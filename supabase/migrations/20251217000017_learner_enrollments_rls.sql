-- Allow learners (anon + header) to read their own enrollments.
-- This is safe because it only checks enrollments.student_id against the header,
-- without creating recursion with sessions RLS.

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Learners can view their enrollments (header)" ON public.enrollments;

-- Create policy: learners can read their own enrollments
CREATE POLICY "Learners can view their enrollments (header)"
  ON public.enrollments
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND enrollments.student_id = public.learner_student_id()
  );

-- Also allow learners to read sessions they are enrolled in (for the join in dashboard)
-- This uses the helper function to avoid recursion
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view their sessions via enrollments (header)" ON public.sessions;

CREATE POLICY "Learners can view their sessions via enrollments (header)"
  ON public.sessions
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND public.is_student_enrolled_in_session(public.learner_student_id(), sessions.id)
  );

-- Allow learners to read formations (needed for the join in enrollments query)
-- Use SECURITY DEFINER to avoid recursion with sessions RLS
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view formations of their sessions (header)" ON public.formations;

-- Helper function to check if learner can access a formation (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_learner_access_formation(p_formation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sessions s
    WHERE s.formation_id = p_formation_id
      AND public.is_student_enrolled_in_session(public.learner_student_id(), s.id)
  );
$$;

CREATE POLICY "Learners can view formations of their sessions (header)"
  ON public.formations
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND public.can_learner_access_formation(formations.id)
  );

-- Allow learners to read session_slots (time slots) for sessions they are enrolled in
ALTER TABLE public.session_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view session slots of their sessions (header)" ON public.session_slots;

CREATE POLICY "Learners can view session slots of their sessions (header)"
  ON public.session_slots
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND public.is_student_enrolled_in_session(public.learner_student_id(), session_slots.session_id)
  );

-- Allow learners to read programs associated with formations of their sessions
-- Use SECURITY DEFINER to avoid recursion
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view programs of their session formations (header)" ON public.programs;

-- Helper function to check if learner can access a program (bypasses RLS)
CREATE OR REPLACE FUNCTION public.can_learner_access_program(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.formations f
    JOIN public.sessions s ON s.formation_id = f.id
    WHERE f.program_id = p_program_id
      AND public.is_student_enrolled_in_session(public.learner_student_id(), s.id)
  );
$$;

CREATE POLICY "Learners can view programs of their session formations (header)"
  ON public.programs
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND public.can_learner_access_program(programs.id)
  );

