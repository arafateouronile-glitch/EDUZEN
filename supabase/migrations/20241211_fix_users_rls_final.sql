-- Migration FINALE pour corriger les politiques RLS sur users
-- Utilise une fonction SECURITY DEFINER qui désactive complètement RLS

-- Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view own profile only" ON users;
DROP POLICY IF EXISTS "Users can create own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile only" ON users;
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Supprimer l'ancienne fonction si elle existe
DROP FUNCTION IF EXISTS public.get_user_organization_id();

-- Créer une fonction qui obtient l'organization_id en désactivant complètement RLS
-- Cette fonction utilise SECURITY DEFINER et désactive RLS au niveau de la session
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
  old_row_security TEXT;
BEGIN
  -- Obtenir l'ID de l'utilisateur actuel
  current_user_id := auth.uid();
  
  -- Si pas d'utilisateur authentifié, retourner NULL
  IF current_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Sauvegarder l'état actuel de row_security
  SELECT current_setting('row_security', true) INTO old_row_security;
  
  -- Désactiver RLS pour cette session
  PERFORM set_config('row_security', 'off', true);
  
  -- Lire l'organization_id directement depuis la table
  -- Maintenant RLS est désactivé, donc pas de récursion
  SELECT organization_id INTO user_org_id
  FROM public.users
  WHERE id = current_user_id
  LIMIT 1;
  
  -- Restaurer l'état de row_security
  PERFORM set_config('row_security', COALESCE(old_row_security, 'on'), true);
  
  RETURN user_org_id;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO anon;

-- Politique pour SELECT : voir son propre profil ET les utilisateurs de la même organisation
CREATE POLICY "Users can view users in their organization"
    ON users FOR SELECT
    TO authenticated
    USING (
      -- Toujours voir son propre profil
      id = auth.uid()
      -- OU voir les utilisateurs de la même organisation
      -- La fonction get_user_organization_id() désactive RLS donc pas de récursion
      OR (
        organization_id = public.get_user_organization_id()
        AND public.get_user_organization_id() IS NOT NULL
      )
      -- OU si c'est un super_admin, voir tous les utilisateurs
      OR (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid()
          AND role = 'super_admin'
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


