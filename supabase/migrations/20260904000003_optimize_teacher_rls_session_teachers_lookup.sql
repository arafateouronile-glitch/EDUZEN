-- Optimisation suite au fix RLS de session_teachers (20260904000002).
--
-- Avant ce fix, la seule policy active sur session_teachers était
-- admin-only : toute sous-requête `EXISTS (SELECT 1 FROM session_teachers
-- st WHERE st.teacher_id = auth.uid())` évaluée pour un enseignant
-- retournait FALSE immédiatement (RLS filtrait déjà tout), donc "gratuite"
-- en pratique. Depuis le fix, ces sous-requêtes déclenchent réellement
-- l'évaluation RLS de session_teachers (3 policies combinées en OR, dont
-- une qui re-référence sessions+formations) — un coût RLS imbriqué qui
-- n'existait pas avant, par ligne, pour chaque politique qui teste
-- l'appartenance d'un enseignant à une session via session_teachers.
--
-- Constaté en conditions réelles : timeouts (57014, statement_timeout=8s
-- pour le rôle authenticated) sur des requêtes enrollments filtrées par
-- session_id pour un enseignant, juste après le fix.
--
-- Remplace ces sous-requêtes par is_session_teacher() (SECURITY DEFINER,
-- contourne la RLS en interne, lookup direct sur l'index unique
-- session_teachers(session_id, teacher_id)) — même optimisation déjà
-- appliquée à la policy SELECT de `sessions`.

-- attendance : SELECT / INSERT / UPDATE
DROP POLICY IF EXISTS "Staff can view attendance in their organization" ON public.attendance;
CREATE POLICY "Staff can view attendance in their organization"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR public.is_session_teacher(attendance.session_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = attendance.session_id AND s.teacher_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can create attendance in their organization" ON public.attendance;
CREATE POLICY "Staff can create attendance in their organization"
  ON public.attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR public.is_session_teacher(attendance.session_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = attendance.session_id AND s.teacher_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can update attendance in their organization" ON public.attendance;
CREATE POLICY "Staff can update attendance in their organization"
  ON public.attendance FOR UPDATE
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR public.is_session_teacher(attendance.session_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = attendance.session_id AND s.teacher_id = auth.uid())
    )
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- enrollments : SELECT (policy dédiée enseignant, combinée en OR avec
-- "Users can view enrollments in their organization" — celle-ci non modifiée)
DROP POLICY IF EXISTS "Teachers can view enrollments for their assigned sessions" ON public.enrollments;
CREATE POLICY "Teachers can view enrollments for their assigned sessions"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (
    public.is_session_teacher(enrollments.session_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = enrollments.session_id AND s.teacher_id = auth.uid())
  );
