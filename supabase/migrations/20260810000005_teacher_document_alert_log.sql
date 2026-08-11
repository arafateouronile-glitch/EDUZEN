-- Journal des relances (email + notification) envoyées pour les documents de
-- conformité des formateurs. Anti-doublon sur (teacher_id, required_document_type_id,
-- alert_type) — contrairement à diploma_alert_log (dédupliqué sur diploma_id), une
-- alerte "document manquant" n'a pas de document associé, donc la clé de dédup porte
-- sur le formateur × le type de document requis.

CREATE TABLE IF NOT EXISTS public.teacher_document_alert_log (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  teacher_id                  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  required_document_type_id   UUID REFERENCES public.teacher_required_document_types(id) ON DELETE CASCADE,
  teacher_document_id         UUID REFERENCES public.teacher_documents(id) ON DELETE SET NULL,
  alert_type                  TEXT NOT NULL CHECK (alert_type IN ('warning_180d', 'warning_90d', 'critical_1d', 'missing_manual')),
  recipient                   TEXT,
  sent_by                     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sent_at                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.teacher_document_alert_log IS 'Journal des relances de conformité envoyées aux formateurs (anti-doublon + historique pour l''UI "Dernière relance")';
COMMENT ON COLUMN public.teacher_document_alert_log.sent_by IS 'NULL pour un envoi automatique (cron), renseigné pour une relance manuelle déclenchée par un admin';

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_document_alert_log_dedup
  ON public.teacher_document_alert_log(teacher_id, required_document_type_id, alert_type)
  WHERE alert_type != 'missing_manual';

CREATE INDEX IF NOT EXISTS idx_teacher_document_alert_log_teacher
  ON public.teacher_document_alert_log(teacher_id, sent_at DESC);

ALTER TABLE public.teacher_document_alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view alert log" ON public.teacher_document_alert_log;
CREATE POLICY "Admins can view alert log"
  ON public.teacher_document_alert_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'secretary')
      AND organization_id = teacher_document_alert_log.organization_id
    )
  );

DROP POLICY IF EXISTS "Admins can insert alert log" ON public.teacher_document_alert_log;
CREATE POLICY "Admins can insert alert log"
  ON public.teacher_document_alert_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'secretary')
      AND organization_id = teacher_document_alert_log.organization_id
    )
  );

-- Le service role (cron) contourne RLS via la clé service ; aucune policy
-- supplémentaire n'est nécessaire pour les envois automatiques.

GRANT SELECT, INSERT ON public.teacher_document_alert_log TO authenticated;
