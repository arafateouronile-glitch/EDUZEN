-- Migration ULTIME - Approche la plus simple possible
-- Séparer les politiques pour éviter toute récursion

-- Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile only" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile only" ON users;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Supprimer les fonctions si elles existent
DROP FUNCTION IF EXISTS public.get_user_organization_id();
DROP FUNCTION IF EXISTS public.get_user_role();

-- Politique 1 : Toujours voir son propre profil (condition simple, pas de récursion)
CREATE POLICY "Users can view own profile"
    ON users FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Politique 2 : Voir les utilisateurs de la même organisation
-- On utilise une sous-requête mais seulement pour comparer organization_id
-- La condition u.id = auth.uid() dans la sous-requête permet de lire l'utilisateur actuel
-- sans déclencher de récursion car cette condition est toujours vraie pour l'utilisateur lui-même
CREATE POLICY "Users can view users in their organization"
    ON users FOR SELECT
    TO authenticated
    USING (
      -- Voir les utilisateurs de la même organisation
      -- La sous-requête lit uniquement l'utilisateur actuel (u.id = auth.uid())
      -- donc pas de récursion
      organization_id IN (
        SELECT u.organization_id 
        FROM public.users u
        WHERE u.id = auth.uid()
        AND u.organization_id IS NOT NULL
      )
    );

-- Politique pour INSERT : créer son propre profil
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
      organization_id IN (
        SELECT u.organization_id 
        FROM public.users u
        WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'admin')
        AND u.organization_id IS NOT NULL
      )
    )
    WITH CHECK (
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


