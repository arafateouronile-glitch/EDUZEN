-- Script de vérification post-migration EDUZEN
-- Exécutez ce script après l'application des migrations pour vérifier leur intégrité

-- ========================================
-- 1. VÉRIFICATION DES TABLES PRINCIPALES
-- ========================================

SELECT '=== VÉRIFICATION DES TABLES ===' AS section;

SELECT 
    'tables' AS check_type,
    tablename,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tablename AND table_schema = 'public')
        THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END AS status
FROM (VALUES 
    ('users'),
    ('organizations'),
    ('students'),
    ('sessions'),
    ('formations'),
    ('programs'),
    ('enrollments'),
    ('attendance'),
    ('grades'),
    ('invoices'),
    ('payments'),
    ('documents'),
    ('conversations'),
    ('conversation_participants'),
    ('messages'),
    ('evaluation_templates'),
    ('evaluation_template_questions'),
    ('session_charges'),
    ('session_slots'),
    ('calendar_todos'),
    ('calendar_notifications')
) AS tables(tablename);

-- ========================================
-- 2. VÉRIFICATION DES POLICIES RLS
-- ========================================

SELECT '=== VÉRIFICATION RLS ===' AS section;

SELECT 
    'rls_enabled' AS check_type,
    schemaname || '.' || tablename AS table_full_name,
    CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END AS rls_status,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = t.schemaname) AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'organizations', 'students', 'sessions', 'formations',
    'programs', 'enrollments', 'attendance', 'grades', 'invoices',
    'payments', 'documents', 'conversations', 'conversation_participants', 'messages'
)
ORDER BY tablename;

-- ========================================
-- 3. VÉRIFICATION DES FONCTIONS RPC
-- ========================================

SELECT '=== VÉRIFICATION FONCTIONS RPC ===' AS section;

SELECT 
    'functions' AS check_type,
    p.proname AS function_name,
    CASE 
        WHEN p.prosecdef THEN '🔒 SECURITY DEFINER'
        ELSE '📖 INVOKER'
    END AS security,
    '✅ EXISTS' AS status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'get_learner_student',
    'get_user_name',
    'insert_student_message',
    'sync_user_from_auth',
    'learner_student_id',
    'get_calendar_events'
)
ORDER BY p.proname;

-- ========================================
-- 4. VÉRIFICATION DES INDEX
-- ========================================

SELECT '=== VÉRIFICATION DES INDEX ===' AS section;

SELECT 
    'indexes' AS check_type,
    indexname,
    tablename,
    '✅ EXISTS' AS status
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname
LIMIT 30;

-- ========================================
-- 5. VÉRIFICATION DES BUCKETS STORAGE
-- ========================================

SELECT '=== VÉRIFICATION STORAGE BUCKETS ===' AS section;

SELECT 
    'storage_buckets' AS check_type,
    id AS bucket_name,
    CASE WHEN public THEN '🌐 PUBLIC' ELSE '🔒 PRIVATE' END AS visibility,
    '✅ EXISTS' AS status
FROM storage.buckets
WHERE id IN ('documents', 'messages', 'avatars', 'templates')
ORDER BY id;

-- ========================================
-- 6. VÉRIFICATION DES CONTRAINTES FK
-- ========================================

SELECT '=== VÉRIFICATION CONTRAINTES FK ===' AS section;

SELECT 
    'foreign_keys' AS check_type,
    tc.table_name,
    COUNT(*) AS fk_count,
    '✅ CONFIGURED' AS status
FROM information_schema.table_constraints tc
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
GROUP BY tc.table_name
ORDER BY tc.table_name
LIMIT 20;

-- ========================================
-- 7. RÉSUMÉ
-- ========================================

SELECT '=== RÉSUMÉ ===' AS section;

SELECT 
    'summary' AS check_type,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') AS total_tables,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS total_indexes,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS total_policies,
    (SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.prokind = 'f') AS total_functions,
    (SELECT COUNT(*) FROM storage.buckets) AS total_buckets;

-- ========================================
-- 8. VÉRIFICATION DES DONNÉES CRITIQUES
-- ========================================

SELECT '=== VÉRIFICATION DONNÉES ===' AS section;

SELECT 
    'data_check' AS check_type,
    'organizations' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END AS status
FROM public.organizations
UNION ALL
SELECT 
    'data_check',
    'users',
    COUNT(*),
    CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END
FROM public.users
UNION ALL
SELECT 
    'data_check',
    'students',
    COUNT(*),
    CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ EMPTY' END
FROM public.students
UNION ALL
SELECT 
    'data_check',
    'evaluation_templates (system)',
    COUNT(*),
    CASE WHEN COUNT(*) > 0 THEN '✅ HAS DATA' ELSE '⚠️ MISSING SYSTEM TEMPLATES' END
FROM public.evaluation_templates
WHERE organization_id IS NULL;

SELECT '=== FIN DE LA VÉRIFICATION ===' AS section;

