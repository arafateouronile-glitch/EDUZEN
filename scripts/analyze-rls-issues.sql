-- ============================================================================
-- SCRIPT D'ANALYSE DES PROBLÈMES RLS - EDUZEN
-- ============================================================================
-- Ce script identifie les tables qui nécessitent une attention particulière
-- ============================================================================

-- 🔴 1. Tables sans RLS activé (6 tables)
-- Ces tables sont potentiellement vulnérables si elles contiennent des données sensibles
SELECT 
  '🔴 CRITIQUE: Tables sans RLS' as severity,
  tablename,
  'RLS désactivé' as issue,
  CASE 
    WHEN tablename IN ('users', 'students', 'payments', 'invoices', 'organizations') THEN '🚨 TRÈS CRITIQUE - Données sensibles'
    WHEN tablename LIKE '%log%' OR tablename LIKE '%audit%' THEN '⚠️ ATTENTION - Tables de logs'
    ELSE '📋 À vérifier'
  END as risk_level
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE '\_%'
  AND tablename NOT IN ('schema_migrations')
ORDER BY 
  CASE 
    WHEN tablename IN ('users', 'students', 'payments', 'invoices', 'organizations') THEN 0
    WHEN tablename LIKE '%log%' OR tablename LIKE '%audit%' THEN 1
    ELSE 2
  END,
  tablename;

-- 🟠 2. Tables avec RLS activé mais sans policies (11 tables environ)
-- Ces tables ont RLS activé mais aucune policy, donc aucun accès possible
SELECT 
  '🟠 IMPORTANT: Tables avec RLS mais sans policies' as severity,
  t.tablename,
  'RLS activé mais aucune policy définie - Accès bloqué' as issue,
  '📋 À corriger: Créer des policies' as action_required
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND t.tablename NOT LIKE '\_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.tablename 
    AND p.schemaname = 'public'
  )
ORDER BY t.tablename;

-- 🟡 3. Tables critiques avec policies incomplètes
-- Vérifie que les tables critiques ont au moins SELECT, INSERT, UPDATE
SELECT 
  '🟡 ATTENTION: Policies incomplètes sur tables critiques' as severity,
  incomplete.tablename,
  'Opérations manquantes: ' || STRING_AGG(DISTINCT incomplete.cmd::text, ', ' ORDER BY incomplete.cmd) as missing_operations,
  '📋 À corriger: Ajouter les policies manquantes' as action_required
FROM (
  SELECT DISTINCT t.tablename, op.cmd
  FROM pg_tables t
  CROSS JOIN (VALUES ('SELECT'), ('INSERT'), ('UPDATE')) op(cmd)
  WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
    AND t.tablename IN (
      -- Tables critiques qui DOIVENT avoir toutes les opérations de base
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

-- 📊 4. Résumé des tables critiques
-- Liste toutes les tables critiques avec leur statut RLS
SELECT 
  '📊 Résumé tables critiques' as check_type,
  t.tablename,
  CASE WHEN t.rowsecurity THEN '✅' ELSE '❌' END || ' RLS' as rls_status,
  COALESCE(p.policy_count, 0)::text as policies_count,
  COALESCE(p.operations, 'Aucune') as operations,
  CASE 
    WHEN NOT t.rowsecurity THEN '🔴 CRITIQUE: RLS désactivé'
    WHEN p.policy_count = 0 THEN '🟠 IMPORTANT: Aucune policy'
    WHEN p.policy_count < 3 THEN '🟡 ATTENTION: Policies incomplètes'
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
    -- Liste des tables critiques à vérifier en priorité
    'users', 'organizations', 'students', 'sessions',
    'programs', 'formations', 'payments', 'invoices',
    'attendance', 'evaluations', 'documents', 'courses',
    'course_enrollments', 'grades', 'messages', 'conversations',
    'learning_portfolios', 'learning_portfolio_templates'
  )
ORDER BY 
  CASE 
    WHEN NOT t.rowsecurity THEN 0
    WHEN p.policy_count = 0 THEN 1
    WHEN p.policy_count < 3 THEN 2
    ELSE 3
  END,
  t.tablename;


