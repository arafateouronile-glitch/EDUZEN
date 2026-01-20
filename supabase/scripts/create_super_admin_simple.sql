-- =====================================================
-- Script SIMPLE pour créer un Super Admin
-- =====================================================
-- 
-- ÉTAPE 1 : Exécutez cette requête pour voir tous les utilisateurs
-- =====================================================

SELECT 
  id as user_id,
  email,
  created_at,
  'Copiez l''ID ci-dessus' as instruction
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- ÉTAPE 2 : Une fois que vous avez votre user_id, 
--           exécutez cette commande en remplaçant 'VOTRE_USER_ID'
-- =====================================================

-- Décommentez et remplacez 'VOTRE_USER_ID' par l'ID copié ci-dessus :
-- SELECT create_super_admin(p_user_id := 'VOTRE_USER_ID');

-- =====================================================
-- OU : Script automatique avec votre email
-- =====================================================
-- Si vous préférez utiliser votre email, décommentez et modifiez le script ci-dessous :

/*
DO $$
DECLARE
  target_user_id UUID;
  user_email TEXT := 'arafateouronile@gmail.com';  -- ⚠️ REMPLACEZ ICI
  admin_id UUID;
BEGIN
  -- Chercher l'utilisateur
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE LOWER(email) = LOWER(user_email)
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE NOTICE '❌ Email non trouvé: %', user_email;
    RAISE NOTICE '📋 Exécutez d''abord: SELECT id, email FROM auth.users;';
    RAISE NOTICE '   Puis utilisez: SELECT create_super_admin(p_user_id := ''id-trouvé'');';
    RETURN;
  END IF;

  -- Créer ou mettre à jour le super admin
  INSERT INTO platform_admins (user_id, role, permissions, is_active, accepted_at)
  VALUES (
    target_user_id,
    'super_admin',
    '{"view_dashboard":true,"view_revenue":true,"manage_subscriptions":true,"manage_invoices":true,"manage_promo_codes":true,"manage_referrals":true,"manage_blog":true,"publish_posts":true,"moderate_comments":true,"manage_team":true}'::jsonb,
    true,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    is_active = true,
    revoked_at = NULL,
    updated_at = NOW()
  RETURNING id INTO admin_id;

  RAISE NOTICE '✅ Super Admin créé avec succès !';
  RAISE NOTICE '   User ID: %', target_user_id;
  RAISE NOTICE '   Admin ID: %', admin_id;
END $$;
*/
