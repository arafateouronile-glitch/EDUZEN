-- Permettre les demandes d'émargement pour les formateurs (qui ne sont pas dans la table students)
-- student_id devient nullable, user_id référence users pour les formateurs

ALTER TABLE electronic_attendance_requests
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE electronic_attendance_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE electronic_attendance_requests
  ADD COLUMN IF NOT EXISTS requester_role text NOT NULL DEFAULT 'student'
    CHECK (requester_role IN ('student', 'trainer'));

-- Index pour filtrer par rôle
CREATE INDEX IF NOT EXISTS idx_ear_requester_role
  ON electronic_attendance_requests(attendance_session_id, requester_role);

-- Vérifier qu'on a soit student_id soit user_id
ALTER TABLE electronic_attendance_requests
  ADD CONSTRAINT ear_student_or_user_required
    CHECK (student_id IS NOT NULL OR user_id IS NOT NULL);
