-- Ajouter la colonne JSONB pour les onglets du profil des apprenants
ALTER TABLE programs
  ADD COLUMN IF NOT EXISTS learner_profile_tabs JSONB;

COMMENT ON COLUMN programs.learner_profile_tabs IS 'Onglets de profil des apprenants : [{id, title, content}]';
