-- =====================================================
-- Vérifier que vous êtes dans le BON projet Supabase
-- =====================================================
-- 
-- Exécutez ce script pour vérifier :
-- 1. Que la table platform_admins existe
-- 2. Que vous avez des utilisateurs
-- 3. Que vous êtes dans le bon projet
-- =====================================================

-- 1. Vérifier que la table platform_admins existe (migration exécutée)
SELECT 
  'MIGRATION' as verification,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'platform_admins'
    )
    THEN '✅ Table platform_admins existe - Migration OK'
    ELSE '❌ Table platform_admins n''existe pas - Exécutez la migration d''abord'
  END as statut;

-- 2. Compter les utilisateurs
SELECT 
  'UTILISATEURS' as verification,
  COUNT(*)::text as nombre,
  CASE 
    WHEN COUNT(*) = 0 
    THEN '❌ Aucun utilisateur - Créez un établissement dans l''app'
    ELSE '✅ ' || COUNT(*)::text || ' utilisateur(s) trouvé(s)'
  END as statut
FROM auth.users;

-- 3. Lister les utilisateurs (si ils existent)
SELECT 
  'LISTE UTILISATEURS' as type,
  id::text as user_id,
  email,
  created_at::text as date_creation
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 4. Vérifier les super admins existants
SELECT 
  'SUPER ADMINS' as verification,
  COUNT(*)::text as nombre,
  CASE 
    WHEN COUNT(*) = 0 
    THEN '❌ Aucun super admin - Créez-en un'
    ELSE '✅ ' || COUNT(*)::text || ' super admin(s) trouvé(s)'
  END as statut
FROM platform_admins
WHERE role = 'super_admin' AND is_active = true;

-- 5. Liste des super admins (si ils existent)
SELECT 
  'DÉTAILS SUPER ADMINS' as type,
  pa.id::text as admin_id,
  u.email,
  pa.role,
  pa.is_active::text as actif,
  pa.created_at::text as date_creation
FROM platform_admins pa
JOIN auth.users u ON u.id = pa.user_id
WHERE pa.role = 'super_admin'
ORDER BY pa.created_at DESC;
