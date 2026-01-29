-- Migration: type de question "rating" (étoiles 0-5) pour évaluations satisfaction
-- Les questions de type rating attendent une réponse 0 à 5 étoiles.

-- 1. Autoriser le type 'rating' dans evaluation_template_questions
ALTER TABLE public.evaluation_template_questions
  DROP CONSTRAINT IF EXISTS evaluation_template_questions_question_type_check;

ALTER TABLE public.evaluation_template_questions
  ADD CONSTRAINT evaluation_template_questions_question_type_check
  CHECK (question_type IN (
    'multiple_choice', 'true_false', 'short_answer', 'essay', 'numeric', 'rating'
  ));

COMMENT ON COLUMN public.evaluation_template_questions.question_type IS 'Types: multiple_choice, true_false, short_answer, essay, numeric, rating (étoiles 0-5)';

-- 2. Colonne answer_rating dans evaluation_responses (0-5)
ALTER TABLE public.evaluation_responses
  ADD COLUMN IF NOT EXISTS answer_rating INTEGER
  CHECK (answer_rating IS NULL OR (answer_rating >= 0 AND answer_rating <= 5));

COMMENT ON COLUMN public.evaluation_responses.answer_rating IS 'Réponse étoiles 0-5 pour questions de type rating';

-- 2b. Permettre aux apprenants (anon) de mettre à jour leurs réponses (upsert)
DROP POLICY IF EXISTS "Learners can update own evaluation responses (header)" ON public.evaluation_responses;
CREATE POLICY "Learners can update own evaluation responses (header)"
  ON public.evaluation_responses
  FOR UPDATE
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
  )
  WITH CHECK (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND student_id = public.learner_student_id()
  );
GRANT UPDATE ON public.evaluation_responses TO anon;

-- 3. Corriger automatiquement les réponses de type rating (points proportionnels aux étoiles)
CREATE OR REPLACE FUNCTION public.auto_correct_evaluation_responses(p_instance_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_record RECORD;
  question_record RECORD;
  is_correct_result BOOLEAN;
  points_earned_result NUMERIC;
  corrected_count INTEGER := 0;
BEGIN
  FOR response_record IN
    SELECT * FROM public.evaluation_responses
    WHERE instance_id = p_instance_id
      AND is_correct IS NULL
  LOOP
    SELECT * INTO question_record
    FROM public.evaluation_template_questions
    WHERE id = response_record.question_id;

    IF question_record IS NULL THEN
      CONTINUE;
    END IF;

    CASE question_record.question_type
      WHEN 'multiple_choice' THEN
        SELECT
          COALESCE(
            (SELECT COUNT(*) FROM jsonb_array_elements(question_record.options) AS opt
             WHERE (opt->>'is_correct')::boolean = true
               AND opt->>'text' = ANY(response_record.answer_choice)) =
            (SELECT COUNT(*) FROM jsonb_array_elements(question_record.options) AS opt
             WHERE (opt->>'is_correct')::boolean = true)
            AND (SELECT COUNT(*) FROM jsonb_array_elements(question_record.options) AS opt
                 WHERE (opt->>'is_correct')::boolean = true) =
            array_length(response_record.answer_choice, 1),
            false
          ) INTO is_correct_result;
        IF is_correct_result THEN
          points_earned_result := question_record.points;
        ELSE
          points_earned_result := 0;
        END IF;

      WHEN 'true_false' THEN
        is_correct_result := (response_record.answer_boolean::text = question_record.correct_answer);
        points_earned_result := CASE WHEN is_correct_result THEN question_record.points ELSE 0 END;

      WHEN 'short_answer' THEN
        IF question_record.correct_answer_pattern IS NOT NULL THEN
          is_correct_result := (LOWER(TRIM(response_record.answer_text)) ~* question_record.correct_answer_pattern);
        ELSE
          is_correct_result := (LOWER(TRIM(response_record.answer_text)) = LOWER(TRIM(question_record.correct_answer)));
        END IF;
        points_earned_result := CASE WHEN is_correct_result THEN question_record.points ELSE 0 END;

      WHEN 'numeric' THEN
        is_correct_result := (response_record.answer_text::numeric = question_record.correct_answer::numeric);
        points_earned_result := CASE WHEN is_correct_result THEN question_record.points ELSE 0 END;

      WHEN 'essay' THEN
        is_correct_result := NULL;
        points_earned_result := 0;

      WHEN 'rating' THEN
        -- Réponse étoiles 0-5 : pas de bonne/mauvaise réponse, points proportionnels (5 étoiles = full points)
        is_correct_result := true;
        IF response_record.answer_rating IS NOT NULL THEN
          points_earned_result := ROUND((response_record.answer_rating::numeric / 5.0) * question_record.points, 2);
        ELSE
          points_earned_result := 0;
        END IF;

      ELSE
        is_correct_result := false;
        points_earned_result := 0;
    END CASE;

    UPDATE public.evaluation_responses
    SET
      is_correct = is_correct_result,
      points_earned = points_earned_result,
      max_points = question_record.points,
      corrected_at = NOW(),
      corrected_by = auth.uid()
    WHERE id = response_record.id;

    corrected_count := corrected_count + 1;
  END LOOP;

  RETURN corrected_count;
END;
$$;

-- 4. Mise à jour du grade : pour types satisfaction (hot, cold, manager, instructor, funder),
--    définir grade.rating = moyenne des answer_rating, et laisser score/max_score à null
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
  IF v_assessment_type IN ('hot', 'cold', 'manager', 'instructor', 'funder') THEN
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
