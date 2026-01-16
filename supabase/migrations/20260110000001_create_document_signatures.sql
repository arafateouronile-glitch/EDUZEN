-- Migration: Création de la table pour les signatures électroniques de documents
-- Date: 2025-01-10
-- Description: Table pour stocker les signatures électroniques associées aux documents

-- Table pour les signatures de documents
CREATE TABLE IF NOT EXISTS public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  
  -- Informations de la signature
  signature_data TEXT NOT NULL, -- Image de la signature en base64
  signature_type VARCHAR(50) DEFAULT 'handwritten', -- 'handwritten', 'typed', 'image'
  
  -- Informations du signataire
  signer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  signer_name VARCHAR(255) NOT NULL, -- Nom du signataire au moment de la signature
  signer_email VARCHAR(255), -- Email du signataire
  signer_role VARCHAR(100), -- Rôle du signataire (directeur, enseignant, etc.)
  
  -- Position et format
  position_x INTEGER, -- Position X sur le document (pour placement)
  position_y INTEGER, -- Position Y sur le document
  width INTEGER DEFAULT 200, -- Largeur de la signature
  height INTEGER DEFAULT 80, -- Hauteur de la signature
  page_number INTEGER DEFAULT 1, -- Numéro de page où se trouve la signature
  
  -- Métadonnées
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45), -- Adresse IP du signataire
  user_agent TEXT, -- User agent du navigateur
  
  -- Statut et validation
  status VARCHAR(50) DEFAULT 'signed', -- 'pending', 'signed', 'revoked', 'expired'
  is_valid BOOLEAN DEFAULT TRUE,
  validation_code VARCHAR(100), -- Code de validation pour vérifier l'intégrité
  
  -- Commentaire optionnel
  comment TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_document_signatures_document ON public.document_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signer ON public.document_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_organization ON public.document_signatures(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_signatures_status ON public.document_signatures(status);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signed_at ON public.document_signatures(signed_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_document_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_document_signatures_updated_at ON public.document_signatures;
CREATE TRIGGER update_document_signatures_updated_at
  BEFORE UPDATE ON public.document_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_document_signatures_updated_at();

-- Activer Row Level Security
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- Policies RLS

-- Policy: Les utilisateurs peuvent voir les signatures des documents de leur organisation
DROP POLICY IF EXISTS "document_signatures_select_organization" ON public.document_signatures;
CREATE POLICY "document_signatures_select_organization"
  ON public.document_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.organization_id = document_signatures.organization_id
    )
  );

-- Policy: Les utilisateurs peuvent créer des signatures pour les documents de leur organisation
DROP POLICY IF EXISTS "document_signatures_insert_organization" ON public.document_signatures;
CREATE POLICY "document_signatures_insert_organization"
  ON public.document_signatures
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.organization_id = document_signatures.organization_id
      AND users.id = document_signatures.signer_id
    )
  );

-- Policy: Les utilisateurs peuvent modifier leurs propres signatures
DROP POLICY IF EXISTS "document_signatures_update_own" ON public.document_signatures;
CREATE POLICY "document_signatures_update_own"
  ON public.document_signatures
  FOR UPDATE
  USING (
    signer_id = auth.uid()
    AND status = 'pending' -- Seulement les signatures en attente peuvent être modifiées
  );

-- Policy: Les admins peuvent modifier toutes les signatures de leur organisation
DROP POLICY IF EXISTS "document_signatures_update_admin" ON public.document_signatures;
CREATE POLICY "document_signatures_update_admin"
  ON public.document_signatures
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.organization_id = document_signatures.organization_id
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Les utilisateurs peuvent supprimer leurs propres signatures (seulement si pending)
DROP POLICY IF EXISTS "document_signatures_delete_own" ON public.document_signatures;
CREATE POLICY "document_signatures_delete_own"
  ON public.document_signatures
  FOR DELETE
  USING (
    signer_id = auth.uid()
    AND status = 'pending'
  );

-- Policy: Les admins peuvent supprimer toutes les signatures de leur organisation
DROP POLICY IF EXISTS "document_signatures_delete_admin" ON public.document_signatures;
CREATE POLICY "document_signatures_delete_admin"
  ON public.document_signatures
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.organization_id = document_signatures.organization_id
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- Commentaires
COMMENT ON TABLE public.document_signatures IS 'Signatures électroniques associées aux documents';
COMMENT ON COLUMN public.document_signatures.signature_data IS 'Image de la signature encodée en base64 (format PNG)';
COMMENT ON COLUMN public.document_signatures.signature_type IS 'Type de signature: handwritten (manuscrite), typed (tapée), image (image uploadée)';
COMMENT ON COLUMN public.document_signatures.status IS 'Statut de la signature: pending (en attente), signed (signée), revoked (révoquée), expired (expirée)';
COMMENT ON COLUMN public.document_signatures.validation_code IS 'Code de validation pour vérifier l''intégrité de la signature';
