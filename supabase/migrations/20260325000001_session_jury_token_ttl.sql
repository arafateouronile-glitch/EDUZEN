-- Migration : Ajout TTL sur les tokens de convocation jury
-- Les tokens expirent 7 jours après l'envoi (ou 30 jours après création si jamais envoyés).
-- La route /api/jury/confirm vérifie cette expiration avant d'autoriser la réponse.

ALTER TABLE session_jury
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Pour les entrées existantes : expiration dans 30 jours à partir d'aujourd'hui
UPDATE session_jury
SET token_expires_at = NOW() + INTERVAL '30 days'
WHERE token_expires_at IS NULL;

-- Index pour les requêtes de nettoyage
CREATE INDEX IF NOT EXISTS session_jury_token_expires_at_idx
  ON session_jury(token_expires_at);

-- Commentaire
COMMENT ON COLUMN session_jury.token_expires_at IS
  'Date d''expiration du magic-link de convocation. Défaut : 30 jours après création, mis à J+7 à l''envoi.';
