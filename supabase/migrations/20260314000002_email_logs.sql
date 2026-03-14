-- =============================================================================
-- Email Logs — Tracking des emails transactionnels via Resend
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        REFERENCES organizations(id) ON DELETE SET NULL,
  recipient       TEXT        NOT NULL,
  subject         TEXT        NOT NULL,
  template_type   TEXT,       -- 'convocation', 'contrat', 'alerte', 'facturation', 'onboarding', etc.
  resend_id       TEXT        UNIQUE,
  status          TEXT        NOT NULL DEFAULT 'sent'
                              CHECK (status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed')),
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index composite principal : par org + date pour le super-admin
CREATE INDEX idx_email_logs_org_date
  ON email_logs (organization_id, created_at DESC);

-- Index sur statut pour les filtres
CREATE INDEX idx_email_logs_status
  ON email_logs (status);

-- Index sur created_at pour les dashboards globaux
CREATE INDEX idx_email_logs_created_at
  ON email_logs (created_at DESC);

-- Index sur resend_id pour les mises à jour rapides depuis les webhooks
CREATE INDEX idx_email_logs_resend_id
  ON email_logs (resend_id);

-- Trigger de mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

-- =============================================================================
-- RLS (Row Level Security)
-- =============================================================================

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Politique 1 : Les super-admins peuvent tout lire
CREATE POLICY "platform_admins_read_all_email_logs"
  ON email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins
      WHERE user_id = auth.uid()
    )
  );

-- Politique 2 : Le service role (webhook, server actions) peut tout faire
CREATE POLICY "service_role_all_email_logs"
  ON email_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
