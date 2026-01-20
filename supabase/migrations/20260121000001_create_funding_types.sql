-- Migration: Création de la table funding_types et ajout du champ funding_type_id à enrollments
-- Date: 2026-01-21

-- ============================================
-- TABLE: funding_types
-- ============================================
-- Table pour gérer les types de financement disponibles pour les inscriptions

CREATE TABLE IF NOT EXISTS public.funding_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Informations du type de financement
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50), -- Code court pour référence (ex: "CPF", "OPCO", "PERSONNEL")
  description TEXT,
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  requires_documentation BOOLEAN DEFAULT false, -- Si des documents sont requis pour ce type
  requires_approval BOOLEAN DEFAULT false, -- Si une approbation est requise
  
  -- Métadonnées
  display_order INTEGER DEFAULT 0, -- Ordre d'affichage dans les listes
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Contrainte: nom unique par organisation
  CONSTRAINT funding_types_org_name_unique UNIQUE (organization_id, name)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_funding_types_org ON public.funding_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_funding_types_active ON public.funding_types(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_funding_types_code ON public.funding_types(organization_id, code) WHERE code IS NOT NULL;

-- Commentaires
COMMENT ON TABLE public.funding_types IS 'Types de financement disponibles pour les inscriptions (CPF, OPCO, Personnel, etc.)';
COMMENT ON COLUMN public.funding_types.code IS 'Code court pour référence rapide (ex: "CPF", "OPCO", "PERSONNEL")';
COMMENT ON COLUMN public.funding_types.requires_documentation IS 'Indique si des documents sont requis pour ce type de financement';
COMMENT ON COLUMN public.funding_types.requires_approval IS 'Indique si une approbation est requise pour ce type de financement';
COMMENT ON COLUMN public.funding_types.display_order IS 'Ordre d''affichage dans les listes déroulantes';

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_funding_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_funding_types_updated_at
  BEFORE UPDATE ON public.funding_types
  FOR EACH ROW
  EXECUTE FUNCTION update_funding_types_updated_at();

-- ============================================
-- MODIFICATION: Ajout du champ funding_type_id à enrollments
-- ============================================

-- Ajouter la colonne funding_type_id à la table enrollments
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS funding_type_id UUID REFERENCES public.funding_types(id) ON DELETE SET NULL;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_enrollments_funding_type ON public.enrollments(funding_type_id);

-- Commentaire
COMMENT ON COLUMN public.enrollments.funding_type_id IS 'Type de financement utilisé pour cette inscription';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activer RLS sur funding_types
ALTER TABLE public.funding_types ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir les types de financement de leur organisation
DROP POLICY IF EXISTS "Users can view funding types of their organization" ON public.funding_types;
CREATE POLICY "Users can view funding types of their organization"
  ON public.funding_types FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Les admins peuvent gérer les types de financement de leur organisation
DROP POLICY IF EXISTS "Admins can manage funding types of their organization" ON public.funding_types;
CREATE POLICY "Admins can manage funding types of their organization"
  ON public.funding_types FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'manager')
    )
  );

-- ============================================
-- DONNÉES PAR DÉFAUT (optionnel)
-- ============================================
-- Note: Les types de financement par défaut seront créés via l'interface
-- ou lors de la création d'une organisation
