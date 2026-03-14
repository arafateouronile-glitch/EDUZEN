-- Migration: CRM - Table customer_events pour le tracking du parcours client
-- Permet au Super Admin de suivre le cycle de vie des Organismes de Formation

CREATE TABLE IF NOT EXISTS customer_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type      TEXT        NOT NULL,
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index composite pour les requêtes timeline par org (le plus utilisé)
CREATE INDEX IF NOT EXISTS idx_customer_events_org_time
  ON customer_events(organization_id, created_at DESC);

-- Index pour filtrer par type d'événement
CREATE INDEX IF NOT EXISTS idx_customer_events_type
  ON customer_events(event_type);

-- Index pour les requêtes globales triées par date (dashboard CRM)
CREATE INDEX IF NOT EXISTS idx_customer_events_created_at
  ON customer_events(created_at DESC);

-- Activation RLS
ALTER TABLE customer_events ENABLE ROW LEVEL SECURITY;

-- Les super admins peuvent lire tous les événements
CREATE POLICY "platform_admins_read_customer_events"
  ON customer_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );

-- Le service role peut tout faire (utilisé par trackCustomerEvent côté serveur)
CREATE POLICY "service_role_all_customer_events"
  ON customer_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Les utilisateurs authentifiés peuvent insérer des événements pour leur propre organisation
CREATE POLICY "authenticated_insert_own_org_events"
  ON customer_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE customer_events IS 'CRM léger : tracking du parcours client des Organismes de Formation';
COMMENT ON COLUMN customer_events.event_type IS
  'Type d''événement : signup | login | onboarding_started | onboarding_step_X_completed |
   first_formation_created | first_session_created | first_student_added |
   first_document_generated | first_pdf_generated | billing_started |
   subscription_upgraded | subscription_canceled | payment_failed |
   payment_succeeded | integration_connected | feature_used | error';
COMMENT ON COLUMN customer_events.metadata IS
  'Données contextuelles JSON (ex: {"plan": "pro", "pdf_count": 3, "step": 2})';
