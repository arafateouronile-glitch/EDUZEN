-- =====================================================
-- Debug : Vérifier l'accès Super Admin
-- =====================================================

-- 1. Vérifier que le super admin existe
SELECT 
  'SUPER ADMIN EXISTE' as check_type,
  pa.id::text as admin_id,
  pa.user_id::text as user_id,
  pa.role,
  pa.is_active,
  u.email as user_email
FROM platform_admins pa
LEFT JOIN auth.users u ON u.id = pa.user_id
WHERE pa.role = 'super_admin' AND pa.is_active = true;

-- 2. Vérifier les politiques RLS sur platform_admins
SELECT 
  'POLITIQUES RLS' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'platform_admins';

-- 3. Vérifier que la fonction is_super_admin existe
SELECT 
  'FONCTION HELPER' as check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_super_admin', 'is_platform_admin', 'can_manage_blog');

-- 4. Tester la fonction is_super_admin avec un user_id
-- Remplacez 'VOTRE_USER_ID' par votre user_id
-- SELECT 
--   'TEST FONCTION' as check_type,
--   is_super_admin('VOTRE_USER_ID'::uuid) as is_super_admin_result;

-- 5. Vérifier les permissions sur la table
SELECT 
  'PERMISSIONS TABLE' as check_type,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'platform_admins';
