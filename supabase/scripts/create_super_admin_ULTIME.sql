-- =====================================================
-- Script ULTIME : Créer Super Admin (Tous les cas)
-- =====================================================
-- Ce script gère automatiquement tous les scénarios
-- =====================================================

-- =====================================================
-- PARTIE 1 : Diagnostic
-- =====================================================

-- Compter les utilisateurs
SELECT 
  'DIAGNOSTIC' as etape,
  (SELECT COUNT(*) FROM auth.users)::text as nb_utilisateurs,
  (SELECT COUNT(*) FROM platform_admins WHERE role = 'super_admin' AND is_active = true)::text as nb_super_admins,
  CASE 
    WHEN (SELECT COUNT(*) FROM auth.users) = 0 
    THEN '❌ Aucun utilisateur - Inscrivez-vous d''abord dans l''application'
    ELSE '✅ Utilisateurs trouvés'
  END as instruction;

-- =====================================================
-- PARTIE 2 : Liste des utilisateurs (si ils existent)
-- =====================================================

SELECT 
  'UTILISATEURS DISPONIBLES' as type,
  id::text as user_id,
  email,
  created_at::text as date_creation,
  'Copiez cet ID pour créer le super admin' as instruction
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- PARTIE 3 : Créer le super admin
-- =====================================================
-- 
-- INSTRUCTIONS :
-- 1. Si vous voyez des utilisateurs ci-dessus, copiez un user_id
-- 2. Remplacez 'VOTRE_USER_ID' dans la commande ci-dessous
-- 3. Décommentez et exécutez la ligne
-- 
-- Si vous ne voyez aucun utilisateur, vous devez d'abord :
-- - Ouvrir votre application EDUZEN
-- - Vous inscrire avec votre email
-- - Puis revenir ici et exécuter ce script à nouveau
-- =====================================================

-- Décommentez et remplacez 'VOTRE_USER_ID' :
-- SELECT create_super_admin(p_user_id := 'VOTRE_USER_ID');

-- OU si votre email existe maintenant :
-- SELECT create_super_admin(p_user_email := 'arafateouronile@gmail.com');

-- =====================================================
-- PARTIE 4 : Vérification finale
-- =====================================================

SELECT 
  'SUPER ADMINS CRÉÉS' as type,
  pa.id::text as admin_id,
  u.email,
  pa.role,
  pa.is_active::text as actif,
  pa.created_at::text as date_creation
FROM platform_admins pa
JOIN auth.users u ON u.id = pa.user_id
WHERE pa.role = 'super_admin'
ORDER BY pa.created_at DESC;
