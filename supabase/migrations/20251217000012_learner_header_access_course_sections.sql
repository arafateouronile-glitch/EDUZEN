-- Allow learners (anon + header) to read course sections for assigned courses,
-- while preserving management access for instructors/admins.

ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;

-- Learner (anon) read access for course sections of accessible courses
DROP POLICY IF EXISTS "Learners can view course sections (header)" ON public.course_sections;
CREATE POLICY "Learners can view course sections (header)"
  ON public.course_sections
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.can_learner_access_course(course_sections.course_id)
  );

-- Staff management access (authenticated)
DROP POLICY IF EXISTS "Instructors and Admins can manage course sections" ON public.course_sections;
CREATE POLICY "Instructors and Admins can manage course sections"
  ON public.course_sections
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_sections.course_id
        AND (
          c.instructor_id = auth.uid()
          OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'secretary')
            AND c.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.courses c
      WHERE c.id = course_sections.course_id
        AND (
          c.instructor_id = auth.uid()
          OR (
            (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'secretary')
            AND c.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
          )
        )
    )
  );






