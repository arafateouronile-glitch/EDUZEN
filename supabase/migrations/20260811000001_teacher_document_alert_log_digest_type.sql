-- Ajoute un type d'alerte "digest hebdomadaire" pour les documents manquants
-- (par opposition aux alertes à échéance warning_180d/90d/critical_1d, et à la
-- relance manuelle missing_manual). Un digest hebdomadaire doit pouvoir se répéter
-- chaque semaine tant que le document manque : on l'exclut donc de l'index unique
-- de dédoublonnage, comme missing_manual.

ALTER TABLE public.teacher_document_alert_log
  DROP CONSTRAINT IF EXISTS teacher_document_alert_log_alert_type_check;

ALTER TABLE public.teacher_document_alert_log
  ADD CONSTRAINT teacher_document_alert_log_alert_type_check
  CHECK (alert_type IN ('warning_180d', 'warning_90d', 'critical_1d', 'missing_manual', 'missing_weekly_digest'));

DROP INDEX IF EXISTS idx_teacher_document_alert_log_dedup;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_document_alert_log_dedup
  ON public.teacher_document_alert_log(teacher_id, required_document_type_id, alert_type)
  WHERE alert_type NOT IN ('missing_manual', 'missing_weekly_digest');
