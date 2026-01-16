-- Migration pour créer le système de modèles d'emails
-- Permet de créer des modèles d'emails personnalisés pour chaque type d'envoi

-- Table des modèles d'emails
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Type d'email (document_generated, invoice_sent, payment_reminder, notification, etc.)
  email_type VARCHAR(100) NOT NULL,
  
  -- Informations du modèle
  name VARCHAR(255) NOT NULL, -- Nom du modèle (ex: "Document généré - Standard", "Facture - Référencement CPF")
  subject TEXT NOT NULL, -- Sujet de l'email (peut contenir des variables comme {student_name})
  body_html TEXT NOT NULL, -- Corps de l'email en HTML (peut contenir des variables)
  body_text TEXT, -- Corps de l'email en texte brut (optionnel)
  
  -- Variables disponibles (JSON pour documenter les variables utilisables)
  available_variables JSONB DEFAULT '[]'::jsonb,
  
  -- Configuration
  is_default BOOLEAN DEFAULT false, -- Modèle par défaut pour ce type d'email
  is_active BOOLEAN DEFAULT true,
  
  -- Métadonnées
  description TEXT, -- Description du modèle
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_email_templates_org_type ON public.email_templates(organization_id, email_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_org_default ON public.email_templates(organization_id, email_type, is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON public.email_templates(organization_id, email_type, is_active) WHERE is_active = true;

-- Contrainte : un seul modèle par défaut par type d'email et par organisation
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_unique_default 
ON public.email_templates(organization_id, email_type) 
WHERE is_default = true;

-- Commentaires
COMMENT ON TABLE public.email_templates IS 'Modèles d''emails personnalisables pour chaque type d''envoi';
COMMENT ON COLUMN public.email_templates.email_type IS 'Type d''email: document_generated, invoice_sent, payment_reminder, notification, enrollment_confirmation, etc.';
COMMENT ON COLUMN public.email_templates.body_html IS 'Corps HTML avec variables comme {student_name}, {document_title}, {organization_name}, etc.';
COMMENT ON COLUMN public.email_templates.available_variables IS 'Liste des variables disponibles pour ce type d''email (ex: ["student_name", "document_title"])';

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- RLS Policies
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir les modèles de leur organisation
CREATE POLICY "Users can view templates of their organization"
ON public.email_templates
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
);

-- Policy: Les utilisateurs avec rôle approprié peuvent créer des modèles
CREATE POLICY "Users can create templates in their organization"
ON public.email_templates
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  )
);

-- Policy: Les utilisateurs avec rôle approprié peuvent mettre à jour les modèles
CREATE POLICY "Users can update templates in their organization"
ON public.email_templates
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
);

-- Policy: Les utilisateurs avec rôle approprié peuvent supprimer les modèles
CREATE POLICY "Users can delete templates in their organization"
ON public.email_templates
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.users WHERE id = auth.uid()
  )
  AND (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'manager')
    )
  )
);

-- Insérer des modèles par défaut pour chaque type (optionnel, peut être fait côté application)
-- Ces modèles seront créés lors de la première utilisation
