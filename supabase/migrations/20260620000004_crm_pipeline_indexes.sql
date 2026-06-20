-- Index pour accélérer get_crm_pipeline (était 11s → devrait passer sous 1s)

-- Scan principal : students par org + tri stable
CREATE INDEX IF NOT EXISTS idx_students_org_created
  ON students (organization_id, created_at DESC, id DESC);

-- LATERAL JOIN enrollments : cherche l'inscription active la plus récente
CREATE INDEX IF NOT EXISTS idx_enrollments_student_status_created
  ON enrollments (student_id, status, created_at DESC);

-- EXISTS has_convocation : email_logs par email + type + org
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient_template_org
  ON email_logs (recipient, template_type, organization_id);

-- EXISTS has_contract : learner_documents par étudiant
CREATE INDEX IF NOT EXISTS idx_learner_documents_student
  ON learner_documents (student_id);

-- EXISTS has_attendance : présences par étudiant + org + statut
CREATE INDEX IF NOT EXISTS idx_attendance_student_org_status
  ON attendance (student_id, organization_id, status);

-- EXISTS has_evaluation : réponses par étudiant
CREATE INDEX IF NOT EXISTS idx_evaluation_responses_student
  ON evaluation_responses (student_id);

-- LATERAL JOIN company_employees : entreprise active par étudiant
CREATE INDEX IF NOT EXISTS idx_company_employees_student_active
  ON company_employees (student_id, is_active);
