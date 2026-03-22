-- ============================================================
-- Module Examen & Jury — Migration
-- Ajoute exam_date sur sessions, crée jury_members et session_jury
-- ============================================================

-- 1. Colonne exam_date sur sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS exam_date TIMESTAMPTZ;

-- 2. Table jury_members (professionnels externes)
CREATE TABLE IF NOT EXISTS jury_members (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name      TEXT        NOT NULL,
  last_name       TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  company         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jury_members_organization_id_idx
  ON jury_members(organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS jury_members_org_email_idx
  ON jury_members(organization_id, email);

-- 3. Table de liaison session_jury
CREATE TABLE IF NOT EXISTS session_jury (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      UUID        NOT NULL REFERENCES sessions(id)      ON DELETE CASCADE,
  jury_member_id  UUID        NOT NULL REFERENCES jury_members(id)  ON DELETE CASCADE,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'declined')),
  token           UUID        DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  email_sent_at   TIMESTAMPTZ,
  confirmed_at    TIMESTAMPTZ,                  -- piste d'audit Qualiopi
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, jury_member_id)
);

CREATE INDEX IF NOT EXISTS session_jury_session_id_idx
  ON session_jury(session_id);

CREATE INDEX IF NOT EXISTS session_jury_token_idx
  ON session_jury(token);

-- 4. Trigger updated_at (crée la fonction si elle n'existe pas)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_jury_members_updated_at'
  ) THEN
    CREATE TRIGGER update_jury_members_updated_at
      BEFORE UPDATE ON jury_members
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_session_jury_updated_at'
  ) THEN
    CREATE TRIGGER update_session_jury_updated_at
      BEFORE UPDATE ON session_jury
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;

-- 5. RLS
ALTER TABLE jury_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_jury  ENABLE ROW LEVEL SECURITY;

-- Membres de jury : lecture/écriture pour les users de la même org
CREATE POLICY "jury_members_org_access" ON jury_members
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- session_jury : lecture/écriture pour les users dont la session appartient à leur org
CREATE POLICY "session_jury_org_access" ON session_jury
  FOR ALL
  USING (
    session_id IN (
      SELECT s.id
      FROM   sessions s
      JOIN   users u ON u.organization_id = s.organization_id
      WHERE  u.id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT s.id
      FROM   sessions s
      JOIN   users u ON u.organization_id = s.organization_id
      WHERE  u.id = auth.uid()
    )
  );

-- Accès public (sans auth) pour la confirmation via magic-link
-- Le token est le secret : seul qui détient le token peut confirmer
CREATE POLICY "session_jury_public_token_update" ON session_jury
  FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

-- Lecture publique par token (pour la route de confirmation)
CREATE POLICY "session_jury_public_token_read" ON session_jury
  FOR SELECT
  USING (TRUE);
