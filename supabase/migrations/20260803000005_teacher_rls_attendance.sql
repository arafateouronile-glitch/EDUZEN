-- La table `attendance` a RLS activée depuis 20251217000018 mais aucune policy
-- "authenticated" n'est trackée dans les migrations (seule une policy apprenant
-- anonyme existe) — soit une policy équivalente a été créée hors dépôt, soit le
-- personnel n'a en réalité aucun accès garanti par une règle versionnée. On
-- retrouve dynamiquement toute policy authenticated existante sur cette table
-- (quel que soit son nom) avant de créer la version définitive ci-dessous, pour
-- ne pas laisser de policy dupliquée/orpheline.

DO $$
DECLARE
  existing_pol record;
BEGIN
  FOR existing_pol IN
    SELECT pol.polname
    FROM pg_policy pol
    JOIN pg_class rel ON rel.oid = pol.polrelid
    WHERE rel.relname = 'attendance'
      AND pol.polname <> 'Learners can view their own attendance (header)'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.attendance', existing_pol.polname);
  END LOOP;
END $$;

CREATE POLICY "Staff can view attendance in their organization"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (
        SELECT 1 FROM public.session_teachers st
        WHERE st.session_id = attendance.session_id AND st.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = attendance.session_id AND s.teacher_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can create attendance in their organization"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (
        SELECT 1 FROM public.session_teachers st
        WHERE st.session_id = attendance.session_id AND st.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = attendance.session_id AND s.teacher_id = auth.uid()
      )
    )
  );

CREATE POLICY "Staff can update attendance in their organization"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR EXISTS (
        SELECT 1 FROM public.session_teachers st
        WHERE st.session_id = attendance.session_id AND st.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = attendance.session_id AND s.teacher_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.attendance TO authenticated;
