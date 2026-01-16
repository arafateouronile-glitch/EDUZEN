-- =====================================================
-- MIGRATION COMPLÈTE - Tables manquantes + Livret d'apprentissage
-- Date: 2024-12-06
-- Version ultra-simplifiée : tables uniquement, pas de RLS complexe
-- =====================================================

-- Table: session_teachers
CREATE TABLE IF NOT EXISTS public.session_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'instructor',
    is_primary BOOLEAN DEFAULT false,
    hourly_rate DECIMAL(10, 2),
    total_hours DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: resource_categories
CREATE TABLE IF NOT EXISTS public.resource_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'folder',
    parent_id UUID,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: educational_resources
CREATE TABLE IF NOT EXISTS public.educational_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    category_id UUID,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'document',
    file_url TEXT,
    file_size BIGINT,
    file_type VARCHAR(100),
    thumbnail_url TEXT,
    external_url TEXT,
    duration INTEGER,
    status VARCHAR(20) DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT false,
    is_downloadable BOOLEAN DEFAULT true,
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: elearning_courses
CREATE TABLE IF NOT EXISTS public.elearning_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formation_id UUID,
    organization_id UUID,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    instructor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    duration_hours DECIMAL(5, 2),
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    status VARCHAR(20) DEFAULT 'draft',
    is_featured BOOLEAN DEFAULT false,
    price DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'EUR',
    prerequisites TEXT[],
    learning_objectives TEXT[],
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: course_enrollments
CREATE TABLE IF NOT EXISTS public.course_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    progress DECIMAL(5, 2) DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    certificate_url TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Table: quizzes
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    course_id UUID,
    session_id UUID,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'assessment',
    time_limit INTEGER,
    passing_score DECIMAL(5, 2) DEFAULT 60,
    max_attempts INTEGER DEFAULT 1,
    shuffle_questions BOOLEAN DEFAULT false,
    show_answers BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: quiz_results
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    score DECIMAL(5, 2) NOT NULL,
    max_score DECIMAL(5, 2) NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL,
    passed BOOLEAN NOT NULL,
    time_spent INTEGER,
    attempt_number INTEGER DEFAULT 1,
    answers JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Table: learning_portfolio_templates
CREATE TABLE IF NOT EXISTS public.learning_portfolio_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_structure JSONB NOT NULL DEFAULT '[]',
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    header_logo_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#335ACF',
    secondary_color VARCHAR(20) DEFAULT '#34B9EE',
    formation_id UUID,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: learning_portfolios
CREATE TABLE IF NOT EXISTS public.learning_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    template_id UUID NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    session_id UUID,
    content JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'draft',
    progress_percentage DECIMAL(5, 2) DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by UUID REFERENCES public.users(id),
    is_visible_to_student BOOLEAN DEFAULT false,
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    teacher_notes TEXT,
    student_comments TEXT,
    last_modified_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: learning_portfolio_entries
CREATE TABLE IF NOT EXISTS public.learning_portfolio_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    section_id VARCHAR(100) NOT NULL,
    field_id VARCHAR(100) NOT NULL,
    value JSONB,
    score DECIMAL(5, 2),
    max_score DECIMAL(5, 2),
    grade VARCHAR(10),
    teacher_comment TEXT,
    attachments JSONB DEFAULT '[]',
    evaluated_by UUID REFERENCES public.users(id),
    evaluated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: learning_portfolio_signatures
CREATE TABLE IF NOT EXISTS public.learning_portfolio_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL,
    signer_type VARCHAR(20) NOT NULL,
    signer_id UUID REFERENCES public.users(id),
    signer_name VARCHAR(255),
    signer_role VARCHAR(100),
    signature_data TEXT,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Activer RLS (sans politiques pour l'instant)
ALTER TABLE public.session_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educational_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elearning_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_portfolio_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_portfolio_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_portfolio_signatures ENABLE ROW LEVEL SECURITY;

-- Politiques RLS basiques (accès complet pour les admins uniquement)
DO $$
BEGIN
    -- session_teachers
    DROP POLICY IF EXISTS "session_teachers_all" ON public.session_teachers;
    CREATE POLICY "session_teachers_all" ON public.session_teachers FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'secretary'))
    );
    
    -- resource_categories
    DROP POLICY IF EXISTS "resource_categories_all" ON public.resource_categories;
    CREATE POLICY "resource_categories_all" ON public.resource_categories FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );
    
    -- educational_resources
    DROP POLICY IF EXISTS "educational_resources_all" ON public.educational_resources;
    CREATE POLICY "educational_resources_all" ON public.educational_resources FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );
    
    -- elearning_courses
    DROP POLICY IF EXISTS "elearning_courses_all" ON public.elearning_courses;
    CREATE POLICY "elearning_courses_all" ON public.elearning_courses FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );
    
    -- course_enrollments
    DROP POLICY IF EXISTS "course_enrollments_all" ON public.course_enrollments;
    CREATE POLICY "course_enrollments_all" ON public.course_enrollments FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher'))
    );
    
    -- quizzes
    DROP POLICY IF EXISTS "quizzes_all" ON public.quizzes;
    CREATE POLICY "quizzes_all" ON public.quizzes FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher'))
    );
    
    -- quiz_results
    DROP POLICY IF EXISTS "quiz_results_all" ON public.quiz_results;
    CREATE POLICY "quiz_results_all" ON public.quiz_results FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher'))
    );
    
    -- learning_portfolio_templates
    DROP POLICY IF EXISTS "portfolio_templates_all" ON public.learning_portfolio_templates;
    CREATE POLICY "portfolio_templates_all" ON public.learning_portfolio_templates FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin'))
    );
    
    -- learning_portfolios
    DROP POLICY IF EXISTS "portfolios_all" ON public.learning_portfolios;
    CREATE POLICY "portfolios_all" ON public.learning_portfolios FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher', 'secretary'))
    );
    
    -- learning_portfolio_entries
    DROP POLICY IF EXISTS "portfolio_entries_all" ON public.learning_portfolio_entries;
    CREATE POLICY "portfolio_entries_all" ON public.learning_portfolio_entries FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher'))
    );
    
    -- learning_portfolio_signatures
    DROP POLICY IF EXISTS "portfolio_signatures_all" ON public.learning_portfolio_signatures;
    CREATE POLICY "portfolio_signatures_all" ON public.learning_portfolio_signatures FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher'))
    );
END $$;

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'session_teachers', 'resource_categories', 'educational_resources', 
        'elearning_courses', 'quizzes', 'learning_portfolio_templates',
        'learning_portfolios', 'learning_portfolio_entries'
    ]
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON public.%s;', t, t);
        EXECUTE format('
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON public.%s
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END $$;

-- Migration terminée !
