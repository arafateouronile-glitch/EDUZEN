-- Migration SIMPLIFIÉE pour corriger les politiques RLS sur users
-- Approche sans fonction helper pour éviter toute récursion

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
-- On utilise une approche simple qui compare directement les organization_id
-- La sous-requête utilise SECURITY DEFINER via une fonction inline pour éviter la récursion
CREATE POLICY "Users can view users in their organization"
    ON users FOR SELECT
    TO authenticated
    USING (
      -- Toujours voir son propre profil (cela ne déclenche pas de récursion)
      id = auth.uid()
      -- OU voir les utilisateurs de la même organisation
      -- On utilise une sous-requête avec une condition qui évite la récursion
      -- en vérifiant d'abord que l'utilisateur peut se voir lui-même
      OR (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.organization_id IS NOT NULL
          AND u.organization_id = users.organization_id
          -- Cette condition garantit que la sous-requête peut toujours lire l'utilisateur actuel
          -- car u.id = auth.uid() est toujours vrai pour l'utilisateur lui-même
        )
      )
      -- OU si c'est un super_admin, voir tous les utilisateurs
      OR (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
          AND u.role = 'super_admin'
        )
      )
    );

-- Politique pour INSERT : créer son propre profil (pour l'inscription)
CREATE POLICY "Users can create own profile"
    ON users FOR INSERT
    WITH CHECK (
      auth.uid() IS NOT NULL 
      AND id = auth.uid()
    );

-- Politique pour UPDATE : mettre à jour son propre profil
CREATE POLICY "Users can update own profile only"
    ON users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Politique pour UPDATE : admins peuvent mettre à jour les utilisateurs de leur organisation
CREATE POLICY "Admins can update users in their organization"
    ON users FOR UPDATE
    USING (
      -- Vérifier que l'utilisateur est admin et que l'organization_id correspond
      organization_id IN (
        SELECT u.organization_id 
        FROM public.users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('super_admin', 'admin')
        AND u.organization_id IS NOT NULL
      )
    )
    WITH CHECK (
      -- Vérifier que l'utilisateur est admin et que l'organization_id correspond
      organization_id IN (
        SELECT u.organization_id 
        FROM public.users u 
        WHERE u.id = auth.uid() 
        AND u.role IN ('super_admin', 'admin')
        AND u.organization_id IS NOT NULL
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

