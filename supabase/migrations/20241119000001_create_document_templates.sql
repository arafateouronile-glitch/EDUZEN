-- Migration: Create Document Templates and Generated Documents tables
-- Date: 2024-11-19

-- Enum for document types (créer seulement s'il n'existe pas)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM (
      'convention',
      'facture',
      'devis',
      'convocation',
      'contrat',
      'attestation_reussite',
      'certificat_scolarite',
      'releve_notes',
      'attestation_entree',
      'reglement_interieur',
      'cgv',
      'programme',
      'attestation_assiduite'
    );
  END IF;
END $$;

-- Table: document_templates
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Document identification
  type document_type NOT NULL,
  name TEXT NOT NULL,
  
  -- Header configuration
  header JSONB,
  header_enabled BOOLEAN DEFAULT true,
  header_height INTEGER DEFAULT 100, -- in pixels
  
  -- Body configuration (main content)
  content JSONB NOT NULL, -- Structure JSON du template (éléments, positions, styles)
  
  -- Footer configuration
  footer JSONB,
  footer_enabled BOOLEAN DEFAULT true,
  footer_height INTEGER DEFAULT 60, -- in pixels
  
  -- Document settings
  is_default BOOLEAN DEFAULT false, -- Template par défaut du type
  is_active BOOLEAN DEFAULT true,
  page_size TEXT DEFAULT 'A4', -- A4, Letter, Legal
  margins JSONB DEFAULT '{"top": 20, "right": 20, "bottom": 20, "left": 20}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: generated_documents
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE SET NULL,
  
  -- Document metadata
  type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- URL du fichier sur cloud storage
  format TEXT NOT NULL, -- PDF ou DOCX
  page_count INTEGER DEFAULT 1, -- Nombre de pages générées
  
  -- Related entity (student, session, enrollment, etc.)
  related_entity_type TEXT, -- 'student', 'session', 'enrollment', 'invoice', etc.
  related_entity_id TEXT,
  
  -- Generation data
  metadata JSONB, -- Données utilisées pour génération
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_templates_org_type 
  ON document_templates(organization_id, type);
  
CREATE INDEX IF NOT EXISTS idx_document_templates_org_active 
  ON document_templates(organization_id, is_active);

-- Ensure only one default template per type per organization
CREATE UNIQUE INDEX IF NOT EXISTS document_templates_unique_default 
  ON document_templates (organization_id, type) 
  WHERE (is_default = true);

CREATE INDEX IF NOT EXISTS idx_generated_documents_org_type 
  ON generated_documents(organization_id, type);
  
CREATE INDEX IF NOT EXISTS idx_generated_documents_related 
  ON generated_documents(related_entity_type, related_entity_id);
  
CREATE INDEX IF NOT EXISTS idx_generated_documents_created 
  ON generated_documents(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe avant de le recréer
DROP TRIGGER IF EXISTS update_document_templates_timestamp ON document_templates;

CREATE TRIGGER update_document_templates_timestamp
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_templates_updated_at();

-- RLS Policies
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes avant de les recréer
DROP POLICY IF EXISTS "Users can view templates from their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can create templates in their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can update templates from their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can delete templates from their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can view generated documents from their organization" ON generated_documents;
DROP POLICY IF EXISTS "Users can create generated documents in their organization" ON generated_documents;

-- Policy: Users can only access templates from their organization
CREATE POLICY "Users can view templates from their organization"
  ON document_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert templates in their organization
CREATE POLICY "Users can create templates in their organization"
  ON document_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update templates from their organization
CREATE POLICY "Users can update templates from their organization"
  ON document_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete templates from their organization
CREATE POLICY "Users can delete templates from their organization"
  ON document_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can view generated documents from their organization
CREATE POLICY "Users can view generated documents from their organization"
  ON generated_documents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can create generated documents in their organization
CREATE POLICY "Users can create generated documents in their organization"
  ON generated_documents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Comment on tables
COMMENT ON TABLE document_templates IS 'Modèles de documents avec header/footer personnalisables';
COMMENT ON COLUMN document_templates.header IS 'Configuration JSON de l''en-tête avec éléments et styles';
COMMENT ON COLUMN document_templates.content IS 'Structure JSON du corps du document (éléments, positions, styles)';
COMMENT ON COLUMN document_templates.footer IS 'Configuration JSON du pied de page avec pagination';
COMMENT ON TABLE generated_documents IS 'Documents générés à partir des modèles';



-- Enum for document types (créer seulement s'il n'existe pas)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM (
      'convention',
      'facture',
      'devis',
      'convocation',
      'contrat',
      'attestation_reussite',
      'certificat_scolarite',
      'releve_notes',
      'attestation_entree',
      'reglement_interieur',
      'cgv',
      'programme',
      'attestation_assiduite'
    );
  END IF;
END $$;

-- Table: document_templates
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Document identification
  type document_type NOT NULL,
  name TEXT NOT NULL,
  
  -- Header configuration
  header JSONB,
  header_enabled BOOLEAN DEFAULT true,
  header_height INTEGER DEFAULT 100, -- in pixels
  
  -- Body configuration (main content)
  content JSONB NOT NULL, -- Structure JSON du template (éléments, positions, styles)
  
  -- Footer configuration
  footer JSONB,
  footer_enabled BOOLEAN DEFAULT true,
  footer_height INTEGER DEFAULT 60, -- in pixels
  
  -- Document settings
  is_default BOOLEAN DEFAULT false, -- Template par défaut du type
  is_active BOOLEAN DEFAULT true,
  page_size TEXT DEFAULT 'A4', -- A4, Letter, Legal
  margins JSONB DEFAULT '{"top": 20, "right": 20, "bottom": 20, "left": 20}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: generated_documents
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE SET NULL,
  
  -- Document metadata
  type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- URL du fichier sur cloud storage
  format TEXT NOT NULL, -- PDF ou DOCX
  page_count INTEGER DEFAULT 1, -- Nombre de pages générées
  
  -- Related entity (student, session, enrollment, etc.)
  related_entity_type TEXT, -- 'student', 'session', 'enrollment', 'invoice', etc.
  related_entity_id TEXT,
  
  -- Generation data
  metadata JSONB, -- Données utilisées pour génération
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_templates_org_type 
  ON document_templates(organization_id, type);
  
CREATE INDEX IF NOT EXISTS idx_document_templates_org_active 
  ON document_templates(organization_id, is_active);

-- Ensure only one default template per type per organization
CREATE UNIQUE INDEX IF NOT EXISTS document_templates_unique_default 
  ON document_templates (organization_id, type) 
  WHERE (is_default = true);

CREATE INDEX IF NOT EXISTS idx_generated_documents_org_type 
  ON generated_documents(organization_id, type);
  
CREATE INDEX IF NOT EXISTS idx_generated_documents_related 
  ON generated_documents(related_entity_type, related_entity_id);
  
CREATE INDEX IF NOT EXISTS idx_generated_documents_created 
  ON generated_documents(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe avant de le recréer
DROP TRIGGER IF EXISTS update_document_templates_timestamp ON document_templates;

CREATE TRIGGER update_document_templates_timestamp
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_templates_updated_at();

-- RLS Policies
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes avant de les recréer
DROP POLICY IF EXISTS "Users can view templates from their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can create templates in their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can update templates from their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can delete templates from their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can view generated documents from their organization" ON generated_documents;
DROP POLICY IF EXISTS "Users can create generated documents in their organization" ON generated_documents;

-- Policy: Users can only access templates from their organization
CREATE POLICY "Users can view templates from their organization"
  ON document_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert templates in their organization
CREATE POLICY "Users can create templates in their organization"
  ON document_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update templates from their organization
CREATE POLICY "Users can update templates from their organization"
  ON document_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete templates from their organization
CREATE POLICY "Users can delete templates from their organization"
  ON document_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can view generated documents from their organization
CREATE POLICY "Users can view generated documents from their organization"
  ON generated_documents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can create generated documents in their organization
CREATE POLICY "Users can create generated documents in their organization"
  ON generated_documents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Comment on tables
COMMENT ON TABLE document_templates IS 'Modèles de documents avec header/footer personnalisables';
COMMENT ON COLUMN document_templates.header IS 'Configuration JSON de l''en-tête avec éléments et styles';
COMMENT ON COLUMN document_templates.content IS 'Structure JSON du corps du document (éléments, positions, styles)';
COMMENT ON COLUMN document_templates.footer IS 'Configuration JSON du pied de page avec pagination';
COMMENT ON TABLE generated_documents IS 'Documents générés à partir des modèles';



-- Enum for document types (créer seulement s'il n'existe pas)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM (
      'convention',
      'facture',
      'devis',
      'convocation',
      'contrat',
      'attestation_reussite',
      'certificat_scolarite',
      'releve_notes',
      'attestation_entree',
      'reglement_interieur',
      'cgv',
      'programme',
      'attestation_assiduite'
    );
  END IF;
END $$;

-- Table: document_templates
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Document identification
  type document_type NOT NULL,
  name TEXT NOT NULL,
  
  -- Header configuration
  header JSONB,
  header_enabled BOOLEAN DEFAULT true,
  header_height INTEGER DEFAULT 100, -- in pixels
  
  -- Body configuration (main content)
  content JSONB NOT NULL, -- Structure JSON du template (éléments, positions, styles)
  
  -- Footer configuration
  footer JSONB,
  footer_enabled BOOLEAN DEFAULT true,
  footer_height INTEGER DEFAULT 60, -- in pixels
  
  -- Document settings
  is_default BOOLEAN DEFAULT false, -- Template par défaut du type
  is_active BOOLEAN DEFAULT true,
  page_size TEXT DEFAULT 'A4', -- A4, Letter, Legal
  margins JSONB DEFAULT '{"top": 20, "right": 20, "bottom": 20, "left": 20}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: generated_documents
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE SET NULL,
  
  -- Document metadata
  type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL, -- URL du fichier sur cloud storage
  format TEXT NOT NULL, -- PDF ou DOCX
  page_count INTEGER DEFAULT 1, -- Nombre de pages générées
  
  -- Related entity (student, session, enrollment, etc.)
  related_entity_type TEXT, -- 'student', 'session', 'enrollment', 'invoice', etc.
  related_entity_id TEXT,
  
  -- Generation data
  metadata JSONB, -- Données utilisées pour génération
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_templates_org_type 
  ON document_templates(organization_id, type);
  
CREATE INDEX IF NOT EXISTS idx_document_templates_org_active 
  ON document_templates(organization_id, is_active);

-- Ensure only one default template per type per organization
CREATE UNIQUE INDEX IF NOT EXISTS document_templates_unique_default 
  ON document_templates (organization_id, type) 
  WHERE (is_default = true);

CREATE INDEX IF NOT EXISTS idx_generated_documents_org_type 
  ON generated_documents(organization_id, type);
  
CREATE INDEX IF NOT EXISTS idx_generated_documents_related 
  ON generated_documents(related_entity_type, related_entity_id);
  
CREATE INDEX IF NOT EXISTS idx_generated_documents_created 
  ON generated_documents(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe avant de le recréer
DROP TRIGGER IF EXISTS update_document_templates_timestamp ON document_templates;

CREATE TRIGGER update_document_templates_timestamp
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_templates_updated_at();

-- RLS Policies
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes avant de les recréer
DROP POLICY IF EXISTS "Users can view templates from their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can create templates in their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can update templates from their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can delete templates from their organization" ON document_templates;
DROP POLICY IF EXISTS "Users can view generated documents from their organization" ON generated_documents;
DROP POLICY IF EXISTS "Users can create generated documents in their organization" ON generated_documents;

-- Policy: Users can only access templates from their organization
CREATE POLICY "Users can view templates from their organization"
  ON document_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can insert templates in their organization
CREATE POLICY "Users can create templates in their organization"
  ON document_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can update templates from their organization
CREATE POLICY "Users can update templates from their organization"
  ON document_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can delete templates from their organization
CREATE POLICY "Users can delete templates from their organization"
  ON document_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can view generated documents from their organization
CREATE POLICY "Users can view generated documents from their organization"
  ON generated_documents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy: Users can create generated documents in their organization
CREATE POLICY "Users can create generated documents in their organization"
  ON generated_documents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Comment on tables
COMMENT ON TABLE document_templates IS 'Modèles de documents avec header/footer personnalisables';
COMMENT ON COLUMN document_templates.header IS 'Configuration JSON de l''en-tête avec éléments et styles';
COMMENT ON COLUMN document_templates.content IS 'Structure JSON du corps du document (éléments, positions, styles)';
COMMENT ON COLUMN document_templates.footer IS 'Configuration JSON du pied de page avec pagination';
COMMENT ON TABLE generated_documents IS 'Documents générés à partir des modèles';





