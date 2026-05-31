-- Table des messages reçus via le formulaire de contact public (/contact)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  TEXT        NOT NULL,
  last_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  company     TEXT        NOT NULL DEFAULT '',
  reason      TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  -- Statut de traitement par l'équipe
  status      TEXT        NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new', 'read', 'replied', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour trier par date
CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx
  ON contact_submissions (created_at DESC);

-- RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Tout visiteur anonyme peut soumettre le formulaire
CREATE POLICY "public_insert_contact"
  ON contact_submissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Seuls les admins de la plateforme peuvent lire et mettre à jour
CREATE POLICY "admins_select_contact"
  ON contact_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY "admins_update_contact"
  ON contact_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );
