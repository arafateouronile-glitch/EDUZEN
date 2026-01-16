-- Migration FINALE qui fonctionne vraiment
-- Utilise une fonction SECURITY DEFINER avec désactivation RLS au niveau session

-- Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile only" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile only" ON users;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Supprimer les anciennes fonctions si elles existent
DROP FUNCTION IF EXISTS public.get_user_organization_id();
DROP FUNCTION IF EXISTS public.get_user_role();

-- Créer une fonction SECURITY DEFINER qui lit directement depuis users
-- Cette fonction s'exécute avec les privilèges du propriétaire (postgres)
-- donc elle contourne complètement RLS
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Créer aussi une fonction pour obtenir le rôle de l'utilisateur (pour éviter la récursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role 
  FROM public.users 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon;

-- Politique pour SELECT : voir son propre profil ET les utilisateurs de la même organisation
-- On utilise les fonctions SECURITY DEFINER qui ne déclenchent pas de récursion
CREATE POLICY "Users can view users in their organization"
    ON users FOR SELECT
    TO authenticated
    USING (
      -- Toujours voir son propre profil
      id = auth.uid()
      -- OU voir les utilisateurs de la même organisation
      -- Les fonctions get_user_organization_id() et get_user_role() sont SECURITY DEFINER
      -- donc elles ne déclenchent pas de récursion
      OR (
        organization_id = public.get_user_organization_id()
        AND public.get_user_organization_id() IS NOT NULL
      )
      -- OU si c'est un super_admin, voir tous les utilisateurs
      OR (
        public.get_user_role() = 'super_admin'
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
      -- On utilise get_user_role() pour éviter la récursion
      organization_id = public.get_user_organization_id()
      AND public.get_user_organization_id() IS NOT NULL
      AND public.get_user_role() IN ('super_admin', 'admin')
    )
    WITH CHECK (
      -- Vérifier que l'utilisateur est admin et que l'organization_id correspond
      organization_id = public.get_user_organization_id()
      AND public.get_user_organization_id() IS NOT NULL
      AND public.get_user_role() IN ('super_admin', 'admin')
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

