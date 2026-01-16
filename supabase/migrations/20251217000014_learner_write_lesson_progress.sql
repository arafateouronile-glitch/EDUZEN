-- Allow learners (anon + header) to write their own lesson progress.
-- Fixes 401 Unauthorized on POST /rest/v1/lesson_progress when using the learner (anon) client.

-- Grants: allow anon role to write (RLS still applies)
GRANT SELECT, INSERT, UPDATE ON public.lesson_progress TO anon;

-- Helper: can learner access a given lesson (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_learner_access_lesson(p_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    WHERE l.id = p_lesson_id
      AND public.can_learner_access_course(l.course_id)
  );
$$;

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- INSERT: learner can create progress rows for themselves, for accessible lessons
DROP POLICY IF EXISTS "Learners can insert their lesson progress (header)" ON public.lesson_progress;
CREATE POLICY "Learners can insert their lesson progress (header)"
  ON public.lesson_progress
  FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND lesson_progress.student_id = public.learner_student_id()
    AND public.can_learner_access_lesson(lesson_progress.lesson_id)
  );

-- UPDATE: learner can update their own progress rows, for accessible lessons
DROP POLICY IF EXISTS "Learners can update their lesson progress (header)" ON public.lesson_progress;
CREATE POLICY "Learners can update their lesson progress (header)"
  ON public.lesson_progress
  FOR UPDATE
  USING (
    auth.role() = 'anon'
    AND lesson_progress.student_id = public.learner_student_id()
    AND public.can_learner_access_lesson(lesson_progress.lesson_id)
  )
  WITH CHECK (
    auth.role() = 'anon'
    AND lesson_progress.student_id = public.learner_student_id()
    AND public.can_learner_access_lesson(lesson_progress.lesson_id)
  );






