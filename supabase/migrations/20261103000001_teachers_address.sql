-- Adresse du formateur : alimente {formateur_adresse}, {formateur_code_postal}
-- et {formateur_ville} des conventions et ordres de mission.

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS address     TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city        TEXT;
