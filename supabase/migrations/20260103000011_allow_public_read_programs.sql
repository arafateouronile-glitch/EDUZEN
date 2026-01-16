-- =====================================================
-- EDUZEN - Autoriser la lecture publique des programmes
-- =====================================================
-- Description: Ajouter une politique RLS pour permettre la lecture publique des programmes avec is_public = true
-- Date: 2026-01-03
-- =====================================================

-- Activer RLS sur la table programs si ce n'est pas déjà fait
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Supprimer la politique existante si elle existe (pour éviter les doublons)
DROP POLICY IF EXISTS "Public can view public programs" ON public.programs;

-- Créer une politique RLS pour permettre la lecture publique des programmes publics
CREATE POLICY "Public can view public programs"
  ON public.programs
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true AND is_active = true);

COMMENT ON POLICY "Public can view public programs" ON public.programs IS 
  'Permet aux utilisateurs anonymes et authentifiés de voir les programmes marqués comme publics et actifs';



