-- Migration pour permettre aux learners d'accéder aux modèles d'évaluation et leurs questions via le header x-learner-student-id
-- Date: 2026-01-28
-- Description: Ajoute des politiques RLS pour permettre aux apprenants d'accéder aux modèles d'évaluation liés à leurs grades

-- S'assurer que RLS est activé
ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_template_questions ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Learners can view evaluation templates via grades (header)" ON public.evaluation_templates;
DROP POLICY IF EXISTS "Learners can view evaluation template questions via templates (header)" ON public.evaluation_template_questions;
DROP POLICY IF EXISTS "Learners can view evaluation template instances via grades (header)" ON public.evaluation_template_instances;

-- Créer la politique pour permettre aux learners de voir les instances d'évaluation liées à leurs grades
CREATE POLICY "Learners can view evaluation template instances via grades (header)"
  ON public.evaluation_template_instances
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.grades
      WHERE grades.id = evaluation_template_instances.grade_id
        AND grades.student_id = public.learner_student_id()
    )
  );

-- Créer la politique pour permettre aux learners de voir les modèles d'évaluation liés à leurs grades
-- La relation se fait via evaluation_template_instances (grade_id -> template_id)
CREATE POLICY "Learners can view evaluation templates via grades (header)"
  ON public.evaluation_templates
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.evaluation_template_instances
      INNER JOIN public.grades ON grades.id = evaluation_template_instances.grade_id
      WHERE evaluation_template_instances.template_id = evaluation_templates.id
        AND grades.student_id = public.learner_student_id()
    )
  );

-- Créer la politique pour permettre aux learners de voir les questions des modèles d'évaluation liés à leurs grades
-- La relation se fait via evaluation_template_instances (grade_id -> template_id -> questions)
CREATE POLICY "Learners can view evaluation template questions via templates (header)"
  ON public.evaluation_template_questions
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND public.learner_student_id() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.evaluation_template_instances
      INNER JOIN public.grades ON grades.id = evaluation_template_instances.grade_id
      WHERE evaluation_template_instances.template_id = evaluation_template_questions.template_id
        AND grades.student_id = public.learner_student_id()
    )
  );

-- Commentaires pour documentation
COMMENT ON POLICY "Learners can view evaluation template instances via grades (header)" ON public.evaluation_template_instances IS
  'Permet aux apprenants d''accéder aux instances d''évaluation liées à leurs grades via le header x-learner-student-id.';

COMMENT ON POLICY "Learners can view evaluation templates via grades (header)" ON public.evaluation_templates IS
  'Permet aux apprenants d''accéder aux modèles d''évaluation liés à leurs grades via le header x-learner-student-id.';

COMMENT ON POLICY "Learners can view evaluation template questions via templates (header)" ON public.evaluation_template_questions IS
  'Permet aux apprenants d''accéder aux questions des modèles d''évaluation liés à leurs grades via le header x-learner-student-id.';
