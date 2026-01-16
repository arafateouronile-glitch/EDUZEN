-- Autoriser le rôle 'secretary' à gérer les cours e-learning au même titre que admin/super_admin

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage courses in their organization" ON public.courses;
CREATE POLICY "Admins can manage courses in their organization"
  ON public.courses
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'secretary')
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'secretary')
  );






