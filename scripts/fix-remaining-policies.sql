-- ============================================================================
-- CORRECTION DES 2 TABLES RESTANTES SANS POLICIES
-- ============================================================================
-- Tables concernées:
-- - audit_findings
-- - security_training_records
-- ============================================================================

-- ============================================================================
-- 1. POLICIES POUR audit_findings
-- ============================================================================

-- Vérifier la structure de la table
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'audit_findings'
ORDER BY ordinal_position;

-- Policy SELECT : Les utilisateurs peuvent voir les audits de leur organisation
DROP POLICY IF EXISTS "Users can view audit findings in their organization" ON public.audit_findings;

CREATE POLICY "Users can view audit findings in their organization"
  ON public.audit_findings
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Policy INSERT : Les utilisateurs peuvent créer des audits dans leur organisation
DROP POLICY IF EXISTS "Users can create audit findings in their organization" ON public.audit_findings;

CREATE POLICY "Users can create audit findings in their organization"
  ON public.audit_findings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Policy UPDATE : Les utilisateurs peuvent modifier les audits de leur organisation
DROP POLICY IF EXISTS "Users can update audit findings in their organization" ON public.audit_findings;

CREATE POLICY "Users can update audit findings in their organization"
  ON public.audit_findings
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Policy DELETE : Les utilisateurs peuvent supprimer les audits de leur organisation (si nécessaire)
DROP POLICY IF EXISTS "Users can delete audit findings in their organization" ON public.audit_findings;

CREATE POLICY "Users can delete audit findings in their organization"
  ON public.audit_findings
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 2. POLICIES POUR security_training_records
-- ============================================================================

-- Vérifier la structure de la table
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'security_training_records'
ORDER BY ordinal_position;

-- Policy SELECT : Les utilisateurs peuvent voir les enregistrements de formation de leur organisation
DROP POLICY IF EXISTS "Users can view security training records in their organization" ON public.security_training_records;

CREATE POLICY "Users can view security training records in their organization"
  ON public.security_training_records
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Policy INSERT : Les utilisateurs peuvent créer des enregistrements de formation dans leur organisation
DROP POLICY IF EXISTS "Users can create security training records in their organization" ON public.security_training_records;

CREATE POLICY "Users can create security training records in their organization"
  ON public.security_training_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Policy UPDATE : Les utilisateurs peuvent modifier les enregistrements de leur organisation
DROP POLICY IF EXISTS "Users can update security training records in their organization" ON public.security_training_records;

CREATE POLICY "Users can update security training records in their organization"
  ON public.security_training_records
  FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Policy DELETE : Les utilisateurs peuvent supprimer les enregistrements de leur organisation (si nécessaire)
DROP POLICY IF EXISTS "Users can delete security training records in their organization" ON public.security_training_records;

CREATE POLICY "Users can delete security training records in their organization"
  ON public.security_training_records
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- 3. VÉRIFICATION POST-CORRECTION
-- ============================================================================

-- Vérifier que les policies ont été créées
SELECT 
  '✅ Vérification policies créées' as check_type,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('audit_findings', 'security_training_records')
ORDER BY tablename, cmd;

-- Vérifier qu'il ne reste plus de tables avec RLS mais sans policies
SELECT 
  '✅ Vérification finale' as check_type,
  COUNT(*) as tables_without_policies
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND t.tablename NOT LIKE '\_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.tablename 
    AND p.schemaname = 'public'
  );


