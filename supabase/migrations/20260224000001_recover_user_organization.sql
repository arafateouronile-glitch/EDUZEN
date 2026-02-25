-- Récupération automatique de l'organisation pour un utilisateur connecté sans organization_id
-- Utilise auth.users.raw_user_meta_data.organization_id (stocké à l'inscription) pour réattribuer l'org

-- 1. Fonction RPC : récupérer et réattribuer l'organisation depuis les métadonnées auth
CREATE OR REPLACE FUNCTION public.recover_user_organization(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org_id_from_meta TEXT;
  v_org_exists BOOLEAN;
  v_updated RECORD;
BEGIN
  -- Seul l'utilisateur concerné peut appeler (ou service_role)
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: can only recover own organization'
    );
  END IF;

  -- Vérifier que l'utilisateur dans public.users n'a pas déjà une organisation
  IF EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND organization_id IS NOT NULL) THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already has organization_id',
      'organization_id', (SELECT organization_id FROM public.users WHERE id = p_user_id)
    );
  END IF;

  -- Lire organization_id depuis auth.users.raw_user_meta_data
  SELECT (raw_user_meta_data->>'organization_id')::TEXT
  INTO v_org_id_from_meta
  FROM auth.users
  WHERE id = p_user_id;

  IF v_org_id_from_meta IS NULL OR v_org_id_from_meta = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No organization_id in user metadata',
      'user_id', p_user_id
    );
  END IF;

  -- Vérifier que l'organisation existe
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_org_id_from_meta::UUID)
  INTO v_org_exists;

  IF NOT v_org_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found',
      'organization_id', v_org_id_from_meta
    );
  END IF;

  -- Mettre à jour public.users
  UPDATE public.users
  SET organization_id = v_org_id_from_meta::UUID, updated_at = NOW()
  WHERE id = p_user_id
  RETURNING id, organization_id INTO v_updated;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Organization recovered from metadata',
    'organization_id', v_updated.organization_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', p_user_id
    );
END;
$$;

COMMENT ON FUNCTION public.recover_user_organization(UUID) IS 'Récupère organization_id depuis auth.users.raw_user_meta_data et met à jour public.users. Appelé à la connexion si l''utilisateur n''a pas d''organisation.';

GRANT EXECUTE ON FUNCTION public.recover_user_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recover_user_organization(UUID) TO service_role;


-- 2. Mise à jour de sync_user_from_auth : utiliser organization_id des métadonnées si présent
CREATE OR REPLACE FUNCTION public.sync_user_from_auth(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  auth_user_record RECORD;
  new_user_record RECORD;
  v_org_id_from_meta UUID;
  v_org_exists BOOLEAN;
BEGIN
  SELECT 
    au.id,
    au.email,
    au.raw_user_meta_data,
    au.created_at
  INTO auth_user_record
  FROM auth.users au
  WHERE au.id = user_id;

  IF auth_user_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found in auth.users',
      'user_id', user_id
    );
  END IF;

  IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id) THEN
    SELECT * INTO new_user_record FROM public.users WHERE id = user_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already exists',
      'user', jsonb_build_object(
        'id', new_user_record.id,
        'email', new_user_record.email,
        'full_name', new_user_record.full_name,
        'role', new_user_record.role,
        'organization_id', new_user_record.organization_id
      )
    );
  END IF;

  -- Récupérer organization_id depuis les métadonnées si présent
  v_org_id_from_meta := NULL;
  IF auth_user_record.raw_user_meta_data ? 'organization_id' AND auth_user_record.raw_user_meta_data->>'organization_id' IS NOT NULL THEN
    BEGIN
      v_org_id_from_meta := (auth_user_record.raw_user_meta_data->>'organization_id')::UUID;
      SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = v_org_id_from_meta) INTO v_org_exists;
      IF NOT v_org_exists THEN
        v_org_id_from_meta := NULL;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_org_id_from_meta := NULL;
    END;
  END IF;

  -- Créer l'utilisateur avec organization_id si disponible
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    is_active,
    organization_id,
    created_at,
    updated_at
  )
  VALUES (
    auth_user_record.id,
    auth_user_record.email,
    COALESCE(auth_user_record.raw_user_meta_data->>'full_name', auth_user_record.email),
    COALESCE((auth_user_record.raw_user_meta_data->>'role')::text, 'user'),
    COALESCE((auth_user_record.raw_user_meta_data->>'is_active')::boolean, true),
    v_org_id_from_meta,
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
      'role', new_user_record.role,
      'organization_id', new_user_record.organization_id
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

COMMENT ON FUNCTION public.sync_user_from_auth(UUID) IS 'Synchronise un utilisateur depuis auth.users vers public.users. Utilise raw_user_meta_data.organization_id si présent.';
