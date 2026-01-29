-- Inclure pre_formation dans les types satisfaction pour update_grade_from_instance_for_learner
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
  v_avg_rating NUMERIC;
  v_assessment_type TEXT;
BEGIN
  v_learner_id := public.learner_student_id();
  IF v_learner_id IS NULL THEN
    RAISE EXCEPTION 'Learner student id required';
  END IF;

  SELECT eti.grade_id, g.student_id, g.assessment_type
  INTO v_grade_id, v_student_id, v_assessment_type
  FROM public.evaluation_template_instances eti
  INNER JOIN public.grades g ON g.id = eti.grade_id
  WHERE eti.id = p_instance_id;

  IF v_grade_id IS NULL OR v_student_id != v_learner_id THEN
    RAISE EXCEPTION 'Instance not found or not owned by learner';
  END IF;

  -- Types satisfaction : pas de score, uniquement rating (moyenne des étoiles 0-5)
  IF v_assessment_type IN ('pre_formation', 'hot', 'cold', 'manager', 'instructor', 'funder') THEN
    SELECT AVG(answer_rating)::numeric INTO v_avg_rating
    FROM public.evaluation_responses
    WHERE instance_id = p_instance_id
      AND answer_rating IS NOT NULL;
    UPDATE public.grades
    SET rating = LEAST(5, GREATEST(0, COALESCE(ROUND(v_avg_rating), 0)::integer)),
        graded_at = NOW(), score = NULL, max_score = NULL
    WHERE id = v_grade_id;
    RETURN;
  END IF;

  -- Autres types : score classique
  SELECT total_score, max_score INTO v_total_score, v_max_score
  FROM public.calculate_evaluation_score(p_instance_id)
  LIMIT 1;

  UPDATE public.grades
  SET score = v_total_score, max_score = v_max_score, graded_at = NOW()
  WHERE id = v_grade_id;
END;
$$;

COMMENT ON FUNCTION public.update_grade_from_instance_for_learner(UUID) IS
  'Met à jour le grade après soumission : pour satisfaction (pre_formation, hot, cold, manager, instructor, funder) calcule rating = moyenne des answer_rating ; sinon score classique.';
