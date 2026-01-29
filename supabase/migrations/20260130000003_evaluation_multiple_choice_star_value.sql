-- Migration: Choix multiples satisfaction → star_value (0-5) et moyenne
-- Pour les questions à choix multiples dont les options ont "star_value",
-- on enregistre answer_rating = star_value de l'option choisie et on inclut
-- ces réponses dans la moyenne de satisfaction (grade.rating).

-- 1. Mise à jour de auto_correct_evaluation_responses : pour multiple_choice avec options.star_value,
--    extraire le star_value de l'option choisie, définir answer_rating et points proportionnels.
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
  v_new_rating INTEGER := NULL;
  v_chosen_text TEXT;
  v_star_value INTEGER;
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

    v_new_rating := NULL;

    CASE question_record.question_type
      WHEN 'multiple_choice' THEN
        -- Option choisie (premier élément pour choix unique)
        v_chosen_text := NULL;
        IF response_record.answer_choice IS NOT NULL AND array_length(response_record.answer_choice, 1) > 0 THEN
          v_chosen_text := response_record.answer_choice[1];
        END IF;

        -- Si les options ont star_value (satisfaction), utiliser star_value pour answer_rating et points
        SELECT (opt->>'star_value')::INTEGER INTO v_star_value
        FROM jsonb_array_elements(COALESCE(question_record.options, '[]'::jsonb)) AS opt
        WHERE (opt->>'text') IS NOT NULL AND TRIM(opt->>'text') = TRIM(COALESCE(v_chosen_text, ''))
        LIMIT 1;

        IF v_star_value IS NOT NULL AND v_star_value >= 0 AND v_star_value <= 5 THEN
          is_correct_result := true;
          points_earned_result := ROUND((v_star_value::numeric / 5.0) * question_record.points, 2);
          v_new_rating := v_star_value;
        ELSE
          -- Comportement classique : vérifier is_correct
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
        is_correct_result := true;
        IF response_record.answer_rating IS NOT NULL THEN
          points_earned_result := ROUND((response_record.answer_rating::numeric / 5.0) * question_record.points, 2);
          v_new_rating := response_record.answer_rating;
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
      corrected_by = auth.uid(),
      answer_rating = COALESCE(v_new_rating, answer_rating)
    WHERE id = response_record.id;

    corrected_count := corrected_count + 1;
  END LOOP;

  RETURN corrected_count;
END;
$$;

COMMENT ON FUNCTION public.auto_correct_evaluation_responses(UUID) IS
  'Corrige les réponses : pour multiple_choice avec options.star_value, remplit answer_rating et points proportionnels ; pour rating utilise answer_rating. La moyenne satisfaction (grade.rating) inclut tous les answer_rating.';
