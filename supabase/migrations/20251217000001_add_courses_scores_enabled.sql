-- Ajout d'un flag pour activer/désactiver le scoring des élèves sur une séquence e-learning
-- Par défaut: scoring activé

ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS scores_enabled BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_courses_scores_enabled
ON public.courses(scores_enabled);






