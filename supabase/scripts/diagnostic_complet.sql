-- =====================================================
-- DIAGNOSTIC COMPLET - État de la base de données
-- =====================================================

-- 1. Vérifier les utilisateurs dans auth.users
SELECT 
  'UTILISATEURS AUTH' as type,
  COUNT(*)::text as nombre,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ Aucun utilisateur - Vous devez vous inscrire d''abord'
    ELSE '✅ ' || COUNT(*)::text || ' utilisateur(s) trouvé(s)'
  END as statut
FROM auth.users;

-- 2. Afficher les utilisateurs (si ils existent)
SELECT 
  'LISTE UTILISATEURS' as type,
  id::text as user_id,
  email,
  created_at::text as date_creation
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Vérifier les super admins
SELECT 
  'SUPER ADMINS' as type,
  COUNT(*)::text as nombre,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ Aucun super admin créé'
    ELSE '✅ ' || COUNT(*)::text || ' super admin(s) trouvé(s)'
  END as statut
FROM platform_admins
WHERE role = 'super_admin' AND is_active = true;

-- 4. Liste des super admins (si ils existent)
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

-- 5. Vérifier si la table platform_admins existe
SELECT 
  'TABLE PLATFORM_ADMINS' as type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_admins')
    THEN '✅ Table existe'
    ELSE '❌ Table n''existe pas - Migration non exécutée'
  END as statut;
