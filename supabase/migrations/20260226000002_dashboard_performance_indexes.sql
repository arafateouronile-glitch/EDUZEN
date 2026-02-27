-- =====================================================
-- Dashboard performance indexes (admin)
-- Date: 2026-02-26
-- Objectif: accélérer les endpoints agrégés dashboard
-- =====================================================

-- KPI overview
CREATE INDEX IF NOT EXISTS idx_students_org_status_class
ON public.students(organization_id, status, class_id);

CREATE INDEX IF NOT EXISTS idx_users_org_role_active
ON public.users(organization_id, role, is_active);

CREATE INDEX IF NOT EXISTS idx_payments_org_status_paid_at
ON public.payments(organization_id, status, paid_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_org_status_created_at_when_unpaid_at
ON public.payments(organization_id, status, created_at DESC)
WHERE paid_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_attendance_org_date_status
ON public.attendance(organization_id, date, status);

CREATE INDEX IF NOT EXISTS idx_invoices_org_status_doc_type
ON public.invoices(organization_id, status, document_type);

CREATE INDEX IF NOT EXISTS idx_formations_org_is_active
ON public.formations(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_programs_org_is_active
ON public.programs(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_sessions_formation_id_id
ON public.sessions(formation_id, id);

-- Secondary data (students distribution)
CREATE INDEX IF NOT EXISTS idx_classes_org_id
ON public.classes(organization_id, id);

-- Tertiary data (recent enrollments / top programs)
CREATE INDEX IF NOT EXISTS idx_enrollments_session_created_at
ON public.enrollments(session_id, created_at DESC);

-- Documentation comments
COMMENT ON INDEX idx_students_org_status_class IS 'Dashboard: apprenants actifs par organisation et classe';
COMMENT ON INDEX idx_users_org_role_active IS 'Dashboard: comptage enseignants actifs par organisation';
COMMENT ON INDEX idx_payments_org_status_paid_at IS 'Dashboard: revenus mensuels via paid_at';
COMMENT ON INDEX idx_payments_org_status_created_at_when_unpaid_at IS 'Dashboard: fallback revenus via created_at quand paid_at est null';
COMMENT ON INDEX idx_attendance_org_date_status IS 'Dashboard: taux de présence jour J';
COMMENT ON INDEX idx_invoices_org_status_doc_type IS 'Dashboard: impayés factures (pas devis)';
COMMENT ON INDEX idx_sessions_formation_id_id IS 'Dashboard: jointure rapide formations -> sessions';
COMMENT ON INDEX idx_enrollments_session_created_at IS 'Dashboard: inscriptions récentes et volumes par session';
