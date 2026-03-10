-- Migration: Table de log des alertes email pour les habilitations/diplômes
-- Permet d'éviter les doublons d'envoi (une seule alerte par type et par diplôme)

CREATE TABLE IF NOT EXISTS diploma_alert_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  diploma_id  UUID        NOT NULL REFERENCES employee_diplomas(id) ON DELETE CASCADE,
  alert_type  TEXT        NOT NULL CHECK (alert_type IN ('warning_180d', 'warning_90d', 'critical_1d')),
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient   TEXT
);

-- Un seul envoi par diplôme × type d'alerte
CREATE UNIQUE INDEX IF NOT EXISTS idx_diploma_alert_log_uniq
  ON diploma_alert_log(diploma_id, alert_type);

CREATE INDEX IF NOT EXISTS idx_diploma_alert_log_diploma
  ON diploma_alert_log(diploma_id);

ALTER TABLE diploma_alert_log ENABLE ROW LEVEL SECURITY;

-- Accès restreint à l'organisation de l'utilisateur connecté
CREATE POLICY "diploma_alert_log_org_access" ON diploma_alert_log
  USING (
    diploma_id IN (
      SELECT id FROM employee_diplomas
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

COMMENT ON TABLE diploma_alert_log IS 'Log des alertes email envoyées pour les habilitations/diplômes arrivant à expiration';
