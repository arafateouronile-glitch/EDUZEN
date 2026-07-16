-- Corrige une faille : can_learner_access_course() autorisait l'accès à TOUT cours
-- publié de l'organisation (clause "catalogue"), pas seulement ceux assignés à la
-- session de l'apprenant via session_courses. Résultat : un apprenant pouvait ouvrir
-- et suivre n'importe quelle séquence e-learning de l'organisation, même sans être
-- inscrit à la session concernée. Cette fonction contrôle aussi l'accès à lessons,
-- course_sections, quizzes, quiz_questions (via can_learner_access_quiz) — le
-- correctif se propage automatiquement à ces tables.

CREATE OR REPLACE FUNCTION public.can_learner_access_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.session_courses sc
    WHERE sc.course_id = p_course_id
      AND public.is_student_enrolled_in_session(public.learner_student_id(), sc.session_id)
  );
$$;
