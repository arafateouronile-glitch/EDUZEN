-- Migration: Ajout des index manquants pour améliorer les performances
-- Date: 2024-12-27
-- Description: Cette migration ajoute des index sur les colonnes fréquemment requêtées

-- ========== MESSAGES ==========
-- Index pour les requêtes par conversation_id (très fréquent)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON public.messages(conversation_id) 
WHERE is_deleted = false;

-- Index pour les requêtes par sender_id
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON public.messages(sender_id) 
WHERE sender_id IS NOT NULL;

-- Index pour le tri par date de création
CREATE INDEX IF NOT EXISTS idx_messages_created_at_desc 
ON public.messages(created_at DESC);

-- Index composite pour les requêtes de messages d'une conversation triés par date
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC) 
WHERE is_deleted = false;

-- ========== CONVERSATION_PARTICIPANTS ==========
-- Index pour les requêtes par user_id
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
ON public.conversation_participants(user_id) 
WHERE user_id IS NOT NULL;

-- Index pour les requêtes par student_id
CREATE INDEX IF NOT EXISTS idx_conversation_participants_student_id 
ON public.conversation_participants(student_id) 
WHERE student_id IS NOT NULL;

-- Index composite pour trouver les conversations d'un participant
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_conv 
ON public.conversation_participants(user_id, conversation_id);

-- ========== CONVERSATIONS ==========
-- Index pour les requêtes par organization_id
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id 
ON public.conversations(organization_id) 
WHERE is_archived = false;

-- Index pour le tri par dernier message
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at 
ON public.conversations(last_message_at DESC NULLS LAST);

-- Index composite pour les conversations d'une organisation triées
CREATE INDEX IF NOT EXISTS idx_conversations_org_last_msg 
ON public.conversations(organization_id, last_message_at DESC NULLS LAST) 
WHERE is_archived = false;

-- ========== STUDENTS ==========
-- Index pour les requêtes par organization_id
CREATE INDEX IF NOT EXISTS idx_students_organization_id 
ON public.students(organization_id);

-- Index pour les requêtes par email (login)
CREATE INDEX IF NOT EXISTS idx_students_email 
ON public.students(email) 
WHERE email IS NOT NULL;

-- Index pour les requêtes par student_number
CREATE INDEX IF NOT EXISTS idx_students_student_number 
ON public.students(student_number) 
WHERE student_number IS NOT NULL;

-- ========== ENROLLMENTS ==========
-- Index pour les requêtes par session_id
CREATE INDEX IF NOT EXISTS idx_enrollments_session_id 
ON public.enrollments(session_id);

-- Index pour les requêtes par student_id
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id 
ON public.enrollments(student_id);

-- Index composite pour les inscriptions d'une session
CREATE INDEX IF NOT EXISTS idx_enrollments_session_status 
ON public.enrollments(session_id, status) 
WHERE status NOT IN ('cancelled', 'rejected', 'dropped');

-- ========== ATTENDANCE ==========
-- Index pour les requêtes par session_id
CREATE INDEX IF NOT EXISTS idx_attendance_session_id 
ON public.attendance(session_id);

-- Index pour les requêtes par student_id
CREATE INDEX IF NOT EXISTS idx_attendance_student_id 
ON public.attendance(student_id);

-- Index pour les requêtes par date
CREATE INDEX IF NOT EXISTS idx_attendance_date 
ON public.attendance(date);

-- Index composite pour les présences d'une session à une date
CREATE INDEX IF NOT EXISTS idx_attendance_session_date 
ON public.attendance(session_id, date);

-- ========== GRADES ==========
-- Index pour les requêtes par student_id
CREATE INDEX IF NOT EXISTS idx_grades_student_id 
ON public.grades(student_id);

-- Index pour les requêtes par session_id
CREATE INDEX IF NOT EXISTS idx_grades_session_id 
ON public.grades(session_id);

-- Index composite pour les notes d'un étudiant dans une session
CREATE INDEX IF NOT EXISTS idx_grades_student_session 
ON public.grades(student_id, session_id);

-- ========== SESSIONS ==========
-- Index pour les requêtes par organization_id
CREATE INDEX IF NOT EXISTS idx_sessions_organization_id 
ON public.sessions(organization_id);

-- Index pour les requêtes par formation_id
CREATE INDEX IF NOT EXISTS idx_sessions_formation_id 
ON public.sessions(formation_id);

-- Index pour le tri par date de début
CREATE INDEX IF NOT EXISTS idx_sessions_start_date 
ON public.sessions(start_date DESC);

-- ========== INVOICES ==========
-- Index pour les requêtes par organization_id
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id 
ON public.invoices(organization_id);

-- Index pour les requêtes par student_id
CREATE INDEX IF NOT EXISTS idx_invoices_student_id 
ON public.invoices(student_id);

-- Index pour les requêtes par status
CREATE INDEX IF NOT EXISTS idx_invoices_status 
ON public.invoices(status);

-- ========== PAYMENTS ==========
-- Index pour les requêtes par invoice_id
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id 
ON public.payments(invoice_id);

-- Index pour les requêtes par date
CREATE INDEX IF NOT EXISTS idx_payments_payment_date 
ON public.payments(payment_date DESC);

-- ========== USERS ==========
-- Index pour les requêtes par organization_id
CREATE INDEX IF NOT EXISTS idx_users_organization_id 
ON public.users(organization_id);

-- Index pour les requêtes par email
CREATE INDEX IF NOT EXISTS idx_users_email 
ON public.users(email);

-- ========== DOCUMENTS ==========
-- Index pour les requêtes par organization_id
CREATE INDEX IF NOT EXISTS idx_documents_organization_id 
ON public.documents(organization_id);

-- Index pour les requêtes par student_id
CREATE INDEX IF NOT EXISTS idx_documents_student_id 
ON public.documents(student_id) 
WHERE student_id IS NOT NULL;

-- Index pour les requêtes par type
CREATE INDEX IF NOT EXISTS idx_documents_type 
ON public.documents(type);

-- ========== EVALUATION_TEMPLATES ==========
-- Index pour les requêtes par organization_id (y compris NULL pour system templates)
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_organization_id 
ON public.evaluation_templates(organization_id);

-- ========== EVALUATION_TEMPLATE_QUESTIONS ==========
-- Index pour les requêtes par template_id
CREATE INDEX IF NOT EXISTS idx_evaluation_template_questions_template_id 
ON public.evaluation_template_questions(template_id);

-- ========== SESSION_CHARGES ==========
-- Index pour les requêtes par session_id
CREATE INDEX IF NOT EXISTS idx_session_charges_session_id 
ON public.session_charges(session_id);

-- ========== SESSION_SLOTS ==========
-- Index pour les requêtes par session_id
CREATE INDEX IF NOT EXISTS idx_session_slots_session_id 
ON public.session_slots(session_id);

-- Index pour les requêtes par date
CREATE INDEX IF NOT EXISTS idx_session_slots_date 
ON public.session_slots(date);

-- Commentaire
COMMENT ON INDEX idx_messages_conversation_created IS 
  'Index composite pour améliorer les performances des requêtes de messages dans une conversation';

COMMENT ON INDEX idx_conversations_org_last_msg IS 
  'Index composite pour améliorer les performances de la liste des conversations';

COMMENT ON INDEX idx_enrollments_session_status IS 
  'Index partiel pour les inscriptions actives d''une session';

