-- =====================================================
-- Migration d'optimisation : Index et politiques RLS affinées
-- Date: 2024-12-06
-- À exécuter APRÈS 20241206_complete_migration.sql
-- =====================================================

-- =====================================================
-- INDEX pour améliorer les performances
-- =====================================================

-- Index pour session_teachers
CREATE INDEX IF NOT EXISTS idx_session_teachers_session_id ON public.session_teachers(session_id);
CREATE INDEX IF NOT EXISTS idx_session_teachers_teacher_id ON public.session_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_session_teachers_role ON public.session_teachers(role);

-- Index pour resource_categories
CREATE INDEX IF NOT EXISTS idx_resource_categories_org ON public.resource_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_resource_categories_parent ON public.resource_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_resource_categories_slug ON public.resource_categories(slug);

-- Index pour educational_resources
CREATE INDEX IF NOT EXISTS idx_educational_resources_org ON public.educational_resources(organization_id);
CREATE INDEX IF NOT EXISTS idx_educational_resources_category ON public.educational_resources(category_id);
CREATE INDEX IF NOT EXISTS idx_educational_resources_author ON public.educational_resources(author_id);
CREATE INDEX IF NOT EXISTS idx_educational_resources_status ON public.educational_resources(status);
CREATE INDEX IF NOT EXISTS idx_educational_resources_type ON public.educational_resources(type);

-- Index pour elearning_courses
CREATE INDEX IF NOT EXISTS idx_elearning_courses_org ON public.elearning_courses(organization_id);
CREATE INDEX IF NOT EXISTS idx_elearning_courses_formation ON public.elearning_courses(formation_id);
CREATE INDEX IF NOT EXISTS idx_elearning_courses_instructor ON public.elearning_courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_elearning_courses_status ON public.elearning_courses(status);
CREATE INDEX IF NOT EXISTS idx_elearning_courses_slug ON public.elearning_courses(slug);

-- Index pour course_enrollments
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_completed ON public.course_enrollments(completed_at);

-- Index pour quizzes
CREATE INDEX IF NOT EXISTS idx_quizzes_org ON public.quizzes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_session ON public.quizzes(session_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON public.quizzes(created_by);
CREATE INDEX IF NOT EXISTS idx_quizzes_active ON public.quizzes(is_active);

-- Index pour quiz_results
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz ON public.quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student ON public.quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_completed ON public.quiz_results(completed_at);
CREATE INDEX IF NOT EXISTS idx_quiz_results_passed ON public.quiz_results(passed);

-- Index pour learning_portfolio_templates
CREATE INDEX IF NOT EXISTS idx_portfolio_templates_org ON public.learning_portfolio_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_templates_formation ON public.learning_portfolio_templates(formation_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_templates_active ON public.learning_portfolio_templates(is_active);

-- Index pour learning_portfolios
CREATE INDEX IF NOT EXISTS idx_portfolios_org ON public.learning_portfolios(organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_student ON public.learning_portfolios(student_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_session ON public.learning_portfolios(session_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_template ON public.learning_portfolios(template_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON public.learning_portfolios(status);
CREATE INDEX IF NOT EXISTS idx_portfolios_visible ON public.learning_portfolios(is_visible_to_student);

-- Index pour learning_portfolio_entries
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_portfolio ON public.learning_portfolio_entries(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_section ON public.learning_portfolio_entries(section_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_evaluated ON public.learning_portfolio_entries(evaluated_by);

-- Index pour learning_portfolio_signatures
CREATE INDEX IF NOT EXISTS idx_portfolio_signatures_portfolio ON public.learning_portfolio_signatures(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_signatures_signer ON public.learning_portfolio_signatures(signer_id);

-- =====================================================
-- CONTRAINTES UNIQUE
-- =====================================================

-- Contrainte UNIQUE pour session_teachers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_teachers_session_id_teacher_id_key') THEN
        ALTER TABLE public.session_teachers ADD CONSTRAINT session_teachers_session_id_teacher_id_key UNIQUE(session_id, teacher_id);
    END IF;
END $$;

-- Contrainte UNIQUE pour course_enrollments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'course_enrollments_course_id_student_id_key') THEN
        ALTER TABLE public.course_enrollments ADD CONSTRAINT course_enrollments_course_id_student_id_key UNIQUE(course_id, student_id);
    END IF;
END $$;

-- Contrainte UNIQUE pour learning_portfolio_entries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_portfolio_entries_portfolio_section_field_key') THEN
        ALTER TABLE public.learning_portfolio_entries ADD CONSTRAINT learning_portfolio_entries_portfolio_section_field_key UNIQUE(portfolio_id, section_id, field_id);
    END IF;
END $$;

-- =====================================================
-- POLITIQUES RLS AFFINÉES
-- =====================================================

-- Supprimer les anciennes politiques basiques
DROP POLICY IF EXISTS "session_teachers_all" ON public.session_teachers;
DROP POLICY IF EXISTS "resource_categories_all" ON public.resource_categories;
DROP POLICY IF EXISTS "educational_resources_all" ON public.educational_resources;
DROP POLICY IF EXISTS "elearning_courses_all" ON public.elearning_courses;
DROP POLICY IF EXISTS "course_enrollments_all" ON public.course_enrollments;
DROP POLICY IF EXISTS "quizzes_all" ON public.quizzes;
DROP POLICY IF EXISTS "quiz_results_all" ON public.quiz_results;
DROP POLICY IF EXISTS "portfolio_templates_all" ON public.learning_portfolio_templates;
DROP POLICY IF EXISTS "portfolios_all" ON public.learning_portfolios;
DROP POLICY IF EXISTS "portfolio_entries_all" ON public.learning_portfolio_entries;
DROP POLICY IF EXISTS "portfolio_signatures_all" ON public.learning_portfolio_signatures;

-- Nouvelles politiques pour session_teachers
CREATE POLICY "session_teachers_select_own" ON public.session_teachers
    FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "session_teachers_select_admin" ON public.session_teachers
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'secretary')));

CREATE POLICY "session_teachers_manage" ON public.session_teachers
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'secretary')));

-- Nouvelles politiques pour resource_categories
CREATE POLICY "resource_categories_select" ON public.resource_categories
    FOR SELECT USING (true);

CREATE POLICY "resource_categories_manage" ON public.resource_categories
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

-- Nouvelles politiques pour educational_resources
CREATE POLICY "educational_resources_select" ON public.educational_resources
    FOR SELECT USING (status = 'published' OR author_id = auth.uid());

CREATE POLICY "educational_resources_insert" ON public.educational_resources
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "educational_resources_update" ON public.educational_resources
    FOR UPDATE USING (author_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

CREATE POLICY "educational_resources_delete" ON public.educational_resources
    FOR DELETE USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

-- Nouvelles politiques pour elearning_courses
CREATE POLICY "elearning_courses_select" ON public.elearning_courses
    FOR SELECT USING (status = 'published' OR instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

CREATE POLICY "elearning_courses_manage" ON public.elearning_courses
    FOR ALL USING (instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

-- Nouvelles politiques pour course_enrollments
CREATE POLICY "course_enrollments_select_student" ON public.course_enrollments
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = course_enrollments.student_id AND s.email = auth.jwt() ->> 'email'));

CREATE POLICY "course_enrollments_select_admin" ON public.course_enrollments
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher')));

CREATE POLICY "course_enrollments_manage" ON public.course_enrollments
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

-- Nouvelles politiques pour quizzes
CREATE POLICY "quizzes_select" ON public.quizzes
    FOR SELECT USING (is_active = true OR created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher')));

CREATE POLICY "quizzes_manage" ON public.quizzes
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher')));

-- Nouvelles politiques pour quiz_results
CREATE POLICY "quiz_results_select_student" ON public.quiz_results
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.students s WHERE s.id = quiz_results.student_id AND s.email = auth.jwt() ->> 'email'));

CREATE POLICY "quiz_results_select_admin" ON public.quiz_results
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher')));

CREATE POLICY "quiz_results_insert" ON public.quiz_results
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Nouvelles politiques pour learning_portfolio_templates
CREATE POLICY "portfolio_templates_select" ON public.learning_portfolio_templates
    FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

CREATE POLICY "portfolio_templates_manage" ON public.learning_portfolio_templates
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

-- Nouvelles politiques pour learning_portfolios
CREATE POLICY "portfolios_select_teacher" ON public.learning_portfolios
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
        OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = learning_portfolios.session_id AND st.teacher_id = auth.uid())
    );

CREATE POLICY "portfolios_select_admin" ON public.learning_portfolios
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'secretary')));

CREATE POLICY "portfolios_select_student" ON public.learning_portfolios
    FOR SELECT USING (
        is_visible_to_student = true
        AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = learning_portfolios.student_id AND s.email = auth.jwt() ->> 'email')
    );

CREATE POLICY "portfolios_update_teacher" ON public.learning_portfolios
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'teacher')
        OR EXISTS (SELECT 1 FROM public.session_teachers st WHERE st.session_id = learning_portfolios.session_id AND st.teacher_id = auth.uid())
    );

CREATE POLICY "portfolios_manage_admin" ON public.learning_portfolios
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin')));

CREATE POLICY "portfolios_insert" ON public.learning_portfolios
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Nouvelles politiques pour learning_portfolio_entries
CREATE POLICY "portfolio_entries_select" ON public.learning_portfolio_entries
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.learning_portfolios lp WHERE lp.id = learning_portfolio_entries.portfolio_id));

CREATE POLICY "portfolio_entries_manage" ON public.learning_portfolio_entries
    FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'teacher')));

-- Nouvelles politiques pour learning_portfolio_signatures
CREATE POLICY "portfolio_signatures_select" ON public.learning_portfolio_signatures
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.learning_portfolios lp WHERE lp.id = learning_portfolio_signatures.portfolio_id));

CREATE POLICY "portfolio_signatures_insert" ON public.learning_portfolio_signatures
    FOR INSERT WITH CHECK (signer_id = auth.uid());

-- Migration d'optimisation terminée !


