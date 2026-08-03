-- Restreint un enseignant (role='teacher') aux sessions qui lui sont assignées
-- (via session_teachers, avec repli sur sessions.teacher_id) — les autres rôles
-- gardent l'accès org-large existant, inchangé.

DROP POLICY IF EXISTS "Users can view sessions in their organization" ON public.sessions;

CREATE POLICY "Users can view sessions in their organization"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    formation_id IN (
      SELECT id FROM public.formations
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (
        SELECT 1 FROM public.session_teachers st
        WHERE st.session_id = sessions.id AND st.teacher_id = auth.uid()
      )
      OR sessions.teacher_id = auth.uid()
    )
  );
