-- Migration pour corriger la contrainte CHECK sur assessment_type
-- Date: 2024-12-22
-- Description: Vérifie et corrige la contrainte CHECK pour assessment_type dans la table grades

-- 1. Vérifier la contrainte actuelle
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.grades'::regclass
  AND conname LIKE '%assessment_type%';

-- 2. Supprimer l'ancienne contrainte si elle existe
ALTER TABLE public.grades 
  DROP CONSTRAINT IF EXISTS grades_assessment_type_check;

-- 3. Créer une nouvelle contrainte avec toutes les valeurs autorisées
-- Basé sur les valeurs utilisées dans l'application :
-- 'pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder', 'quiz', 'exam', 'project', 'other'
ALTER TABLE public.grades
  ADD CONSTRAINT grades_assessment_type_check 
  CHECK (
    assessment_type IS NULL 
    OR assessment_type IN (
      'pre_formation',
      'hot',
      'cold',
      'manager',
      'instructor',
      'funder',
      'quiz',
      'exam',
      'project',
      'other'
    )
  );

-- 4. Vérifier que la contrainte est bien créée
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.grades'::regclass
  AND conname = 'grades_assessment_type_check';



