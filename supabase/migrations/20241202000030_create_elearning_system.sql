-- Migration pour le module E-learning intégré

-- 1. Table pour les cours en ligne
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Informations du cours
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  -- Métadonnées
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  cover_image_url TEXT,
  -- Configuration
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  language TEXT DEFAULT 'fr',
  -- Durée et contenu
  estimated_duration_hours DECIMAL(5, 2), -- Durée estimée en heures
  total_lessons INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  -- Prix et accès
  price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  is_free BOOLEAN DEFAULT true,
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  tags TEXT[],
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Table pour les sections de cours (organisation des leçons)
CREATE TABLE IF NOT EXISTS public.course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, order_index)
);

-- 3. Table pour les leçons
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.course_sections(id) ON DELETE SET NULL,
  -- Informations de la leçon
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Contenu en Markdown ou HTML
  -- Type de contenu
  lesson_type TEXT DEFAULT 'video', -- 'video', 'text', 'quiz', 'assignment', 'live'
  video_url TEXT,
  video_duration_minutes INTEGER,
  -- Fichiers et ressources
  attachments JSONB, -- Array d'objets {url, filename, type, size}
  resources JSONB, -- Ressources supplémentaires
  -- Configuration
  is_preview BOOLEAN DEFAULT false, -- Leçon en aperçu (gratuite)
  is_required BOOLEAN DEFAULT true, -- Leçon obligatoire
  order_index INTEGER NOT NULL,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- 4. Table pour les quiz
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  -- Informations du quiz
  title TEXT NOT NULL,
  description TEXT,
  -- Configuration
  passing_score INTEGER DEFAULT 70, -- Score minimum pour réussir (%)
  time_limit_minutes INTEGER, -- Limite de temps (NULL = illimité)
  max_attempts INTEGER DEFAULT 3, -- Nombre maximum de tentatives
  shuffle_questions BOOLEAN DEFAULT false,
  show_results_immediately BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les questions de quiz
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  -- Question
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', 'short_answer', 'essay'
  -- Options et réponses
  options JSONB, -- Pour multiple_choice: [{text, is_correct}, ...]
  correct_answer TEXT, -- Pour short_answer et true_false
  explanation TEXT, -- Explication de la réponse
  -- Points
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table pour les tentatives de quiz
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Résultats
  score DECIMAL(5, 2), -- Score en pourcentage
  total_questions INTEGER,
  correct_answers INTEGER,
  is_passed BOOLEAN DEFAULT false,
  -- Réponses
  answers JSONB, -- {question_id: answer, ...}
  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_taken_minutes INTEGER
);

-- 7. Table pour les inscriptions aux cours
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  enrollment_status TEXT DEFAULT 'enrolled', -- 'enrolled', 'completed', 'dropped'
  -- Progression
  progress_percentage DECIMAL(5, 2) DEFAULT 0,
  completed_lessons INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  last_accessed_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  -- Dates
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(course_id, student_id)
);

-- 8. Table pour le suivi de progression des leçons
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Progression
  is_completed BOOLEAN DEFAULT false,
  completion_percentage DECIMAL(5, 2) DEFAULT 0, -- Pour les vidéos: % visionné
  time_spent_minutes INTEGER DEFAULT 0,
  -- Dates
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(lesson_id, student_id)
);

-- 9. Table pour les devoirs/assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  -- Informations
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  -- Configuration
  due_date TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100,
  allow_late_submission BOOLEAN DEFAULT false,
  -- Fichiers
  attachment_required BOOLEAN DEFAULT false,
  allowed_file_types TEXT[], -- ['pdf', 'doc', 'docx', ...]
  max_file_size_mb INTEGER DEFAULT 10,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Table pour les soumissions de devoirs
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Contenu
  submission_text TEXT,
  attachments JSONB, -- Array d'objets {url, filename, type, size}
  -- Évaluation
  score DECIMAL(5, 2),
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  -- Statut
  status TEXT DEFAULT 'submitted', -- 'submitted', 'graded', 'returned'
  -- Dates
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- 11. Table pour les certificats de complétion
CREATE TABLE IF NOT EXISTS public.course_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.course_enrollments(id) ON DELETE SET NULL,
  -- Informations du certificat
  certificate_number TEXT NOT NULL UNIQUE,
  certificate_url TEXT, -- URL du PDF du certificat
  -- Dates
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- 12. Table pour les notes et commentaires sur les cours
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Évaluation
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- 13. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_courses_org ON public.courses(organization_id, is_published);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_featured ON public.courses(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_course_sections_course ON public.course_sections(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_section ON public.lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id, student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id, student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON public.lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson ON public.assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON public.assignment_submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_course_certificates_course ON public.course_certificates(course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON public.course_reviews(course_id);

-- 14. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_elearning_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 15. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_courses_timestamp ON public.courses;
CREATE TRIGGER update_courses_timestamp
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_course_sections_timestamp ON public.course_sections;
CREATE TRIGGER update_course_sections_timestamp
  BEFORE UPDATE ON public.course_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_lessons_timestamp ON public.lessons;
CREATE TRIGGER update_lessons_timestamp
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_quizzes_timestamp ON public.quizzes;
CREATE TRIGGER update_quizzes_timestamp
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_quiz_questions_timestamp ON public.quiz_questions;
CREATE TRIGGER update_quiz_questions_timestamp
  BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_assignments_timestamp ON public.assignments;
CREATE TRIGGER update_assignments_timestamp
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_assignment_submissions_timestamp ON public.assignment_submissions;
CREATE TRIGGER update_assignment_submissions_timestamp
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_course_reviews_timestamp ON public.course_reviews;
CREATE TRIGGER update_course_reviews_timestamp
  BEFORE UPDATE ON public.course_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

-- 16. Fonction pour mettre à jour la progression du cours
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_lessons INTEGER;
  completed_count INTEGER;
  progress_pct DECIMAL(5, 2);
  enrollment_record RECORD;
BEGIN
  -- Récupérer l'inscription
  SELECT * INTO enrollment_record
  FROM public.course_enrollments
  WHERE student_id = NEW.student_id
    AND course_id = (SELECT course_id FROM public.lessons WHERE id = NEW.lesson_id);
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Compter le total de leçons du cours
  SELECT COUNT(*) INTO total_lessons
  FROM public.lessons
  WHERE course_id = enrollment_record.course_id;
  
  -- Compter les leçons complétées
  SELECT COUNT(*) INTO completed_count
  FROM public.lesson_progress
  WHERE student_id = NEW.student_id
    AND is_completed = true
    AND lesson_id IN (SELECT id FROM public.lessons WHERE course_id = enrollment_record.course_id);
  
  -- Calculer le pourcentage
  IF total_lessons > 0 THEN
    progress_pct := (completed_count::DECIMAL / total_lessons::DECIMAL) * 100;
  ELSE
    progress_pct := 0;
  END IF;
  
  -- Mettre à jour l'inscription
  UPDATE public.course_enrollments
  SET progress_percentage = progress_pct,
      completed_lessons = (
        SELECT ARRAY_AGG(lesson_id::INTEGER)
        FROM public.lesson_progress
        WHERE student_id = NEW.student_id
          AND is_completed = true
          AND lesson_id IN (SELECT id FROM public.lessons WHERE course_id = enrollment_record.course_id)
      ),
      enrollment_status = CASE
        WHEN progress_pct >= 100 THEN 'completed'
        ELSE 'enrolled'
      END,
      completed_at = CASE
        WHEN progress_pct >= 100 AND enrollment_record.completed_at IS NULL THEN NOW()
        ELSE enrollment_record.completed_at
      END
  WHERE id = enrollment_record.id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_course_progress ON public.lesson_progress;
CREATE TRIGGER trigger_update_course_progress
  AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW
  WHEN (NEW.is_completed = true)
  EXECUTE FUNCTION update_course_progress();

-- 17. Fonction pour générer le numéro de certificat
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  cert_num TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Trouver le dernier numéro de séquence pour cette année
  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.course_certificates
  WHERE certificate_number LIKE 'CERT-' || year_part || '-%';
  
  cert_num := 'CERT-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN cert_num;
END;
$$;

-- 18. Trigger pour générer automatiquement le numéro de certificat
CREATE OR REPLACE FUNCTION set_certificate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
    NEW.certificate_number := generate_certificate_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_certificate_number ON public.course_certificates;
CREATE TRIGGER trigger_set_certificate_number
  BEFORE INSERT ON public.course_certificates
  FOR EACH ROW
  EXECUTE FUNCTION set_certificate_number();

-- 19. RLS Policies pour courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published courses in their organization" ON public.courses;
CREATE POLICY "Users can view published courses in their organization"
  ON public.courses
  FOR SELECT
  USING (
    (is_published = true OR instructor_id = auth.uid())
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Instructors can manage their courses" ON public.courses;
CREATE POLICY "Instructors can manage their courses"
  ON public.courses
  FOR ALL
  USING (
    instructor_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage courses in their organization" ON public.courses;
CREATE POLICY "Admins can manage courses in their organization"
  ON public.courses
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 20. RLS Policies pour course_enrollments
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can view their own enrollments"
  ON public.course_enrollments
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can create their own enrollments"
  ON public.course_enrollments
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND course_id IN (
      SELECT id FROM public.courses
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Instructors can view enrollments for their courses" ON public.course_enrollments;
CREATE POLICY "Instructors can view enrollments for their courses"
  ON public.course_enrollments
  FOR SELECT
  USING (
    course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
  );

-- 21. RLS Policies pour lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lessons of published courses" ON public.lessons;
CREATE POLICY "Users can view lessons of published courses"
  ON public.lessons
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE is_published = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    OR course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Instructors can manage lessons of their courses" ON public.lessons;
CREATE POLICY "Instructors can manage lessons of their courses"
  ON public.lessons
  FOR ALL
  USING (
    course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
  );

-- 22. RLS pour quizzes, quiz_questions, quiz_attempts
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view quizzes of published courses" ON public.quizzes;
CREATE POLICY "Users can view quizzes of published courses"
  ON public.quizzes
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE is_published = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can view quiz questions"
  ON public.quiz_questions
  FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE course_id IN (
        SELECT id FROM public.courses
        WHERE is_published = true
        AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage their own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can manage their own quiz attempts"
  ON public.quiz_attempts
  FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can view quiz attempts for their courses" ON public.quiz_attempts;
CREATE POLICY "Instructors can view quiz attempts for their courses"
  ON public.quiz_attempts
  FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
    )
  );

-- 23. RLS Policies pour lesson_progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can manage their own lesson progress"
  ON public.lesson_progress
  FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can view lesson progress for their courses" ON public.lesson_progress;
CREATE POLICY "Instructors can view lesson progress for their courses"
  ON public.lesson_progress
  FOR SELECT
  USING (
    lesson_id IN (
      SELECT id FROM public.lessons
      WHERE course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
    )
  );

-- 24. RLS Policies pour assignments et assignment_submissions
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view assignments of published courses" ON public.assignments;
CREATE POLICY "Users can view assignments of published courses"
  ON public.assignments
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE is_published = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage their own assignment submissions" ON public.assignment_submissions;
CREATE POLICY "Users can manage their own assignment submissions"
  ON public.assignment_submissions
  FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can manage assignment submissions for their courses" ON public.assignment_submissions;
CREATE POLICY "Instructors can manage assignment submissions for their courses"
  ON public.assignment_submissions
  FOR ALL
  USING (
    assignment_id IN (
      SELECT id FROM public.assignments
      WHERE course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
    )
  );

-- 25. RLS Policies pour course_certificates
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own certificates" ON public.course_certificates;
CREATE POLICY "Users can view their own certificates"
  ON public.course_certificates
  FOR SELECT
  USING (student_id = auth.uid());

-- 26. RLS Policies pour course_reviews
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reviews" ON public.course_reviews;
CREATE POLICY "Users can view reviews"
  ON public.course_reviews
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create reviews for courses they completed" ON public.course_reviews;
CREATE POLICY "Users can create reviews for courses they completed"
  ON public.course_reviews
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND course_id IN (
      SELECT course_id FROM public.course_enrollments
      WHERE student_id = auth.uid()
      AND enrollment_status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.course_reviews;
CREATE POLICY "Users can update their own reviews"
  ON public.course_reviews
  FOR UPDATE
  USING (student_id = auth.uid());

-- 27. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT SELECT, INSERT ON public.course_certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.course_reviews TO authenticated;


-- 1. Table pour les cours en ligne
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Informations du cours
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  -- Métadonnées
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  cover_image_url TEXT,
  -- Configuration
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  language TEXT DEFAULT 'fr',
  -- Durée et contenu
  estimated_duration_hours DECIMAL(5, 2), -- Durée estimée en heures
  total_lessons INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  -- Prix et accès
  price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  is_free BOOLEAN DEFAULT true,
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  tags TEXT[],
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Table pour les sections de cours (organisation des leçons)
CREATE TABLE IF NOT EXISTS public.course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, order_index)
);

-- 3. Table pour les leçons
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.course_sections(id) ON DELETE SET NULL,
  -- Informations de la leçon
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Contenu en Markdown ou HTML
  -- Type de contenu
  lesson_type TEXT DEFAULT 'video', -- 'video', 'text', 'quiz', 'assignment', 'live'
  video_url TEXT,
  video_duration_minutes INTEGER,
  -- Fichiers et ressources
  attachments JSONB, -- Array d'objets {url, filename, type, size}
  resources JSONB, -- Ressources supplémentaires
  -- Configuration
  is_preview BOOLEAN DEFAULT false, -- Leçon en aperçu (gratuite)
  is_required BOOLEAN DEFAULT true, -- Leçon obligatoire
  order_index INTEGER NOT NULL,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- 4. Table pour les quiz
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  -- Informations du quiz
  title TEXT NOT NULL,
  description TEXT,
  -- Configuration
  passing_score INTEGER DEFAULT 70, -- Score minimum pour réussir (%)
  time_limit_minutes INTEGER, -- Limite de temps (NULL = illimité)
  max_attempts INTEGER DEFAULT 3, -- Nombre maximum de tentatives
  shuffle_questions BOOLEAN DEFAULT false,
  show_results_immediately BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les questions de quiz
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  -- Question
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', 'short_answer', 'essay'
  -- Options et réponses
  options JSONB, -- Pour multiple_choice: [{text, is_correct}, ...]
  correct_answer TEXT, -- Pour short_answer et true_false
  explanation TEXT, -- Explication de la réponse
  -- Points
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table pour les tentatives de quiz
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Résultats
  score DECIMAL(5, 2), -- Score en pourcentage
  total_questions INTEGER,
  correct_answers INTEGER,
  is_passed BOOLEAN DEFAULT false,
  -- Réponses
  answers JSONB, -- {question_id: answer, ...}
  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_taken_minutes INTEGER
);

-- 7. Table pour les inscriptions aux cours
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  enrollment_status TEXT DEFAULT 'enrolled', -- 'enrolled', 'completed', 'dropped'
  -- Progression
  progress_percentage DECIMAL(5, 2) DEFAULT 0,
  completed_lessons INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  last_accessed_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  -- Dates
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(course_id, student_id)
);

-- 8. Table pour le suivi de progression des leçons
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Progression
  is_completed BOOLEAN DEFAULT false,
  completion_percentage DECIMAL(5, 2) DEFAULT 0, -- Pour les vidéos: % visionné
  time_spent_minutes INTEGER DEFAULT 0,
  -- Dates
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(lesson_id, student_id)
);

-- 9. Table pour les devoirs/assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  -- Informations
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  -- Configuration
  due_date TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100,
  allow_late_submission BOOLEAN DEFAULT false,
  -- Fichiers
  attachment_required BOOLEAN DEFAULT false,
  allowed_file_types TEXT[], -- ['pdf', 'doc', 'docx', ...]
  max_file_size_mb INTEGER DEFAULT 10,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Table pour les soumissions de devoirs
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Contenu
  submission_text TEXT,
  attachments JSONB, -- Array d'objets {url, filename, type, size}
  -- Évaluation
  score DECIMAL(5, 2),
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  -- Statut
  status TEXT DEFAULT 'submitted', -- 'submitted', 'graded', 'returned'
  -- Dates
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- 11. Table pour les certificats de complétion
CREATE TABLE IF NOT EXISTS public.course_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.course_enrollments(id) ON DELETE SET NULL,
  -- Informations du certificat
  certificate_number TEXT NOT NULL UNIQUE,
  certificate_url TEXT, -- URL du PDF du certificat
  -- Dates
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- 12. Table pour les notes et commentaires sur les cours
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Évaluation
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- 13. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_courses_org ON public.courses(organization_id, is_published);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_featured ON public.courses(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_course_sections_course ON public.course_sections(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_section ON public.lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id, student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id, student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON public.lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson ON public.assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON public.assignment_submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_course_certificates_course ON public.course_certificates(course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON public.course_reviews(course_id);

-- 14. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_elearning_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 15. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_courses_timestamp ON public.courses;
CREATE TRIGGER update_courses_timestamp
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_course_sections_timestamp ON public.course_sections;
CREATE TRIGGER update_course_sections_timestamp
  BEFORE UPDATE ON public.course_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_lessons_timestamp ON public.lessons;
CREATE TRIGGER update_lessons_timestamp
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_quizzes_timestamp ON public.quizzes;
CREATE TRIGGER update_quizzes_timestamp
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_quiz_questions_timestamp ON public.quiz_questions;
CREATE TRIGGER update_quiz_questions_timestamp
  BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_assignments_timestamp ON public.assignments;
CREATE TRIGGER update_assignments_timestamp
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_assignment_submissions_timestamp ON public.assignment_submissions;
CREATE TRIGGER update_assignment_submissions_timestamp
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_course_reviews_timestamp ON public.course_reviews;
CREATE TRIGGER update_course_reviews_timestamp
  BEFORE UPDATE ON public.course_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

-- 16. Fonction pour mettre à jour la progression du cours
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_lessons INTEGER;
  completed_count INTEGER;
  progress_pct DECIMAL(5, 2);
  enrollment_record RECORD;
BEGIN
  -- Récupérer l'inscription
  SELECT * INTO enrollment_record
  FROM public.course_enrollments
  WHERE student_id = NEW.student_id
    AND course_id = (SELECT course_id FROM public.lessons WHERE id = NEW.lesson_id);
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Compter le total de leçons du cours
  SELECT COUNT(*) INTO total_lessons
  FROM public.lessons
  WHERE course_id = enrollment_record.course_id;
  
  -- Compter les leçons complétées
  SELECT COUNT(*) INTO completed_count
  FROM public.lesson_progress
  WHERE student_id = NEW.student_id
    AND is_completed = true
    AND lesson_id IN (SELECT id FROM public.lessons WHERE course_id = enrollment_record.course_id);
  
  -- Calculer le pourcentage
  IF total_lessons > 0 THEN
    progress_pct := (completed_count::DECIMAL / total_lessons::DECIMAL) * 100;
  ELSE
    progress_pct := 0;
  END IF;
  
  -- Mettre à jour l'inscription
  UPDATE public.course_enrollments
  SET progress_percentage = progress_pct,
      completed_lessons = (
        SELECT ARRAY_AGG(lesson_id::INTEGER)
        FROM public.lesson_progress
        WHERE student_id = NEW.student_id
          AND is_completed = true
          AND lesson_id IN (SELECT id FROM public.lessons WHERE course_id = enrollment_record.course_id)
      ),
      enrollment_status = CASE
        WHEN progress_pct >= 100 THEN 'completed'
        ELSE 'enrolled'
      END,
      completed_at = CASE
        WHEN progress_pct >= 100 AND enrollment_record.completed_at IS NULL THEN NOW()
        ELSE enrollment_record.completed_at
      END
  WHERE id = enrollment_record.id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_course_progress ON public.lesson_progress;
CREATE TRIGGER trigger_update_course_progress
  AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW
  WHEN (NEW.is_completed = true)
  EXECUTE FUNCTION update_course_progress();

-- 17. Fonction pour générer le numéro de certificat
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  cert_num TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Trouver le dernier numéro de séquence pour cette année
  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.course_certificates
  WHERE certificate_number LIKE 'CERT-' || year_part || '-%';
  
  cert_num := 'CERT-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN cert_num;
END;
$$;

-- 18. Trigger pour générer automatiquement le numéro de certificat
CREATE OR REPLACE FUNCTION set_certificate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
    NEW.certificate_number := generate_certificate_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_certificate_number ON public.course_certificates;
CREATE TRIGGER trigger_set_certificate_number
  BEFORE INSERT ON public.course_certificates
  FOR EACH ROW
  EXECUTE FUNCTION set_certificate_number();

-- 19. RLS Policies pour courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published courses in their organization" ON public.courses;
CREATE POLICY "Users can view published courses in their organization"
  ON public.courses
  FOR SELECT
  USING (
    (is_published = true OR instructor_id = auth.uid())
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Instructors can manage their courses" ON public.courses;
CREATE POLICY "Instructors can manage their courses"
  ON public.courses
  FOR ALL
  USING (
    instructor_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage courses in their organization" ON public.courses;
CREATE POLICY "Admins can manage courses in their organization"
  ON public.courses
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 20. RLS Policies pour course_enrollments
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can view their own enrollments"
  ON public.course_enrollments
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can create their own enrollments"
  ON public.course_enrollments
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND course_id IN (
      SELECT id FROM public.courses
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Instructors can view enrollments for their courses" ON public.course_enrollments;
CREATE POLICY "Instructors can view enrollments for their courses"
  ON public.course_enrollments
  FOR SELECT
  USING (
    course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
  );

-- 21. RLS Policies pour lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lessons of published courses" ON public.lessons;
CREATE POLICY "Users can view lessons of published courses"
  ON public.lessons
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE is_published = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    OR course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Instructors can manage lessons of their courses" ON public.lessons;
CREATE POLICY "Instructors can manage lessons of their courses"
  ON public.lessons
  FOR ALL
  USING (
    course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
  );

-- 22. RLS pour quizzes, quiz_questions, quiz_attempts
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view quizzes of published courses" ON public.quizzes;
CREATE POLICY "Users can view quizzes of published courses"
  ON public.quizzes
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE is_published = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can view quiz questions"
  ON public.quiz_questions
  FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE course_id IN (
        SELECT id FROM public.courses
        WHERE is_published = true
        AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage their own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can manage their own quiz attempts"
  ON public.quiz_attempts
  FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can view quiz attempts for their courses" ON public.quiz_attempts;
CREATE POLICY "Instructors can view quiz attempts for their courses"
  ON public.quiz_attempts
  FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
    )
  );

-- 23. RLS Policies pour lesson_progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can manage their own lesson progress"
  ON public.lesson_progress
  FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can view lesson progress for their courses" ON public.lesson_progress;
CREATE POLICY "Instructors can view lesson progress for their courses"
  ON public.lesson_progress
  FOR SELECT
  USING (
    lesson_id IN (
      SELECT id FROM public.lessons
      WHERE course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
    )
  );

-- 24. RLS Policies pour assignments et assignment_submissions
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view assignments of published courses" ON public.assignments;
CREATE POLICY "Users can view assignments of published courses"
  ON public.assignments
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE is_published = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage their own assignment submissions" ON public.assignment_submissions;
CREATE POLICY "Users can manage their own assignment submissions"
  ON public.assignment_submissions
  FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can manage assignment submissions for their courses" ON public.assignment_submissions;
CREATE POLICY "Instructors can manage assignment submissions for their courses"
  ON public.assignment_submissions
  FOR ALL
  USING (
    assignment_id IN (
      SELECT id FROM public.assignments
      WHERE course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
    )
  );

-- 25. RLS Policies pour course_certificates
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own certificates" ON public.course_certificates;
CREATE POLICY "Users can view their own certificates"
  ON public.course_certificates
  FOR SELECT
  USING (student_id = auth.uid());

-- 26. RLS Policies pour course_reviews
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reviews" ON public.course_reviews;
CREATE POLICY "Users can view reviews"
  ON public.course_reviews
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create reviews for courses they completed" ON public.course_reviews;
CREATE POLICY "Users can create reviews for courses they completed"
  ON public.course_reviews
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND course_id IN (
      SELECT course_id FROM public.course_enrollments
      WHERE student_id = auth.uid()
      AND enrollment_status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.course_reviews;
CREATE POLICY "Users can update their own reviews"
  ON public.course_reviews
  FOR UPDATE
  USING (student_id = auth.uid());

-- 27. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT SELECT, INSERT ON public.course_certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.course_reviews TO authenticated;


-- 1. Table pour les cours en ligne
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  -- Informations du cours
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  -- Métadonnées
  instructor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  thumbnail_url TEXT,
  cover_image_url TEXT,
  -- Configuration
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  language TEXT DEFAULT 'fr',
  -- Durée et contenu
  estimated_duration_hours DECIMAL(5, 2), -- Durée estimée en heures
  total_lessons INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  -- Prix et accès
  price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  is_free BOOLEAN DEFAULT true,
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  tags TEXT[],
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Table pour les sections de cours (organisation des leçons)
CREATE TABLE IF NOT EXISTS public.course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, order_index)
);

-- 3. Table pour les leçons
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.course_sections(id) ON DELETE SET NULL,
  -- Informations de la leçon
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Contenu en Markdown ou HTML
  -- Type de contenu
  lesson_type TEXT DEFAULT 'video', -- 'video', 'text', 'quiz', 'assignment', 'live'
  video_url TEXT,
  video_duration_minutes INTEGER,
  -- Fichiers et ressources
  attachments JSONB, -- Array d'objets {url, filename, type, size}
  resources JSONB, -- Ressources supplémentaires
  -- Configuration
  is_preview BOOLEAN DEFAULT false, -- Leçon en aperçu (gratuite)
  is_required BOOLEAN DEFAULT true, -- Leçon obligatoire
  order_index INTEGER NOT NULL,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

-- 4. Table pour les quiz
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  -- Informations du quiz
  title TEXT NOT NULL,
  description TEXT,
  -- Configuration
  passing_score INTEGER DEFAULT 70, -- Score minimum pour réussir (%)
  time_limit_minutes INTEGER, -- Limite de temps (NULL = illimité)
  max_attempts INTEGER DEFAULT 3, -- Nombre maximum de tentatives
  shuffle_questions BOOLEAN DEFAULT false,
  show_results_immediately BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les questions de quiz
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  -- Question
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice', -- 'multiple_choice', 'true_false', 'short_answer', 'essay'
  -- Options et réponses
  options JSONB, -- Pour multiple_choice: [{text, is_correct}, ...]
  correct_answer TEXT, -- Pour short_answer et true_false
  explanation TEXT, -- Explication de la réponse
  -- Points
  points INTEGER DEFAULT 1,
  order_index INTEGER NOT NULL,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table pour les tentatives de quiz
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Résultats
  score DECIMAL(5, 2), -- Score en pourcentage
  total_questions INTEGER,
  correct_answers INTEGER,
  is_passed BOOLEAN DEFAULT false,
  -- Réponses
  answers JSONB, -- {question_id: answer, ...}
  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  time_taken_minutes INTEGER
);

-- 7. Table pour les inscriptions aux cours
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  enrollment_status TEXT DEFAULT 'enrolled', -- 'enrolled', 'completed', 'dropped'
  -- Progression
  progress_percentage DECIMAL(5, 2) DEFAULT 0,
  completed_lessons INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  last_accessed_lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  -- Dates
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(course_id, student_id)
);

-- 8. Table pour le suivi de progression des leçons
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Progression
  is_completed BOOLEAN DEFAULT false,
  completion_percentage DECIMAL(5, 2) DEFAULT 0, -- Pour les vidéos: % visionné
  time_spent_minutes INTEGER DEFAULT 0,
  -- Dates
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(lesson_id, student_id)
);

-- 9. Table pour les devoirs/assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  -- Informations
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  -- Configuration
  due_date TIMESTAMPTZ,
  max_score INTEGER DEFAULT 100,
  allow_late_submission BOOLEAN DEFAULT false,
  -- Fichiers
  attachment_required BOOLEAN DEFAULT false,
  allowed_file_types TEXT[], -- ['pdf', 'doc', 'docx', ...]
  max_file_size_mb INTEGER DEFAULT 10,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Table pour les soumissions de devoirs
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Contenu
  submission_text TEXT,
  attachments JSONB, -- Array d'objets {url, filename, type, size}
  -- Évaluation
  score DECIMAL(5, 2),
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  -- Statut
  status TEXT DEFAULT 'submitted', -- 'submitted', 'graded', 'returned'
  -- Dates
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- 11. Table pour les certificats de complétion
CREATE TABLE IF NOT EXISTS public.course_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.course_enrollments(id) ON DELETE SET NULL,
  -- Informations du certificat
  certificate_number TEXT NOT NULL UNIQUE,
  certificate_url TEXT, -- URL du PDF du certificat
  -- Dates
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- 12. Table pour les notes et commentaires sur les cours
CREATE TABLE IF NOT EXISTS public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Évaluation
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

-- 13. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_courses_org ON public.courses(organization_id, is_published);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_featured ON public.courses(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_course_sections_course ON public.course_sections(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_lessons_section ON public.lessons(section_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON public.quizzes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON public.quiz_questions(quiz_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON public.quiz_attempts(quiz_id, student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON public.quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson ON public.lesson_progress(lesson_id, student_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON public.lesson_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_lesson ON public.assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON public.assignment_submissions(assignment_id, student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_course_certificates_course ON public.course_certificates(course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON public.course_reviews(course_id);

-- 14. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_elearning_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 15. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_courses_timestamp ON public.courses;
CREATE TRIGGER update_courses_timestamp
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_course_sections_timestamp ON public.course_sections;
CREATE TRIGGER update_course_sections_timestamp
  BEFORE UPDATE ON public.course_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_lessons_timestamp ON public.lessons;
CREATE TRIGGER update_lessons_timestamp
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_quizzes_timestamp ON public.quizzes;
CREATE TRIGGER update_quizzes_timestamp
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_quiz_questions_timestamp ON public.quiz_questions;
CREATE TRIGGER update_quiz_questions_timestamp
  BEFORE UPDATE ON public.quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_assignments_timestamp ON public.assignments;
CREATE TRIGGER update_assignments_timestamp
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_assignment_submissions_timestamp ON public.assignment_submissions;
CREATE TRIGGER update_assignment_submissions_timestamp
  BEFORE UPDATE ON public.assignment_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

DROP TRIGGER IF EXISTS update_course_reviews_timestamp ON public.course_reviews;
CREATE TRIGGER update_course_reviews_timestamp
  BEFORE UPDATE ON public.course_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_elearning_updated_at();

-- 16. Fonction pour mettre à jour la progression du cours
CREATE OR REPLACE FUNCTION update_course_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  total_lessons INTEGER;
  completed_count INTEGER;
  progress_pct DECIMAL(5, 2);
  enrollment_record RECORD;
BEGIN
  -- Récupérer l'inscription
  SELECT * INTO enrollment_record
  FROM public.course_enrollments
  WHERE student_id = NEW.student_id
    AND course_id = (SELECT course_id FROM public.lessons WHERE id = NEW.lesson_id);
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Compter le total de leçons du cours
  SELECT COUNT(*) INTO total_lessons
  FROM public.lessons
  WHERE course_id = enrollment_record.course_id;
  
  -- Compter les leçons complétées
  SELECT COUNT(*) INTO completed_count
  FROM public.lesson_progress
  WHERE student_id = NEW.student_id
    AND is_completed = true
    AND lesson_id IN (SELECT id FROM public.lessons WHERE course_id = enrollment_record.course_id);
  
  -- Calculer le pourcentage
  IF total_lessons > 0 THEN
    progress_pct := (completed_count::DECIMAL / total_lessons::DECIMAL) * 100;
  ELSE
    progress_pct := 0;
  END IF;
  
  -- Mettre à jour l'inscription
  UPDATE public.course_enrollments
  SET progress_percentage = progress_pct,
      completed_lessons = (
        SELECT ARRAY_AGG(lesson_id::INTEGER)
        FROM public.lesson_progress
        WHERE student_id = NEW.student_id
          AND is_completed = true
          AND lesson_id IN (SELECT id FROM public.lessons WHERE course_id = enrollment_record.course_id)
      ),
      enrollment_status = CASE
        WHEN progress_pct >= 100 THEN 'completed'
        ELSE 'enrolled'
      END,
      completed_at = CASE
        WHEN progress_pct >= 100 AND enrollment_record.completed_at IS NULL THEN NOW()
        ELSE enrollment_record.completed_at
      END
  WHERE id = enrollment_record.id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_course_progress ON public.lesson_progress;
CREATE TRIGGER trigger_update_course_progress
  AFTER INSERT OR UPDATE ON public.lesson_progress
  FOR EACH ROW
  WHEN (NEW.is_completed = true)
  EXECUTE FUNCTION update_course_progress();

-- 17. Fonction pour générer le numéro de certificat
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  cert_num TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Trouver le dernier numéro de séquence pour cette année
  SELECT COALESCE(MAX(CAST(SUBSTRING(certificate_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.course_certificates
  WHERE certificate_number LIKE 'CERT-' || year_part || '-%';
  
  cert_num := 'CERT-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN cert_num;
END;
$$;

-- 18. Trigger pour générer automatiquement le numéro de certificat
CREATE OR REPLACE FUNCTION set_certificate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.certificate_number IS NULL OR NEW.certificate_number = '' THEN
    NEW.certificate_number := generate_certificate_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_certificate_number ON public.course_certificates;
CREATE TRIGGER trigger_set_certificate_number
  BEFORE INSERT ON public.course_certificates
  FOR EACH ROW
  EXECUTE FUNCTION set_certificate_number();

-- 19. RLS Policies pour courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published courses in their organization" ON public.courses;
CREATE POLICY "Users can view published courses in their organization"
  ON public.courses
  FOR SELECT
  USING (
    (is_published = true OR instructor_id = auth.uid())
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Instructors can manage their courses" ON public.courses;
CREATE POLICY "Instructors can manage their courses"
  ON public.courses
  FOR ALL
  USING (
    instructor_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage courses in their organization" ON public.courses;
CREATE POLICY "Admins can manage courses in their organization"
  ON public.courses
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 20. RLS Policies pour course_enrollments
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can view their own enrollments"
  ON public.course_enrollments
  FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.course_enrollments;
CREATE POLICY "Users can create their own enrollments"
  ON public.course_enrollments
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND course_id IN (
      SELECT id FROM public.courses
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Instructors can view enrollments for their courses" ON public.course_enrollments;
CREATE POLICY "Instructors can view enrollments for their courses"
  ON public.course_enrollments
  FOR SELECT
  USING (
    course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
  );

-- 21. RLS Policies pour lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lessons of published courses" ON public.lessons;
CREATE POLICY "Users can view lessons of published courses"
  ON public.lessons
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE is_published = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    OR course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Instructors can manage lessons of their courses" ON public.lessons;
CREATE POLICY "Instructors can manage lessons of their courses"
  ON public.lessons
  FOR ALL
  USING (
    course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
  );

-- 22. RLS pour quizzes, quiz_questions, quiz_attempts
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view quizzes of published courses" ON public.quizzes;
CREATE POLICY "Users can view quizzes of published courses"
  ON public.quizzes
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE is_published = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view quiz questions" ON public.quiz_questions;
CREATE POLICY "Users can view quiz questions"
  ON public.quiz_questions
  FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE course_id IN (
        SELECT id FROM public.courses
        WHERE is_published = true
        AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage their own quiz attempts" ON public.quiz_attempts;
CREATE POLICY "Users can manage their own quiz attempts"
  ON public.quiz_attempts
  FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can view quiz attempts for their courses" ON public.quiz_attempts;
CREATE POLICY "Instructors can view quiz attempts for their courses"
  ON public.quiz_attempts
  FOR SELECT
  USING (
    quiz_id IN (
      SELECT id FROM public.quizzes
      WHERE course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
    )
  );

-- 23. RLS Policies pour lesson_progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own lesson progress" ON public.lesson_progress;
CREATE POLICY "Users can manage their own lesson progress"
  ON public.lesson_progress
  FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can view lesson progress for their courses" ON public.lesson_progress;
CREATE POLICY "Instructors can view lesson progress for their courses"
  ON public.lesson_progress
  FOR SELECT
  USING (
    lesson_id IN (
      SELECT id FROM public.lessons
      WHERE course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
    )
  );

-- 24. RLS Policies pour assignments et assignment_submissions
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view assignments of published courses" ON public.assignments;
CREATE POLICY "Users can view assignments of published courses"
  ON public.assignments
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE is_published = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage their own assignment submissions" ON public.assignment_submissions;
CREATE POLICY "Users can manage their own assignment submissions"
  ON public.assignment_submissions
  FOR ALL
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Instructors can manage assignment submissions for their courses" ON public.assignment_submissions;
CREATE POLICY "Instructors can manage assignment submissions for their courses"
  ON public.assignment_submissions
  FOR ALL
  USING (
    assignment_id IN (
      SELECT id FROM public.assignments
      WHERE course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
    )
  );

-- 25. RLS Policies pour course_certificates
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own certificates" ON public.course_certificates;
CREATE POLICY "Users can view their own certificates"
  ON public.course_certificates
  FOR SELECT
  USING (student_id = auth.uid());

-- 26. RLS Policies pour course_reviews
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reviews" ON public.course_reviews;
CREATE POLICY "Users can view reviews"
  ON public.course_reviews
  FOR SELECT
  USING (
    course_id IN (
      SELECT id FROM public.courses
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create reviews for courses they completed" ON public.course_reviews;
CREATE POLICY "Users can create reviews for courses they completed"
  ON public.course_reviews
  FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND course_id IN (
      SELECT course_id FROM public.course_enrollments
      WHERE student_id = auth.uid()
      AND enrollment_status = 'completed'
    )
  );

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.course_reviews;
CREATE POLICY "Users can update their own reviews"
  ON public.course_reviews
  FOR UPDATE
  USING (student_id = auth.uid());

-- 27. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT SELECT, INSERT ON public.course_certificates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.course_reviews TO authenticated;

