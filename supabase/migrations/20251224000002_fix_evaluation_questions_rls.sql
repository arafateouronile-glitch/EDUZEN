-- Migration pour corriger les RLS policies des questions d'évaluations
-- Date: 2024-12-24
-- Description: Permet de lire les questions des templates système (organization_id IS NULL)

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Questions lisibles via template" ON public.evaluation_template_questions;
DROP POLICY IF EXISTS "Questions modifiables via template" ON public.evaluation_template_questions;

-- Nouvelle policy pour la lecture : inclut les templates système
CREATE POLICY "Questions lisibles via template" ON public.evaluation_template_questions
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM public.evaluation_templates
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
         OR organization_id IS NULL  -- Templates système
    )
  );

-- Nouvelle policy pour la modification : inclut les templates système pour admin/teacher
CREATE POLICY "Questions modifiables via template" ON public.evaluation_template_questions
  FOR ALL USING (
    template_id IN (
      SELECT id FROM public.evaluation_templates
      WHERE (
        organization_id IN (
          SELECT organization_id FROM public.users 
          WHERE id = auth.uid() AND role IN ('admin', 'teacher')
        )
      )
      OR (
        organization_id IS NULL  -- Templates système modifiables par admin/teacher
        AND EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND role IN ('admin', 'teacher')
        )
      )
    )
  );

-- Mettre aussi à jour la policy de lecture des templates pour inclure les templates système
DROP POLICY IF EXISTS "Templates lisibles par l'organisation" ON public.evaluation_templates;
CREATE POLICY "Templates lisibles par l'organisation" ON public.evaluation_templates
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR organization_id IS NULL  -- Templates système
  );

-- Vérification
SELECT 
  et.name as template_name,
  COUNT(etq.id) as question_count
FROM public.evaluation_templates et
LEFT JOIN public.evaluation_template_questions etq ON etq.template_id = et.id
WHERE et.organization_id IS NULL
GROUP BY et.id, et.name
ORDER BY et.name;



