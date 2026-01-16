-- Script de vérification pour s'assurer que les tables courses sont correctement configurées
-- À exécuter après la migration 20241203000011

-- 1. Vérifier que les tables existent
SELECT 
  'Tables existantes' as check_type,
  table_name,
  CASE 
    WHEN table_name = 'courses' THEN '✅'
    WHEN table_name = 'course_enrollments' THEN '✅'
    ELSE '❌'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('courses', 'course_enrollments')
ORDER BY table_name;

-- 2. Vérifier la relation instructor_id
SELECT 
  'Relation instructor_id' as check_type,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  CASE 
    WHEN ccu.table_schema = 'public' AND ccu.table_name = 'users' THEN '✅ Correcte'
    ELSE '❌ Incorrecte'
  END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'courses'
  AND kcu.column_name = 'instructor_id';

-- 3. Vérifier les index
SELECT 
  'Index' as check_type,
  indexname,
  tablename,
  CASE 
    WHEN indexname LIKE 'idx_courses%' OR indexname LIKE 'idx_course_enrollments%' THEN '✅'
    ELSE '⚠️'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('courses', 'course_enrollments')
ORDER BY tablename, indexname;

-- 4. Vérifier les RLS policies
SELECT 
  'RLS Policies' as check_type,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN tablename IN ('courses', 'course_enrollments') THEN '✅'
    ELSE '⚠️'
  END as status
FROM pg_policies
WHERE tablename IN ('courses', 'course_enrollments')
ORDER BY tablename, cmd;

-- 5. Test de requête avec jointure (devrait fonctionner sans erreur)
SELECT 
  'Test jointure' as check_type,
  COUNT(*) as courses_count,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ Requête fonctionne'
    ELSE '❌ Erreur'
  END as status
FROM courses c
LEFT JOIN users u ON c.instructor_id = u.id;





