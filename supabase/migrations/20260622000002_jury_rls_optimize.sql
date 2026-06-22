-- Optimisation des politiques RLS jury_members et session_jury
--
-- Problèmes de la migration précédente :
--   1. session_jury_org_access : EXISTS avec JOIN users évalué pour chaque ligne accédée
--   2. jury_members_org_access : IN avec sous-requête (moins précis qu'un = scalaire)
--   3. Indexes manquants sur les colonnes de filtrage des politiques

-- ─── Indexes pour les chemins chauds des politiques RLS ───────────────────────

-- session_jury : la politique filtre par session_id (EXISTS vers sessions)
CREATE INDEX IF NOT EXISTS idx_session_jury_session_id
  ON session_jury (session_id);

-- jury_members : la politique filtre par organization_id
CREATE INDEX IF NOT EXISTS idx_jury_members_organization_id
  ON jury_members (organization_id);

-- users : covering index pour le lookup auth.uid() → organization_id (évite heap fetch)
CREATE INDEX IF NOT EXISTS idx_users_id_organization_id
  ON users (id, organization_id);

-- ─── jury_members : = scalaire au lieu de IN ──────────────────────────────────
-- IN (sous-requête) accepte N résultats ; = (sous-requête scalaire) est plus
-- précis et légèrement plus rapide car PostgreSQL sait qu'il n'y a qu'une valeur.

DROP POLICY IF EXISTS "jury_members_org_access" ON jury_members;
CREATE POLICY "jury_members_org_access" ON jury_members
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ─── session_jury : EXISTS sans JOIN ─────────────────────────────────────────
-- Avant : EXISTS (SELECT 1 FROM sessions s JOIN users u ON u.org = s.org WHERE ...)
--   → PostgreSQL évalue le JOIN pour chaque ligne de session_jury.
--
-- Après : la sous-requête scalaire (SELECT org FROM users WHERE id = uid()) est
--   évaluée UNE SEULE FOIS par PostgreSQL et mise en cache pour toute la durée
--   de la requête. L'EXISTS ne touche plus que la table sessions via son PK.

DROP POLICY IF EXISTS "session_jury_org_access" ON session_jury;
CREATE POLICY "session_jury_org_access" ON session_jury
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE  s.id             = session_jury.session_id
        AND  s.organization_id = (
               SELECT organization_id FROM users WHERE id = auth.uid()
             )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE  s.id             = session_jury.session_id
        AND  s.organization_id = (
               SELECT organization_id FROM users WHERE id = auth.uid()
             )
    )
  );
