-- ============================================================================
-- SCRIPT DE CORRECTION RLS - EDUZEN
-- ============================================================================
-- Ce script corrige automatiquement les problèmes RLS identifiés
-- ⚠️ EXÉCUTEZ D'ABORD analyze-rls-issues.sql pour identifier les problèmes
-- ⚠️ VÉRIFIEZ les résultats avant d'exécuter ce script
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: IDENTIFIER LES PROBLÈMES
-- ============================================================================
-- Exécutez d'abord cette partie pour voir ce qui sera corrigé

-- 1.1 Tables sans RLS qui devraient l'avoir (tables avec données sensibles)
SELECT 
  'À CORRIGER: Activer RLS' as action,
  tablename,
  CASE 
    WHEN tablename IN ('users', 'students', 'payments', 'invoices', 'organizations', 
                       'sessions', 'programs', 'formations', 'attendance', 'evaluations',
                       'documents', 'grades', 'messages', 'conversations') 
    THEN '🔴 CRITIQUE - Données sensibles'
    WHEN tablename LIKE '%log%' OR tablename LIKE '%audit%' 
    THEN '⚠️ ATTENTION - Table de logs (peut rester sans RLS)'
    ELSE '📋 À vérifier manuellement'
  END as priority
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE '\_%'
  AND tablename NOT IN ('schema_migrations')
ORDER BY 
  CASE 
    WHEN tablename IN ('users', 'students', 'payments', 'invoices', 'organizations') THEN 0
    WHEN tablename LIKE '%log%' OR tablename LIKE '%audit%' THEN 2
    ELSE 1
  END;

-- 1.2 Tables avec RLS mais sans policies
SELECT 
  'À CORRIGER: Créer policies' as action,
  t.tablename,
  'RLS activé mais aucune policy - Accès bloqué' as issue
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

-- ============================================================================
-- ÉTAPE 2: CORRECTIONS AUTOMATIQUES
-- ============================================================================
-- ⚠️ COMMENTEZ/DÉCOMMENTEZ les sections selon vos besoins

-- 2.1 Activer RLS sur les tables critiques qui ne l'ont pas
-- Décommentez et ajustez selon vos besoins

/*
-- Exemple pour une table spécifique
DO $$
DECLARE
  table_name TEXT;
BEGIN
  -- Liste des tables critiques qui DOIVENT avoir RLS
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
      AND rowsecurity = false
      AND tablename IN (
        'users', 'students', 'payments', 'invoices', 'organizations',
        'sessions', 'programs', 'formations', 'attendance', 'evaluations',
        'documents', 'grades', 'messages', 'conversations'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    RAISE NOTICE 'RLS activé sur la table: %', table_name;
  END LOOP;
END $$;
*/

-- ============================================================================
-- ÉTAPE 3: CRÉER DES POLICIES PAR DÉFAUT
-- ============================================================================
-- Ces policies génériques peuvent être adaptées selon vos besoins

-- 3.1 Fonction helper pour vérifier si un utilisateur appartient à une organisation
-- (Cette fonction devrait déjà exister, mais on la crée si nécessaire)
CREATE OR REPLACE FUNCTION public.user_has_organization_access(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = auth.uid() 
    AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Template de policy générique pour les tables avec organization_id
-- À adapter pour chaque table spécifique

/*
-- Exemple de policy SELECT générique
CREATE POLICY "Users can view data in their organization"
  ON public.NOM_TABLE
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Exemple de policy INSERT générique
CREATE POLICY "Users can create data in their organization"
  ON public.NOM_TABLE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

-- Exemple de policy UPDATE générique
CREATE POLICY "Users can update data in their organization"
  ON public.NOM_TABLE
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

-- Exemple de policy DELETE générique
CREATE POLICY "Users can delete data in their organization"
  ON public.NOM_TABLE
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );
*/

-- ============================================================================
-- ÉTAPE 4: VÉRIFICATION POST-CORRECTION
-- ============================================================================

-- Vérifier que toutes les tables critiques ont maintenant RLS
SELECT 
  'Vérification post-correction' as check_type,
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS activé' ELSE '❌ RLS désactivé' END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename AND schemaname = 'public') as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'organizations', 'students', 'sessions',
    'programs', 'formations', 'payments', 'invoices',
    'attendance', 'evaluations', 'documents'
  )
ORDER BY tablename;


