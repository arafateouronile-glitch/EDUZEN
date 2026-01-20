-- =====================================================
-- Script FINAL : Créer Super Admin avec user_id
-- =====================================================
-- 
-- INSTRUCTIONS SIMPLES :
-- 1. Exécutez d'abord la requête ci-dessous pour voir les utilisateurs
-- 2. Copiez un user_id de la liste
-- 3. Remplacez 'VOTRE_USER_ID' dans la fonction create_super_admin
-- 4. Exécutez la fonction
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : Voir tous les utilisateurs
-- =====================================================
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- =====================================================
-- ÉTAPE 2 : Créer le super admin
-- =====================================================
-- Remplacez 'VOTRE_USER_ID' par l'ID copié ci-dessus
-- Exemple : SELECT create_super_admin(p_user_id := '123e4567-e89b-12d3-a456-426614174000');

SELECT create_super_admin(p_user_id := 'VOTRE_USER_ID');

-- =====================================================
-- ÉTAPE 3 : Vérifier que c'est créé
-- =====================================================
SELECT 
  pa.id,
  u.email,
  pa.role,
  pa.is_active,
  'Super Admin créé avec succès !' as status
FROM platform_admins pa
JOIN auth.users u ON u.id = pa.user_id
WHERE pa.user_id = (SELECT user_id FROM platform_admins ORDER BY created_at DESC LIMIT 1);
