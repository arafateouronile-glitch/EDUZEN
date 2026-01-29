-- Migration: ajouter rating (0-5) pour évaluations satisfaction (à chaud, à froid, apprenants, financeurs)
-- Ces types n'ont pas de score mais des étoiles et un avis client.

ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5));

COMMENT ON COLUMN public.grades.rating IS 'Note satisfaction 0-5 étoiles (pour assessment_type hot, cold, manager, instructor, funder). Null pour les évaluations notées (score/max_score).';
