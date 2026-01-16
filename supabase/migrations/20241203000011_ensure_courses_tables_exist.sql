-- Migration pour s'assurer que les tables courses et course_enrollments existent
-- et ont les bonnes relations

-- Vérifier si les tables existent, sinon les créer
DO $$
BEGIN
  -- Créer la table courses si elle n'existe pas
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'courses') THEN
    CREATE TABLE public.courses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
      formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      short_description TEXT,
      instructor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      thumbnail_url TEXT,
      cover_image_url TEXT,
      is_published BOOLEAN DEFAULT false,
      is_featured BOOLEAN DEFAULT false,
      difficulty_level TEXT DEFAULT 'beginner',
      language TEXT DEFAULT 'fr',
      estimated_duration_hours DECIMAL(5, 2),
      total_lessons INTEGER DEFAULT 0,
      total_students INTEGER DEFAULT 0,
      price DECIMAL(10, 2) DEFAULT 0,
      currency TEXT DEFAULT 'EUR',
      is_free BOOLEAN DEFAULT true,
      meta_title TEXT,
      meta_description TEXT,
      tags TEXT[],
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(organization_id, slug)
    );
    
    -- Créer les index
    CREATE INDEX IF NOT EXISTS idx_courses_org ON public.courses(organization_id, is_published);
    CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
    CREATE INDEX IF NOT EXISTS idx_courses_instructor ON public.courses(instructor_id);
    CREATE INDEX IF NOT EXISTS idx_courses_featured ON public.courses(is_featured) WHERE is_featured = true;
    
    RAISE NOTICE 'Table courses créée';
  ELSE
    RAISE NOTICE 'Table courses existe déjà';
  END IF;

  -- Créer la table course_enrollments si elle n'existe pas
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'course_enrollments') THEN
    CREATE TABLE public.course_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      enrollment_status TEXT DEFAULT 'enrolled',
      progress_percentage DECIMAL(5, 2) DEFAULT 0,
      completed_lessons INTEGER[] DEFAULT ARRAY[]::INTEGER[],
      last_accessed_lesson_id UUID,
      enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      last_accessed_at TIMESTAMPTZ,
      UNIQUE(course_id, student_id)
    );
    
    -- Créer les index
    CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
    CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
    
    RAISE NOTICE 'Table course_enrollments créée';
  ELSE
    RAISE NOTICE 'Table course_enrollments existe déjà';
  END IF;

  -- Corriger la relation instructor_id si elle existe
  -- On supprime d'abord la contrainte si elle existe (peu importe où elle pointe)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'courses' 
      AND constraint_name = 'courses_instructor_id_fkey'
  ) THEN
    -- Supprimer l'ancienne contrainte
    ALTER TABLE public.courses DROP CONSTRAINT courses_instructor_id_fkey;
    RAISE NOTICE 'Ancienne contrainte instructor_id supprimée';
  END IF;

  -- Ajouter la nouvelle contrainte vers public.users (si la colonne existe)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'courses'
      AND column_name = 'instructor_id'
  ) THEN
    BEGIN
      ALTER TABLE public.courses
        ADD CONSTRAINT courses_instructor_id_fkey 
        FOREIGN KEY (instructor_id) 
        REFERENCES public.users(id) 
        ON DELETE SET NULL;
      RAISE NOTICE 'Relation instructor_id créée vers public.users';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE 'Relation instructor_id existe déjà';
    END;
  END IF;

  -- Activer RLS si ce n'est pas déjà fait
  ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

  -- Créer les RLS policies si elles n'existent pas
  -- Policy pour courses
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'courses' 
    AND policyname = 'Users can view published courses in their organization'
  ) THEN
    CREATE POLICY "Users can view published courses in their organization"
      ON public.courses
      FOR SELECT
      USING (
        (is_published = true OR instructor_id = auth.uid())
        AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'courses' 
    AND policyname = 'Instructors can manage their courses'
  ) THEN
    CREATE POLICY "Instructors can manage their courses"
      ON public.courses
      FOR ALL
      USING (
        instructor_id = auth.uid()
        AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'courses' 
    AND policyname = 'Admins can manage courses in their organization'
  ) THEN
    CREATE POLICY "Admins can manage courses in their organization"
      ON public.courses
      FOR ALL
      USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
      );
  END IF;

  -- Policies pour course_enrollments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'course_enrollments' 
    AND policyname = 'Users can view their own enrollments'
  ) THEN
    CREATE POLICY "Users can view their own enrollments"
      ON public.course_enrollments
      FOR SELECT
      USING (student_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'course_enrollments' 
    AND policyname = 'Users can create their own enrollments'
  ) THEN
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'course_enrollments' 
    AND policyname = 'Instructors can view enrollments for their courses'
  ) THEN
    CREATE POLICY "Instructors can view enrollments for their courses"
      ON public.course_enrollments
      FOR SELECT
      USING (
        course_id IN (SELECT id FROM public.courses WHERE instructor_id = auth.uid())
      );
  END IF;

  -- Permissions
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;

  RAISE NOTICE 'Migration terminée avec succès';
END $$;

