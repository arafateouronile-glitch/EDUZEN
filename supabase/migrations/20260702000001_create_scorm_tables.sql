-- SCORM support: packages metadata + learner sessions
-- Tables: scorm_packages, scorm_sessions
-- Bucket: scorm-packages

-- 1. scorm_packages — métadonnées du package SCORM lié à une leçon
CREATE TABLE IF NOT EXISTS public.scorm_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scorm_version TEXT NOT NULL DEFAULT '1.2',  -- '1.2' ou '2004'
  title TEXT,
  description TEXT,
  entry_point TEXT NOT NULL,                   -- ex: 'index.html'
  storage_path TEXT NOT NULL,                  -- chemin dans Storage: '{org_id}/{lesson_id}/'
  package_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_scorm_packages_lesson ON public.scorm_packages(lesson_id);
CREATE INDEX IF NOT EXISTS idx_scorm_packages_org ON public.scorm_packages(organization_id);

-- 2. scorm_sessions — progression par apprenant
CREATE TABLE IF NOT EXISTS public.scorm_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  scorm_version TEXT NOT NULL DEFAULT '1.2',
  -- Statuts (SCORM 1.2)
  lesson_status TEXT DEFAULT 'not attempted',  -- passed|completed|failed|incomplete|browsed|not attempted
  -- Statuts (SCORM 2004)
  completion_status TEXT DEFAULT 'unknown',    -- completed|incomplete|unknown
  success_status TEXT DEFAULT 'unknown',       -- passed|failed|unknown
  -- Score
  score_raw DECIMAL(8,2),
  score_min DECIMAL(8,2),
  score_max DECIMAL(8,2),
  score_scaled DECIMAL(5,4),                   -- 0..1 (SCORM 2004)
  -- Données runtime
  total_time TEXT,                             -- PT1H30M (2004) ou 01:30:00 (1.2)
  suspend_data TEXT,                           -- cmi.suspend_data, jusqu'à 64 KB
  location TEXT,                               -- cmi.location / cmi.core.lesson_location
  attempt_count INTEGER NOT NULL DEFAULT 1,
  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_scorm_sessions_lesson ON public.scorm_sessions(lesson_id, student_id);
CREATE INDEX IF NOT EXISTS idx_scorm_sessions_student ON public.scorm_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_scorm_sessions_org ON public.scorm_sessions(organization_id);

-- 3. Trigger updated_at
CREATE OR REPLACE FUNCTION update_scorm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_scorm_packages_updated_at ON public.scorm_packages;
CREATE TRIGGER trigger_scorm_packages_updated_at
  BEFORE UPDATE ON public.scorm_packages
  FOR EACH ROW EXECUTE FUNCTION update_scorm_updated_at();

DROP TRIGGER IF EXISTS trigger_scorm_sessions_updated_at ON public.scorm_sessions;
CREATE TRIGGER trigger_scorm_sessions_updated_at
  BEFORE UPDATE ON public.scorm_sessions
  FOR EACH ROW EXECUTE FUNCTION update_scorm_updated_at();

-- 4. RLS pour scorm_packages
ALTER TABLE public.scorm_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructors can manage scorm packages of their courses" ON public.scorm_packages;
CREATE POLICY "Instructors can manage scorm packages of their courses"
  ON public.scorm_packages
  FOR ALL
  USING (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE c.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Students can view scorm packages of enrolled courses" ON public.scorm_packages;
CREATE POLICY "Students can view scorm packages of enrolled courses"
  ON public.scorm_packages
  FOR SELECT
  USING (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      JOIN public.course_enrollments e ON e.course_id = c.id
      WHERE e.student_id = auth.uid()
    )
  );

-- 5. RLS pour scorm_sessions
ALTER TABLE public.scorm_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage their own scorm sessions" ON public.scorm_sessions;
CREATE POLICY "Students can manage their own scorm sessions"
  ON public.scorm_sessions
  FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can view scorm sessions of their courses" ON public.scorm_sessions;
CREATE POLICY "Instructors can view scorm sessions of their courses"
  ON public.scorm_sessions
  FOR SELECT
  USING (
    lesson_id IN (
      SELECT l.id FROM public.lessons l
      JOIN public.courses c ON c.id = l.course_id
      WHERE c.instructor_id = auth.uid()
    )
  );

-- 6. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorm_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scorm_sessions TO authenticated;

-- 7. Bucket scorm-packages
INSERT INTO storage.buckets (id, name, public)
VALUES ('scorm-packages', 'scorm-packages', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read access for scorm packages" ON storage.objects;
CREATE POLICY "Public read access for scorm packages"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'scorm-packages');

DROP POLICY IF EXISTS "Authenticated users can upload scorm packages" ON storage.objects;
CREATE POLICY "Authenticated users can upload scorm packages"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'scorm-packages' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update scorm packages" ON storage.objects;
CREATE POLICY "Authenticated users can update scorm packages"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'scorm-packages' AND auth.uid() = owner)
  WITH CHECK (bucket_id = 'scorm-packages' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Authenticated users can delete scorm packages" ON storage.objects;
CREATE POLICY "Authenticated users can delete scorm packages"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'scorm-packages' AND auth.uid() = owner);
