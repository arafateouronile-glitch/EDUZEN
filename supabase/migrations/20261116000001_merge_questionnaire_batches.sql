-- Un seul lot (un seul bloc, un seul QR code) par questionnaire de session.
--
-- Les questionnaires envoyés depuis une session ou par une automatisation
-- créaient l'évaluation de chaque apprenant avec sa propre date (à la
-- milliseconde près) : chaque apprenant formait un lot à part, avec son QR.
-- On aligne la date des évaluations liées à un questionnaire sur la première
-- du lot (même session, même modèle, même type), et on rattache les QR déjà
-- générés au lot fusionné. Les évaluations créées à la main ne sont pas touchées.
--
-- Bloc unique : la table temporaire vit dans la même instruction, ce qui
-- fonctionne aussi dans l'éditeur SQL de Supabase.

DO $$
BEGIN
  -- 1. QR déjà générés : on garde le plus ancien de chaque lot fusionné,
  --    rattaché à la date du lot ; les autres sont supprimés.
  CREATE TEMP TABLE questionnaire_batch_links ON COMMIT DROP AS
  WITH batch_dates AS (
    SELECT g.session_id, g.subject, g.assessment_type,
           g.graded_at AS old_graded_at,
           min(g.graded_at) OVER (PARTITION BY g.session_id, g.subject, g.assessment_type) AS new_graded_at
    FROM public.grades g
    WHERE g.session_id IS NOT NULL
      AND g.graded_at IS NOT NULL
      AND g.id IN (SELECT grade_id FROM public.questionnaire_links WHERE grade_id IS NOT NULL)
  ),
  links AS (
    SELECT DISTINCT l.id, l.session_id, l.subject, l.assessment_type, l.created_at, d.new_graded_at
    FROM public.evaluation_public_links l
    JOIN batch_dates d
      ON d.session_id = l.session_id
     AND d.subject = l.subject
     AND d.assessment_type = l.assessment_type
     AND d.old_graded_at = l.graded_at
  )
  SELECT id, new_graded_at,
         row_number() OVER (
           PARTITION BY session_id, subject, assessment_type, new_graded_at
           ORDER BY created_at, id
         ) AS rank
  FROM links;

  DELETE FROM public.evaluation_public_links l
  USING questionnaire_batch_links b
  WHERE l.id = b.id AND b.rank > 1;

  UPDATE public.evaluation_public_links l
  SET graded_at = b.new_graded_at
  FROM questionnaire_batch_links b
  WHERE l.id = b.id AND b.rank = 1 AND l.graded_at <> b.new_graded_at;

  -- 2. Évaluations : date de la première du lot
  WITH batch_dates AS (
    SELECT g.id,
           g.graded_at AS old_graded_at,
           min(g.graded_at) OVER (PARTITION BY g.session_id, g.subject, g.assessment_type) AS new_graded_at
    FROM public.grades g
    WHERE g.session_id IS NOT NULL
      AND g.graded_at IS NOT NULL
      AND g.id IN (SELECT grade_id FROM public.questionnaire_links WHERE grade_id IS NOT NULL)
  )
  UPDATE public.grades g
  SET graded_at = d.new_graded_at
  FROM batch_dates d
  WHERE g.id = d.id AND d.old_graded_at <> d.new_graded_at;

  DROP TABLE IF EXISTS questionnaire_batch_links;
END $$;
