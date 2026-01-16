-- Migration pour corriger les politiques RLS sur users
-- Garantit qu'un utilisateur peut toujours lire ses propres données, même sans organization_id
-- Nécessaire pour la synchronisation automatique des utilisateurs
-- IMPORTANT : Évite la récursion infinie en ne lisant PAS dans users depuis les politiques

-- Supprimer TOUTES les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can always view their own profile" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile only" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;

-- ============================================================================
-- POLITIQUES RLS SANS RÉCURSION
-- ============================================================================

-- Politique SELECT 1 : Les utilisateurs peuvent TOUJOURS voir leur propre profil
-- Cette politique est SIMPLE et ne fait AUCUNE requête sur users (pas de récursion)
CREATE POLICY "Users can always view their own profile"
    ON users FOR SELECT
    TO authenticated
    USING (
        -- Un utilisateur peut TOUJOURS voir son propre profil, même sans organization_id
        -- Condition simple, pas de sous-requête = pas de récursion
        id = auth.uid()
    );

-- Politique SELECT 2 : Les utilisateurs peuvent voir les utilisateurs de leur organisation
-- NOTE : Cette politique est désactivée temporairement pour éviter la récursion
-- Elle peut être réactivée plus tard avec une approche différente (ex: vue matérialisée)
-- Pour l'instant, la politique "Users can always view their own profile" est suffisante
-- pour permettre la synchronisation et la lecture de son propre profil
--
-- CREATE POLICY "Users can view users in their organization"
--     ON users FOR SELECT
--     TO authenticated
--     USING (
--         organization_id IS NOT NULL
--         AND organization_id::text = public.get_user_organization_id()
--     );

-- Politique INSERT : Les utilisateurs authentifiés peuvent créer leur propre profil
CREATE POLICY "Users can create own profile"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND id = auth.uid()
    );

-- Politique UPDATE : Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile only"
    ON users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Vérifier que les politiques sont créées
SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN '✅ Lecture'
        WHEN cmd = 'INSERT' THEN '✅ Création'
        WHEN cmd = 'UPDATE' THEN '✅ Modification'
        ELSE cmd
    END as action
FROM pg_policies
WHERE tablename = 'users'
ORDER BY cmd, policyname;

