-- Allow learners (anon + header) to read their own attendance records.
-- This uses the x-learner-student-id header for RLS.

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Learners can view their own attendance (header)" ON public.attendance;

-- Create policy: learners can read their own attendance records
CREATE POLICY "Learners can view their own attendance (header)"
  ON public.attendance
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND attendance.student_id = public.learner_student_id()
  );

-- Also allow learners to read session_slots for sessions they are enrolled in
-- (needed to calculate attendance hours)
ALTER TABLE public.session_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view session slots of their sessions (header)" ON public.session_slots;

-- This policy should already exist from migration 20251217000017, but we ensure it's here
CREATE POLICY "Learners can view session slots of their sessions (header)"
  ON public.session_slots
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.session_id = session_slots.session_id
        AND e.student_id = public.learner_student_id()
    )
  );

-- Allow learners to read their own generated documents
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view their own generated documents (header)" ON public.generated_documents;

-- Helper function to safely compare related_entity_id with student_id
CREATE OR REPLACE FUNCTION public.is_related_entity_student(p_related_entity_id text, p_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_related_entity_id IS NULL OR p_related_entity_id = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Try UUID comparison first
  BEGIN
    RETURN p_related_entity_id::uuid = p_student_id;
  EXCEPTION WHEN OTHERS THEN
    -- Fallback to text comparison
    RETURN p_related_entity_id = p_student_id::text;
  END;
END;
$$;

CREATE POLICY "Learners can view their own generated documents (header)"
  ON public.generated_documents
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND (
      -- Documents liés directement à l'étudiant
      (
        related_entity_type = 'student' 
        AND public.is_related_entity_student(related_entity_id, public.learner_student_id())
      )
      OR
      -- Documents liés à un enrollment de l'étudiant
      (
        related_entity_type = 'enrollment' 
        AND related_entity_id IS NOT NULL
        AND related_entity_id != ''
        AND EXISTS (
          SELECT 1
          FROM public.enrollments e
          WHERE e.id::text = generated_documents.related_entity_id
            AND e.student_id = public.learner_student_id()
        )
      )
      OR
      -- Documents liés à une session où l'étudiant est inscrit
      (
        related_entity_type = 'session' 
        AND related_entity_id IS NOT NULL
        AND related_entity_id != ''
        AND EXISTS (
          SELECT 1
          FROM public.enrollments e
          WHERE e.session_id::text = generated_documents.related_entity_id
            AND e.student_id = public.learner_student_id()
        )
      )
    )
  );

-- Allow learners to read their own documents from the documents table
-- Note: documents table has student_id field (no session_id)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Learners can view their own documents (header)" ON public.documents;

CREATE POLICY "Learners can view their own documents (header)"
  ON public.documents
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    -- Documents liés directement à l'étudiant
    AND documents.student_id = public.learner_student_id()
  );

-- Allow learners to read their own course certificates
-- Note: course_certificates.student_id references auth.users(id)
-- We use a SECURITY DEFINER function to check the link via email
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

-- Helper function to check certificate access via email matching
-- Uses SECURITY DEFINER to access auth.users
CREATE OR REPLACE FUNCTION public.can_learner_access_certificate_via_email(p_certificate_student_id uuid, p_learner_student_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  student_email TEXT;
  user_email TEXT;
BEGIN
  -- Cas 1: Correspondance directe (si FK pointe vers public.students)
  IF p_certificate_student_id = p_learner_student_id THEN
    RETURN TRUE;
  END IF;
  
  -- Cas 2: Correspondance via email (si FK pointe vers auth.users)
  -- Récupérer l'email de l'étudiant
  SELECT email INTO student_email
  FROM public.students
  WHERE id = p_learner_student_id;
  
  IF student_email IS NULL OR student_email = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier si un auth.users avec cet email et cet ID existe
  -- Cette requête s'exécute avec les permissions du propriétaire de la fonction (postgres)
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = p_certificate_student_id
  LIMIT 1;
  
  RETURN COALESCE(user_email, '') = student_email;
END;
$$;

DROP POLICY IF EXISTS "Learners can view their own course certificates (header)" ON public.course_certificates;

CREATE POLICY "Learners can view their own course certificates (header)"
  ON public.course_certificates
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND public.can_learner_access_certificate_via_email(
      course_certificates.student_id,
      public.learner_student_id()
    )
  );

