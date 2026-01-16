-- Migration pour corriger les politiques RLS sur users
-- Permettre aux admins de voir TOUS les utilisateurs de leur organisation

-- Supprimer TOUTES les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile only" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile only" ON users;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Créer une fonction helper pour obtenir l'organization_id de l'utilisateur actuel
-- Cette fonction évite les problèmes de récursion en utilisant SECURITY DEFINER
-- et en désactivant temporairement RLS pour cette requête
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
  current_user_id UUID;
BEGIN
  -- Obtenir l'ID de l'utilisateur actuel
  current_user_id := auth.uid();
  
  -- Si pas d'utilisateur authentifié, retourner NULL
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Désactiver temporairement RLS pour cette requête
  -- Cela permet de lire directement depuis la table sans déclencher les politiques RLS
  SET LOCAL row_security = off;
  
  -- Lire l'organization_id directement depuis la table
  SELECT organization_id INTO user_org_id
  FROM public.users
  WHERE id = current_user_id
  LIMIT 1;
  
  RETURN user_org_id;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO anon;

-- Politique pour SELECT : voir les utilisateurs de son organisation
-- Cette politique unique couvre tous les cas :
-- 1. Voir son propre profil
-- 2. Voir les utilisateurs de la même organisation
-- 3. Voir tous les utilisateurs (pour les super_admins)
-- Note: On utilise get_user_organization_id() qui est SECURITY DEFINER et contourne RLS
CREATE POLICY "Users can view users in their organization"
    ON users FOR SELECT
    USING (
      -- Toujours voir son propre profil
      id = auth.uid()
      -- OU voir les utilisateurs de la même organisation
      -- La fonction get_user_organization_id() utilise SECURITY DEFINER donc contourne RLS
      OR (
        organization_id = public.get_user_organization_id()
        AND public.get_user_organization_id() IS NOT NULL
      )
      -- OU si c'est un super_admin, voir tous les utilisateurs
      -- On utilise la fonction pour éviter la récursion
      OR (
        public.get_user_organization_id() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid()
          AND role = 'super_admin'
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
-- On utilise get_user_organization_id() pour éviter la récursion
CREATE POLICY "Admins can update users in their organization"
    ON users FOR UPDATE
    USING (
      -- Vérifier que l'utilisateur est admin et que l'organization_id correspond
      organization_id = public.get_user_organization_id()
      AND public.get_user_organization_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
      )
    )
    WITH CHECK (
      -- Vérifier que l'utilisateur est admin et que l'organization_id correspond
      organization_id = public.get_user_organization_id()
      AND public.get_user_organization_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
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

