-- Migration pour permettre aux enseignants de voir les enrollments des sessions où ils sont assignés
-- Cette politique complète la politique existante basée sur l'organisation

-- Ajouter une politique pour les enseignants assignés aux sessions
-- Cette politique permet aux enseignants de voir les enrollments des sessions
-- où ils sont assignés (via session_teachers ou sessions.teacher_id)

DROP POLICY IF EXISTS "Teachers can view enrollments for their assigned sessions" ON public.enrollments;

CREATE POLICY "Teachers can view enrollments for their assigned sessions"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (
    -- Vérifier si l'utilisateur est assigné à la session via session_teachers
    EXISTS (
      SELECT 1
      FROM public.session_teachers st
      WHERE st.session_id = enrollments.session_id
        AND st.teacher_id = auth.uid()
    )
    OR
    -- Fallback : vérifier si l'utilisateur est le teacher_id de la session
    EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = enrollments.session_id
        AND s.teacher_id = auth.uid()
    )
  );

-- Commentaire pour documenter
COMMENT ON POLICY "Teachers can view enrollments for their assigned sessions" ON public.enrollments IS 
  'Permet aux enseignants de voir les enrollments des sessions où ils sont assignés (via session_teachers ou sessions.teacher_id)';
