-- Fonction SQL pour créer une organisation en bypassant RLS
-- Version améliorée qui accepte user_id en paramètre optionnel
-- À exécuter dans le SQL Editor de Supabase

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS public.create_organization_for_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_organization_for_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

-- Créer une fonction qui accepte user_id en paramètre (pour contourner le problème de session)
CREATE OR REPLACE FUNCTION public.create_organization_for_user(
  org_name TEXT,
  org_code TEXT,
  org_type TEXT DEFAULT 'primary',
  org_country TEXT DEFAULT 'SN',
  org_currency TEXT DEFAULT 'XOF',
  org_language TEXT DEFAULT 'fr',
  org_timezone TEXT DEFAULT 'Africa/Dakar',
  user_id UUID DEFAULT NULL  -- Paramètre optionnel pour user_id
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
  actual_user_id UUID;
BEGIN
  -- Essayer d'abord auth.uid(), sinon utiliser le paramètre user_id
  actual_user_id := COALESCE(auth.uid(), user_id);
  
  -- Si toujours NULL, lancer une erreur
  IF actual_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated or user_id must be provided';
  END IF;

  -- Créer l'organisation (bypass RLS grâce à SECURITY DEFINER)
  -- Note: Utiliser le type directement sans cast pour éviter l'erreur "type does not exist"
  INSERT INTO public.organizations (
    name,
    code,
    type,
    country,
    currency,
    language,
    timezone,
    subscription_tier,
    subscription_status,
    settings
  )
  VALUES (
    org_name,
    org_code,
    org_type::text,  -- Utiliser text au lieu de organizations_type
    org_country,
    org_currency,
    org_language,
    org_timezone,
    'free'::text,  -- Utiliser text au lieu de subscription_tier_type
    'active'::text,  -- Utiliser text au lieu de subscription_status_type
    '{}'::jsonb
  )
  RETURNING id INTO org_id;

  RETURN org_id;
END;
$$;

-- Donner les permissions d'exécution à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.create_organization_for_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_for_user TO anon;
GRANT EXECUTE ON FUNCTION public.create_organization_for_user TO service_role;

-- Vérifier que la fonction est créée
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'create_organization_for_user';
