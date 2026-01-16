-- Fonction SQL pour créer un utilisateur dans la table users en bypassant RLS
-- À exécuter dans le SQL Editor de Supabase

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS public.create_user_for_organization(UUID, TEXT, TEXT, TEXT, UUID);

-- Créer une fonction qui permet de créer un utilisateur avec SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_user_for_organization(
  user_id UUID,
  user_email TEXT,
  user_full_name TEXT,
  organization_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created_user_id UUID;
BEGIN
  -- Vérifier que user_id est fourni
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User ID must be provided';
  END IF;

  IF organization_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID must be provided';
  END IF;

  -- Créer l'utilisateur dans la table users (bypass RLS grâce à SECURITY DEFINER)
  INSERT INTO public.users (
    id,
    organization_id,
    email,
    full_name,
    role,
    is_active
  )
  VALUES (
    user_id,
    organization_id,
    user_email,
    user_full_name,
    'admin'::text,  -- Utiliser text au lieu du type enum
    true
  )
  RETURNING id INTO created_user_id;

  RETURN created_user_id;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.create_user_for_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_for_organization TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_for_organization TO service_role;

-- Vérifier que la fonction est créée
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_user_for_organization';

























