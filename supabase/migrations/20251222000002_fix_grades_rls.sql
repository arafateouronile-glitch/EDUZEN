-- Migration pour ajouter les politiques RLS à la table grades
-- Date: 2024-12-22
-- Description: Ajoute les politiques RLS manquantes pour permettre l'accès à la table grades

-- Activer RLS sur la table grades si ce n'est pas déjà fait
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view grades in their organization" ON public.grades;
DROP POLICY IF EXISTS "Users can create grades in their organization" ON public.grades;
DROP POLICY IF EXISTS "Users can update grades in their organization" ON public.grades;
DROP POLICY IF EXISTS "Users can delete grades in their organization" ON public.grades;

-- Politique SELECT : Les utilisateurs peuvent voir les notes de leur organisation
CREATE POLICY "Users can view grades in their organization"
  ON public.grades
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Politique INSERT : Les utilisateurs peuvent créer des notes dans leur organisation
CREATE POLICY "Users can create grades in their organization"
  ON public.grades
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Politique UPDATE : Les utilisateurs peuvent mettre à jour les notes de leur organisation
CREATE POLICY "Users can update grades in their organization"
  ON public.grades
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Politique DELETE : Les utilisateurs peuvent supprimer les notes de leur organisation
CREATE POLICY "Users can delete grades in their organization"
  ON public.grades
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Accorder les permissions nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades TO authenticated;



