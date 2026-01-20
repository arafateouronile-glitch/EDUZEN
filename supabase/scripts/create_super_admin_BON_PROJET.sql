-- =====================================================
-- Créer Super Admin dans le BON projet
-- =====================================================
-- 
-- ⚠️ IMPORTANT : Vérifiez d'abord que vous êtes dans le bon projet
-- Exécutez d'abord : verifier_bon_projet.sql
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : Voir les utilisateurs disponibles
-- =====================================================
SELECT 
  id as user_id,
  email,
  created_at,
  'Copiez cet ID' as instruction
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- ÉTAPE 2 : Créer le super admin
-- =====================================================
-- 
-- Méthode A : Par user_id (RECOMMANDÉ)
-- Remplacez 'VOTRE_USER_ID' par l'ID copié ci-dessus
-- 
SELECT create_super_admin(p_user_id := 'VOTRE_USER_ID');

-- 
-- Méthode B : Par email (si votre email existe)
-- Remplacez par votre email
-- 
-- SELECT create_super_admin(p_user_email := 'votre-email@example.com');

-- 
-- Méthode C : Utilisateur connecté (si vous êtes connecté dans l'app)
-- 
-- SELECT create_super_admin();

-- =====================================================
-- ÉTAPE 3 : Vérifier la création
-- =====================================================
SELECT 
  '✅ SUPER ADMIN CRÉÉ' as status,
  pa.id::text as admin_id,
  u.email,
  pa.role,
  pa.is_active::text as actif,
  'Accédez à /super-admin dans l''application' as next_step
FROM platform_admins pa
JOIN auth.users u ON u.id = pa.user_id
WHERE pa.role = 'super_admin'
ORDER BY pa.created_at DESC
LIMIT 1;
