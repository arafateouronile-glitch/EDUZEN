-- Ajouter les colonnes JSONB pour les onglets contenu et suivi de l'exécution
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS training_content_tabs    JSONB,
  ADD COLUMN IF NOT EXISTS execution_follow_up_tabs JSONB;

COMMENT ON COLUMN programs.training_content_tabs    IS 'Onglets de contenu de formation : [{id, title, content}]';
COMMENT ON COLUMN programs.execution_follow_up_tabs IS 'Onglets de suivi de l''exécution : [{id, title, content}]';
