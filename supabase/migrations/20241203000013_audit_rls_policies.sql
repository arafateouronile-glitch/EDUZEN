-- Audit complet des RLS Policies
-- Ce script vérifie que toutes les tables sensibles ont des RLS activées
-- et que les policies sont correctement configurées

-- ============================================================================
-- 1. VÉRIFIER QUE RLS EST ACTIVÉ SUR TOUTES LES TABLES SENSIBLES
-- ============================================================================

SELECT 
  'Tables sans RLS' as audit_type,
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = false THEN '❌ RLS désactivé'
    ELSE '✅ RLS activé'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'organizations',
    'students',
    'courses',
    'course_enrollments',
    'payments',
    'invoices',
    'attendance',
    'sessions',
    'programs',
    'formations',
    'evaluations',
    'documents',
    'educational_resources'
  )
ORDER BY 
  CASE WHEN rowsecurity = false THEN 0 ELSE 1 END,
  tablename;

-- ============================================================================
-- 2. LISTER TOUTES LES POLICIES PAR TABLE
-- ============================================================================

SELECT 
  'Policies par table' as audit_type,
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(cmd::text, ', ' ORDER BY cmd) as operations,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ Aucune policy'
    WHEN COUNT(*) < 3 THEN '⚠️ Policies incomplètes'
    ELSE '✅ Policies complètes'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'organizations',
    'students',
    'courses',
    'course_enrollments',
    'payments',
    'invoices',
    'attendance',
    'sessions',
    'programs',
    'formations',
    'evaluations',
    'documents',
    'educational_resources'
  )
GROUP BY tablename
ORDER BY 
  CASE 
    WHEN COUNT(*) = 0 THEN 0
    WHEN COUNT(*) < 3 THEN 1
    ELSE 2
  END,
  tablename;

-- ============================================================================
-- 3. DÉTAIL DES POLICIES PAR TABLE
-- ============================================================================

SELECT 
  'Détail policies' as audit_type,
  tablename,
  policyname,
  cmd as operation,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Lecture'
    WHEN cmd = 'INSERT' THEN '✅ Création'
    WHEN cmd = 'UPDATE' THEN '✅ Modification'
    WHEN cmd = 'DELETE' THEN '✅ Suppression'
    WHEN cmd = 'ALL' THEN '✅ Toutes opérations'
    ELSE cmd::text
  END as operation_label
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'organizations',
    'students',
    'courses',
    'course_enrollments',
    'payments',
    'invoices',
    'attendance',
    'sessions',
    'programs',
    'formations',
    'evaluations',
    'documents',
    'educational_resources'
  )
ORDER BY tablename, cmd;

-- ============================================================================
-- 4. VÉRIFIER LES TABLES CRITIQUES SANS POLICIES
-- ============================================================================

SELECT 
  'Tables critiques sans policies' as audit_type,
  t.tablename,
  CASE 
    WHEN t.rowsecurity = false THEN '❌ RLS désactivé'
    WHEN p.policy_count IS NULL THEN '❌ Aucune policy'
    ELSE '✅ OK'
  END as status
FROM pg_tables t
LEFT JOIN (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'users',
    'organizations',
    'students',
    'courses',
    'course_enrollments',
    'payments',
    'invoices',
    'attendance',
    'sessions',
    'programs',
    'formations',
    'evaluations',
    'documents',
    'educational_resources'
  )
  AND (t.rowsecurity = false OR p.policy_count IS NULL OR p.policy_count = 0)
ORDER BY t.tablename;

-- ============================================================================
-- 5. VÉRIFIER LES POLICIES PERMISSIVES (POTENTIELLEMENT DANGEREUSES)
-- ============================================================================

SELECT 
  'Policies potentiellement permissives' as audit_type,
  tablename,
  policyname,
  cmd,
  qual as using_clause,
  CASE 
    WHEN qual LIKE '%true%' OR qual IS NULL THEN '⚠️ Très permissive'
    WHEN qual LIKE '%auth.uid() IS NOT NULL%' THEN '⚠️ Permissive (tous authentifiés)'
    ELSE '✅ Restrictive'
  END as security_level
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual LIKE '%true%' 
    OR qual IS NULL
    OR (qual LIKE '%auth.uid() IS NOT NULL%' AND qual NOT LIKE '%organization_id%')
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- 6. RÉSUMÉ PAR TABLE
-- ============================================================================

SELECT 
  'Résumé sécurité' as audit_type,
  summary.tablename,
  CASE 
    WHEN summary.rls_enabled = false THEN '❌ RLS désactivé'
    WHEN summary.policy_count = 0 THEN '❌ Aucune policy'
    WHEN summary.policy_count < 3 THEN '⚠️ Policies incomplètes'
    ELSE '✅ Sécurisé'
  END as security_status,
  summary.rls_enabled,
  summary.policy_count,
  COALESCE(summary.has_select, false) as has_select,
  COALESCE(summary.has_insert, false) as has_insert,
  COALESCE(summary.has_update, false) as has_update,
  COALESCE(summary.has_delete, false) as has_delete
FROM (
  SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(DISTINCT p.policyname) as policy_count,
    BOOL_OR(p.cmd = 'SELECT' OR p.cmd = 'ALL') as has_select,
    BOOL_OR(p.cmd = 'INSERT' OR p.cmd = 'ALL') as has_insert,
    BOOL_OR(p.cmd = 'UPDATE' OR p.cmd = 'ALL') as has_update,
    BOOL_OR(p.cmd = 'DELETE' OR p.cmd = 'ALL') as has_delete
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'users',
      'organizations',
      'students',
      'courses',
      'course_enrollments',
      'payments',
      'invoices',
      'attendance',
      'sessions',
      'programs',
      'formations',
      'evaluations',
      'documents',
      'educational_resources'
    )
  GROUP BY t.tablename, t.rowsecurity
) summary
ORDER BY 
  CASE 
    WHEN summary.rls_enabled = false OR summary.policy_count = 0 THEN 0
    WHEN summary.policy_count < 3 THEN 1
    ELSE 2
  END,
  summary.tablename;

