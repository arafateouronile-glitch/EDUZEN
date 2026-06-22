-- Granularité des politiques RLS session_jury et jury_members
--
-- FOR ALL est ambigu : il autorise INSERT/UPDATE/DELETE/SELECT avec la même règle.
-- On sépare pour documenter l'intention et pouvoir restreindre indépendamment.
--
-- Rappel : les membres de jury n'ont PAS de compte Supabase — ils passent par
-- /api/jury/confirm (service_role, bypass RLS). Ces politiques couvrent uniquement
-- les utilisateurs authentifiés de l'organisation (admins, secrétaires).

-- ─── session_jury ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "session_jury_org_access" ON session_jury;

-- Les admins/secrétaires lisent les affectations de leur org
CREATE POLICY "session_jury_select" ON session_jury
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE  s.id              = session_jury.session_id
        AND  s.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- Création d'une affectation uniquement pour une session de son org
CREATE POLICY "session_jury_insert" ON session_jury
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE  s.id              = session_jury.session_id
        AND  s.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- Mise à jour (ex : correction manuelle du statut) uniquement sur son org
CREATE POLICY "session_jury_update" ON session_jury
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE  s.id              = session_jury.session_id
        AND  s.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE  s.id              = session_jury.session_id
        AND  s.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- Suppression d'une affectation (retrait d'un membre du jury d'une session)
CREATE POLICY "session_jury_delete" ON session_jury
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE  s.id              = session_jury.session_id
        AND  s.organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    )
  );

-- ─── jury_members ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "jury_members_org_access" ON jury_members;

CREATE POLICY "jury_members_select" ON jury_members
  FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "jury_members_insert" ON jury_members
  FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "jury_members_update" ON jury_members
  FOR UPDATE
  USING  (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "jury_members_delete" ON jury_members
  FOR DELETE
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  );
