-- Version alternative de la fonction qui ne nécessite pas auth.uid()
-- À utiliser si la session n'est pas disponible lors de l'inscription
-- ⚠️ MOINS SÉCURISÉ - À utiliser seulement pour le développement initial

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS public.create_organization_for_user_no_auth(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

-- Créer une fonction qui accepte user_id en paramètre
CREATE OR REPLACE FUNCTION public.create_organization_for_user_no_auth(
  org_name TEXT,
  org_code TEXT,
  user_id UUID,  -- Passer l'ID utilisateur en paramètre
  org_type TEXT DEFAULT 'primary',
  org_country TEXT DEFAULT 'SN',
  org_currency TEXT DEFAULT 'XOF',
  org_language TEXT DEFAULT 'fr',
  org_timezone TEXT DEFAULT 'Africa/Dakar'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Vérifier que user_id est fourni
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User ID must be provided';
  END IF;

  -- Créer l'organisation (bypass RLS grâce à SECURITY DEFINER)
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
    org_type::organizations_type,
    org_country,
    org_currency,
    org_language,
    org_timezone,
    'free'::subscription_tier_type,
    'active'::subscription_status_type,
    '{}'::jsonb
  )
  RETURNING id INTO org_id;

  RETURN org_id;
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION public.create_organization_for_user_no_auth TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_for_user_no_auth TO anon;
GRANT EXECUTE ON FUNCTION public.create_organization_for_user_no_auth TO service_role;

























