-- ============================================================================
-- VÉRIFICATION DES TABLES NON-CRITIQUES
-- ============================================================================
-- Ce script identifie les tables non-critiques qui pourraient nécessiter RLS
-- Les tables critiques sont déjà vérifiées et OK ✅
-- ============================================================================

-- 1. Tables sans RLS (probablement tables système/logs - à vérifier)
SELECT 
  '📋 Tables sans RLS (non-critiques)' as check_type,
  tablename,
  CASE 
    WHEN tablename LIKE '%log%' OR tablename LIKE '%audit%' OR tablename LIKE '%history%' 
    THEN '⚠️ Probable table de logs - Peut rester sans RLS'
    WHEN tablename LIKE '%config%' OR tablename LIKE '%setting%'
    THEN '📋 Table de configuration - À vérifier'
    WHEN tablename LIKE '%cache%' OR tablename LIKE '%temp%'
    THEN '📋 Table temporaire/cache - Peut rester sans RLS'
    ELSE '❓ À examiner manuellement'
  END as recommendation
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE '\_%'
  AND tablename NOT IN ('schema_migrations')
  AND tablename NOT IN (
    -- Exclure les tables critiques (déjà vérifiées)
    'users', 'organizations', 'students', 'sessions',
    'programs', 'formations', 'payments', 'invoices',
    'attendance', 'evaluations', 'documents', 'courses',
    'course_enrollments', 'grades', 'messages', 'conversations',
    'learning_portfolios', 'learning_portfolio_templates'
  )
ORDER BY 
  CASE 
    WHEN tablename LIKE '%log%' OR tablename LIKE '%audit%' THEN 2
    WHEN tablename LIKE '%config%' OR tablename LIKE '%setting%' THEN 1
    ELSE 0
  END,
  tablename;

-- 2. Tables avec RLS mais sans policies (non-critiques)
SELECT 
  '📋 Tables avec RLS mais sans policies (non-critiques)' as check_type,
  t.tablename,
  CASE 
    WHEN t.tablename LIKE '%log%' OR t.tablename LIKE '%audit%'
    THEN '⚠️ Table de logs - Policies optionnelles'
    WHEN t.tablename LIKE '%config%' OR t.tablename LIKE '%setting%'
    THEN '📋 Table de configuration - Créer policy si lecture nécessaire'
    ELSE '❓ À examiner manuellement'
  END as recommendation
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND t.tablename NOT LIKE '\_%'
  AND t.tablename NOT IN ('schema_migrations')
  AND t.tablename NOT IN (
    -- Exclure les tables critiques (déjà vérifiées)
    'users', 'organizations', 'students', 'sessions',
    'programs', 'formations', 'payments', 'invoices',
    'attendance', 'evaluations', 'documents', 'courses',
    'course_enrollments', 'grades', 'messages', 'conversations',
    'learning_portfolios', 'learning_portfolio_templates'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.tablename 
    AND p.schemaname = 'public'
  )
ORDER BY 
  CASE 
    WHEN t.tablename LIKE '%log%' OR t.tablename LIKE '%audit%' THEN 2
    WHEN t.tablename LIKE '%config%' OR t.tablename LIKE '%setting%' THEN 1
    ELSE 0
  END,
  t.tablename;

-- 3. Résumé global (toutes tables confondues)
SELECT 
  '📊 Résumé global sécurité' as check_type,
  COUNT(*) FILTER (WHERE rowsecurity = true) as total_with_rls,
  COUNT(*) FILTER (WHERE rowsecurity = false AND tablename NOT LIKE '\_%' AND tablename NOT IN ('schema_migrations')) as total_without_rls,
  (SELECT COUNT(DISTINCT tablename) FROM pg_policies WHERE schemaname = 'public') as tables_with_policies,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  COUNT(*) FILTER (
    WHERE rowsecurity = true 
    AND tablename IN (
      'users', 'organizations', 'students', 'sessions',
      'programs', 'formations', 'payments', 'invoices',
      'attendance', 'evaluations', 'documents', 'courses',
      'course_enrollments', 'grades', 'messages', 'conversations',
      'learning_portfolios', 'learning_portfolio_templates'
    )
  ) as critical_tables_secured
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE '\_%';


