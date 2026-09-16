-- Permet à un admin de programmer, par intervenant, une date/heure à partir
-- de laquelle une session (et ses séances/session_slots) devient visible
-- pour ce formateur dans son espace personnel (accueil, calendrier,
-- émargement) — onglet Intervenants d'une session, bouton "Programmer une
-- date de visibilité". Par défaut (NULL), le planning reste visible
-- immédiatement, comportement historique inchangé.

ALTER TABLE public.session_teachers
  ADD COLUMN IF NOT EXISTS visibility_date timestamptz NULL;

COMMENT ON COLUMN public.session_teachers.visibility_date IS
  'Date/heure à partir de laquelle cette session (et ses séances) devient visible pour ce formateur dans son espace personnel. NULL = visible immédiatement (comportement par défaut).';

-- Corrige is_session_teacher() pour respecter visibility_date. Le fallback
-- legacy (sessions.teacher_id) est repris DANS la fonction elle-même : il ne
-- s'applique que si AUCUNE ligne session_teachers n'existe pour ce couple
-- (session, formateur) — jamais comme échappatoire à une date programmée.
CREATE OR REPLACE FUNCTION public.is_session_teacher(p_session_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.session_teachers st
      WHERE st.session_id = p_session_id AND st.teacher_id = p_user_id
    )
    THEN EXISTS (
      SELECT 1 FROM public.session_teachers st
      WHERE st.session_id = p_session_id
        AND st.teacher_id = p_user_id
        AND (st.visibility_date IS NULL OR st.visibility_date <= now())
    )
    ELSE EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = p_session_id AND s.teacher_id = p_user_id
    )
  END;
$$;

COMMENT ON FUNCTION public.is_session_teacher(uuid, uuid) IS
  'Vrai si p_user_id est assigné (session_teachers) à p_session_id ET que sa visibility_date est NULL ou passée ; si aucune ligne session_teachers n''existe, retombe sur sessions.teacher_id (compat. sessions historiques) — jamais un contournement de visibility_date.';

-- ── sessions : retire le "OR sessions.teacher_id = auth.uid()" indépendant ──
-- Avant ce correctif, le formateur "principal" (sessions.teacher_id, tenu à
-- jour par makePrimaryMutation et par l'effet d'auto-migration legacy de
-- config-intervenants.tsx) voyait TOUJOURS sa session via cette branche,
-- même avec une visibility_date future — is_session_teacher() encapsule
-- maintenant ce même fallback légitimement ; cette branche séparée devenait
-- un contournement pur et simple de la fonctionnalité.
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
    )
  );

-- ── attendance : idem sur les 3 commandes ──
DROP POLICY IF EXISTS "Staff can view attendance in their organization" ON public.attendance;
CREATE POLICY "Staff can view attendance in their organization"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
      OR public.is_session_teacher(attendance.session_id, auth.uid())
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
    )
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- ── enrollments : deux policies concernées ──
-- 1) La policy teacher-dédiée : retire son fallback indépendant.
DROP POLICY IF EXISTS "Teachers can view enrollments for their assigned sessions" ON public.enrollments;
CREATE POLICY "Teachers can view enrollments for their assigned sessions"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (
    public.is_session_teacher(enrollments.session_id, auth.uid())
  );

-- 2) Faille RLS séparée constatée en direct sur la base le 2026-09-04 : la
--    policy org-large "Users can view enrollments in their organization" ne
--    comporte AUCUNE restriction de rôle enseignant en production, malgré
--    20260803000009_teacher_rls_enrollments.sql qui visait à l'ajouter
--    (jamais appliqué en prod, ou écrasé depuis). Sans ce correctif, un
--    enseignant voit déjà TOUTES les inscriptions de l'organisation via
--    cette policy seule, ce qui rend la policy dédiée ci-dessus — et donc
--    visibility_date — inopérante pour enrollments (RLS = policies OR'd).
--    Réappliqué ici explicitement, avec is_session_teacher().
DROP POLICY IF EXISTS "Users can view enrollments in their organization" ON public.enrollments;
CREATE POLICY "Users can view enrollments in their organization"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = enrollments.session_id
        AND (
          EXISTS (
            SELECT 1 FROM public.formations f
            WHERE f.id = s.formation_id
              AND f.organization_id::text = public.get_user_organization_id()
          )
          OR s.organization_id::text = public.get_user_organization_id()
        )
        AND (
          (SELECT role FROM public.users WHERE id = auth.uid()) <> 'teacher'
          OR public.is_session_teacher(s.id, auth.uid())
        )
    )
  );
