-- =====================================================
-- Script pour créer le premier Super Admin
-- =====================================================
-- 
-- INSTRUCTIONS :
-- 1. Remplacez 'VOTRE_EMAIL@example.com' par l'email de votre compte
-- 2. Exécutez ce script dans le SQL Editor de Supabase
-- 3. Ou utilisez la fonction ci-dessous avec votre user_id
-- =====================================================

-- Option 1 : Créer un super admin à partir d'un email
-- Remplacez l'email par celui de votre compte utilisateur
DO $$
DECLARE
  target_user_id UUID;
  admin_exists BOOLEAN;
BEGIN
  -- Récupérer l'ID de l'utilisateur par email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'VOTRE_EMAIL@example.com'  -- ⚠️ REMPLACEZ ICI
  LIMIT 1;

  -- Vérifier si l'utilisateur existe
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé avec cet email. Veuillez vérifier l''email.';
  END IF;

  -- Vérifier si un admin existe déjà pour cet utilisateur
  SELECT EXISTS(
    SELECT 1 FROM platform_admins WHERE user_id = target_user_id
  ) INTO admin_exists;

  IF admin_exists THEN
    RAISE NOTICE 'Un compte admin existe déjà pour cet utilisateur. Mise à jour du rôle en super_admin...';
    
    UPDATE platform_admins
    SET 
      role = 'super_admin',
      is_active = true,
      revoked_at = NULL,
      revoked_by = NULL,
      revoke_reason = NULL,
      updated_at = NOW()
    WHERE user_id = target_user_id;
  ELSE
    -- Créer le super admin
    INSERT INTO platform_admins (
      user_id,
      role,
      permissions,
      is_active,
      accepted_at
    ) VALUES (
      target_user_id,
      'super_admin',
      '{
        "view_dashboard": true,
        "view_revenue": true,
        "manage_subscriptions": true,
        "manage_invoices": true,
        "manage_promo_codes": true,
        "manage_referrals": true,
        "manage_blog": true,
        "publish_posts": true,
        "moderate_comments": true,
        "manage_team": true
      }'::jsonb,
      true,
      NOW()
    );
  END IF;

  RAISE NOTICE 'Super Admin créé avec succès pour l''utilisateur %', target_user_id;
END $$;

-- =====================================================
-- Option 2 : Fonction réutilisable pour créer un super admin
-- =====================================================

CREATE OR REPLACE FUNCTION create_super_admin(
  p_user_email TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  admin_id UUID;
  admin_exists BOOLEAN;
BEGIN
  -- Déterminer l'ID de l'utilisateur
  IF p_user_id IS NOT NULL THEN
    target_user_id := p_user_id;
  ELSIF p_user_email IS NOT NULL THEN
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = p_user_email
    LIMIT 1;
  ELSE
    -- Utiliser l'utilisateur actuellement authentifié
    target_user_id := auth.uid();
  END IF;

  -- Vérifier si l'utilisateur existe
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé. Fournissez un email ou un user_id valide.';
  END IF;

  -- Vérifier si un admin existe déjà
  SELECT EXISTS(
    SELECT 1 FROM platform_admins WHERE user_id = target_user_id
  ) INTO admin_exists;

  IF admin_exists THEN
    -- Mettre à jour l'admin existant
    UPDATE platform_admins
    SET 
      role = 'super_admin',
      is_active = true,
      revoked_at = NULL,
      revoked_by = NULL,
      revoke_reason = NULL,
      updated_at = NOW()
    WHERE user_id = target_user_id
    RETURNING id INTO admin_id;
  ELSE
    -- Créer un nouveau super admin
    INSERT INTO platform_admins (
      user_id,
      role,
      permissions,
      is_active,
      accepted_at
    ) VALUES (
      target_user_id,
      'super_admin',
      '{
        "view_dashboard": true,
        "view_revenue": true,
        "manage_subscriptions": true,
        "manage_invoices": true,
        "manage_promo_codes": true,
        "manage_referrals": true,
        "manage_blog": true,
        "publish_posts": true,
        "moderate_comments": true,
        "manage_team": true
      }'::jsonb,
      true,
      NOW()
    )
    RETURNING id INTO admin_id;
  END IF;

  RETURN admin_id;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION create_super_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_super_admin TO service_role;

-- =====================================================
-- Option 3 : Utilisation de la fonction
-- =====================================================

-- Exemple 1 : Par email
-- SELECT create_super_admin(p_user_email := 'admin@example.com');

-- Exemple 2 : Par user_id
-- SELECT create_super_admin(p_user_id := 'uuid-de-l-utilisateur');

-- Exemple 3 : Utilisateur actuellement connecté
-- SELECT create_super_admin();

-- =====================================================
-- Vérification : Lister tous les super admins
-- =====================================================

-- SELECT 
--   pa.id,
--   pa.role,
--   pa.is_active,
--   u.email,
--   u.full_name,
--   pa.created_at,
--   pa.accepted_at
-- FROM platform_admins pa
-- JOIN auth.users u ON u.id = pa.user_id
-- WHERE pa.role = 'super_admin'
-- ORDER BY pa.created_at DESC;
