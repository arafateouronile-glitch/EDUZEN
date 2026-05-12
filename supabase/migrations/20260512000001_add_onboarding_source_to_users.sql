-- Ajoute la colonne onboarding_source à la table users
-- Permet d'identifier l'origine d'inscription (ex: 'vsl', 'direct', 'invitation')
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_source text DEFAULT NULL;

-- Créer un index pour filtrer efficacement les leads VSL
CREATE INDEX IF NOT EXISTS idx_users_onboarding_source ON users(onboarding_source) WHERE onboarding_source IS NOT NULL;

-- Commentaire
COMMENT ON COLUMN users.onboarding_source IS 'Source d''inscription : vsl, direct, invitation, etc.';
