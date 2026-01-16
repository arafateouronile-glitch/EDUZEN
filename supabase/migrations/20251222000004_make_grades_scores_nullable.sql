-- Migration pour rendre score et max_score nullable dans la table grades
-- Date: 2024-12-22
-- Description: Permet de créer des évaluations sans note initiale (la note sera calculée plus tard)

-- Rendre score nullable
ALTER TABLE public.grades
  ALTER COLUMN score DROP NOT NULL;

-- Rendre max_score nullable
ALTER TABLE public.grades
  ALTER COLUMN max_score DROP NOT NULL;

-- Vérifier que les colonnes sont bien nullable
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'grades'
  AND column_name IN ('score', 'max_score');



