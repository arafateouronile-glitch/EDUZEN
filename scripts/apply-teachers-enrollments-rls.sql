-- Script pour appliquer manuellement la politique RLS pour les enseignants
-- À exécuter dans le SQL Editor de Supabase si la migration n'a pas été appliquée automatiquement

-- Vérifier si la politique existe déjà
SELECT 
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'enrollments'
  AND policyname = 'Teachers can view enrollments for their assigned sessions';

-- Si la politique n'existe pas, l'ajouter
-- (Le DROP POLICY IF EXISTS dans la migration devrait gérer cela, mais on peut le faire manuellement)

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

-- Vérifier que la politique a été créée
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'enrollments'
  AND policyname = 'Teachers can view enrollments for their assigned sessions';
