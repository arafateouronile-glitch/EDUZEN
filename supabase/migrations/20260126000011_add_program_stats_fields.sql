-- Migration: Ajouter les champs statistiques aux programmes
-- Ces champs permettent d'afficher les indicateurs de performance sur la page publique

-- Ajouter les champs de statistiques à la table programs
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS success_rate INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS satisfaction_rate NUMERIC(3,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_learners INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completion_rate INTEGER DEFAULT NULL;

-- Ajouter des contraintes de validation (avec DO block pour éviter les erreurs si elles existent)
DO $$
BEGIN
  -- Contrainte pour success_rate (0-100)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_success_rate') THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT check_success_rate CHECK (success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 100));
  END IF;

  -- Contrainte pour satisfaction_rate (0-5)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_satisfaction_rate') THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT check_satisfaction_rate CHECK (satisfaction_rate IS NULL OR (satisfaction_rate >= 0 AND satisfaction_rate <= 5));
  END IF;

  -- Contrainte pour total_learners (>= 0)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_total_learners') THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT check_total_learners CHECK (total_learners IS NULL OR total_learners >= 0);
  END IF;

  -- Contrainte pour completion_rate (0-100)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_completion_rate') THEN
    ALTER TABLE public.programs
      ADD CONSTRAINT check_completion_rate CHECK (completion_rate IS NULL OR (completion_rate >= 0 AND completion_rate <= 100));
  END IF;
END $$;

-- Commentaires pour documentation
COMMENT ON COLUMN public.programs.success_rate IS 'Taux de réussite en pourcentage (0-100)';
COMMENT ON COLUMN public.programs.satisfaction_rate IS 'Note de satisfaction sur 5 (ex: 4.8)';
COMMENT ON COLUMN public.programs.total_learners IS 'Nombre total d''apprenants ayant suivi ce programme';
COMMENT ON COLUMN public.programs.completion_rate IS 'Taux de complétion en pourcentage (0-100)';
