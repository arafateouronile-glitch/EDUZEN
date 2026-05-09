-- Ajout des champs pédagogiques et financiers sur la table programs

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS pedagogical_objectives TEXT,
  ADD COLUMN IF NOT EXISTS training_content       TEXT,
  ADD COLUMN IF NOT EXISTS modalities             TEXT,
  ADD COLUMN IF NOT EXISTS learner_profile        TEXT,
  ADD COLUMN IF NOT EXISTS price                  NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency               TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS duration_hours         INTEGER,
  ADD COLUMN IF NOT EXISTS duration_days          INTEGER,
  ADD COLUMN IF NOT EXISTS duration_unit          TEXT CHECK (duration_unit IN ('hours', 'days'));
