-- Migration pour créer le système de modèles d'évaluations
-- Date: 2024-12-22
-- Description: Permet de créer des modèles d'évaluations avec questions/réponses et correction automatique

-- 1. Table pour les modèles d'évaluations
CREATE TABLE IF NOT EXISTS public.evaluation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  assessment_type TEXT, -- Type d'évaluation (pre_formation, hot, cold, etc.)
  subject TEXT, -- Sujet/matière
  max_score NUMERIC(5,2) DEFAULT 20, -- Note maximale du modèle
  passing_score NUMERIC(5,2), -- Score minimum pour réussir (%)
  time_limit_minutes INTEGER, -- Limite de temps (NULL = illimité)
  shuffle_questions BOOLEAN DEFAULT false, -- Mélanger les questions
  show_correct_answers BOOLEAN DEFAULT true, -- Afficher les bonnes réponses après correction
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- 2. Table pour les questions des modèles
CREATE TABLE IF NOT EXISTS public.evaluation_template_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'numeric')),
  -- Pour multiple_choice et true_false
  options JSONB, -- [{text: "Option 1", is_correct: true}, {text: "Option 2", is_correct: false}, ...]
  -- Pour short_answer et numeric
  correct_answer TEXT, -- Réponse exacte ou pattern
  correct_answer_pattern TEXT, -- Pattern regex pour validation flexible
  -- Pour essay (pas de correction automatique)
  -- Points
  points NUMERIC(5,2) DEFAULT 1, -- Points attribués pour cette question
  order_index INTEGER NOT NULL,
  explanation TEXT, -- Explication de la réponse correcte
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour lier une évaluation (grade) à un modèle
CREATE TABLE IF NOT EXISTS public.evaluation_template_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES public.grades(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE RESTRICT,
  -- Configuration de l'instance
  max_score NUMERIC(5,2), -- Peut être différent du modèle
  time_limit_minutes INTEGER, -- Peut être différent du modèle
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(grade_id)
);

-- 4. Table pour les réponses des étudiants
CREATE TABLE IF NOT EXISTS public.evaluation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES public.evaluation_template_instances(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.evaluation_template_questions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  -- Réponse
  answer_text TEXT, -- Pour short_answer, essay, numeric
  answer_choice TEXT[], -- Pour multiple_choice (array des choix sélectionnés)
  answer_boolean BOOLEAN, -- Pour true_false
  -- Correction
  is_correct BOOLEAN, -- Résultat de la correction automatique
  points_earned NUMERIC(5,2) DEFAULT 0, -- Points obtenus pour cette question
  max_points NUMERIC(5,2), -- Points maximum pour cette question
  teacher_feedback TEXT, -- Feedback manuel du professeur (pour essay notamment)
  corrected_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  corrected_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(instance_id, question_id, student_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_org ON public.evaluation_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_templates_type ON public.evaluation_templates(assessment_type);
CREATE INDEX IF NOT EXISTS idx_template_questions_template ON public.evaluation_template_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_instances_grade ON public.evaluation_template_instances(grade_id);
CREATE INDEX IF NOT EXISTS idx_template_instances_template ON public.evaluation_template_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_responses_instance ON public.evaluation_responses(instance_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_responses_student ON public.evaluation_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_responses_question ON public.evaluation_responses(question_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_evaluation_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_evaluation_templates_updated_at ON public.evaluation_templates;
CREATE TRIGGER update_evaluation_templates_updated_at
  BEFORE UPDATE ON public.evaluation_templates
  FOR EACH ROW EXECUTE FUNCTION update_evaluation_template_updated_at();

DROP TRIGGER IF EXISTS update_template_questions_updated_at ON public.evaluation_template_questions;
CREATE TRIGGER update_template_questions_updated_at
  BEFORE UPDATE ON public.evaluation_template_questions
  FOR EACH ROW EXECUTE FUNCTION update_evaluation_template_updated_at();

DROP TRIGGER IF EXISTS update_template_instances_updated_at ON public.evaluation_template_instances;
CREATE TRIGGER update_template_instances_updated_at
  BEFORE UPDATE ON public.evaluation_template_instances
  FOR EACH ROW EXECUTE FUNCTION update_evaluation_template_updated_at();

DROP TRIGGER IF EXISTS update_evaluation_responses_updated_at ON public.evaluation_responses;
CREATE TRIGGER update_evaluation_responses_updated_at
  BEFORE UPDATE ON public.evaluation_responses
  FOR EACH ROW EXECUTE FUNCTION update_evaluation_template_updated_at();

-- RLS Policies
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_template_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;

-- Policies pour evaluation_templates
DROP POLICY IF EXISTS "Templates lisibles par l'organisation" ON public.evaluation_templates;
CREATE POLICY "Templates lisibles par l'organisation" ON public.evaluation_templates
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Templates modifiables par admin/teacher" ON public.evaluation_templates;
CREATE POLICY "Templates modifiables par admin/teacher" ON public.evaluation_templates
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Policies pour evaluation_template_questions
DROP POLICY IF EXISTS "Questions lisibles via template" ON public.evaluation_template_questions;
CREATE POLICY "Questions lisibles via template" ON public.evaluation_template_questions
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM public.evaluation_templates
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Questions modifiables via template" ON public.evaluation_template_questions;
CREATE POLICY "Questions modifiables via template" ON public.evaluation_template_questions
  FOR ALL USING (
    template_id IN (
      SELECT id FROM public.evaluation_templates
      WHERE organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'teacher')
      )
    )
  );

-- Policies pour evaluation_template_instances
DROP POLICY IF EXISTS "Instances lisibles via grade" ON public.evaluation_template_instances;
CREATE POLICY "Instances lisibles via grade" ON public.evaluation_template_instances
  FOR SELECT USING (
    grade_id IN (
      SELECT id FROM public.grades
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Instances modifiables via grade" ON public.evaluation_template_instances;
CREATE POLICY "Instances modifiables via grade" ON public.evaluation_template_instances
  FOR ALL USING (
    grade_id IN (
      SELECT id FROM public.grades
      WHERE organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role IN ('admin', 'teacher')
      )
    )
  );

-- Policies pour evaluation_responses
DROP POLICY IF EXISTS "Réponses lisibles via instance" ON public.evaluation_responses;
CREATE POLICY "Réponses lisibles via instance" ON public.evaluation_responses
  FOR SELECT USING (
    instance_id IN (
      SELECT id FROM public.evaluation_template_instances
      WHERE grade_id IN (
        SELECT id FROM public.grades
        WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        OR student_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Réponses modifiables par étudiant ou enseignant" ON public.evaluation_responses;
CREATE POLICY "Réponses modifiables par étudiant ou enseignant" ON public.evaluation_responses
  FOR ALL USING (
    instance_id IN (
      SELECT id FROM public.evaluation_template_instances
      WHERE grade_id IN (
        SELECT id FROM public.grades
        WHERE organization_id IN (
          SELECT organization_id FROM public.users 
          WHERE id = auth.uid() AND role IN ('admin', 'teacher')
        )
        OR student_id = auth.uid()
      )
    )
  );

-- Fonction pour calculer automatiquement la note d'une évaluation
CREATE OR REPLACE FUNCTION public.calculate_evaluation_score(
  p_instance_id UUID
)
RETURNS TABLE (
  total_score NUMERIC,
  max_score NUMERIC,
  percentage NUMERIC,
  correct_count INTEGER,
  total_questions INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_score NUMERIC := 0;
  v_max_score NUMERIC := 0;
  v_correct_count INTEGER := 0;
  v_total_questions INTEGER := 0;
BEGIN
  -- Calculer le score total et le nombre de questions
  SELECT 
    COALESCE(SUM(points_earned), 0),
    COALESCE(SUM(max_points), 0),
    COUNT(*) FILTER (WHERE is_correct = true),
    COUNT(*)
  INTO 
    v_total_score,
    v_max_score,
    v_correct_count,
    v_total_questions
  FROM public.evaluation_responses
  WHERE instance_id = p_instance_id;

  -- Calculer le pourcentage
  DECLARE
    v_percentage NUMERIC;
  BEGIN
    IF v_max_score > 0 THEN
      v_percentage := ROUND((v_total_score / v_max_score) * 100, 2);
    ELSE
      v_percentage := 0;
    END IF;

    RETURN QUERY SELECT 
      v_total_score,
      v_max_score,
      v_percentage,
      v_correct_count,
      v_total_questions;
  END;
END;
$$;

-- Fonction pour corriger automatiquement les réponses
CREATE OR REPLACE FUNCTION public.auto_correct_evaluation_responses(
  p_instance_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_record RECORD;
  question_record RECORD;
  is_correct_result BOOLEAN;
  points_earned_result NUMERIC;
  corrected_count INTEGER := 0;
BEGIN
  -- Parcourir toutes les réponses non corrigées
  FOR response_record IN 
    SELECT * FROM public.evaluation_responses
    WHERE instance_id = p_instance_id
      AND is_correct IS NULL
  LOOP
    -- Récupérer la question correspondante
    SELECT * INTO question_record
    FROM public.evaluation_template_questions
    WHERE id = response_record.question_id;

    IF question_record IS NULL THEN
      CONTINUE;
    END IF;

    -- Corriger selon le type de question
    CASE question_record.question_type
      WHEN 'multiple_choice' THEN
        -- Vérifier si les choix sélectionnés correspondent aux bonnes réponses
        SELECT 
          COALESCE(
            (SELECT COUNT(*) FROM jsonb_array_elements(question_record.options) AS opt
             WHERE (opt->>'is_correct')::boolean = true
               AND opt->>'text' = ANY(response_record.answer_choice)) = 
            (SELECT COUNT(*) FROM jsonb_array_elements(question_record.options) AS opt
             WHERE (opt->>'is_correct')::boolean = true)
            AND (SELECT COUNT(*) FROM jsonb_array_elements(question_record.options) AS opt
                 WHERE (opt->>'is_correct')::boolean = true) = 
            array_length(response_record.answer_choice, 1),
            false
          ) INTO is_correct_result;
        
        IF is_correct_result THEN
          points_earned_result := question_record.points;
        ELSE
          points_earned_result := 0;
        END IF;

      WHEN 'true_false' THEN
        -- Comparer la réponse booléenne avec la bonne réponse
        is_correct_result := (response_record.answer_boolean::text = question_record.correct_answer);
        points_earned_result := CASE WHEN is_correct_result THEN question_record.points ELSE 0 END;

      WHEN 'short_answer' THEN
        -- Comparer la réponse texte (insensible à la casse, trim)
        IF question_record.correct_answer_pattern IS NOT NULL THEN
          -- Utiliser un pattern regex si fourni
          is_correct_result := (LOWER(TRIM(response_record.answer_text)) ~* question_record.correct_answer_pattern);
        ELSE
          -- Comparaison exacte (insensible à la casse)
          is_correct_result := (LOWER(TRIM(response_record.answer_text)) = LOWER(TRIM(question_record.correct_answer)));
        END IF;
        points_earned_result := CASE WHEN is_correct_result THEN question_record.points ELSE 0 END;

      WHEN 'numeric' THEN
        -- Comparer les valeurs numériques
        is_correct_result := (response_record.answer_text::numeric = question_record.correct_answer::numeric);
        points_earned_result := CASE WHEN is_correct_result THEN question_record.points ELSE 0 END;

      WHEN 'essay' THEN
        -- Les questions de type essay ne sont pas corrigées automatiquement
        is_correct_result := NULL;
        points_earned_result := 0;

      ELSE
        is_correct_result := false;
        points_earned_result := 0;
    END CASE;

    -- Mettre à jour la réponse
    UPDATE public.evaluation_responses
    SET 
      is_correct = is_correct_result,
      points_earned = points_earned_result,
      max_points = question_record.points,
      corrected_at = NOW(),
      corrected_by = auth.uid()
    WHERE id = response_record.id;

    corrected_count := corrected_count + 1;
  END LOOP;

  RETURN corrected_count;
END;
$$;

-- Accorder les permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_template_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_template_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluation_responses TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_evaluation_score TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_correct_evaluation_responses TO authenticated;

