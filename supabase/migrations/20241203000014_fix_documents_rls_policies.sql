-- Migration pour compléter les RLS policies de la table documents
-- Problème identifié : Manque INSERT, UPDATE, DELETE policies

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Vérifier les policies existantes
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'documents'
ORDER BY cmd;

-- ============================================================================
-- INSERT : Créer des documents
-- ============================================================================

DROP POLICY IF EXISTS "Users can create documents in their organization" ON public.documents;

CREATE POLICY "Users can create documents in their organization"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- UPDATE : Modifier des documents
-- ============================================================================

DROP POLICY IF EXISTS "Users can update documents in their organization" ON public.documents;

CREATE POLICY "Users can update documents in their organization"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
    AND (
      -- L'utilisateur peut modifier ses propres documents
      -- OU c'est un admin de l'organisation
      (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- DELETE : Supprimer des documents
-- ============================================================================

DROP POLICY IF EXISTS "Admins can delete documents in their organization" ON public.documents;

CREATE POLICY "Admins can delete documents in their organization"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

SELECT 
  'Documents RLS Policies' as check_type,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Lecture'
    WHEN cmd = 'INSERT' THEN '✅ Création'
    WHEN cmd = 'UPDATE' THEN '✅ Modification'
    WHEN cmd = 'DELETE' THEN '✅ Suppression'
    ELSE cmd::text
  END as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'documents'
ORDER BY cmd;





