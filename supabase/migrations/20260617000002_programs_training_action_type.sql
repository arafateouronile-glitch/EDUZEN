-- Ajouter les champs de type d'action de formation aux programmes
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS training_action_type TEXT,
  ADD COLUMN IF NOT EXISTS rs_title_name        TEXT,
  ADD COLUMN IF NOT EXISTS rs_code              TEXT;

COMMENT ON COLUMN programs.training_action_type IS 'Type d''action de formation : action_formation, bloc_competences, specialite, certification_rs';
COMMENT ON COLUMN programs.rs_title_name        IS 'Nom du titre visé (certifications RS / CQP)';
COMMENT ON COLUMN programs.rs_code              IS 'Code RS enregistré au répertoire spécifique';
