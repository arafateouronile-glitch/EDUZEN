-- Allow learners (anon + header) to read quizzes and quiz questions for accessible courses.

-- Helper: can learner access a quiz (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_learner_access_quiz(p_quiz_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quizzes q
    WHERE q.id = p_quiz_id
      AND public.can_learner_access_course(q.course_id)
  );
$$;

-- QUIZZES
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view quizzes (header)" ON public.quizzes;
CREATE POLICY "Learners can view quizzes (header)"
  ON public.quizzes
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.can_learner_access_course(quizzes.course_id)
  );

-- QUIZ_QUESTIONS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view quiz questions (header)" ON public.quiz_questions;
CREATE POLICY "Learners can view quiz questions (header)"
  ON public.quiz_questions
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.can_learner_access_quiz(quiz_questions.quiz_id)
  );






