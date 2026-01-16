-- Migration pour créer une fonction RPC qui peut être appelée pour synchroniser un utilisateur
-- Cette fonction peut être utilisée par l'Edge Function ou directement depuis le client

-- Supprimer toutes les versions existantes de la fonction (peu importe la signature)
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Supprimer toutes les signatures possibles de la fonction
  FOR func_record IN (
    SELECT proname, oidvectortypes(proargtypes) as arg_types
    FROM pg_proc
    WHERE proname = 'sync_user_from_auth' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.' || func_record.proname || '(' || func_record.arg_types || ') CASCADE;';
  END LOOP;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignorer les erreurs si la fonction n'existe pas
END $$;

-- Fonction RPC pour synchroniser un utilisateur depuis auth.users vers public.users
-- Peut être appelée avec SECURITY DEFINER pour bypass RLS
CREATE OR REPLACE FUNCTION public.sync_user_from_auth(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  auth_user_record RECORD;
  new_user_record RECORD;
BEGIN
  -- Récupérer l'utilisateur depuis auth.users
  -- Note: Cette requête nécessite des permissions sur auth.users
  -- Dans Supabase, cela fonctionne avec SECURITY DEFINER
  SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data,
    au.created_at
  INTO auth_user_record
  FROM auth.users au
  WHERE au.id = user_id;
  
  -- Vérifier si l'utilisateur existe dans auth.users
  IF auth_user_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users',
      'user_id', user_id
    );
  END IF;
  
  -- Vérifier si l'utilisateur existe déjà dans public.users
  IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    SELECT * INTO new_user_record FROM public.users WHERE id = user_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already exists',
      'user', jsonb_build_object(
        'id', new_user_record.id,
        'email', new_user_record.email,
        'full_name', new_user_record.full_name,
        'role', new_user_record.role
      )
    );
  END IF;
  
  -- Créer l'utilisateur dans public.users
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    auth_user_record.id,
    auth_user_record.email,
    COALESCE(auth_user_record.raw_user_meta_data->>'full_name', auth_user_record.email),
    COALESCE((auth_user_record.raw_user_meta_data->>'role')::text, 'user'),
    COALESCE((auth_user_record.raw_user_meta_data->>'is_active')::boolean, true),
    auth_user_record.created_at,
    NOW()
  )
  RETURNING * INTO new_user_record;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User synced successfully',
    'user', jsonb_build_object(
      'id', new_user_record.id,
      'email', new_user_record.email,
      'full_name', new_user_record.full_name,
      'role', new_user_record.role
    )
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', user_id
    );
END;
$$;

COMMENT ON FUNCTION public.sync_user_from_auth(UUID) IS 'Synchronise un utilisateur depuis auth.users vers public.users. Peut être appelée par une Edge Function ou directement depuis le client.';

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.sync_user_from_auth(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_user_from_auth(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.sync_user_from_auth(UUID) TO service_role;

