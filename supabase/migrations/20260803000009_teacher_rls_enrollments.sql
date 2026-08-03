-- La policy org-large "Users can view enrollments in their organization"
-- (20260417000002) rendait inopérante la policy teacher-scopée dédiée
-- (20260123000008 "Teachers can view enrollments for their assigned sessions")
-- puisque les policies RLS Postgres d'une même commande s'additionnent en OR.
-- On ajoute donc la restriction teacher directement dans la policy org-large.

DROP POLICY IF EXISTS "Users can view enrollments in their organization" ON public.enrollments;
CREATE POLICY "Users can view enrollments in their organization"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          EXISTS (
            SELECT 1 FROM public.formations f
            WHERE f.id = s.formation_id
              AND f.organization_id = public.get_user_organization_id()
          )
          OR s.organization_id = public.get_user_organization_id()::text
        )
        AND (
          (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
          OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = s.id AND st.teacher_id = auth.uid())
          OR s.teacher_id = auth.uid()
        )
    )
  );
