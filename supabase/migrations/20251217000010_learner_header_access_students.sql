-- Allow learners (no auth) to read their own student row using a request header.
-- This relies on a request header: x-learner-student-id (UUID string)

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view their student profile via header" ON public.students;

CREATE POLICY "Learners can view their student profile via header"
  ON public.students
  FOR SELECT
  USING (
    id = ((current_setting('request.headers', true)::json->>'x-learner-student-id')::uuid)
  );






