-- Migration pour améliorer le module d'évaluations
-- Ajout de coefficients, rattrapages, appréciations et bulletins

-- 1. Ajouter des colonnes à la table grades pour les améliorations
ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS coefficient NUMERIC(5,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS is_makeup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appreciation TEXT,
  ADD COLUMN IF NOT EXISTS rank_in_class INTEGER,
  ADD COLUMN IF NOT EXISTS term_period TEXT, -- 'Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'T1', 'T2', 'T3'
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- 2. Créer la table des bulletins (report_cards)
CREATE TABLE IF NOT EXISTS public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  term_period TEXT NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'T1', 'T2', 'T3'
  overall_average NUMERIC(5,2),
  overall_rank INTEGER,
  total_students INTEGER,
  class_average NUMERIC(5,2),
  appreciation TEXT,
  principal_comment TEXT,
  parent_comment TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(student_id, session_id, term_period, academic_year_id)
);

-- 3. Créer la table des matières par bulletin (report_card_subjects)
CREATE TABLE IF NOT EXISTS public.report_card_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.report_cards(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  average_score NUMERIC(5,2),
  coefficient NUMERIC(5,2) DEFAULT 1.0,
  rank_in_subject INTEGER,
  total_students_in_subject INTEGER,
  subject_average NUMERIC(5,2),
  appreciation TEXT,
  teacher_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_card_id, subject)
);

-- 4. Créer la table des statistiques avancées par matière (subject_statistics)
CREATE TABLE IF NOT EXISTS public.subject_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  term_period TEXT,
  assessment_type TEXT,
  mean_score NUMERIC(5,2), -- Moyenne
  median_score NUMERIC(5,2), -- Médiane
  mode_score NUMERIC(5,2), -- Mode
  std_deviation NUMERIC(5,2), -- Écart-type
  min_score NUMERIC(5,2), -- Note minimale
  max_score NUMERIC(5,2), -- Note maximale
  q1_score NUMERIC(5,2), -- Premier quartile
  q3_score NUMERIC(5,2), -- Troisième quartile
  pass_rate NUMERIC(5,2), -- Taux de réussite (%)
  total_students INTEGER,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, session_id, academic_year_id, subject, term_period, assessment_type)
);

-- 5. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_grades_student_session_term ON public.grades(student_id, session_id, term_period);
CREATE INDEX IF NOT EXISTS idx_grades_academic_year ON public.grades(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_student_session ON public.report_cards(student_id, session_id, term_period);
CREATE INDEX IF NOT EXISTS idx_subject_statistics_org_session ON public.subject_statistics(organization_id, session_id, subject);

-- 6. Fonction pour calculer les statistiques avancées d'une matière
CREATE OR REPLACE FUNCTION public.calculate_subject_statistics(
  p_organization_id UUID,
  p_subject TEXT,
  p_session_id UUID DEFAULT NULL,
  p_academic_year_id UUID DEFAULT NULL,
  p_term_period TEXT DEFAULT NULL,
  p_assessment_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  mean_score NUMERIC,
  median_score NUMERIC,
  mode_score NUMERIC,
  std_deviation NUMERIC,
  min_score NUMERIC,
  max_score NUMERIC,
  q1_score NUMERIC,
  q3_score NUMERIC,
  pass_rate NUMERIC,
  total_students INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scores NUMERIC[];
  v_sorted_scores NUMERIC[];
  v_mean NUMERIC;
  v_median NUMERIC;
  v_mode NUMERIC;
  v_std_dev NUMERIC;
  v_min NUMERIC;
  v_max NUMERIC;
  v_q1 NUMERIC;
  v_q3 NUMERIC;
  v_pass_rate NUMERIC;
  v_total INTEGER;
  v_variance NUMERIC;
  v_count INTEGER;
BEGIN
  -- Récupérer tous les scores pour cette matière
  SELECT 
    ARRAY_AGG(percentage ORDER BY percentage),
    COUNT(*),
    AVG(percentage),
    MIN(percentage),
    MAX(percentage)
  INTO 
    v_scores,
    v_total,
    v_mean,
    v_min,
    v_max
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false; -- Exclure les rattrapages pour les stats principales

  -- Si aucun score, retourner NULL
  IF v_total = 0 OR v_scores IS NULL THEN
    RETURN QUERY SELECT NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, 0::INTEGER;
    RETURN;
  END IF;

  -- Calculer la médiane
  v_count := array_length(v_scores, 1);
  IF v_count % 2 = 0 THEN
    v_median := (v_scores[v_count / 2] + v_scores[v_count / 2 + 1]) / 2;
  ELSE
    v_median := v_scores[(v_count + 1) / 2];
  END IF;

  -- Calculer le mode (valeur la plus fréquente)
  SELECT mode() WITHIN GROUP (ORDER BY percentage)
  INTO v_mode
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false;

  -- Calculer l'écart-type
  SELECT 
    SQRT(SUM(POWER(percentage - v_mean, 2)) / v_total)
  INTO v_std_dev
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false;

  -- Calculer les quartiles
  v_q1 := v_scores[CEIL(v_count * 0.25)];
  v_q3 := v_scores[CEIL(v_count * 0.75)];

  -- Calculer le taux de réussite (>= 50% ou selon critère)
  SELECT 
    ROUND(COUNT(*) FILTER (WHERE percentage >= 50) * 100.0 / NULLIF(COUNT(*), 0), 2)
  INTO v_pass_rate
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false;

  RETURN QUERY SELECT 
    ROUND(v_mean, 2),
    ROUND(v_median, 2),
    ROUND(v_mode, 2),
    ROUND(v_std_dev, 2),
    v_min,
    v_max,
    ROUND(v_q1, 2),
    ROUND(v_q3, 2),
    v_pass_rate,
    v_total;
END;
$$;

-- 7. Fonction pour générer un bulletin automatiquement
CREATE OR REPLACE FUNCTION public.generate_report_card(
  p_student_id UUID,
  p_session_id UUID,
  p_term_period TEXT,
  p_academic_year_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
  v_report_card_id UUID;
  v_overall_average NUMERIC(5,2);
  v_total_coefficient NUMERIC(5,2);
  v_weighted_sum NUMERIC(5,2);
  v_rank INTEGER;
  v_total_students INTEGER;
  v_class_average NUMERIC(5,2);
BEGIN
  -- Récupérer l'organization_id depuis l'étudiant
  SELECT organization_id INTO v_organization_id
  FROM public.students
  WHERE id = p_student_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Student not found or has no organization';
  END IF;

  -- Calculer la moyenne générale pondérée
  SELECT 
    SUM(score * coefficient),
    SUM(max_score * coefficient)
  INTO v_weighted_sum, v_total_coefficient
  FROM public.grades
  WHERE student_id = p_student_id
    AND session_id = p_session_id
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (term_period = p_term_period OR term_period IS NULL)
    AND is_makeup = false
    AND max_score IS NOT NULL
    AND max_score > 0;

  IF v_total_coefficient > 0 THEN
    v_overall_average := ROUND((v_weighted_sum / v_total_coefficient) * 20, 2); -- Convertir sur 20
  END IF;

  -- Calculer le rang de l'étudiant
  SELECT 
    COUNT(*) + 1,
    COUNT(*)
  INTO v_rank, v_total_students
  FROM public.students s
  WHERE s.organization_id = v_organization_id
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = s.id
        AND e.session_id = p_session_id
    )
    AND s.id != p_student_id
    AND (
      SELECT COALESCE(ROUND(SUM(g.score * g.coefficient) / NULLIF(SUM(g.max_score * g.coefficient), 0) * 20, 2), 0)
      FROM public.grades g
      WHERE g.student_id = s.id
        AND g.session_id = p_session_id
        AND (p_academic_year_id IS NULL OR g.academic_year_id = p_academic_year_id)
        AND (g.term_period = p_term_period OR g.term_period IS NULL)
        AND g.is_makeup = false
        AND g.max_score IS NOT NULL
        AND g.max_score > 0
    ) > v_overall_average;

  -- Calculer la moyenne de classe
  SELECT 
    COALESCE(ROUND(AVG(
      (SELECT COALESCE(ROUND(SUM(g.score * g.coefficient) / NULLIF(SUM(g.max_score * g.coefficient), 0) * 20, 2), 0)
       FROM public.grades g
       WHERE g.student_id = s.id
         AND g.session_id = p_session_id
         AND (p_academic_year_id IS NULL OR g.academic_year_id = p_academic_year_id)
         AND (g.term_period = p_term_period OR g.term_period IS NULL)
         AND g.is_makeup = false
         AND g.max_score IS NOT NULL
         AND g.max_score > 0)
    ), 2), 0)
  INTO v_class_average
  FROM public.students s
  WHERE s.organization_id = v_organization_id
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = s.id
        AND e.session_id = p_session_id
    );

  -- Créer ou mettre à jour le bulletin
  INSERT INTO public.report_cards (
    organization_id,
    student_id,
    session_id,
    academic_year_id,
    term_period,
    overall_average,
    overall_rank,
    total_students,
    class_average,
    created_by
  )
  VALUES (
    v_organization_id,
    p_student_id,
    p_session_id,
    p_academic_year_id,
    p_term_period,
    v_overall_average,
    v_rank,
    v_total_students,
    v_class_average,
    auth.uid()
  )
  ON CONFLICT (student_id, session_id, term_period, academic_year_id)
  DO UPDATE SET
    overall_average = EXCLUDED.overall_average,
    overall_rank = EXCLUDED.overall_rank,
    total_students = EXCLUDED.total_students,
    class_average = EXCLUDED.class_average,
    updated_at = NOW()
  RETURNING id INTO v_report_card_id;

  -- Générer les entrées par matière
  INSERT INTO public.report_card_subjects (
    report_card_id,
    subject,
    average_score,
    coefficient,
    subject_average
  )
  SELECT 
    v_report_card_id,
    g.subject,
    ROUND(SUM(g.score * g.coefficient) / NULLIF(SUM(g.max_score * g.coefficient), 0) * 20, 2),
    SUM(g.coefficient),
    (SELECT COALESCE(ROUND(AVG(percentage), 2), 0)
     FROM public.grades
     WHERE subject = g.subject
       AND session_id = p_session_id
       AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
       AND (term_period = p_term_period OR term_period IS NULL)
       AND is_makeup = false
       AND percentage IS NOT NULL)
  FROM public.grades g
  WHERE g.student_id = p_student_id
    AND g.session_id = p_session_id
    AND (p_academic_year_id IS NULL OR g.academic_year_id = p_academic_year_id)
    AND (g.term_period = p_term_period OR g.term_period IS NULL)
    AND g.is_makeup = false
    AND g.max_score IS NOT NULL
    AND g.max_score > 0
  GROUP BY g.subject
  ON CONFLICT (report_card_id, subject)
  DO UPDATE SET
    average_score = EXCLUDED.average_score,
    coefficient = EXCLUDED.coefficient,
    subject_average = EXCLUDED.subject_average;

  RETURN v_report_card_id;
END;
$$;

-- 8. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_report_cards_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_report_cards_timestamp ON public.report_cards;
CREATE TRIGGER update_report_cards_timestamp
  BEFORE UPDATE ON public.report_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_report_cards_timestamp();

-- 9. RLS Policies pour report_cards
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can view report cards in their organization"
  ON public.report_cards
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can create report cards in their organization"
  ON public.report_cards
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can update report cards in their organization"
  ON public.report_cards
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can delete report cards in their organization"
  ON public.report_cards
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 10. RLS Policies pour report_card_subjects
ALTER TABLE public.report_card_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view report card subjects in their organization" ON public.report_card_subjects;
CREATE POLICY "Users can view report card subjects in their organization"
  ON public.report_card_subjects
  FOR SELECT
  USING (
    report_card_id IN (
      SELECT id FROM public.report_cards
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage report card subjects in their organization" ON public.report_card_subjects;
CREATE POLICY "Users can manage report card subjects in their organization"
  ON public.report_card_subjects
  FOR ALL
  USING (
    report_card_id IN (
      SELECT id FROM public.report_cards
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- 11. RLS Policies pour subject_statistics
ALTER TABLE public.subject_statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view subject statistics in their organization" ON public.subject_statistics;
CREATE POLICY "Users can view subject statistics in their organization"
  ON public.subject_statistics
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage subject statistics in their organization" ON public.subject_statistics;
CREATE POLICY "Users can manage subject statistics in their organization"
  ON public.subject_statistics
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 12. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_card_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_subject_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_report_card TO authenticated;



-- 1. Ajouter des colonnes à la table grades pour les améliorations
ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS coefficient NUMERIC(5,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS is_makeup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appreciation TEXT,
  ADD COLUMN IF NOT EXISTS rank_in_class INTEGER,
  ADD COLUMN IF NOT EXISTS term_period TEXT, -- 'Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'T1', 'T2', 'T3'
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- 2. Créer la table des bulletins (report_cards)
CREATE TABLE IF NOT EXISTS public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  term_period TEXT NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'T1', 'T2', 'T3'
  overall_average NUMERIC(5,2),
  overall_rank INTEGER,
  total_students INTEGER,
  class_average NUMERIC(5,2),
  appreciation TEXT,
  principal_comment TEXT,
  parent_comment TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(student_id, session_id, term_period, academic_year_id)
);

-- 3. Créer la table des matières par bulletin (report_card_subjects)
CREATE TABLE IF NOT EXISTS public.report_card_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.report_cards(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  average_score NUMERIC(5,2),
  coefficient NUMERIC(5,2) DEFAULT 1.0,
  rank_in_subject INTEGER,
  total_students_in_subject INTEGER,
  subject_average NUMERIC(5,2),
  appreciation TEXT,
  teacher_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_card_id, subject)
);

-- 4. Créer la table des statistiques avancées par matière (subject_statistics)
CREATE TABLE IF NOT EXISTS public.subject_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  term_period TEXT,
  assessment_type TEXT,
  mean_score NUMERIC(5,2), -- Moyenne
  median_score NUMERIC(5,2), -- Médiane
  mode_score NUMERIC(5,2), -- Mode
  std_deviation NUMERIC(5,2), -- Écart-type
  min_score NUMERIC(5,2), -- Note minimale
  max_score NUMERIC(5,2), -- Note maximale
  q1_score NUMERIC(5,2), -- Premier quartile
  q3_score NUMERIC(5,2), -- Troisième quartile
  pass_rate NUMERIC(5,2), -- Taux de réussite (%)
  total_students INTEGER,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, session_id, academic_year_id, subject, term_period, assessment_type)
);

-- 5. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_grades_student_session_term ON public.grades(student_id, session_id, term_period);
CREATE INDEX IF NOT EXISTS idx_grades_academic_year ON public.grades(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_student_session ON public.report_cards(student_id, session_id, term_period);
CREATE INDEX IF NOT EXISTS idx_subject_statistics_org_session ON public.subject_statistics(organization_id, session_id, subject);

-- 6. Fonction pour calculer les statistiques avancées d'une matière
CREATE OR REPLACE FUNCTION public.calculate_subject_statistics(
  p_organization_id UUID,
  p_subject TEXT,
  p_session_id UUID DEFAULT NULL,
  p_academic_year_id UUID DEFAULT NULL,
  p_term_period TEXT DEFAULT NULL,
  p_assessment_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  mean_score NUMERIC,
  median_score NUMERIC,
  mode_score NUMERIC,
  std_deviation NUMERIC,
  min_score NUMERIC,
  max_score NUMERIC,
  q1_score NUMERIC,
  q3_score NUMERIC,
  pass_rate NUMERIC,
  total_students INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scores NUMERIC[];
  v_sorted_scores NUMERIC[];
  v_mean NUMERIC;
  v_median NUMERIC;
  v_mode NUMERIC;
  v_std_dev NUMERIC;
  v_min NUMERIC;
  v_max NUMERIC;
  v_q1 NUMERIC;
  v_q3 NUMERIC;
  v_pass_rate NUMERIC;
  v_total INTEGER;
  v_variance NUMERIC;
  v_count INTEGER;
BEGIN
  -- Récupérer tous les scores pour cette matière
  SELECT 
    ARRAY_AGG(percentage ORDER BY percentage),
    COUNT(*),
    AVG(percentage),
    MIN(percentage),
    MAX(percentage)
  INTO 
    v_scores,
    v_total,
    v_mean,
    v_min,
    v_max
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false; -- Exclure les rattrapages pour les stats principales

  -- Si aucun score, retourner NULL
  IF v_total = 0 OR v_scores IS NULL THEN
    RETURN QUERY SELECT NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, 0::INTEGER;
    RETURN;
  END IF;

  -- Calculer la médiane
  v_count := array_length(v_scores, 1);
  IF v_count % 2 = 0 THEN
    v_median := (v_scores[v_count / 2] + v_scores[v_count / 2 + 1]) / 2;
  ELSE
    v_median := v_scores[(v_count + 1) / 2];
  END IF;

  -- Calculer le mode (valeur la plus fréquente)
  SELECT mode() WITHIN GROUP (ORDER BY percentage)
  INTO v_mode
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false;

  -- Calculer l'écart-type
  SELECT 
    SQRT(SUM(POWER(percentage - v_mean, 2)) / v_total)
  INTO v_std_dev
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false;

  -- Calculer les quartiles
  v_q1 := v_scores[CEIL(v_count * 0.25)];
  v_q3 := v_scores[CEIL(v_count * 0.75)];

  -- Calculer le taux de réussite (>= 50% ou selon critère)
  SELECT 
    ROUND(COUNT(*) FILTER (WHERE percentage >= 50) * 100.0 / NULLIF(COUNT(*), 0), 2)
  INTO v_pass_rate
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false;

  RETURN QUERY SELECT 
    ROUND(v_mean, 2),
    ROUND(v_median, 2),
    ROUND(v_mode, 2),
    ROUND(v_std_dev, 2),
    v_min,
    v_max,
    ROUND(v_q1, 2),
    ROUND(v_q3, 2),
    v_pass_rate,
    v_total;
END;
$$;

-- 7. Fonction pour générer un bulletin automatiquement
CREATE OR REPLACE FUNCTION public.generate_report_card(
  p_student_id UUID,
  p_session_id UUID,
  p_term_period TEXT,
  p_academic_year_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
  v_report_card_id UUID;
  v_overall_average NUMERIC(5,2);
  v_total_coefficient NUMERIC(5,2);
  v_weighted_sum NUMERIC(5,2);
  v_rank INTEGER;
  v_total_students INTEGER;
  v_class_average NUMERIC(5,2);
BEGIN
  -- Récupérer l'organization_id depuis l'étudiant
  SELECT organization_id INTO v_organization_id
  FROM public.students
  WHERE id = p_student_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Student not found or has no organization';
  END IF;

  -- Calculer la moyenne générale pondérée
  SELECT 
    SUM(score * coefficient),
    SUM(max_score * coefficient)
  INTO v_weighted_sum, v_total_coefficient
  FROM public.grades
  WHERE student_id = p_student_id
    AND session_id = p_session_id
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (term_period = p_term_period OR term_period IS NULL)
    AND is_makeup = false
    AND max_score IS NOT NULL
    AND max_score > 0;

  IF v_total_coefficient > 0 THEN
    v_overall_average := ROUND((v_weighted_sum / v_total_coefficient) * 20, 2); -- Convertir sur 20
  END IF;

  -- Calculer le rang de l'étudiant
  SELECT 
    COUNT(*) + 1,
    COUNT(*)
  INTO v_rank, v_total_students
  FROM public.students s
  WHERE s.organization_id = v_organization_id
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = s.id
        AND e.session_id = p_session_id
    )
    AND s.id != p_student_id
    AND (
      SELECT COALESCE(ROUND(SUM(g.score * g.coefficient) / NULLIF(SUM(g.max_score * g.coefficient), 0) * 20, 2), 0)
      FROM public.grades g
      WHERE g.student_id = s.id
        AND g.session_id = p_session_id
        AND (p_academic_year_id IS NULL OR g.academic_year_id = p_academic_year_id)
        AND (g.term_period = p_term_period OR g.term_period IS NULL)
        AND g.is_makeup = false
        AND g.max_score IS NOT NULL
        AND g.max_score > 0
    ) > v_overall_average;

  -- Calculer la moyenne de classe
  SELECT 
    COALESCE(ROUND(AVG(
      (SELECT COALESCE(ROUND(SUM(g.score * g.coefficient) / NULLIF(SUM(g.max_score * g.coefficient), 0) * 20, 2), 0)
       FROM public.grades g
       WHERE g.student_id = s.id
         AND g.session_id = p_session_id
         AND (p_academic_year_id IS NULL OR g.academic_year_id = p_academic_year_id)
         AND (g.term_period = p_term_period OR g.term_period IS NULL)
         AND g.is_makeup = false
         AND g.max_score IS NOT NULL
         AND g.max_score > 0)
    ), 2), 0)
  INTO v_class_average
  FROM public.students s
  WHERE s.organization_id = v_organization_id
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = s.id
        AND e.session_id = p_session_id
    );

  -- Créer ou mettre à jour le bulletin
  INSERT INTO public.report_cards (
    organization_id,
    student_id,
    session_id,
    academic_year_id,
    term_period,
    overall_average,
    overall_rank,
    total_students,
    class_average,
    created_by
  )
  VALUES (
    v_organization_id,
    p_student_id,
    p_session_id,
    p_academic_year_id,
    p_term_period,
    v_overall_average,
    v_rank,
    v_total_students,
    v_class_average,
    auth.uid()
  )
  ON CONFLICT (student_id, session_id, term_period, academic_year_id)
  DO UPDATE SET
    overall_average = EXCLUDED.overall_average,
    overall_rank = EXCLUDED.overall_rank,
    total_students = EXCLUDED.total_students,
    class_average = EXCLUDED.class_average,
    updated_at = NOW()
  RETURNING id INTO v_report_card_id;

  -- Générer les entrées par matière
  INSERT INTO public.report_card_subjects (
    report_card_id,
    subject,
    average_score,
    coefficient,
    subject_average
  )
  SELECT 
    v_report_card_id,
    g.subject,
    ROUND(SUM(g.score * g.coefficient) / NULLIF(SUM(g.max_score * g.coefficient), 0) * 20, 2),
    SUM(g.coefficient),
    (SELECT COALESCE(ROUND(AVG(percentage), 2), 0)
     FROM public.grades
     WHERE subject = g.subject
       AND session_id = p_session_id
       AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
       AND (term_period = p_term_period OR term_period IS NULL)
       AND is_makeup = false
       AND percentage IS NOT NULL)
  FROM public.grades g
  WHERE g.student_id = p_student_id
    AND g.session_id = p_session_id
    AND (p_academic_year_id IS NULL OR g.academic_year_id = p_academic_year_id)
    AND (g.term_period = p_term_period OR g.term_period IS NULL)
    AND g.is_makeup = false
    AND g.max_score IS NOT NULL
    AND g.max_score > 0
  GROUP BY g.subject
  ON CONFLICT (report_card_id, subject)
  DO UPDATE SET
    average_score = EXCLUDED.average_score,
    coefficient = EXCLUDED.coefficient,
    subject_average = EXCLUDED.subject_average;

  RETURN v_report_card_id;
END;
$$;

-- 8. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_report_cards_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_report_cards_timestamp ON public.report_cards;
CREATE TRIGGER update_report_cards_timestamp
  BEFORE UPDATE ON public.report_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_report_cards_timestamp();

-- 9. RLS Policies pour report_cards
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can view report cards in their organization"
  ON public.report_cards
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can create report cards in their organization"
  ON public.report_cards
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can update report cards in their organization"
  ON public.report_cards
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can delete report cards in their organization"
  ON public.report_cards
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 10. RLS Policies pour report_card_subjects
ALTER TABLE public.report_card_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view report card subjects in their organization" ON public.report_card_subjects;
CREATE POLICY "Users can view report card subjects in their organization"
  ON public.report_card_subjects
  FOR SELECT
  USING (
    report_card_id IN (
      SELECT id FROM public.report_cards
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage report card subjects in their organization" ON public.report_card_subjects;
CREATE POLICY "Users can manage report card subjects in their organization"
  ON public.report_card_subjects
  FOR ALL
  USING (
    report_card_id IN (
      SELECT id FROM public.report_cards
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- 11. RLS Policies pour subject_statistics
ALTER TABLE public.subject_statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view subject statistics in their organization" ON public.subject_statistics;
CREATE POLICY "Users can view subject statistics in their organization"
  ON public.subject_statistics
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage subject statistics in their organization" ON public.subject_statistics;
CREATE POLICY "Users can manage subject statistics in their organization"
  ON public.subject_statistics
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 12. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_card_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_subject_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_report_card TO authenticated;



-- 1. Ajouter des colonnes à la table grades pour les améliorations
ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS coefficient NUMERIC(5,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS is_makeup BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_grade_id UUID REFERENCES public.grades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS appreciation TEXT,
  ADD COLUMN IF NOT EXISTS rank_in_class INTEGER,
  ADD COLUMN IF NOT EXISTS term_period TEXT, -- 'Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'T1', 'T2', 'T3'
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL;

-- 2. Créer la table des bulletins (report_cards)
CREATE TABLE IF NOT EXISTS public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  term_period TEXT NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4', 'S1', 'S2', 'T1', 'T2', 'T3'
  overall_average NUMERIC(5,2),
  overall_rank INTEGER,
  total_students INTEGER,
  class_average NUMERIC(5,2),
  appreciation TEXT,
  principal_comment TEXT,
  parent_comment TEXT,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(student_id, session_id, term_period, academic_year_id)
);

-- 3. Créer la table des matières par bulletin (report_card_subjects)
CREATE TABLE IF NOT EXISTS public.report_card_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.report_cards(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  average_score NUMERIC(5,2),
  coefficient NUMERIC(5,2) DEFAULT 1.0,
  rank_in_subject INTEGER,
  total_students_in_subject INTEGER,
  subject_average NUMERIC(5,2),
  appreciation TEXT,
  teacher_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_card_id, subject)
);

-- 4. Créer la table des statistiques avancées par matière (subject_statistics)
CREATE TABLE IF NOT EXISTS public.subject_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  term_period TEXT,
  assessment_type TEXT,
  mean_score NUMERIC(5,2), -- Moyenne
  median_score NUMERIC(5,2), -- Médiane
  mode_score NUMERIC(5,2), -- Mode
  std_deviation NUMERIC(5,2), -- Écart-type
  min_score NUMERIC(5,2), -- Note minimale
  max_score NUMERIC(5,2), -- Note maximale
  q1_score NUMERIC(5,2), -- Premier quartile
  q3_score NUMERIC(5,2), -- Troisième quartile
  pass_rate NUMERIC(5,2), -- Taux de réussite (%)
  total_students INTEGER,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, session_id, academic_year_id, subject, term_period, assessment_type)
);

-- 5. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_grades_student_session_term ON public.grades(student_id, session_id, term_period);
CREATE INDEX IF NOT EXISTS idx_grades_academic_year ON public.grades(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_report_cards_student_session ON public.report_cards(student_id, session_id, term_period);
CREATE INDEX IF NOT EXISTS idx_subject_statistics_org_session ON public.subject_statistics(organization_id, session_id, subject);

-- 6. Fonction pour calculer les statistiques avancées d'une matière
CREATE OR REPLACE FUNCTION public.calculate_subject_statistics(
  p_organization_id UUID,
  p_subject TEXT,
  p_session_id UUID DEFAULT NULL,
  p_academic_year_id UUID DEFAULT NULL,
  p_term_period TEXT DEFAULT NULL,
  p_assessment_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  mean_score NUMERIC,
  median_score NUMERIC,
  mode_score NUMERIC,
  std_deviation NUMERIC,
  min_score NUMERIC,
  max_score NUMERIC,
  q1_score NUMERIC,
  q3_score NUMERIC,
  pass_rate NUMERIC,
  total_students INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scores NUMERIC[];
  v_sorted_scores NUMERIC[];
  v_mean NUMERIC;
  v_median NUMERIC;
  v_mode NUMERIC;
  v_std_dev NUMERIC;
  v_min NUMERIC;
  v_max NUMERIC;
  v_q1 NUMERIC;
  v_q3 NUMERIC;
  v_pass_rate NUMERIC;
  v_total INTEGER;
  v_variance NUMERIC;
  v_count INTEGER;
BEGIN
  -- Récupérer tous les scores pour cette matière
  SELECT 
    ARRAY_AGG(percentage ORDER BY percentage),
    COUNT(*),
    AVG(percentage),
    MIN(percentage),
    MAX(percentage)
  INTO 
    v_scores,
    v_total,
    v_mean,
    v_min,
    v_max
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false; -- Exclure les rattrapages pour les stats principales

  -- Si aucun score, retourner NULL
  IF v_total = 0 OR v_scores IS NULL THEN
    RETURN QUERY SELECT NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, 0::INTEGER;
    RETURN;
  END IF;

  -- Calculer la médiane
  v_count := array_length(v_scores, 1);
  IF v_count % 2 = 0 THEN
    v_median := (v_scores[v_count / 2] + v_scores[v_count / 2 + 1]) / 2;
  ELSE
    v_median := v_scores[(v_count + 1) / 2];
  END IF;

  -- Calculer le mode (valeur la plus fréquente)
  SELECT mode() WITHIN GROUP (ORDER BY percentage)
  INTO v_mode
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false;

  -- Calculer l'écart-type
  SELECT 
    SQRT(SUM(POWER(percentage - v_mean, 2)) / v_total)
  INTO v_std_dev
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false;

  -- Calculer les quartiles
  v_q1 := v_scores[CEIL(v_count * 0.25)];
  v_q3 := v_scores[CEIL(v_count * 0.75)];

  -- Calculer le taux de réussite (>= 50% ou selon critère)
  SELECT 
    ROUND(COUNT(*) FILTER (WHERE percentage >= 50) * 100.0 / NULLIF(COUNT(*), 0), 2)
  INTO v_pass_rate
  FROM public.grades
  WHERE organization_id = p_organization_id
    AND subject = p_subject
    AND (p_session_id IS NULL OR session_id = p_session_id)
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (p_term_period IS NULL OR term_period = p_term_period)
    AND (p_assessment_type IS NULL OR assessment_type = p_assessment_type)
    AND percentage IS NOT NULL
    AND is_makeup = false;

  RETURN QUERY SELECT 
    ROUND(v_mean, 2),
    ROUND(v_median, 2),
    ROUND(v_mode, 2),
    ROUND(v_std_dev, 2),
    v_min,
    v_max,
    ROUND(v_q1, 2),
    ROUND(v_q3, 2),
    v_pass_rate,
    v_total;
END;
$$;

-- 7. Fonction pour générer un bulletin automatiquement
CREATE OR REPLACE FUNCTION public.generate_report_card(
  p_student_id UUID,
  p_session_id UUID,
  p_term_period TEXT,
  p_academic_year_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
  v_report_card_id UUID;
  v_overall_average NUMERIC(5,2);
  v_total_coefficient NUMERIC(5,2);
  v_weighted_sum NUMERIC(5,2);
  v_rank INTEGER;
  v_total_students INTEGER;
  v_class_average NUMERIC(5,2);
BEGIN
  -- Récupérer l'organization_id depuis l'étudiant
  SELECT organization_id INTO v_organization_id
  FROM public.students
  WHERE id = p_student_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Student not found or has no organization';
  END IF;

  -- Calculer la moyenne générale pondérée
  SELECT 
    SUM(score * coefficient),
    SUM(max_score * coefficient)
  INTO v_weighted_sum, v_total_coefficient
  FROM public.grades
  WHERE student_id = p_student_id
    AND session_id = p_session_id
    AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
    AND (term_period = p_term_period OR term_period IS NULL)
    AND is_makeup = false
    AND max_score IS NOT NULL
    AND max_score > 0;

  IF v_total_coefficient > 0 THEN
    v_overall_average := ROUND((v_weighted_sum / v_total_coefficient) * 20, 2); -- Convertir sur 20
  END IF;

  -- Calculer le rang de l'étudiant
  SELECT 
    COUNT(*) + 1,
    COUNT(*)
  INTO v_rank, v_total_students
  FROM public.students s
  WHERE s.organization_id = v_organization_id
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = s.id
        AND e.session_id = p_session_id
    )
    AND s.id != p_student_id
    AND (
      SELECT COALESCE(ROUND(SUM(g.score * g.coefficient) / NULLIF(SUM(g.max_score * g.coefficient), 0) * 20, 2), 0)
      FROM public.grades g
      WHERE g.student_id = s.id
        AND g.session_id = p_session_id
        AND (p_academic_year_id IS NULL OR g.academic_year_id = p_academic_year_id)
        AND (g.term_period = p_term_period OR g.term_period IS NULL)
        AND g.is_makeup = false
        AND g.max_score IS NOT NULL
        AND g.max_score > 0
    ) > v_overall_average;

  -- Calculer la moyenne de classe
  SELECT 
    COALESCE(ROUND(AVG(
      (SELECT COALESCE(ROUND(SUM(g.score * g.coefficient) / NULLIF(SUM(g.max_score * g.coefficient), 0) * 20, 2), 0)
       FROM public.grades g
       WHERE g.student_id = s.id
         AND g.session_id = p_session_id
         AND (p_academic_year_id IS NULL OR g.academic_year_id = p_academic_year_id)
         AND (g.term_period = p_term_period OR g.term_period IS NULL)
         AND g.is_makeup = false
         AND g.max_score IS NOT NULL
         AND g.max_score > 0)
    ), 2), 0)
  INTO v_class_average
  FROM public.students s
  WHERE s.organization_id = v_organization_id
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.student_id = s.id
        AND e.session_id = p_session_id
    );

  -- Créer ou mettre à jour le bulletin
  INSERT INTO public.report_cards (
    organization_id,
    student_id,
    session_id,
    academic_year_id,
    term_period,
    overall_average,
    overall_rank,
    total_students,
    class_average,
    created_by
  )
  VALUES (
    v_organization_id,
    p_student_id,
    p_session_id,
    p_academic_year_id,
    p_term_period,
    v_overall_average,
    v_rank,
    v_total_students,
    v_class_average,
    auth.uid()
  )
  ON CONFLICT (student_id, session_id, term_period, academic_year_id)
  DO UPDATE SET
    overall_average = EXCLUDED.overall_average,
    overall_rank = EXCLUDED.overall_rank,
    total_students = EXCLUDED.total_students,
    class_average = EXCLUDED.class_average,
    updated_at = NOW()
  RETURNING id INTO v_report_card_id;

  -- Générer les entrées par matière
  INSERT INTO public.report_card_subjects (
    report_card_id,
    subject,
    average_score,
    coefficient,
    subject_average
  )
  SELECT 
    v_report_card_id,
    g.subject,
    ROUND(SUM(g.score * g.coefficient) / NULLIF(SUM(g.max_score * g.coefficient), 0) * 20, 2),
    SUM(g.coefficient),
    (SELECT COALESCE(ROUND(AVG(percentage), 2), 0)
     FROM public.grades
     WHERE subject = g.subject
       AND session_id = p_session_id
       AND (p_academic_year_id IS NULL OR academic_year_id = p_academic_year_id)
       AND (term_period = p_term_period OR term_period IS NULL)
       AND is_makeup = false
       AND percentage IS NOT NULL)
  FROM public.grades g
  WHERE g.student_id = p_student_id
    AND g.session_id = p_session_id
    AND (p_academic_year_id IS NULL OR g.academic_year_id = p_academic_year_id)
    AND (g.term_period = p_term_period OR g.term_period IS NULL)
    AND g.is_makeup = false
    AND g.max_score IS NOT NULL
    AND g.max_score > 0
  GROUP BY g.subject
  ON CONFLICT (report_card_id, subject)
  DO UPDATE SET
    average_score = EXCLUDED.average_score,
    coefficient = EXCLUDED.coefficient,
    subject_average = EXCLUDED.subject_average;

  RETURN v_report_card_id;
END;
$$;

-- 8. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_report_cards_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_report_cards_timestamp ON public.report_cards;
CREATE TRIGGER update_report_cards_timestamp
  BEFORE UPDATE ON public.report_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_report_cards_timestamp();

-- 9. RLS Policies pour report_cards
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can view report cards in their organization"
  ON public.report_cards
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can create report cards in their organization"
  ON public.report_cards
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can update report cards in their organization"
  ON public.report_cards
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete report cards in their organization" ON public.report_cards;
CREATE POLICY "Users can delete report cards in their organization"
  ON public.report_cards
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 10. RLS Policies pour report_card_subjects
ALTER TABLE public.report_card_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view report card subjects in their organization" ON public.report_card_subjects;
CREATE POLICY "Users can view report card subjects in their organization"
  ON public.report_card_subjects
  FOR SELECT
  USING (
    report_card_id IN (
      SELECT id FROM public.report_cards
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage report card subjects in their organization" ON public.report_card_subjects;
CREATE POLICY "Users can manage report card subjects in their organization"
  ON public.report_card_subjects
  FOR ALL
  USING (
    report_card_id IN (
      SELECT id FROM public.report_cards
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

-- 11. RLS Policies pour subject_statistics
ALTER TABLE public.subject_statistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view subject statistics in their organization" ON public.subject_statistics;
CREATE POLICY "Users can view subject statistics in their organization"
  ON public.subject_statistics
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage subject statistics in their organization" ON public.subject_statistics;
CREATE POLICY "Users can manage subject statistics in their organization"
  ON public.subject_statistics
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 12. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_card_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subject_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_subject_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_report_card TO authenticated;





