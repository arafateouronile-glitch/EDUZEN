-- =====================================================
-- Créer Super Admin après création d'établissement
-- =====================================================
-- 
-- Si vous avez créé un établissement, vous êtes connecté.
-- Ce script crée le super admin pour votre compte.
-- =====================================================

-- =====================================================
-- OPTION 1 : Créer pour l'utilisateur actuellement connecté
-- =====================================================
-- Si vous êtes connecté dans l'application, exécutez :
SELECT create_super_admin();
-- (Sans paramètres, utilise auth.uid() = utilisateur connecté)

-- =====================================================
-- OPTION 2 : Voir tous les utilisateurs et choisir
-- =====================================================
SELECT 
  id as user_id,
  email,
  created_at,
  'Utilisez cet ID pour créer le super admin' as instruction
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Puis utilisez l'ID trouvé :
-- SELECT create_super_admin(p_user_id := 'ID_TROUVE_CI_DESSUS');

-- =====================================================
-- OPTION 3 : Créer pour le dernier utilisateur créé
-- =====================================================
-- Crée automatiquement le super admin pour le dernier utilisateur
DO $$
DECLARE
  dernier_user_id UUID;
  admin_id UUID;
BEGIN
  -- Récupérer le dernier utilisateur créé
  SELECT id INTO dernier_user_id
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;

  IF dernier_user_id IS NULL THEN
    RAISE NOTICE '❌ Aucun utilisateur trouvé.';
    RAISE NOTICE '   Créez d''abord un établissement dans l''application.';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Dernier utilisateur trouvé : %', dernier_user_id;

  -- Vérifier si un admin existe déjà
  SELECT id INTO admin_id
  FROM platform_admins
  WHERE user_id = dernier_user_id
  LIMIT 1;

  IF admin_id IS NOT NULL THEN
    -- Mettre à jour
    UPDATE platform_admins
    SET 
      role = 'super_admin',
      is_active = true,
      revoked_at = NULL,
      updated_at = NOW()
    WHERE user_id = dernier_user_id;

    RAISE NOTICE '✅ Super Admin mis à jour pour le dernier utilisateur !';
  ELSE
    -- Créer
    INSERT INTO platform_admins (
      user_id,
      role,
      permissions,
      is_active,
      accepted_at
    ) VALUES (
      dernier_user_id,
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

    RAISE NOTICE '✅ Super Admin créé pour le dernier utilisateur !';
    RAISE NOTICE '   Admin ID: %', admin_id;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🎉 Super Admin créé avec succès !';
  RAISE NOTICE '   Accédez à : /super-admin';
END $$;

-- =====================================================
-- Vérification
-- =====================================================
SELECT 
  'SUPER ADMINS CRÉÉS' as type,
  pa.id::text as admin_id,
  u.email,
  pa.role,
  pa.is_active::text as actif
FROM platform_admins pa
JOIN auth.users u ON u.id = pa.user_id
WHERE pa.role = 'super_admin'
ORDER BY pa.created_at DESC;
