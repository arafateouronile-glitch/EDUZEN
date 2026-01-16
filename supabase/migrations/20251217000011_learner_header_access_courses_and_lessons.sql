-- Allow learner (no login) to read assigned courses and their lessons.
-- Uses request header: x-learner-student-id (UUID string)
--
-- Why: learner pages read `session_courses` and join `courses`.
-- If `courses` is not readable for anon learners, the join returns null and UI shows nothing.

-- Ensure helper exists (created in 20251217000009)
-- public.learner_student_id()
-- public.is_student_enrolled_in_session(student_id, session_id)

-- ---------- Helper: learner organization id ----------
CREATE OR REPLACE FUNCTION public.learner_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT s.organization_id
  FROM public.students s
  WHERE s.id = public.learner_student_id()
  LIMIT 1;
$$;

-- ---------- Helper: can learner access a given course ----------
CREATE OR REPLACE FUNCTION public.can_learner_access_course(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    -- Assigned via a session the learner is enrolled in
    EXISTS (
      SELECT 1
      FROM public.session_courses sc
      WHERE sc.course_id = p_course_id
        AND public.is_student_enrolled_in_session(public.learner_student_id(), sc.session_id)
    )
    -- OR published in learner's organization (for "catalog" display)
    OR EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = p_course_id
        AND c.is_published = true
        AND c.organization_id = public.learner_organization_id()
    );
$$;

-- ---------- COURSES ----------
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view courses (header)" ON public.courses;
CREATE POLICY "Learners can view courses (header)"
  ON public.courses
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.can_learner_access_course(courses.id)
  );

-- ---------- LESSONS ----------
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learners can view lessons (header)" ON public.lessons;
CREATE POLICY "Learners can view lessons (header)"
  ON public.lessons
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.can_learner_access_course(lessons.course_id)
  );






