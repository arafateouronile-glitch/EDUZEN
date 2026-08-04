-- Corrige un bug RLS pré-existant sur `sessions` : les policies ne
-- reconnaissaient que les sessions rattachées à une formation (formation_id),
-- jamais les "sessions indépendantes" (formation_id = NULL, organization_id
-- renseigné directement — cf. SessionService.createIndependentSession,
-- utilisée par /dashboard/sessions/new). Résultat : la création d'une session
-- indépendante était systématiquement rejetée par RLS (403 Forbidden), quel
-- que soit le rôle de l'utilisateur — même un admin. Ce n'est pas lié aux
-- migrations enseignant précédentes (20260803000004 n'a fait que copier cette
-- même limitation en l'état sur la policy SELECT).
--
-- Même correctif déjà appliqué à `enrollments` dans
-- 20260417000002_fix_enrollments_rls_session_org.sql — on applique ici la
-- même logique aux 4 commandes de `sessions`, en conservant la restriction
-- enseignant ajoutée en SELECT par 20260803000004_teacher_rls_sessions.sql.

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
      OR EXISTS (
        SELECT 1 FROM public.session_teachers st
        WHERE st.session_id = sessions.id AND st.teacher_id = auth.uid()
      )
      OR sessions.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create sessions in their organization" ON public.sessions;
CREATE POLICY "Users can create sessions in their organization"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    formation_id IN (
      SELECT id FROM public.formations
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    OR organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update sessions in their organization" ON public.sessions;
CREATE POLICY "Users can update sessions in their organization"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING (
    formation_id IN (
      SELECT id FROM public.formations
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    OR organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    formation_id IN (
      SELECT id FROM public.formations
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    OR organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete sessions in their organization" ON public.sessions;
CREATE POLICY "Users can delete sessions in their organization"
  ON public.sessions FOR DELETE
  TO authenticated
  USING (
    formation_id IN (
      SELECT id FROM public.formations
      WHERE organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    OR organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );
