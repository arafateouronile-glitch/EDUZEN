-- Allow learner (no login) to read session_courses for their own sessions.
-- This relies on a request header: x-learner-student-id (UUID string)
-- sent by the frontend (see lib/supabase/learner-client.ts).

ALTER TABLE public.session_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view their session courses (header)" ON public.session_courses;
CREATE POLICY "Learners can view their session courses (header)"
  ON public.session_courses
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND (
      (current_setting('request.headers', true)::json->>'x-learner-student-id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.session_id = session_courses.session_id
        AND e.student_id = ((current_setting('request.headers', true)::json->>'x-learner-student-id')::uuid)
    )
  );






