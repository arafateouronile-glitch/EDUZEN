-- =====================================================
-- Script pour vérifier et créer Super Admin
-- =====================================================
-- Ce script retourne des résultats visibles (pas seulement des messages)
-- =====================================================

-- Étape 1 : Vérifier les utilisateurs existants
SELECT 
  'UTILISATEURS DISPONIBLES' as type,
  id::text as user_id,
  email,
  created_at::text as date_creation
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- Étape 2 : Créer le super admin (remplacez le user_id)
-- Décommentez et modifiez la ligne ci-dessous avec un user_id de la liste ci-dessus :

-- SELECT create_super_admin(p_user_id := 'COLLEZ-VOTRE-USER-ID-ICI');

-- Étape 3 : Vérifier les super admins créés
SELECT 
  'SUPER ADMINS EXISTANTS' as type,
  pa.id::text as admin_id,
  u.email,
  pa.role,
  pa.is_active,
  pa.created_at::text as date_creation
FROM platform_admins pa
JOIN auth.users u ON u.id = pa.user_id
WHERE pa.role = 'super_admin'
ORDER BY pa.created_at DESC;
