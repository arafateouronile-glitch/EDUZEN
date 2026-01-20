-- =====================================================
-- Vérifier que le Super Admin est bien créé
-- =====================================================

-- 1. Vérifier le super admin créé
SELECT 
  'SUPER ADMIN' as type,
  pa.id::text as admin_id,
  pa.user_id::text as user_id,
  pa.role,
  pa.is_active::text as actif,
  u.email,
  pa.created_at::text as date_creation
FROM platform_admins pa
LEFT JOIN auth.users u ON u.id = pa.user_id
WHERE pa.role = 'super_admin'
ORDER BY pa.created_at DESC;

-- 2. Vérifier les permissions
SELECT 
  'PERMISSIONS' as type,
  pa.role,
  pa.permissions::text as permissions_json
FROM platform_admins pa
WHERE pa.role = 'super_admin'
LIMIT 1;

-- 3. Vérifier que l'utilisateur existe dans auth.users
SELECT 
  'UTILISATEUR AUTH' as type,
  u.id::text as user_id,
  u.email,
  u.created_at::text as date_creation,
  CASE 
    WHEN EXISTS (SELECT 1 FROM platform_admins WHERE user_id = u.id AND role = 'super_admin')
    THEN '✅ Super Admin associé'
    ELSE '❌ Pas de Super Admin'
  END as statut
FROM auth.users u
WHERE u.email = 'arafateouronile@gmail.com'
LIMIT 1;
