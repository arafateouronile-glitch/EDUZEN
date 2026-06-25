-- Politiques RLS manquantes pour les utilisateurs authentifiés sur email_logs
-- Sans ces policies, les utilisateurs normaux ne voient aucune donnée (tout à 0 sur /dashboard/suivi)
-- et les inserts depuis les routes API (anon key) échouent silencieusement

-- SELECT : lire les emails de sa propre organisation
CREATE POLICY "users_read_own_org_email_logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- INSERT : les routes API (anon key + cookie auth) peuvent logguer les emails envoyés
CREATE POLICY "users_insert_own_org_email_logs"
  ON email_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
