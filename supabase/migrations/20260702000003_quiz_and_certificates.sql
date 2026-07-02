-- Quiz attempts + Certificates pour EDUZEN LMS

-- Suppression préventive pour idempotence (DROP recrée proprement si table partielle)
DROP TABLE IF EXISTS public.certificates CASCADE;
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;

-- 1. quiz_attempts — une tentative = un passage complet du quiz
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,               -- auth.uid()
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  answers JSONB NOT NULL DEFAULT '{}',    -- { question_id: option_id | true | false }
  score_percentage DECIMAL(5,2),
  passed BOOLEAN,
  time_spent_seconds INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_id, student_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lesson_student ON public.quiz_attempts(lesson_id, student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students manage their own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Students manage their own quiz attempts"
  ON public.quiz_attempts FOR ALL USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors view quiz attempts of their courses" ON public.quiz_attempts;
CREATE POLICY "Instructors view quiz attempts of their courses"
  ON public.quiz_attempts FOR SELECT
  USING (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE c.instructor_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;

-- 2. certificates — certificat émis à la complétion d'un cours
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,               -- auth.uid()
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  verification_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  score_percentage DECIMAL(5,2),          -- score moyen des quiz (null si aucun quiz)
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)           -- un seul certificat par cours/étudiant
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON public.certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course ON public.certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON public.certificates(verification_code);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students view their own certificates" ON public.certificates;
CREATE POLICY "Students view their own certificates"
  ON public.certificates FOR SELECT USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Public can verify certificates by code" ON public.certificates;
CREATE POLICY "Public can verify certificates by code"
  ON public.certificates FOR SELECT USING (true);  -- lecture publique pour vérification

DROP POLICY IF EXISTS "Instructors view certificates of their courses" ON public.certificates;
CREATE POLICY "Instructors view certificates of their courses"
  ON public.certificates FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses WHERE instructor_id = auth.uid()
    )
  );

GRANT SELECT ON public.certificates TO anon;
GRANT SELECT, INSERT, UPDATE ON public.certificates TO authenticated;
