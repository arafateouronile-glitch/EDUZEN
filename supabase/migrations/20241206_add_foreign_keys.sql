-- =====================================================
-- Migration : Ajout des contraintes de clé étrangère manquantes
-- Date: 2024-12-06
-- À exécuter APRÈS 20241206_complete_migration.sql
-- =====================================================

-- Contrainte pour learning_portfolios.template_id -> learning_portfolio_templates.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'learning_portfolios_template_id_fkey'
    ) THEN
        ALTER TABLE public.learning_portfolios 
        ADD CONSTRAINT learning_portfolios_template_id_fkey 
        FOREIGN KEY (template_id) REFERENCES public.learning_portfolio_templates(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- Contrainte pour learning_portfolio_entries.portfolio_id -> learning_portfolios.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'learning_portfolio_entries_portfolio_id_fkey'
    ) THEN
        ALTER TABLE public.learning_portfolio_entries 
        ADD CONSTRAINT learning_portfolio_entries_portfolio_id_fkey 
        FOREIGN KEY (portfolio_id) REFERENCES public.learning_portfolios(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Contrainte pour learning_portfolio_signatures.portfolio_id -> learning_portfolios.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'learning_portfolio_signatures_portfolio_id_fkey'
    ) THEN
        ALTER TABLE public.learning_portfolio_signatures 
        ADD CONSTRAINT learning_portfolio_signatures_portfolio_id_fkey 
        FOREIGN KEY (portfolio_id) REFERENCES public.learning_portfolios(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Contrainte pour course_enrollments.course_id -> elearning_courses.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'course_enrollments_course_id_fkey'
    ) THEN
        ALTER TABLE public.course_enrollments 
        ADD CONSTRAINT course_enrollments_course_id_fkey 
        FOREIGN KEY (course_id) REFERENCES public.elearning_courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Contrainte pour quiz_results.quiz_id -> quizzes.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'quiz_results_quiz_id_fkey'
    ) THEN
        ALTER TABLE public.quiz_results 
        ADD CONSTRAINT quiz_results_quiz_id_fkey 
        FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Contrainte pour educational_resources.category_id -> resource_categories.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'educational_resources_category_id_fkey'
    ) THEN
        ALTER TABLE public.educational_resources 
        ADD CONSTRAINT educational_resources_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES public.resource_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Contrainte pour educational_resources.author_id -> users.id
DO $$
BEGIN
    -- Vérifier si la table users existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) THEN
        -- Vérifier si la colonne author_id existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'educational_resources' 
            AND column_name = 'author_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'educational_resources_author_id_fkey'
        ) THEN
            ALTER TABLE public.educational_resources 
            ADD CONSTRAINT educational_resources_author_id_fkey 
            FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Contrainte pour resource_categories.parent_id -> resource_categories.id
DO $$
BEGIN
    -- Ajouter la colonne parent_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'resource_categories' 
        AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE public.resource_categories ADD COLUMN parent_id UUID;
    END IF;
    
    -- Ajouter la contrainte si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'resource_categories_parent_id_fkey'
    ) THEN
        ALTER TABLE public.resource_categories 
        ADD CONSTRAINT resource_categories_parent_id_fkey 
        FOREIGN KEY (parent_id) REFERENCES public.resource_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Contrainte pour quizzes.course_id -> elearning_courses.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'quizzes_course_id_fkey'
    ) THEN
        ALTER TABLE public.quizzes 
        ADD CONSTRAINT quizzes_course_id_fkey 
        FOREIGN KEY (course_id) REFERENCES public.elearning_courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Contraintes vers sessions (seulement si la table sessions existe)
DO $$
BEGIN
    -- Vérifier si la table sessions existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sessions'
    ) THEN
        -- Contrainte pour session_teachers.session_id -> sessions.id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'session_teachers' 
            AND column_name = 'session_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'session_teachers_session_id_fkey'
        ) THEN
            ALTER TABLE public.session_teachers 
            ADD CONSTRAINT session_teachers_session_id_fkey 
            FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
        END IF;
        
        -- Contrainte pour learning_portfolios.session_id -> sessions.id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'learning_portfolios' 
            AND column_name = 'session_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'learning_portfolios_session_id_fkey'
        ) THEN
            ALTER TABLE public.learning_portfolios 
            ADD CONSTRAINT learning_portfolios_session_id_fkey 
            FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;
        END IF;
        
        -- Contrainte pour quizzes.session_id -> sessions.id
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'quizzes' 
            AND column_name = 'session_id'
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'quizzes_session_id_fkey'
        ) THEN
            ALTER TABLE public.quizzes 
            ADD CONSTRAINT quizzes_session_id_fkey 
            FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Migration terminée !

