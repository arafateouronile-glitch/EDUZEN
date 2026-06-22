-- Réapplication des politiques RLS sur jury_members et session_jury
-- Utilise DROP POLICY IF EXISTS pour être idempotent en cas de migration partielle

-- ─── jury_members ─────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS jury_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jury_members_org_access" ON jury_members;
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

-- ─── session_jury ─────────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS session_jury ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_jury_org_access" ON session_jury;
CREATE POLICY "session_jury_org_access" ON session_jury
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM   sessions s
      JOIN   users u ON u.organization_id = s.organization_id
      WHERE  s.id = session_jury.session_id
        AND  u.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   sessions s
      JOIN   users u ON u.organization_id = s.organization_id
      WHERE  s.id = session_jury.session_id
        AND  u.id = auth.uid()
    )
  );

-- Accès public par token (confirmation magic-link sans auth)
DROP POLICY IF EXISTS "session_jury_public_token_update" ON session_jury;
CREATE POLICY "session_jury_public_token_update" ON session_jury
  FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "session_jury_public_token_read" ON session_jury;
CREATE POLICY "session_jury_public_token_read" ON session_jury
  FOR SELECT
  USING (TRUE);
