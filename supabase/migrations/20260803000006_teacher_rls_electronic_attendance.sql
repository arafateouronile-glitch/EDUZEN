-- Resserre l'accès des enseignants (déjà autorisés org-large depuis
-- 20260113000002_create_electronic_attendance.sql) à leurs seules sessions
-- assignées. admin/secretary conservent l'accès org-large inchangé.

-- electronic_attendance_sessions

DROP POLICY IF EXISTS "Admin and staff can view attendance sessions" ON electronic_attendance_sessions;
CREATE POLICY "Admin and staff can view attendance sessions"
  ON electronic_attendance_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.organization_id = electronic_attendance_sessions.organization_id
        AND users.role IN ('admin', 'secretary', 'teacher')
    )
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (
        SELECT 1 FROM session_teachers st
        WHERE st.session_id = electronic_attendance_sessions.session_id AND st.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = electronic_attendance_sessions.session_id AND s.teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admin and staff can create attendance sessions" ON electronic_attendance_sessions;
CREATE POLICY "Admin and staff can create attendance sessions"
  ON electronic_attendance_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.organization_id = electronic_attendance_sessions.organization_id
        AND users.role IN ('admin', 'secretary', 'teacher')
    )
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (
        SELECT 1 FROM session_teachers st
        WHERE st.session_id = electronic_attendance_sessions.session_id AND st.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = electronic_attendance_sessions.session_id AND s.teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admin and staff can update attendance sessions" ON electronic_attendance_sessions;
CREATE POLICY "Admin and staff can update attendance sessions"
  ON electronic_attendance_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.organization_id = electronic_attendance_sessions.organization_id
        AND users.role IN ('admin', 'secretary', 'teacher')
    )
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (
        SELECT 1 FROM session_teachers st
        WHERE st.session_id = electronic_attendance_sessions.session_id AND st.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM sessions s
        WHERE s.id = electronic_attendance_sessions.session_id AND s.teacher_id = auth.uid()
      )
    )
  );

-- electronic_attendance_requests (scoping via attendance_session_id -> electronic_attendance_sessions.session_id)

DROP POLICY IF EXISTS "Admin and staff can view attendance requests" ON electronic_attendance_requests;
CREATE POLICY "Admin and staff can view attendance requests"
  ON electronic_attendance_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.organization_id = electronic_attendance_requests.organization_id
        AND users.role IN ('admin', 'secretary', 'teacher')
    )
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (
        SELECT 1 FROM electronic_attendance_sessions eas
        JOIN session_teachers st ON st.session_id = eas.session_id
        WHERE eas.id = electronic_attendance_requests.attendance_session_id AND st.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM electronic_attendance_sessions eas
        JOIN sessions s ON s.id = eas.session_id
        WHERE eas.id = electronic_attendance_requests.attendance_session_id AND s.teacher_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admin and staff can create attendance requests" ON electronic_attendance_requests;
CREATE POLICY "Admin and staff can create attendance requests"
  ON electronic_attendance_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.organization_id = electronic_attendance_requests.organization_id
        AND users.role IN ('admin', 'secretary', 'teacher')
    )
    AND (
      (SELECT role FROM users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (
        SELECT 1 FROM electronic_attendance_sessions eas
        JOIN session_teachers st ON st.session_id = eas.session_id
        WHERE eas.id = electronic_attendance_requests.attendance_session_id AND st.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM electronic_attendance_sessions eas
        JOIN sessions s ON s.id = eas.session_id
        WHERE eas.id = electronic_attendance_requests.attendance_session_id AND s.teacher_id = auth.uid()
      )
    )
  );
