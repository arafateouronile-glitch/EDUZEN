-- Restreint un enseignant aux notes (grades) de ses sessions assignées.
-- admin/secretary/accountant conservent l'accès org-large existant.

DROP POLICY IF EXISTS "Users can view grades in their organization" ON public.grades;
CREATE POLICY "Users can view grades in their organization"
  ON public.grades
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = grades.session_id AND st.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = grades.session_id AND s.teacher_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create grades in their organization" ON public.grades;
CREATE POLICY "Users can create grades in their organization"
  ON public.grades
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = grades.session_id AND st.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = grades.session_id AND s.teacher_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update grades in their organization" ON public.grades;
CREATE POLICY "Users can update grades in their organization"
  ON public.grades
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = grades.session_id AND st.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = grades.session_id AND s.teacher_id = auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = grades.session_id AND st.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = grades.session_id AND s.teacher_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete grades in their organization" ON public.grades;
CREATE POLICY "Users can delete grades in their organization"
  ON public.grades
  FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = grades.session_id AND st.teacher_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = grades.session_id AND s.teacher_id = auth.uid())
    )
  );
