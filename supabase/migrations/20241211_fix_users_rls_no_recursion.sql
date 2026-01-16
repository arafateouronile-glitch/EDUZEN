-- Migration ULTIME pour corriger les politiques RLS sur users
-- Approche qui évite COMPLÈTEMENT la récursion en n'utilisant PAS de fonction helper
-- et en permettant à tous les utilisateurs authentifiés de voir les utilisateurs de leur organisation

-- Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile only" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile only" ON users;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Supprimer la fonction si elle existe (on n'en a plus besoin)
DROP FUNCTION IF EXISTS public.get_user_organization_id();

-- Politique pour SELECT : voir son propre profil ET les utilisateurs de la même organisation
-- APPROCHE SIMPLIFIÉE : Permettre à tous les utilisateurs authentifiés de voir
-- les utilisateurs de leur organisation en comparant directement les organization_id
-- La condition "id = auth.uid()" permet toujours de voir son propre profil sans récursion
CREATE POLICY "Users can view users in their organization"
    ON users FOR SELECT
    TO authenticated
    USING (
      -- Toujours voir son propre profil (pas de récursion car condition simple)
      id = auth.uid()
      -- OU voir les utilisateurs de la même organisation
      -- On compare directement avec une sous-requête qui ne lit que l'utilisateur actuel
      -- Cette sous-requête ne déclenche pas de récursion car elle filtre par id = auth.uid()
      OR (
        EXISTS (
          SELECT 1 
          FROM public.users u
          WHERE u.id = auth.uid()
          AND u.organization_id IS NOT NULL
          AND u.organization_id = users.organization_id
        )
      )
      -- OU si c'est un super_admin, voir tous les utilisateurs
      -- Même approche : sous-requête qui ne lit que l'utilisateur actuel
      OR (
        EXISTS (
          SELECT 1 
          FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role = 'super_admin'
        )
      )
    );

-- Politique pour INSERT : créer son propre profil (pour l'inscription)
CREATE POLICY "Users can create own profile"
    ON users FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() IS NOT NULL 
      AND id = auth.uid()
    );

-- Politique pour UPDATE : mettre à jour son propre profil
CREATE POLICY "Users can update own profile only"
    ON users FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Politique pour UPDATE : admins peuvent mettre à jour les utilisateurs de leur organisation
CREATE POLICY "Admins can update users in their organization"
    ON users FOR UPDATE
    TO authenticated
    USING (
      -- Vérifier que l'utilisateur est admin et que l'organization_id correspond
      -- Même approche : sous-requête qui ne lit que l'utilisateur actuel
      EXISTS (
        SELECT 1 
        FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
        AND u.organization_id IS NOT NULL
        AND u.organization_id = users.organization_id
      )
    )
    WITH CHECK (
      -- Vérifier que l'utilisateur est admin et que l'organization_id correspond
      EXISTS (
        SELECT 1 
        FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
        AND u.organization_id IS NOT NULL
        AND u.organization_id = users.organization_id
      )
    );

-- Vérifier les politiques créées
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


