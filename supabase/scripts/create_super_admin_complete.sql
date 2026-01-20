-- =====================================================
-- Script COMPLET : Créer Super Admin
-- =====================================================
-- 
-- Ce script fait 3 choses :
-- 1. Liste tous les utilisateurs disponibles
-- 2. Cherche votre email
-- 3. Crée le super admin (par email OU par user_id)
-- =====================================================

-- =====================================================
-- PARTIE 1 : Lister tous les utilisateurs
-- =====================================================
SELECT 
  '📋 UTILISATEURS DISPONIBLES' as info,
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- PARTIE 2 : Chercher votre email et créer le super admin
-- =====================================================
-- Remplacez 'arafateouronile@gmail.com' par votre email
DO $$
DECLARE
  target_user_id UUID;
  user_email TEXT := 'arafateouronile@gmail.com';  -- ⚠️ REMPLACEZ ICI
  admin_id UUID;
  user_count INTEGER;
BEGIN
  -- Compter le nombre d'utilisateurs
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 Recherche de l''email: %', user_email;
  RAISE NOTICE '📊 Nombre total d''utilisateurs: %', user_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Chercher l'utilisateur par email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(user_email)
  LIMIT 1;

  -- Si l'email n'existe pas
  IF target_user_id IS NULL THEN
    RAISE NOTICE '❌ Email non trouvé: %', user_email;
    RAISE NOTICE '';
    RAISE NOTICE '📋 SOLUTIONS :';
    RAISE NOTICE '';
    RAISE NOTICE 'Option 1 : Utiliser un user_id directement';
    RAISE NOTICE '   Exécutez : SELECT create_super_admin(p_user_id := ''VOTRE_USER_ID'');';
    RAISE NOTICE '';
    RAISE NOTICE 'Option 2 : Vérifier la liste ci-dessus et choisir un utilisateur';
    RAISE NOTICE '';
    RAISE NOTICE 'Option 3 : Vous inscrire d''abord dans l''application';
    RAISE NOTICE '';
    
    -- Afficher les emails similaires
    RAISE NOTICE '📧 Emails similaires trouvés :';
    DECLARE
      similar_email TEXT;
      similar_id UUID;
      found_any BOOLEAN := false;
    BEGIN
      FOR similar_email, similar_id IN 
        SELECT email, id FROM auth.users 
        WHERE email ILIKE '%' || SPLIT_PART(user_email, '@', 1) || '%'
        LIMIT 5
      LOOP
        RAISE NOTICE '   - % (ID: %)', similar_email, similar_id;
        found_any := true;
      END LOOP;
      
      IF NOT found_any THEN
        RAISE NOTICE '   Aucun email similaire trouvé.';
      END IF;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '💡 Pour créer le super admin avec un user_id, utilisez :';
    RAISE NOTICE '   SELECT create_super_admin(p_user_id := ''copiez-l-id-ci-dessus'');';
    
    RETURN;
  END IF;

  -- Utilisateur trouvé !
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
    -- Mettre à jour
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
    -- Créer
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
  RAISE NOTICE '🎉 Félicitations !';
  RAISE NOTICE '   Vous pouvez maintenant accéder au dashboard : /super-admin';
  RAISE NOTICE '';
END $$;
