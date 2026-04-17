-- Fix RLS enrollments : les sessions sans formation_id bloquaient toutes
-- les opérations car la policy utilisait un INNER JOIN formations.
-- On accepte maintenant les sessions dont organization_id correspond directement.

-- Helper : renvoie l'organization_id de l'utilisateur courant (SECURITY DEFINER
-- pour éviter la récursion RLS sur la table users).
DROP FUNCTION IF EXISTS public.get_user_organization_id();
CREATE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- SELECT
DROP POLICY IF EXISTS "Users can view enrollments in their organization" ON public.enrollments;
CREATE POLICY "Users can view enrollments in their organization"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          -- Session rattachée à une formation de l'org
          EXISTS (
            SELECT 1 FROM public.formations f
            WHERE f.id = s.formation_id
              AND f.organization_id = public.get_user_organization_id()
          )
          OR
          -- Session directement liée à l'org (sans formation)
          s.organization_id = public.get_user_organization_id()
        )
    )
  );

-- INSERT
DROP POLICY IF EXISTS "Users can create enrollments in their organization" ON public.enrollments;
CREATE POLICY "Users can create enrollments in their organization"
  ON public.enrollments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          EXISTS (
            SELECT 1 FROM public.formations f
            WHERE f.id = s.formation_id
              AND f.organization_id = public.get_user_organization_id()
          )
          OR
          s.organization_id = public.get_user_organization_id()
        )
    )
    AND
    EXISTS (
      SELECT 1 FROM public.students st
      WHERE st.id = student_id
        AND st.organization_id = public.get_user_organization_id()
    )
  );

-- UPDATE
DROP POLICY IF EXISTS "Users can update enrollments in their organization" ON public.enrollments;
CREATE POLICY "Users can update enrollments in their organization"
  ON public.enrollments FOR UPDATE
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
          OR
          s.organization_id = public.get_user_organization_id()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          EXISTS (
            SELECT 1 FROM public.formations f
            WHERE f.id = s.formation_id
              AND f.organization_id = public.get_user_organization_id()
          )
          OR
          s.organization_id = public.get_user_organization_id()
        )
    )
  );

-- DELETE
DROP POLICY IF EXISTS "Users can delete enrollments in their organization" ON public.enrollments;
CREATE POLICY "Users can delete enrollments in their organization"
  ON public.enrollments FOR DELETE
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
          OR
          s.organization_id = public.get_user_organization_id()
        )
    )
  );
