-- =====================================================
-- Script DIRECT : Créer Super Admin avec user_id
-- =====================================================
-- 
-- INSTRUCTIONS :
-- 1. Remplacez 'VOTRE_USER_ID_ICI' par votre user_id
-- 2. Exécutez ce script
-- =====================================================

SELECT create_super_admin(p_user_id := 'VOTRE_USER_ID_ICI');

-- =====================================================
-- Pour trouver votre user_id, exécutez d'abord :
-- =====================================================
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;
