-- Migration pour compléter les RLS policies de la table payments
-- Problème identifié : Manque INSERT, UPDATE, DELETE policies

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Vérifier les policies existantes
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'payments'
ORDER BY cmd;

-- ============================================================================
-- INSERT : Créer des paiements
-- ============================================================================

DROP POLICY IF EXISTS "Users can create payments in their organization" ON public.payments;

CREATE POLICY "Users can create payments in their organization"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
    AND (
      -- Seuls les admins et les utilisateurs avec rôle financier peuvent créer des paiements
      (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'accountant', 'finance')
    )
  );

-- ============================================================================
-- UPDATE : Modifier des paiements
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update payments in their organization" ON public.payments;

CREATE POLICY "Admins can update payments in their organization"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'accountant')
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'accountant')
  );

-- Note : Les paiements complétés ne devraient généralement pas être modifiables
-- Cette policy permet la modification uniquement pour les admins et comptables

-- ============================================================================
-- DELETE : Supprimer des paiements
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can delete payments in their organization" ON public.payments;

CREATE POLICY "Super admins can delete payments in their organization"
  ON public.payments
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
    -- Seuls les super_admins peuvent supprimer des paiements (pour éviter les erreurs)
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================

SELECT 
  'Payments RLS Policies' as check_type,
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
  AND tablename = 'payments'
ORDER BY cmd;





