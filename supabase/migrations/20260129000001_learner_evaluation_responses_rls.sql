-- Migration: permettre aux apprenants (anon + x-learner-student-id) de lire et d'insérer leurs réponses d'évaluation
-- Date: 2026-01-29

-- SELECT : voir ses propres réponses pour les instances liées à ses grades
DROP POLICY IF EXISTS "Learners can view own evaluation responses (header)" ON public.evaluation_responses;
CREATE POLICY "Learners can view own evaluation responses (header)"
  ON public.evaluation_responses
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND student_id = public.learner_student_id()
    AND EXISTS (
      SELECT 1
      FROM public.evaluation_template_instances eti
      INNER JOIN public.grades g ON g.id = eti.grade_id
      WHERE eti.id = evaluation_responses.instance_id
        AND g.student_id = public.learner_student_id()
    )
  );

-- INSERT : insérer ses réponses uniquement pour les instances liées à ses grades
DROP POLICY IF EXISTS "Learners can insert own evaluation responses (header)" ON public.evaluation_responses;
CREATE POLICY "Learners can insert own evaluation responses (header)"
  ON public.evaluation_responses
  FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND student_id = public.learner_student_id()
    AND EXISTS (
      SELECT 1
      FROM public.evaluation_template_instances eti
      INNER JOIN public.grades g ON g.id = eti.grade_id
      WHERE eti.id = evaluation_responses.instance_id
        AND g.student_id = public.learner_student_id()
    )
  );

COMMENT ON POLICY "Learners can view own evaluation responses (header)" ON public.evaluation_responses IS
  'Permet aux apprenants de voir leurs réponses aux évaluations via le header x-learner-student-id.';
COMMENT ON POLICY "Learners can insert own evaluation responses (header)" ON public.evaluation_responses IS
  'Permet aux apprenants d''enregistrer leurs réponses aux évaluations via le header x-learner-student-id.';

-- Permettre au rôle anon d'utiliser les politiques ci-dessus
GRANT SELECT, INSERT ON public.evaluation_responses TO anon;

-- RPC : après correction, mettre à jour la note du grade (uniquement si le grade appartient à l'apprenant)
CREATE OR REPLACE FUNCTION public.update_grade_from_instance_for_learner(p_instance_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grade_id UUID;
  v_student_id UUID;
  v_learner_id UUID;
  v_total_score NUMERIC;
  v_max_score NUMERIC;
BEGIN
  v_learner_id := public.learner_student_id();
  IF v_learner_id IS NULL THEN
    RAISE EXCEPTION 'Learner student id required';
  END IF;

  SELECT eti.grade_id, g.student_id INTO v_grade_id, v_student_id
  FROM public.evaluation_template_instances eti
  INNER JOIN public.grades g ON g.id = eti.grade_id
  WHERE eti.id = p_instance_id;

  IF v_grade_id IS NULL OR v_student_id != v_learner_id THEN
    RAISE EXCEPTION 'Instance not found or not owned by learner';
  END IF;

  SELECT total_score, max_score INTO v_total_score, v_max_score
  FROM public.calculate_evaluation_score(p_instance_id)
  LIMIT 1;

  UPDATE public.grades
  SET score = v_total_score, max_score = v_max_score, graded_at = NOW()
  WHERE id = v_grade_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_grade_from_instance_for_learner(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.auto_correct_evaluation_responses(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.calculate_evaluation_score(UUID) TO anon;
