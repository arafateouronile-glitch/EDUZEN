-- =====================================================
-- Vérifier si la migration Super Admin est exécutée
-- =====================================================

-- Vérifier si la table platform_admins existe
SELECT 
  'VÉRIFICATION MIGRATION' as type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'platform_admins'
    )
    THEN '✅ Table platform_admins existe - Migration OK'
    ELSE '❌ Table platform_admins n''existe pas - Migration NON exécutée'
  END as statut,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'platform_admins'
    )
    THEN 'Vous pouvez créer un super admin'
    ELSE 'Exécutez d''abord la migration : 20260120000001_create_super_admin_module.sql'
  END as instruction;

-- Vérifier les autres tables importantes
SELECT 
  'VÉRIFICATION TABLES' as type,
  table_name as table,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = table_name
    )
    THEN '✅ Existe'
    ELSE '❌ N''existe pas'
  END as statut
FROM (VALUES 
  ('platform_admins'),
  ('subscription_plans'),
  ('organization_subscriptions'),
  ('promo_codes'),
  ('blog_posts')
) AS t(table_name);

-- Vérifier les utilisateurs
SELECT 
  'UTILISATEURS' as type,
  COUNT(*)::text as nombre,
  CASE 
    WHEN COUNT(*) = 0 
    THEN '❌ Aucun utilisateur - Créez un établissement dans l''app'
    ELSE '✅ ' || COUNT(*)::text || ' utilisateur(s)'
  END as statut
FROM auth.users;
