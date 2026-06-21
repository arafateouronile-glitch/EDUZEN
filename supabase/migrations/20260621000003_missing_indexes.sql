-- Indexes sur les chemins de requêtes chauds identifiés lors de l'audit de performance

-- grades : filtre par session + assessment_type (pré-chargement bulk sync-evidence)
CREATE INDEX IF NOT EXISTS idx_grades_session_id_assessment_type
  ON grades (session_id, assessment_type);

-- attendance : filtre par session_id + status (calcul taux d'engagement)
CREATE INDEX IF NOT EXISTS idx_attendance_session_id_status
  ON attendance (session_id, status);

-- qualiopi_indicators : update par org + indicator_code (32 updates par sync)
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_org_code
  ON qualiopi_indicators (organization_id, indicator_code);

-- signature_requests : filtre par document_id (vérification conventions signées)
CREATE INDEX IF NOT EXISTS idx_signature_requests_document_id
  ON signature_requests (document_id);

-- enrollments : filtre par session_id + status (queries dashboard N+1)
CREATE INDEX IF NOT EXISTS idx_enrollments_session_id_status
  ON enrollments (session_id, status);
