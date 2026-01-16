-- ============================================================================
-- QUICK FIX RLS - Correction rapide des problèmes les plus critiques
-- ============================================================================
-- ⚠️ ATTENTION: Ce script corrige automatiquement les problèmes critiques
-- ⚠️ Vérifiez d'abord avec analyze-rls-issues.sql ce qui sera corrigé
-- ============================================================================

-- ============================================================================
-- PARTIE 1: ACTIVER RLS SUR LES TABLES CRITIQUES
-- ============================================================================

DO $$
DECLARE
  table_name TEXT;
  critical_tables TEXT[] := ARRAY[
    'users', 'students', 'payments', 'invoices', 'organizations',
    'sessions', 'programs', 'formations', 'attendance', 'evaluations',
    'documents', 'grades'
  ];
BEGIN
  RAISE NOTICE '🔴 Activation de RLS sur les tables critiques...';
  
  FOREACH table_name IN ARRAY critical_tables
  LOOP
    BEGIN
      -- Vérifier si la table existe et n'a pas déjà RLS activé
      IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = table_name
        AND rowsecurity = false
      ) THEN
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        RAISE NOTICE '✅ RLS activé sur: %', table_name;
      ELSE
        RAISE NOTICE '⏭️  Table % ignorée (RLS déjà activé ou inexistante)', table_name;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur sur %: %', table_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Activation RLS terminée';
END $$;

-- ============================================================================
-- PARTIE 2: CRÉER DES POLICIES PAR DÉFAUT POUR LES TABLES AVEC RLS MAIS SANS POLICIES
-- ============================================================================

DO $$
DECLARE
  table_name TEXT;
  table_has_org_id BOOLEAN;
  policy_exists BOOLEAN;
BEGIN
  RAISE NOTICE '🟠 Création de policies pour les tables sans policies...';
  
  -- Parcourir les tables avec RLS mais sans policies
  FOR table_name IN 
    SELECT t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.rowsecurity = true
      AND t.tablename NOT LIKE '\_%'
      AND NOT EXISTS (
        SELECT 1 FROM pg_policies p 
        WHERE p.tablename = t.tablename 
        AND p.schemaname = 'public'
      )
      AND t.tablename NOT IN ('schema_migrations')
  LOOP
    BEGIN
      -- Vérifier si la table a une colonne organization_id
      EXECUTE format('
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_schema = ''public'' 
          AND table_name = %L
          AND column_name = ''organization_id''
        )', table_name) INTO table_has_org_id;
      
      IF table_has_org_id THEN
        -- Vérifier si la policy SELECT existe déjà
        EXECUTE format('
          SELECT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = ''public''
            AND tablename = %L
            AND policyname = ''Users can view data in their organization''
          )', table_name) INTO policy_exists;
        
        IF NOT policy_exists THEN
          -- Créer une policy SELECT de base avec organization_id
          EXECUTE format('
            CREATE POLICY "Users can view data in their organization"
              ON public.%I
              FOR SELECT
              TO authenticated
              USING (
                organization_id IN (
                  SELECT organization_id 
                  FROM public.users 
                  WHERE id = auth.uid()
                )
              )', table_name);
          
          RAISE NOTICE '✅ Policy SELECT créée pour: %', table_name;
        END IF;
      ELSE
        RAISE NOTICE '⚠️  Table % sans organization_id - Policy manuelle requise', table_name;
      END IF;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '❌ Erreur sur %: %', table_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Création de policies terminée';
END $$;

-- ============================================================================
-- PARTIE 3: VÉRIFICATION POST-CORRECTION
-- ============================================================================

SELECT 
  '📊 Vérification post-correction' as check_type,
  COUNT(*) FILTER (WHERE rowsecurity = true AND tablename IN (
    'users', 'students', 'payments', 'invoices', 'organizations'
  )) as critical_tables_with_rls,
  COUNT(*) FILTER (WHERE rowsecurity = false AND tablename IN (
    'users', 'students', 'payments', 'invoices', 'organizations'
  )) as critical_tables_without_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'students', 'payments', 'invoices', 'organizations');

-- Afficher les tables avec RLS mais toujours sans policies
SELECT 
  '🟠 Tables restantes sans policies' as check_type,
  t.tablename,
  'RLS activé mais aucune policy' as issue
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND t.tablename NOT LIKE '\_%'
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p 
    WHERE p.tablename = t.tablename 
    AND p.schemaname = 'public'
  )
ORDER BY t.tablename;

-- Fin du script
-- ✅ Script Quick Fix terminé. Vérifiez les résultats ci-dessus.

