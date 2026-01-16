-- Fix 500 errors caused by recursive RLS between sessions/enrollments when adding learner header policies.
-- Strategy:
-- 1) Remove learner header policies on sessions/enrollments (they can create recursion with existing org-based policies).
-- 2) Provide safe helper functions to read learner header and check enrollment membership.
-- 3) Re-create session_courses learner policy using SECURITY DEFINER check (no dependency on enrollments RLS).
-- 4) Keep learner access for lesson_progress/quiz_attempts via header (safe).

-- ---------- Helper: safe learner student id from request headers ----------
CREATE OR REPLACE FUNCTION public.learner_student_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v text;
BEGIN
  v := (current_setting('request.headers', true)::jsonb ->> 'x-learner-student-id');
  IF v IS NULL OR v = '' THEN
    RETURN NULL;
  END IF;
  BEGIN
    RETURN v::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$$;

-- ---------- Helper: enrollment membership check (bypasses enrollments RLS) ----------
CREATE OR REPLACE FUNCTION public.is_student_enrolled_in_session(p_student_id uuid, p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.student_id = p_student_id
      AND e.session_id = p_session_id
  );
$$;

-- ---------- Remove problematic learner header policies ----------
DROP POLICY IF EXISTS "Learners can view their sessions (header)" ON public.sessions;
DROP POLICY IF EXISTS "Learners can view their enrollments (header)" ON public.enrollments;

-- ---------- Re-create session_courses learner policy safely ----------
ALTER TABLE public.session_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view their session courses (header)" ON public.session_courses;
CREATE POLICY "Learners can view their session courses (header)"
  ON public.session_courses
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.is_student_enrolled_in_session(public.learner_student_id(), session_courses.session_id)
  );

-- ---------- Learner can read their own lesson_progress ----------
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view their lesson progress (header)" ON public.lesson_progress;
CREATE POLICY "Learners can view their lesson progress (header)"
  ON public.lesson_progress
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND lesson_progress.student_id = public.learner_student_id()
  );

-- ---------- Learner can read their own quiz_attempts ----------
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view their quiz attempts (header)" ON public.quiz_attempts;
CREATE POLICY "Learners can view their quiz attempts (header)"
  ON public.quiz_attempts
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND quiz_attempts.student_id = public.learner_student_id()
  );






