-- ============================================================================
-- CORRECTION SÉCURISÉE DES 2 TABLES RESTANTES SANS POLICIES
-- ============================================================================
-- Ce script vérifie d'abord la structure des tables avant de créer les policies
-- Tables concernées:
-- - audit_findings
-- - security_training_records
-- ============================================================================

DO $$
DECLARE
  has_org_id BOOLEAN;
  has_user_id BOOLEAN;
  has_created_by BOOLEAN;
  current_table TEXT;
BEGIN
  -- ============================================================================
  -- 1. CORRECTION DE audit_findings
  -- ============================================================================
  RAISE NOTICE '🔍 Analyse de la table audit_findings...';
  
  current_table := 'audit_findings';
  
  -- Vérifier si la table existe et sa structure
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = current_table) THEN
    
    -- Vérifier les colonnes disponibles
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = current_table
      AND c.column_name = 'organization_id'
    ) INTO has_org_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = current_table
      AND c.column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = current_table
      AND c.column_name = 'created_by'
    ) INTO has_created_by;
    
    RAISE NOTICE 'Structure audit_findings - organization_id: %, user_id: %, created_by: %', 
      has_org_id, has_user_id, has_created_by;
    
    -- Créer les policies selon la structure disponible
    IF has_org_id THEN
      -- Policy SELECT avec organization_id
      EXECUTE 'DROP POLICY IF EXISTS "Users can view audit findings in their organization" ON public.audit_findings';
      EXECUTE 'CREATE POLICY "Users can view audit findings in their organization"
        ON public.audit_findings FOR SELECT TO authenticated
        USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can create audit findings in their organization" ON public.audit_findings';
      EXECUTE 'CREATE POLICY "Users can create audit findings in their organization"
        ON public.audit_findings FOR INSERT TO authenticated
        WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can update audit findings in their organization" ON public.audit_findings';
      EXECUTE 'CREATE POLICY "Users can update audit findings in their organization"
        ON public.audit_findings FOR UPDATE TO authenticated
        USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))
        WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can delete audit findings in their organization" ON public.audit_findings';
      EXECUTE 'CREATE POLICY "Users can delete audit findings in their organization"
        ON public.audit_findings FOR DELETE TO authenticated
        USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Policies créées pour audit_findings (avec organization_id)';
      
    ELSIF has_user_id OR has_created_by THEN
      -- Policy avec user_id ou created_by
      EXECUTE 'DROP POLICY IF EXISTS "Users can view their own audit findings" ON public.audit_findings';
      EXECUTE format('CREATE POLICY "Users can view their own audit findings"
        ON public.audit_findings FOR SELECT TO authenticated
        USING (%s = auth.uid())', 
        CASE WHEN has_user_id THEN 'user_id' ELSE 'created_by' END);
      
      RAISE NOTICE '✅ Policy SELECT créée pour audit_findings (avec %s)', 
        CASE WHEN has_user_id THEN 'user_id' ELSE 'created_by' END;
      
    ELSE
      -- Si aucune colonne d''isolement trouvée, créer une policy permissive temporaire (À ADAPTER)
      RAISE WARNING '⚠️  audit_findings n''a ni organization_id ni user_id - Policy permissive créée (À ADAPTER)';
      EXECUTE 'DROP POLICY IF EXISTS "Temp: Users can view audit findings" ON public.audit_findings';
      EXECUTE 'CREATE POLICY "Temp: Users can view audit findings"
        ON public.audit_findings FOR SELECT TO authenticated
        USING (true)';
    END IF;
    
  ELSE
    RAISE NOTICE '⏭️  Table audit_findings n''existe pas';
  END IF;
  
  -- ============================================================================
  -- 2. CORRECTION DE security_training_records
  -- ============================================================================
  RAISE NOTICE '🔍 Analyse de la table security_training_records...';
  
  current_table := 'security_training_records';
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = current_table) THEN
    
    -- Vérifier les colonnes disponibles
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = current_table
      AND c.column_name = 'organization_id'
    ) INTO has_org_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = current_table
      AND c.column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = current_table
      AND c.column_name = 'created_by'
    ) INTO has_created_by;
    
    RAISE NOTICE 'Structure security_training_records - organization_id: %, user_id: %, created_by: %', 
      has_org_id, has_user_id, has_created_by;
    
    -- Créer les policies selon la structure disponible
    IF has_org_id THEN
      -- Policy SELECT avec organization_id
      EXECUTE 'DROP POLICY IF EXISTS "Users can view security training records in their organization" ON public.security_training_records';
      EXECUTE 'CREATE POLICY "Users can view security training records in their organization"
        ON public.security_training_records FOR SELECT TO authenticated
        USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can create security training records in their organization" ON public.security_training_records';
      EXECUTE 'CREATE POLICY "Users can create security training records in their organization"
        ON public.security_training_records FOR INSERT TO authenticated
        WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can update security training records in their organization" ON public.security_training_records';
      EXECUTE 'CREATE POLICY "Users can update security training records in their organization"
        ON public.security_training_records FOR UPDATE TO authenticated
        USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))
        WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))';
      
      EXECUTE 'DROP POLICY IF EXISTS "Users can delete security training records in their organization" ON public.security_training_records';
      EXECUTE 'CREATE POLICY "Users can delete security training records in their organization"
        ON public.security_training_records FOR DELETE TO authenticated
        USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()))';
      
      RAISE NOTICE '✅ Policies créées pour security_training_records (avec organization_id)';
      
    ELSIF has_user_id OR has_created_by THEN
      -- Policy avec user_id ou created_by
      EXECUTE 'DROP POLICY IF EXISTS "Users can view their own security training records" ON public.security_training_records';
      EXECUTE format('CREATE POLICY "Users can view their own security training records"
        ON public.security_training_records FOR SELECT TO authenticated
        USING (%s = auth.uid())', 
        CASE WHEN has_user_id THEN 'user_id' ELSE 'created_by' END);
      
      RAISE NOTICE '✅ Policy SELECT créée pour security_training_records (avec %s)', 
        CASE WHEN has_user_id THEN 'user_id' ELSE 'created_by' END;
      
    ELSE
      -- Si aucune colonne d''isolement trouvée, créer une policy permissive temporaire (À ADAPTER)
      RAISE WARNING '⚠️  security_training_records n''a ni organization_id ni user_id - Policy permissive créée (À ADAPTER)';
      EXECUTE 'DROP POLICY IF EXISTS "Temp: Users can view security training records" ON public.security_training_records';
      EXECUTE 'CREATE POLICY "Temp: Users can view security training records"
        ON public.security_training_records FOR SELECT TO authenticated
        USING (true)';
    END IF;
    
  ELSE
    RAISE NOTICE '⏭️  Table security_training_records n''existe pas';
  END IF;
  
  RAISE NOTICE '✅ Correction terminée !';
  
END $$;

-- ============================================================================
-- 3. VÉRIFICATION FINALE
-- ============================================================================

-- Vérifier que les policies ont été créées
SELECT 
  '✅ Vérification policies créées' as check_type,
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(cmd::text, ', ' ORDER BY cmd) as operations
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('audit_findings', 'security_training_records')
GROUP BY tablename
ORDER BY tablename;

-- Vérifier qu'il ne reste plus de tables avec RLS mais sans policies
SELECT 
  '✅ Vérification finale - Tables restantes sans policies' as check_type,
  COUNT(*) as count_remaining
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND t.tablename NOT LIKE '\_%'
  AND t.tablename NOT IN ('schema_migrations')
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.tablename 
    AND p.schemaname = 'public'
  );

