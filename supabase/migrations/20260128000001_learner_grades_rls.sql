-- Migration pour permettre aux learners d'accéder à leurs propres grades via le header x-learner-student-id
-- Date: 2026-01-28
-- Description: Ajoute une politique RLS pour permettre aux apprenants d'accéder à leurs évaluations dans l'espace personnel

-- S'assurer que RLS est activé
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Supprimer la politique existante si elle existe
DROP POLICY IF EXISTS "Learners can view their own grades (header)" ON public.grades;

-- Créer la politique pour permettre aux learners de voir leurs propres grades
CREATE POLICY "Learners can view their own grades (header)"
  ON public.grades
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND grades.student_id = public.learner_student_id()
  );

-- Commentaire pour documentation
COMMENT ON POLICY "Learners can view their own grades (header)" ON public.grades IS
  'Permet aux apprenants d''accéder à leurs propres évaluations via le header x-learner-student-id. Utilise la fonction learner_student_id() pour récupérer le student_id depuis le header HTTP.';
