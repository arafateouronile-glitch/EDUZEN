-- Migration: Création des tables manquantes pour les fonctionnalités enseignant et e-learning
-- Date: 2024-12-06

-- =====================================================
-- Table: session_teachers (Association enseignants-sessions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.session_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'instructor', -- instructor, assistant, supervisor
    is_primary BOOLEAN DEFAULT false,
    hourly_rate DECIMAL(10, 2),
    total_hours DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, teacher_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_session_teachers_session_id ON public.session_teachers(session_id);
CREATE INDEX IF NOT EXISTS idx_session_teachers_teacher_id ON public.session_teachers(teacher_id);

-- RLS policies pour session_teachers
ALTER TABLE public.session_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir les affectations de leur organisation" ON public.session_teachers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.sessions s
            JOIN public.formations f ON s.formation_id = f.id
            WHERE s.id = session_teachers.session_id
            AND f.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Les enseignants peuvent voir leurs propres affectations" ON public.session_teachers
    FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Les admins peuvent gérer les affectations" ON public.session_teachers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'admin', 'secretary')
        )
    );

-- =====================================================
-- Table: resource_categories (Catégories de ressources)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.resource_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'folder',
    parent_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_resource_categories_org ON public.resource_categories(organization_id);

-- RLS
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir les catégories de leur organisation" ON public.resource_categories
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Les admins peuvent gérer les catégories" ON public.resource_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'admin')
            AND u.organization_id = resource_categories.organization_id
        )
    );

-- =====================================================
-- Table: educational_resources (Ressources pédagogiques)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.educational_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'document', -- document, video, audio, link, image
    file_url TEXT,
    file_size BIGINT,
    file_type VARCHAR(100),
    thumbnail_url TEXT,
    external_url TEXT,
    duration INTEGER, -- Durée en secondes pour les vidéos/audios
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    is_featured BOOLEAN DEFAULT false,
    is_downloadable BOOLEAN DEFAULT true,
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_educational_resources_org ON public.educational_resources(organization_id);
CREATE INDEX IF NOT EXISTS idx_educational_resources_category ON public.educational_resources(category_id);
CREATE INDEX IF NOT EXISTS idx_educational_resources_author ON public.educational_resources(author_id);
CREATE INDEX IF NOT EXISTS idx_educational_resources_status ON public.educational_resources(status);

-- RLS
ALTER TABLE public.educational_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir les ressources publiées de leur organisation" ON public.educational_resources
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (status = 'published' OR author_id = auth.uid())
    );

CREATE POLICY "Les auteurs peuvent modifier leurs ressources" ON public.educational_resources
    FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des ressources" ON public.educational_resources
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Les admins peuvent tout gérer" ON public.educational_resources
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'admin')
            AND u.organization_id = educational_resources.organization_id
        )
    );

-- =====================================================
-- Table: elearning_courses (Cours e-learning)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.elearning_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formation_id UUID REFERENCES public.formations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    instructor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    duration_hours DECIMAL(5, 2),
    difficulty_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived
    is_featured BOOLEAN DEFAULT false,
    price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    prerequisites TEXT[],
    learning_objectives TEXT[],
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_elearning_courses_org ON public.elearning_courses(organization_id);
CREATE INDEX IF NOT EXISTS idx_elearning_courses_formation ON public.elearning_courses(formation_id);
CREATE INDEX IF NOT EXISTS idx_elearning_courses_status ON public.elearning_courses(status);

-- RLS
ALTER TABLE public.elearning_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir les cours publiés de leur organisation" ON public.elearning_courses
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (status = 'published' OR instructor_id = auth.uid())
    );

CREATE POLICY "Les instructeurs peuvent modifier leurs cours" ON public.elearning_courses
    FOR UPDATE USING (instructor_id = auth.uid());

CREATE POLICY "Les admins peuvent tout gérer" ON public.elearning_courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'admin')
            AND u.organization_id = elearning_courses.organization_id
        )
    );

-- =====================================================
-- Table: course_enrollments (Inscriptions aux cours e-learning)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.elearning_courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress DECIMAL(5, 2) DEFAULT 0, -- Pourcentage de progression
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    certificate_url TEXT,
    metadata JSONB DEFAULT '{}',
    UNIQUE(course_id, student_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);

-- RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les étudiants peuvent voir leurs inscriptions" ON public.course_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = course_enrollments.student_id
            AND s.email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Les admins peuvent tout voir" ON public.course_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'admin', 'teacher')
        )
    );

-- =====================================================
-- Table: quizzes (Quiz)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.elearning_courses(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'assessment', -- assessment, practice, survey
    time_limit INTEGER, -- En minutes
    passing_score DECIMAL(5, 2) DEFAULT 60, -- Score minimum pour réussir (%)
    max_attempts INTEGER DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT false,
    show_answers BOOLEAN DEFAULT true, -- Montrer les réponses après
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_quizzes_org ON public.quizzes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_session ON public.quizzes(session_id);

-- RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir les quiz de leur organisation" ON public.quizzes
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Les admins peuvent gérer les quiz" ON public.quizzes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'admin', 'teacher')
            AND u.organization_id = quizzes.organization_id
        )
    );

-- =====================================================
-- Table: quiz_results (Résultats des quiz)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    score DECIMAL(5, 2) NOT NULL,
    max_score DECIMAL(5, 2) NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL,
    passed BOOLEAN NOT NULL,
    time_spent INTEGER, -- En secondes
    attempt_number INTEGER DEFAULT 1,
    answers JSONB DEFAULT '{}', -- Détail des réponses
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Index
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz ON public.quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student ON public.quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed ON public.quiz_results(completed_at);

-- RLS
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les étudiants peuvent voir leurs résultats" ON public.quiz_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = quiz_results.student_id
            AND s.email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Les admins et enseignants peuvent voir tous les résultats" ON public.quiz_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'admin', 'teacher')
        )
    );

-- =====================================================
-- Triggers pour updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger aux nouvelles tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['session_teachers', 'resource_categories', 'educational_resources', 'elearning_courses', 'quizzes']
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON public.%s
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- =====================================================
-- Commentaires sur les tables
-- =====================================================
COMMENT ON TABLE public.session_teachers IS 'Association entre les sessions de formation et les enseignants';
COMMENT ON TABLE public.resource_categories IS 'Catégories pour organiser les ressources pédagogiques';
COMMENT ON TABLE public.educational_resources IS 'Ressources pédagogiques (documents, vidéos, liens, etc.)';
COMMENT ON TABLE public.elearning_courses IS 'Cours e-learning associés aux formations';
COMMENT ON TABLE public.course_enrollments IS 'Inscriptions des apprenants aux cours e-learning';
COMMENT ON TABLE public.quizzes IS 'Quiz et évaluations';
COMMENT ON TABLE public.quiz_results IS 'Résultats des quiz passés par les apprenants';

