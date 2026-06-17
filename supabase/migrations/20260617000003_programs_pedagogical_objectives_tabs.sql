-- Ajouter la colonne JSONB pour les onglets d'objectifs pédagogiques
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS pedagogical_objectives_tabs JSONB;

COMMENT ON COLUMN programs.pedagogical_objectives_tabs IS 'Onglets d''objectifs pédagogiques : [{id, title, content}]';
