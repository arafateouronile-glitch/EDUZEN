-- Autoriser super_admin/admin/secretary à voir + gérer les leçons de toutes les séquences de leur organisation
-- Sans ça, seuls les "instructors" (instructor_id = auth.uid()) peuvent modifier les leçons.

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Policy de lecture pour le staff sur toutes les leçons de l'organisation
DROP POLICY IF EXISTS "Staff can view lessons in their organization" ON public.lessons;
CREATE POLICY "Staff can view lessons in their organization"
  ON public.lessons
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'secretary')
  );

-- Policy de gestion (insert/update/delete) pour le staff
DROP POLICY IF EXISTS "Staff can manage lessons in their organization" ON public.lessons;
CREATE POLICY "Staff can manage lessons in their organization"
  ON public.lessons
  FOR ALL
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'secretary')
  )
  WITH CHECK (
    course_id IN (
      SELECT id FROM public.courses
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'secretary')
  );






