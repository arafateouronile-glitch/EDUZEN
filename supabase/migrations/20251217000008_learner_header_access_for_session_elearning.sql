-- Allow learner (no login) to read rows required for session-based e-learning.
-- Uses request header: x-learner-student-id (UUID string)
-- WARNING: this matches the current "access by studentId" model in the app.

-- Helper note: PostgREST exposes request headers via current_setting('request.headers', true)::json

-- ENROLLMENTS: learner can read their own enrollments (to know their sessions)
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view their enrollments (header)" ON public.enrollments;
CREATE POLICY "Learners can view their enrollments (header)"
  ON public.enrollments
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND (
      (current_setting('request.headers', true)::json->>'x-learner-student-id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    AND enrollments.student_id = ((current_setting('request.headers', true)::json->>'x-learner-student-id')::uuid)
  );

-- SESSIONS: learner can read sessions where they are enrolled (used for session name)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view their sessions (header)" ON public.sessions;
CREATE POLICY "Learners can view their sessions (header)"
  ON public.sessions
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND (
      (current_setting('request.headers', true)::json->>'x-learner-student-id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.session_id = sessions.id
        AND e.student_id = ((current_setting('request.headers', true)::json->>'x-learner-student-id')::uuid)
    )
  );

-- LESSON_PROGRESS: learner can read their own progress (for % progress)
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view their lesson progress (header)" ON public.lesson_progress;
CREATE POLICY "Learners can view their lesson progress (header)"
  ON public.lesson_progress
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND (
      (current_setting('request.headers', true)::json->>'x-learner-student-id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    AND lesson_progress.student_id = ((current_setting('request.headers', true)::json->>'x-learner-student-id')::uuid)
  );

-- QUIZ_ATTEMPTS: learner can read their own attempts (for avg score)
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view their quiz attempts (header)" ON public.quiz_attempts;
CREATE POLICY "Learners can view their quiz attempts (header)"
  ON public.quiz_attempts
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND (
      (current_setting('request.headers', true)::json->>'x-learner-student-id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    AND quiz_attempts.student_id = ((current_setting('request.headers', true)::json->>'x-learner-student-id')::uuid)
  );






