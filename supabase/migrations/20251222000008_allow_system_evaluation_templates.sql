-- Migration pour permettre les modèles d'évaluations système (organization_id = NULL)
-- Date: 2024-12-22
-- Description: Rend organization_id nullable et ajuste les contraintes pour permettre les modèles système

-- 1. Supprimer la contrainte UNIQUE existante
ALTER TABLE public.evaluation_templates
  DROP CONSTRAINT IF EXISTS evaluation_templates_organization_id_name_key;

-- 2. Supprimer la contrainte NOT NULL sur organization_id
ALTER TABLE public.evaluation_templates
  ALTER COLUMN organization_id DROP NOT NULL;

-- 3. Modifier la contrainte de clé étrangère pour permettre NULL
-- (PostgreSQL permet déjà NULL dans les FK, mais on doit s'assurer que la contrainte existe toujours)
-- La contrainte FK existante devrait déjà permettre NULL, mais on la recrée si nécessaire
DO $$
BEGIN
  -- Vérifier si la contrainte FK existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.evaluation_templates'::regclass 
    AND conname LIKE '%organization_id%'
    AND contype = 'f'
  ) THEN
    -- La contrainte existe déjà, elle devrait permettre NULL
    -- On ne fait rien
    NULL;
  ELSE
    -- Recréer la contrainte FK si elle n'existe pas
    ALTER TABLE public.evaluation_templates
      ADD CONSTRAINT evaluation_templates_organization_id_fkey
      FOREIGN KEY (organization_id) 
      REFERENCES public.organizations(id) 
      ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Recréer la contrainte UNIQUE pour permettre les modèles système
-- Pour les modèles système (organization_id IS NULL), on permet plusieurs modèles avec le même nom
-- Pour les modèles d'organisation, on garde l'unicité par organisation
CREATE UNIQUE INDEX IF NOT EXISTS evaluation_templates_org_name_unique 
ON public.evaluation_templates(organization_id, name)
WHERE organization_id IS NOT NULL;

-- Pour les modèles système, on peut avoir plusieurs modèles avec le même nom
-- (pas de contrainte UNIQUE nécessaire)

-- 5. Mettre à jour les politiques RLS pour inclure les modèles système
DROP POLICY IF EXISTS "Templates lisibles par l'organisation" ON public.evaluation_templates;
CREATE POLICY "Templates lisibles par l'organisation" ON public.evaluation_templates
  FOR SELECT USING (
    organization_id IS NULL -- Modèles système accessibles à tous
    OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Templates modifiables par admin/teacher" ON public.evaluation_templates;
CREATE POLICY "Templates modifiables par admin/teacher" ON public.evaluation_templates
  FOR ALL USING (
    -- Permettre la modification des modèles système (organization_id IS NULL) et des modèles de l'organisation
    organization_id IS NULL -- Modèles système modifiables par tous les admins/teachers
    OR organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

