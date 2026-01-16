-- ============================================================================
-- SCRIPT DE VÉRIFICATION RLS EN PRODUCTION - EDUZEN
-- ============================================================================
-- Exécutez ce script dans le SQL Editor de Supabase pour vérifier l'état des RLS
-- ============================================================================

-- 1. 🔴 Tables sans RLS activé
SELECT 
  '🔴 Tables sans RLS' as check_type, 
  tablename,
  'Action requise: Activer RLS' as action
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE '\_%' -- Exclure tables système
  AND tablename NOT IN ('schema_migrations')
ORDER BY tablename;

-- 2. 🟠 Tables sans policies
SELECT 
  '🟠 Tables sans policies' as check_type, 
  tablename,
  'Action requise: Créer des policies' as action
FROM pg_tables t
WHERE schemaname = 'public'
  AND rowsecurity = true
  AND tablename NOT LIKE '\_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.tablename 
    AND p.schemaname = 'public'
  )
ORDER BY tablename;

-- 3. 🟡 Tables avec policies incomplètes
SELECT 
  '🟡 Policies incomplètes' as check_type,
  incomplete.tablename,
  'Opérations manquantes: ' || STRING_AGG(DISTINCT incomplete.cmd::text, ', ' ORDER BY incomplete.cmd) as action
FROM (
  SELECT DISTINCT t.tablename, op.cmd
  FROM pg_tables t
  CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) op(cmd)
  WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND t.tablename NOT LIKE '\_%'
    AND t.tablename IN (
      'users', 'organizations', 'students', 'sessions',
      'programs', 'formations', 'payments', 'invoices',
      'attendance', 'evaluations', 'documents'
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.tablename = t.tablename
        AND p.schemaname = 'public'
        AND (p.cmd = op.cmd OR p.cmd = 'ALL')
    )
) incomplete
GROUP BY incomplete.tablename
ORDER BY incomplete.tablename;

-- 4. ⚠️ Policies potentiellement trop permissives
SELECT 
  '⚠️ Policies trop permissives' as check_type,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual LIKE '%true%' OR qual IS NULL THEN '🚨 DANGER: Policy avec true/NULL'
    WHEN qual LIKE '%auth.uid() IS NOT NULL%' AND qual NOT LIKE '%organization_id%' THEN '⚠️ ATTENTION: Permissive (tous utilisateurs)'
    ELSE '✅ OK'
  END as action
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual LIKE '%true%' 
    OR qual IS NULL
    OR (qual LIKE '%auth.uid() IS NOT NULL%' AND qual NOT LIKE '%organization_id%')
  )
ORDER BY 
  CASE 
    WHEN qual LIKE '%true%' OR qual IS NULL THEN 0
    ELSE 1
  END,
  tablename;

-- 5. 📊 Résumé par table (tables critiques)
SELECT 
  '📊 Résumé sécurité' as check_type,
  t.tablename,
  CASE WHEN t.rowsecurity THEN '✅' ELSE '❌' END || ' RLS' as rls_status,
  COALESCE(p.policy_count, 0)::text as policies_count,
  COALESCE(p.operations, 'Aucune') as operations,
  CASE 
    WHEN NOT t.rowsecurity THEN '❌ RLS désactivé'
    WHEN p.policy_count = 0 THEN '❌ Aucune policy'
    WHEN p.policy_count < 3 THEN '⚠️ Incomplet'
    ELSE '✅ OK'
  END as status
FROM pg_tables t
LEFT JOIN (
  SELECT 
    tablename, 
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd) as operations
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'users', 'organizations', 'students', 'sessions',
    'programs', 'formations', 'payments', 'invoices',
    'attendance', 'evaluations', 'documents', 'courses',
    'course_enrollments', 'grades', 'messages', 'conversations'
  )
ORDER BY 
  CASE 
    WHEN NOT t.rowsecurity THEN 0 
    WHEN p.policy_count = 0 THEN 1 
    WHEN p.policy_count < 3 THEN 2 
    ELSE 3 
  END,
  t.tablename;

-- 6. ✅ Statistiques globales
SELECT 
  '📈 Statistiques globales' as check_type,
  COUNT(*) FILTER (WHERE t.rowsecurity = true) as tables_with_rls,
  COUNT(*) FILTER (WHERE t.rowsecurity = false AND t.tablename NOT LIKE '\_%') as tables_without_rls,
  (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') as tables_with_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE '\_%';

