-- =====================================================
-- Fix RLS Policy for platform_admins
-- =====================================================
-- 
-- Problème : La politique actuelle nécessite d'être admin pour lire,
-- mais pour vérifier qu'on est admin, il faut pouvoir lire.
-- Solution : Ajouter une politique qui permet de lire son propre enregistrement.
-- =====================================================

-- Supprimer l'ancienne politique problématique
DROP POLICY IF EXISTS "Platform admins can view admin list" ON platform_admins;

-- Nouvelle politique : Permettre à un utilisateur de voir SON PROPRE enregistrement
-- Cela permet au hook usePlatformAdmin de vérifier si l'utilisateur est admin
DROP POLICY IF EXISTS "Users can view their own platform admin record" ON platform_admins;
CREATE POLICY "Users can view their own platform admin record" 
ON platform_admins 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- La politique "Super admins can manage platform admins" existe déjà, pas besoin de la recréer
-- Elle permet aux super admins de gérer tous les admins

-- Vérification
SELECT 
  'POLITIQUES RLS PLATFORM_ADMINS' as type,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'platform_admins'
ORDER BY policyname;
