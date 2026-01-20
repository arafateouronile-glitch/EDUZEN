-- =====================================================
-- Script simple pour créer un Super Admin par email
-- =====================================================
-- 
-- INSTRUCTIONS :
-- 1. Remplacez 'arafateouronile@gmail.com' par votre email
-- 2. Exécutez ce script dans le SQL Editor de Supabase
-- =====================================================

DO $$
DECLARE
  target_user_id UUID;
  user_email TEXT := 'arafateouronile@gmail.com';  -- ⚠️ REMPLACEZ ICI PAR VOTRE EMAIL
  admin_id UUID;
BEGIN
  -- Étape 1 : Chercher l'utilisateur par email dans auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(user_email)
  LIMIT 1;

  -- Étape 2 : Vérifier si l'utilisateur existe
  IF target_user_id IS NULL THEN
    RAISE NOTICE '❌ Aucun utilisateur trouvé avec l''email: %', user_email;
    RAISE NOTICE '';
    RAISE NOTICE '📋 SOLUTIONS POSSIBLES :';
    RAISE NOTICE '';
    RAISE NOTICE '1. Vérifiez que vous êtes bien inscrit dans l''application';
    RAISE NOTICE '2. Liste des utilisateurs disponibles :';
    RAISE NOTICE '   SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;';
    RAISE NOTICE '';
    RAISE NOTICE '3. Si vous trouvez votre user_id, utilisez :';
    RAISE NOTICE '   SELECT create_super_admin(p_user_id := ''VOTRE_USER_ID'');';
    RAISE NOTICE '';
    RAISE EXCEPTION 'Email non trouvé. Voir les instructions ci-dessus.';
  END IF;

  RAISE NOTICE '✅ Utilisateur trouvé !';
  RAISE NOTICE '   Email: %', user_email;
  RAISE NOTICE '   User ID: %', target_user_id;
  RAISE NOTICE '';

  -- Étape 3 : Vérifier si un admin existe déjà
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
  RAISE NOTICE '🎉 Félicitations ! Vous pouvez maintenant accéder au dashboard Super Admin.';
  RAISE NOTICE '   URL: /super-admin';
END $$;
