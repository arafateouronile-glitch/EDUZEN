-- Migration : Fonction RPC create_user_for_organization
-- Permet de créer un utilisateur en bypassant RLS (SECURITY DEFINER)

DROP FUNCTION IF EXISTS public.create_user_for_organization(UUID, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.create_user_for_organization(UUID, TEXT, TEXT, UUID);

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
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User ID must be provided';
  END IF;

  IF organization_id IS NULL THEN
    RAISE EXCEPTION 'Organization ID must be provided';
  END IF;

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
    'admin'::text,
    true
  )
  RETURNING id INTO created_user_id;

  RETURN created_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_user_for_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_for_organization TO anon;
GRANT EXECUTE ON FUNCTION public.create_user_for_organization TO service_role;
