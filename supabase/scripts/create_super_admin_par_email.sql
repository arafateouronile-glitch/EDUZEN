-- =====================================================
-- Créer Super Admin par Email
-- =====================================================
-- 
-- INSTRUCTIONS :
-- 1. Remplacez 'arafateouronile@gmail.com' par votre email si différent
-- 2. Exécutez ce script dans le SQL Editor de Supabase
-- =====================================================

DO $$
DECLARE
  target_user_id UUID;
  user_email TEXT := 'arafateouronile@gmail.com';  -- ⚠️ MODIFIEZ ICI SI NÉCESSAIRE
  admin_id UUID;
  table_exists BOOLEAN;
BEGIN
  -- Vérifier si la table platform_admins existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'platform_admins'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '❌ ERREUR : Table platform_admins n''existe pas';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'La migration n''a pas été exécutée dans ce projet.';
    RAISE NOTICE '';
    RAISE NOTICE '📋 SOLUTION :';
    RAISE NOTICE '';
    RAISE NOTICE '1. Allez dans Supabase Dashboard → Database → Migrations';
    RAISE NOTICE '2. Vérifiez que la migration existe :';
    RAISE NOTICE '   20260120000001_create_super_admin_module.sql';
    RAISE NOTICE '3. Si elle n''est pas exécutée, exécutez-la';
    RAISE NOTICE '4. OU exécutez le fichier SQL directement dans SQL Editor :';
    RAISE NOTICE '   supabase/migrations/20260120000001_create_super_admin_module.sql';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ Vérifiez aussi que vous êtes dans le BON projet Supabase !';
    RAISE NOTICE '';
    RETURN;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 Recherche de l''email: %', user_email;
  RAISE NOTICE '========================================';

  -- Chercher l'utilisateur par email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(user_email)
  LIMIT 1;

  -- Vérifier si l'utilisateur existe
  IF target_user_id IS NULL THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ Email non trouvé: %', user_email;
    RAISE NOTICE '';
    RAISE NOTICE '📋 SOLUTIONS :';
    RAISE NOTICE '';
    RAISE NOTICE '1. Vérifiez que vous êtes dans le BON projet Supabase';
    RAISE NOTICE '2. Vérifiez que vous avez créé un établissement dans l''application';
    RAISE NOTICE '3. Liste des utilisateurs disponibles :';
    RAISE NOTICE '   SELECT id, email FROM auth.users ORDER BY created_at DESC;';
    RAISE NOTICE '';
    RAISE NOTICE '4. Si vous trouvez votre user_id, utilisez :';
    RAISE NOTICE '   SELECT create_super_admin(p_user_id := ''VOTRE_USER_ID'');';
    RAISE NOTICE '';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Utilisateur trouvé !';
  RAISE NOTICE '   Email: %', user_email;
  RAISE NOTICE '   User ID: %', target_user_id;
  RAISE NOTICE '';

  -- Vérifier si un admin existe déjà
  SELECT id INTO admin_id
  FROM platform_admins
  WHERE user_id = target_user_id
  LIMIT 1;

  IF admin_id IS NOT NULL THEN
    -- Mettre à jour l'admin existant
    UPDATE platform_admins
    SET 
      role = 'super_admin',
      is_active = true,
      revoked_at = NULL,
      revoked_by = NULL,
      revoke_reason = NULL,
      updated_at = NOW()
    WHERE user_id = target_user_id;

    RAISE NOTICE '✅ Super Admin mis à jour avec succès !';
    RAISE NOTICE '   Admin ID: %', admin_id;
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

    RAISE NOTICE '✅ Super Admin créé avec succès !';
    RAISE NOTICE '   Admin ID: %', admin_id;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 Félicitations !';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Vous pouvez maintenant accéder au dashboard Super Admin :';
  RAISE NOTICE '   URL: /super-admin';
  RAISE NOTICE '';
  RAISE NOTICE 'Votre compte :';
  RAISE NOTICE '   Email: %', user_email;
  RAISE NOTICE '   Role: Super Admin';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- Vérification : Afficher le super admin créé
-- =====================================================
SELECT 
  '✅ SUPER ADMIN CRÉÉ' as status,
  pa.id::text as admin_id,
  u.email,
  pa.role,
  pa.is_active::text as actif,
  pa.created_at::text as date_creation
FROM platform_admins pa
JOIN auth.users u ON u.id = pa.user_id
WHERE u.email = 'arafateouronile@gmail.com'  -- ⚠️ MODIFIEZ ICI SI NÉCESSAIRE
  AND pa.role = 'super_admin'
ORDER BY pa.created_at DESC
LIMIT 1;
