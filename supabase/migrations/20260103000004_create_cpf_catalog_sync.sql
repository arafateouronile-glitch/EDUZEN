-- =====================================================
-- EDUZEN - Module CPF - Synchronisation du Catalogue
-- =====================================================
-- Description: Table pour la synchronisation du catalogue de formations CPF
-- Date: 2026-01-03
-- =====================================================

-- Fonction pour mettre à jour automatiquement updated_at (si elle n'existe pas déjà)
CREATE OR REPLACE FUNCTION update_cpf_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table pour stocker les synchronisations du catalogue CPF
CREATE TABLE IF NOT EXISTS public.cpf_catalog_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Informations de synchronisation
  sync_type VARCHAR(50) NOT NULL DEFAULT 'full' CHECK (sync_type IN ('full', 'incremental', 'manual')),
  sync_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'in_progress', 'completed', 'failed', 'partial')),
  sync_method VARCHAR(50) NOT NULL DEFAULT 'xml' CHECK (sync_method IN ('xml', 'api', 'manual')),
  
  -- Fichier XML (si méthode XML)
  xml_file_url TEXT,
  xml_file_hash VARCHAR(64), -- Hash pour vérifier l'intégrité
  
  -- Résultats de synchronisation
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_total INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  
  -- Erreurs et métadonnées
  error_message TEXT,
  error_details JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Statistiques
  stats JSONB DEFAULT '{}'::jsonb, -- Statistiques détaillées (par type de formation, etc.)
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.cpf_catalog_sync IS 'Logs de synchronisation du catalogue CPF depuis la Caisse des Dépôts';
COMMENT ON COLUMN public.cpf_catalog_sync.sync_method IS 'Méthode de synchronisation: xml (fichier XML), api (API REST), manual (saisie manuelle)';
COMMENT ON COLUMN public.cpf_catalog_sync.xml_file_url IS 'URL du fichier XML importé (si méthode XML)';
COMMENT ON COLUMN public.cpf_catalog_sync.xml_file_hash IS 'Hash du fichier XML pour éviter les doublons';

-- Index
CREATE INDEX IF NOT EXISTS idx_cpf_catalog_sync_org ON public.cpf_catalog_sync(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpf_catalog_sync_status ON public.cpf_catalog_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_cpf_catalog_sync_created_at ON public.cpf_catalog_sync(created_at DESC);

-- Trigger pour updated_at
CREATE TRIGGER update_cpf_catalog_sync_updated_at
  BEFORE UPDATE ON public.cpf_catalog_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

-- RLS Policies
ALTER TABLE public.cpf_catalog_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view CPF catalog sync of their organization"
  ON public.cpf_catalog_sync FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage CPF catalog sync"
  ON public.cpf_catalog_sync FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
    )
  );

-- Ajouter une colonne à cpf_eligible_trainings pour le suivi de la synchronisation
ALTER TABLE public.cpf_eligible_trainings
  ADD COLUMN IF NOT EXISTS sync_source VARCHAR(50) DEFAULT 'manual' CHECK (sync_source IN ('manual', 'xml', 'api')),
  ADD COLUMN IF NOT EXISTS sync_id UUID REFERENCES public.cpf_catalog_sync(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sync_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_id VARCHAR(100); -- ID externe du CPF

COMMENT ON COLUMN public.cpf_eligible_trainings.sync_source IS 'Source de la synchronisation: manual (saisie manuelle), xml (fichier XML), api (API)';
COMMENT ON COLUMN public.cpf_eligible_trainings.sync_id IS 'ID de la synchronisation qui a créé/mis à jour cette formation';
COMMENT ON COLUMN public.cpf_eligible_trainings.external_id IS 'ID externe du CPF pour la correspondance';

-- Index pour la synchronisation
CREATE INDEX IF NOT EXISTS idx_cpf_eligible_trainings_sync ON public.cpf_eligible_trainings(sync_id);
CREATE INDEX IF NOT EXISTS idx_cpf_eligible_trainings_external_id ON public.cpf_eligible_trainings(external_id);
CREATE INDEX IF NOT EXISTS idx_cpf_eligible_trainings_sync_source ON public.cpf_eligible_trainings(sync_source);

