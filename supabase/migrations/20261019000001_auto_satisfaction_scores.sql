-- Note de satisfaction automatique des formations et des programmes, calculée
-- à partir des réponses « étoiles » des évaluations à chaud et à froid.
--
-- Réponses prises en compte (moyenne sur 5, pondérée par réponse) :
--   - questions « rating » : answer_rating (0-5 étoiles) ;
--   - QCM sur échelle (Totalement / En partie / … ou options avec star_value) :
--     valeur étoiles de l'option choisie — même règle que le tableau
--     « Suivi qualité » (lib/services/evaluation-analytics.ts) : Oui/Non et
--     quiz (bonne réponse) exclus.
--
-- Priorité (choix produit) : la moyenne automatique est la note officielle dès
-- qu'il y a des réponses ; la note saisie à la main ne sert qu'en l'absence de
-- réponse.
--   - formations : satisfaction_score_auto, sinon satisfaction_score_override ;
--   - programmes : satisfaction_rate (lue par le catalogue public, l'API v1 et
--     Qualiopi) = satisfaction_rate_auto, sinon satisfaction_rate_manual.
--
-- Mise à jour automatique : triggers sur evaluation_responses et grades.

-- ── Colonnes ────────────────────────────────────────────────────────────────

ALTER TABLE public.formations
  ADD COLUMN IF NOT EXISTS satisfaction_score_auto NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS satisfaction_responses_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS satisfaction_rate_manual NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS satisfaction_rate_auto NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS satisfaction_responses_count INTEGER NOT NULL DEFAULT 0;

-- Les notes déjà saisies à la main deviennent la note manuelle (repli).
UPDATE public.programs
SET satisfaction_rate_manual = satisfaction_rate
WHERE satisfaction_rate_manual IS NULL AND satisfaction_rate IS NOT NULL;

-- ── Valeur étoiles d'une réponse ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.evaluation_label_stars(p_label text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE regexp_replace(
           lower(translate(trim(coalesce(p_label, '')),
             'ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇàâäéèêëîïôöùûüç',
             'AAAEEEEIIOOUUUCaaaeeeeiioouuuc')),
           '[.!?]+$', '')
    WHEN 'excellent' THEN 5
    WHEN 'totalement' THEN 5
    WHEN 'tout a fait' THEN 5
    WHEN 'tres satisfait' THEN 5
    WHEN 'tres bon' THEN 4
    WHEN 'plutot oui' THEN 4
    WHEN 'satisfait' THEN 4
    WHEN 'bon' THEN 3
    WHEN 'en partie' THEN 3
    WHEN 'partiellement' THEN 3
    WHEN 'moyennement' THEN 3
    WHEN 'moyen' THEN 1
    WHEN 'plutot non' THEN 1
    WHEN 'insuffisamment' THEN 1
    WHEN 'peu satisfait' THEN 1
    WHEN 'insuffisant' THEN 0
    WHEN 'pas du tout' THEN 0
    WHEN 'pas satisfait' THEN 0
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.evaluation_response_stars(
  p_question_type text,
  p_options jsonb,
  p_rating integer,
  p_choice text[]
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  opts jsonb := p_options;
  opt jsonb;
  label text;
  star numeric;
  chosen text;
  result numeric := NULL;
BEGIN
  IF p_question_type = 'rating' THEN
    RETURN CASE WHEN p_rating BETWEEN 0 AND 5 THEN p_rating END;
  END IF;

  IF p_question_type <> 'multiple_choice' OR p_choice IS NULL OR cardinality(p_choice) = 0 THEN
    RETURN NULL;
  END IF;

  -- Certains modèles ont des options stockées en chaîne JSON (double encodage)
  IF jsonb_typeof(opts) = 'string' THEN
    BEGIN
      opts := (opts #>> '{}')::jsonb;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;
  IF opts IS NULL OR jsonb_typeof(opts) <> 'array' THEN
    RETURN NULL;
  END IF;

  chosen := p_choice[1];
  FOR opt IN SELECT value FROM jsonb_array_elements(opts) LOOP
    IF jsonb_typeof(opt) = 'object' THEN
      -- Quiz (bonne réponse) : pas une échelle de satisfaction
      IF opt->>'is_correct' = 'true' THEN
        RETURN NULL;
      END IF;
      label := opt->>'text';
      star := CASE WHEN jsonb_typeof(opt->'star_value') = 'number' THEN (opt->>'star_value')::numeric END;
    ELSE
      label := opt #>> '{}';
      star := NULL;
    END IF;
    star := coalesce(star, public.evaluation_label_stars(label));
    -- Toutes les options doivent être valorisées pour former une échelle
    IF star IS NULL THEN
      RETURN NULL;
    END IF;
    IF label = chosen THEN
      result := star;
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

-- ── Moyenne sur un ensemble de sessions ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.satisfaction_stats_for_sessions(p_session_ids uuid[])
RETURNS TABLE (average numeric, responses integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    round(avg(s.stars), 1) AS average,
    count(s.stars)::integer AS responses
  FROM (
    SELECT public.evaluation_response_stars(q.question_type, q.options, r.answer_rating, r.answer_choice) AS stars
    FROM public.grades g
    JOIN public.evaluation_template_instances i ON i.grade_id = g.id
    JOIN public.evaluation_responses r ON r.instance_id = i.id
    JOIN public.evaluation_template_questions q ON q.id = r.question_id
    WHERE g.session_id = ANY (p_session_ids)
      AND g.assessment_type IN ('hot', 'cold')
  ) s
  WHERE s.stars IS NOT NULL
$$;

-- ── Rafraîchissement ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refresh_formation_satisfaction(p_formation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats record;
BEGIN
  IF p_formation_id IS NULL THEN RETURN; END IF;
  SELECT * INTO stats FROM public.satisfaction_stats_for_sessions(
    ARRAY(SELECT id FROM public.sessions WHERE formation_id = p_formation_id)
  );
  UPDATE public.formations
  SET satisfaction_score_auto = stats.average,
      satisfaction_responses_count = coalesce(stats.responses, 0)
  WHERE id = p_formation_id
    AND (satisfaction_score_auto IS DISTINCT FROM stats.average
         OR satisfaction_responses_count IS DISTINCT FROM coalesce(stats.responses, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_program_satisfaction(p_program_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats record;
BEGIN
  IF p_program_id IS NULL THEN RETURN; END IF;
  -- Sessions du programme : liées directement (session_programs) ou via une
  -- formation du programme.
  SELECT * INTO stats FROM public.satisfaction_stats_for_sessions(ARRAY(
    SELECT sp.session_id FROM public.session_programs sp WHERE sp.program_id = p_program_id
    UNION
    SELECT s.id FROM public.sessions s
    JOIN public.formations f ON f.id = s.formation_id
    WHERE f.program_id = p_program_id
  ));
  -- satisfaction_rate (note publiée) est recalculée par le trigger
  -- programs_sync_satisfaction_rate.
  UPDATE public.programs
  SET satisfaction_rate_auto = stats.average,
      satisfaction_responses_count = coalesce(stats.responses, 0)
  WHERE id = p_program_id
    AND (satisfaction_rate_auto IS DISTINCT FROM stats.average
         OR satisfaction_responses_count IS DISTINCT FROM coalesce(stats.responses, 0));
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_satisfaction_for_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_formation_id uuid;
  v_program_id uuid;
BEGIN
  SELECT formation_id INTO v_formation_id FROM public.sessions WHERE id = p_session_id;
  PERFORM public.refresh_formation_satisfaction(v_formation_id);

  FOR v_program_id IN
    SELECT sp.program_id FROM public.session_programs sp WHERE sp.session_id = p_session_id
    UNION
    SELECT f.program_id FROM public.formations f WHERE f.id = v_formation_id AND f.program_id IS NOT NULL
  LOOP
    PERFORM public.refresh_program_satisfaction(v_program_id);
  END LOOP;
END;
$$;

-- ── Note publiée des programmes ─────────────────────────────────────────────
-- Toute saisie de satisfaction_rate (formulaire programme, API v1…) est
-- conservée comme note manuelle ; la note publiée est l'automatique si elle
-- existe. Les écrivains existants n'ont donc rien à changer.

CREATE OR REPLACE FUNCTION public.programs_sync_satisfaction_rate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.satisfaction_rate IS NOT NULL AND NEW.satisfaction_rate_manual IS NULL THEN
      NEW.satisfaction_rate_manual := NEW.satisfaction_rate;
    END IF;
  ELSIF NEW.satisfaction_rate IS DISTINCT FROM OLD.satisfaction_rate THEN
    NEW.satisfaction_rate_manual := NEW.satisfaction_rate;
  END IF;
  NEW.satisfaction_rate := coalesce(NEW.satisfaction_rate_auto, NEW.satisfaction_rate_manual);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS programs_sync_satisfaction_rate ON public.programs;
CREATE TRIGGER programs_sync_satisfaction_rate
  BEFORE INSERT OR UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.programs_sync_satisfaction_rate();

-- ── Triggers de mise à jour ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.evaluation_responses_refresh_satisfaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  FOR v_session_id IN
    SELECT DISTINCT g.session_id
    FROM changed_rows c
    JOIN public.evaluation_template_instances i ON i.id = c.instance_id
    JOIN public.grades g ON g.id = i.grade_id
    WHERE g.session_id IS NOT NULL AND g.assessment_type IN ('hot', 'cold')
  LOOP
    PERFORM public.refresh_satisfaction_for_session(v_session_id);
  END LOOP;
  RETURN NULL;
END;
$$;

-- Une table de transition ne peut servir qu'à un seul événement : 3 triggers.
DROP TRIGGER IF EXISTS evaluation_responses_satisfaction_ins ON public.evaluation_responses;
CREATE TRIGGER evaluation_responses_satisfaction_ins
  AFTER INSERT ON public.evaluation_responses
  REFERENCING NEW TABLE AS changed_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.evaluation_responses_refresh_satisfaction();

DROP TRIGGER IF EXISTS evaluation_responses_satisfaction_upd ON public.evaluation_responses;
CREATE TRIGGER evaluation_responses_satisfaction_upd
  AFTER UPDATE ON public.evaluation_responses
  REFERENCING NEW TABLE AS changed_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.evaluation_responses_refresh_satisfaction();

DROP TRIGGER IF EXISTS evaluation_responses_satisfaction_del ON public.evaluation_responses;
CREATE TRIGGER evaluation_responses_satisfaction_del
  AFTER DELETE ON public.evaluation_responses
  REFERENCING OLD TABLE AS changed_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.evaluation_responses_refresh_satisfaction();

-- Suppression d'évaluations : les réponses partent en cascade, mais le grade
-- n'existe plus quand le trigger des réponses s'exécute.
CREATE OR REPLACE FUNCTION public.grades_refresh_satisfaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  FOR v_session_id IN
    SELECT DISTINCT session_id FROM deleted_grades
    WHERE session_id IS NOT NULL AND assessment_type IN ('hot', 'cold')
  LOOP
    PERFORM public.refresh_satisfaction_for_session(v_session_id);
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS grades_satisfaction_del ON public.grades;
CREATE TRIGGER grades_satisfaction_del
  AFTER DELETE ON public.grades
  REFERENCING OLD TABLE AS deleted_grades
  FOR EACH STATEMENT EXECUTE FUNCTION public.grades_refresh_satisfaction();

-- ── Calcul initial ──────────────────────────────────────────────────────────

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT id FROM public.formations LOOP
    PERFORM public.refresh_formation_satisfaction(rec.id);
  END LOOP;
  -- Programmes : la mise à jour de satisfaction_rate_auto déclenche le
  -- recalcul de la note publiée (trigger) ; sans réponse, satisfaction_rate
  -- reste la note manuelle actuelle.
  FOR rec IN SELECT id FROM public.programs LOOP
    PERFORM public.refresh_program_satisfaction(rec.id);
  END LOOP;
END;
$$;

-- ── Droits ──────────────────────────────────────────────────────────────────
-- Fonctions SECURITY DEFINER : appelées uniquement par les triggers, pas via
-- l'API (elles liraient des réponses d'autres organisations).
REVOKE EXECUTE ON FUNCTION public.satisfaction_stats_for_sessions(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_formation_satisfaction(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_program_satisfaction(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_satisfaction_for_session(uuid) FROM PUBLIC, anon, authenticated;
