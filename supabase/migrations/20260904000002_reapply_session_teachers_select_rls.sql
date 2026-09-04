-- Réapplique le correctif RLS de session_teachers (20260811000002), dont
-- l'effet en base ne correspondait plus aux policies attendues : seule
-- "session_teachers_all" (admin/secretary/super_admin uniquement, FOR ALL)
-- était encore présente en prod — les policies SELECT pour le formateur
-- propriétaire et pour le reste de l'organisation avaient disparu.
--
-- Root cause identifiée le 2026-09-04 : session_teachers_select_org (20260811000002)
-- référence sessions+formations, et la policy SELECT de `sessions`
-- (20260803000004 / 20260804000001) référence en retour session_teachers
-- (EXISTS ... st.teacher_id = auth.uid()) pour autoriser un enseignant
-- secondaire (ajouté via l'onglet Intervenants, sans être sessions.teacher_id)
-- à voir sa session. Ces deux policies s'appellent mutuellement en RLS =
-- "infinite recursion detected in policy for relation" (42P17) dès qu'un
-- enseignant interroge l'une ou l'autre table. C'est très probablement pour
-- ça que session_teachers_select_own/org avaient disparu en prod (retour
-- manuel à la policy admin-only pour stopper l'erreur, jamais documenté).
--
-- Fix : un helper SECURITY DEFINER (contourne la RLS en interne, pattern déjà
-- utilisé par is_company_manager/can_access_company) casse le cycle — la
-- policy sessions n'a plus besoin de déclencher la RLS de session_teachers.

CREATE OR REPLACE FUNCTION public.is_session_teacher(p_session_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.session_teachers st
    WHERE st.session_id = p_session_id AND st.teacher_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_session_teacher(uuid, uuid) TO authenticated;

-- sessions : remplace la sous-requête directe (source de la récursion) par le helper
DROP POLICY IF EXISTS "Users can view sessions in their organization" ON public.sessions;
CREATE POLICY "Users can view sessions in their organization"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    (
      formation_id IN (
        SELECT id FROM public.formations
        WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
      OR organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR public.is_session_teacher(sessions.id, auth.uid())
      OR sessions.teacher_id = auth.uid()
    )
  );

-- session_teachers : policies SELECT pour le formateur propriétaire et le
-- reste de l'organisation (celle-ci ne référence QUE sessions/formations,
-- jamais session_teachers en retour — pas de cycle de ce côté).
ALTER TABLE public.session_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_teachers_all" ON public.session_teachers;
DROP POLICY IF EXISTS "session_teachers_select_own" ON public.session_teachers;
DROP POLICY IF EXISTS "session_teachers_select_admin" ON public.session_teachers;
DROP POLICY IF EXISTS "session_teachers_select_org" ON public.session_teachers;
DROP POLICY IF EXISTS "session_teachers_manage" ON public.session_teachers;

CREATE POLICY "session_teachers_select_own"
  ON public.session_teachers FOR SELECT
  TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "session_teachers_select_org"
  ON public.session_teachers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.formations f ON f.id = s.formation_id
      WHERE s.id = session_teachers.session_id
      AND f.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "session_teachers_manage"
  ON public.session_teachers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin', 'secretary')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('super_admin', 'admin', 'secretary')
    )
  );
