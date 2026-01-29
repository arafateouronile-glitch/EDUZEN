-- Migration: Fallback étoiles par libellé (satisfaction) + reprendre les réponses sans answer_rating
-- 1) Si l'option n'a pas star_value, mapper le texte choisi : Excellent->5, Très bon->4, Bon->3, Moyen->1, Insuffisant->0
-- 2) Traiter aussi les réponses déjà corrigées mais sans answer_rating (backfill)

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
  v_normalized TEXT;
  corrected_count INTEGER := 0;
BEGIN
  -- Traiter les réponses non corrigées OU sans answer_rating (backfill satisfaction)
  FOR response_record IN
    SELECT * FROM public.evaluation_responses
    WHERE instance_id = p_instance_id
      AND (is_correct IS NULL OR answer_rating IS NULL)
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
        v_chosen_text := NULL;
        IF response_record.answer_choice IS NOT NULL AND array_length(response_record.answer_choice, 1) > 0 THEN
          v_chosen_text := response_record.answer_choice[1];
        END IF;

        -- 1) star_value explicite dans l'option
        SELECT (opt->>'star_value')::INTEGER INTO v_star_value
        FROM jsonb_array_elements(COALESCE(question_record.options, '[]'::jsonb)) AS opt
        WHERE (opt->>'text') IS NOT NULL AND TRIM(opt->>'text') = TRIM(COALESCE(v_chosen_text, ''))
        LIMIT 1;

        -- 2) Fallback : mapper libellés de satisfaction (sans accent pour comparaison)
        IF (v_star_value IS NULL OR v_star_value < 0 OR v_star_value > 5) AND v_chosen_text IS NOT NULL AND TRIM(v_chosen_text) <> '' THEN
          v_normalized := LOWER(TRIM(v_chosen_text));
          v_normalized := TRANSLATE(v_normalized, 'àâäéèêëïîôùûüç', 'aaaeeeeiioouuc');
          v_star_value := CASE
            WHEN v_normalized IN ('excellent', 'tres bien', 'très bien', 'oui', 'oui, tout a fait', 'oui tout a fait', 'tout a fait', 'beaucoup', 'toujours') THEN 5
            WHEN v_normalized IN ('tres bon', 'très bon', 'plutot oui', 'plutôt oui') THEN 4
            WHEN v_normalized IN ('bon', 'parfois', 'moyennement', 'un peu') THEN 3
            WHEN v_normalized IN ('moyen', 'plutot non', 'plutôt non', 'rarement') THEN 1
            WHEN v_normalized IN ('insuffisant', 'non', 'non pas du tout', 'pas du tout', 'jamais', 'aucun') THEN 0
            ELSE NULL
          END;
        END IF;

        IF v_star_value IS NOT NULL AND v_star_value >= 0 AND v_star_value <= 5 THEN
          is_correct_result := true;
          points_earned_result := ROUND((v_star_value::numeric / 5.0) * question_record.points, 2);
          v_new_rating := v_star_value;
        ELSE
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
  'Corrige les réponses ; pour choix multiples satisfaction : star_value option ou fallback libellé (Excellent->5, Moyen->1, etc.). Traite aussi les réponses sans answer_rating (backfill).';

-- Backfill : recalculer answer_rating pour toutes les instances satisfaction (réponses sans answer_rating)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT eti.id AS instance_id
    FROM public.evaluation_template_instances eti
    INNER JOIN public.grades g ON g.id = eti.grade_id
    WHERE g.assessment_type IN ('hot', 'cold', 'manager', 'instructor', 'funder')
  LOOP
    PERFORM public.auto_correct_evaluation_responses(r.instance_id);
  END LOOP;
END;
$$;

-- Mise à jour des grades satisfaction : recalculer rating à partir des answer_rating (backfill)
UPDATE public.grades g
SET
  rating = LEAST(5, GREATEST(0, COALESCE(
    (SELECT ROUND(AVG(er.answer_rating))::integer
     FROM public.evaluation_responses er
     INNER JOIN public.evaluation_template_instances eti ON eti.id = er.instance_id
     WHERE eti.grade_id = g.id AND er.answer_rating IS NOT NULL),
    0
  ))),
  graded_at = COALESCE(g.graded_at, NOW())
WHERE g.assessment_type IN ('hot', 'cold', 'manager', 'instructor', 'funder')
  AND EXISTS (
    SELECT 1 FROM public.evaluation_template_instances eti
    INNER JOIN public.evaluation_responses er ON er.instance_id = eti.id
    WHERE eti.grade_id = g.id AND er.answer_rating IS NOT NULL
  );
