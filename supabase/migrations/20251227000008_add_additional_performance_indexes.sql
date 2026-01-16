-- Migration: Ajout d'index supplémentaires pour optimiser les requêtes fréquentes
-- Date: 2024-12-27
-- Description: Cette migration ajoute des index sur les colonnes utilisées dans les requêtes complexes

-- ========== ENROLLMENTS ==========
-- Index pour les requêtes par session_id (très fréquent dans le dashboard)
CREATE INDEX IF NOT EXISTS idx_enrollments_session_id 
ON public.enrollments(session_id);

-- Index composite pour les requêtes par session et statut
CREATE INDEX IF NOT EXISTS idx_enrollments_session_status 
ON public.enrollments(session_id, status);

-- Index pour les requêtes par student_id
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id 
ON public.enrollments(student_id);

-- ========== SESSIONS ==========
-- Index pour les requêtes par formation_id avec tri par date
CREATE INDEX IF NOT EXISTS idx_sessions_formation_date 
ON public.sessions(formation_id, start_date DESC);

-- Index pour les requêtes par statut
CREATE INDEX IF NOT EXISTS idx_sessions_status 
ON public.sessions(status) 
WHERE status = 'active';

-- ========== SESSION_TEACHERS ==========
-- Index composite pour trouver les sessions d'un enseignant
CREATE INDEX IF NOT EXISTS idx_session_teachers_teacher_session 
ON public.session_teachers(teacher_id, session_id);

-- Index pour les requêtes par session_id
CREATE INDEX IF NOT EXISTS idx_session_teachers_session_id 
ON public.session_teachers(session_id);

-- ========== ATTENDANCE ==========
-- Index composite pour les requêtes par session et date
CREATE INDEX IF NOT EXISTS idx_attendance_session_date 
ON public.attendance(session_id, date DESC);

-- Index composite pour les requêtes par student et date
CREATE INDEX IF NOT EXISTS idx_attendance_student_date 
ON public.attendance(student_id, date DESC);

-- Index pour les requêtes par statut
CREATE INDEX IF NOT EXISTS idx_attendance_status 
ON public.attendance(status);

-- ========== INVOICES ==========
-- Index composite pour les requêtes par student et statut
CREATE INDEX IF NOT EXISTS idx_invoices_student_status 
ON public.invoices(student_id, status);

-- Index pour les requêtes par date d'échéance (pour les paiements en retard)
CREATE INDEX IF NOT EXISTS idx_invoices_due_date 
ON public.invoices(due_date) 
WHERE status IN ('sent', 'partial', 'overdue');

-- Index pour les requêtes par organization_id et statut
CREATE INDEX IF NOT EXISTS idx_invoices_org_status 
ON public.invoices(organization_id, status);

-- ========== PAYMENTS ==========
-- Index pour les requêtes par invoice_id
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id 
ON public.payments(invoice_id);

-- Index pour les requêtes par date de paiement
CREATE INDEX IF NOT EXISTS idx_payments_paid_at 
ON public.payments(paid_at DESC);

-- ========== GRADES ==========
-- Index composite pour les requêtes par student et session
CREATE INDEX IF NOT EXISTS idx_grades_student_session 
ON public.grades(student_id, session_id);

-- Index pour les requêtes par evaluation_template_instance_id
CREATE INDEX IF NOT EXISTS idx_grades_evaluation_instance 
ON public.grades(evaluation_template_instance_id);

-- ========== NOTIFICATIONS ==========
-- Index composite pour les requêtes par user_id et read_at (déjà optimisé mais on s'assure)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON public.notifications(user_id, read_at NULLS FIRST, created_at DESC);

-- Index pour les requêtes par type
CREATE INDEX IF NOT EXISTS idx_notifications_type 
ON public.notifications(type);

-- ========== DOCUMENTS ==========
-- Index pour les requêtes par student_id
CREATE INDEX IF NOT EXISTS idx_documents_student_id 
ON public.documents(student_id);

-- Index pour les requêtes par type
CREATE INDEX IF NOT EXISTS idx_documents_type 
ON public.documents(type);

-- Index composite pour les requêtes par organization et type
CREATE INDEX IF NOT EXISTS idx_documents_org_type 
ON public.documents(organization_id, type);

-- ========== EVALUATION_TEMPLATES ==========
-- Index pour les requêtes par organization_id
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_org 
ON public.evaluation_templates(organization_id);

-- Index pour les requêtes par statut
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_status 
ON public.evaluation_templates(status);

-- ========== FORMATIONS ==========
-- Index pour les requêtes par program_id
CREATE INDEX IF NOT EXISTS idx_formations_program_id 
ON public.formations(program_id);

-- Index composite pour les requêtes par organization et program
CREATE INDEX IF NOT EXISTS idx_formations_org_program 
ON public.formations(organization_id, program_id);

-- ========== PROGRAMS ==========
-- Index pour les requêtes par organization_id
CREATE INDEX IF NOT EXISTS idx_programs_organization_id 
ON public.programs(organization_id);

-- ========== SESSION_SLOTS ==========
-- Index pour les requêtes par session_id
CREATE INDEX IF NOT EXISTS idx_session_slots_session_id 
ON public.session_slots(session_id);

-- Index composite pour les requêtes par session et date
CREATE INDEX IF NOT EXISTS idx_session_slots_session_date 
ON public.session_slots(session_id, start_time);

-- ========== SESSION_CHARGES ==========
-- Index pour les requêtes par session_id
CREATE INDEX IF NOT EXISTS idx_session_charges_session_id 
ON public.session_charges(session_id);

-- Index pour les requêtes par category_id
CREATE INDEX IF NOT EXISTS idx_session_charges_category_id 
ON public.session_charges(category_id);

-- ========== EXPORT_HISTORY ==========
-- Index pour les requêtes par organization_id et date
CREATE INDEX IF NOT EXISTS idx_export_history_org_date 
ON public.export_history(organization_id, created_at DESC);

-- Index pour les requêtes par user_id
CREATE INDEX IF NOT EXISTS idx_export_history_user_id 
ON public.export_history(user_id);

-- ========== USER_FEEDBACK ==========
-- Index pour les requêtes par organization_id et statut
CREATE INDEX IF NOT EXISTS idx_user_feedback_org_status 
ON public.user_feedback(organization_id, status);

-- Index pour les requêtes par created_by_user_id
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_by 
ON public.user_feedback(created_by_user_id);

-- Commentaires
COMMENT ON INDEX idx_enrollments_session_id IS 'Optimise les requêtes de dashboard qui listent les inscriptions par session';
COMMENT ON INDEX idx_sessions_formation_date IS 'Optimise les requêtes qui listent les sessions d''une formation triées par date';
COMMENT ON INDEX idx_attendance_session_date IS 'Optimise les requêtes de présence par session et date';
COMMENT ON INDEX idx_invoices_student_status IS 'Optimise les requêtes de factures impayées par étudiant';
COMMENT ON INDEX idx_notifications_user_read IS 'Optimise les requêtes de notifications non lues par utilisateur';



