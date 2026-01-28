-- Migration: Ajouter les champs de statistiques au catalogue public
-- Date: 2026-01-26
-- Description: Ajoute les champs pour configurer les statistiques affichées sur le catalogue public

-- Ajouter les colonnes pour les statistiques
ALTER TABLE public.public_catalog_settings
  ADD COLUMN IF NOT EXISTS stats_trained_students INTEGER DEFAULT 1200,
  ADD COLUMN IF NOT EXISTS stats_satisfaction_rate INTEGER DEFAULT 98,
  ADD COLUMN IF NOT EXISTS stats_success_rate INTEGER DEFAULT 95;

-- Ajouter des commentaires
COMMENT ON COLUMN public.public_catalog_settings.stats_trained_students IS 'Nombre d''apprenants formés affiché sur le catalogue public';
COMMENT ON COLUMN public.public_catalog_settings.stats_satisfaction_rate IS 'Taux de satisfaction en pourcentage (0-100) affiché sur le catalogue public';
COMMENT ON COLUMN public.public_catalog_settings.stats_success_rate IS 'Taux de réussite en pourcentage (0-100) affiché sur le catalogue public';

-- Ajouter des contraintes pour valider les valeurs
DO $$
BEGIN
  -- Contrainte pour stats_satisfaction_rate (0-100)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_stats_satisfaction_rate') THEN
    ALTER TABLE public.public_catalog_settings
      ADD CONSTRAINT check_stats_satisfaction_rate 
      CHECK (stats_satisfaction_rate IS NULL OR (stats_satisfaction_rate >= 0 AND stats_satisfaction_rate <= 100));
  END IF;

  -- Contrainte pour stats_success_rate (0-100)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_stats_success_rate') THEN
    ALTER TABLE public.public_catalog_settings
      ADD CONSTRAINT check_stats_success_rate 
      CHECK (stats_success_rate IS NULL OR (stats_success_rate >= 0 AND stats_success_rate <= 100));
  END IF;

  -- Contrainte pour stats_trained_students (>= 0)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_stats_trained_students') THEN
    ALTER TABLE public.public_catalog_settings
      ADD CONSTRAINT check_stats_trained_students 
      CHECK (stats_trained_students IS NULL OR stats_trained_students >= 0);
  END IF;
END $$;
