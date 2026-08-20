-- Corrige une fuite de données inter-organismes : la policy RLS "Parents and
-- students can view their documents" sur documents autorisait la lecture de
-- TOUTE ligne avec student_id IS NULL (conventions formateur, ordres de
-- mission...), sans restriction d'organisme ni de rôle. Résultat : n'importe
-- quel apprenant (même d'un autre organisme, via le header learner anonyme)
-- pouvait voir ces documents. Les documents sans student_id ne sont pas des
-- documents apprenant : ils ne doivent jamais être exposés par cette policy.

DROP POLICY IF EXISTS "Parents and students can view their documents" ON public.documents;

CREATE POLICY "Parents and students can view their documents"
  ON public.documents FOR SELECT
  USING (
    (student_id IN (
      SELECT sg.student_id
      FROM student_guardians sg
      JOIN guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
    ))
    OR (student_id = auth.uid())
  );
