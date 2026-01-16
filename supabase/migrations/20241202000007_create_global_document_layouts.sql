-- Migration: Create Global Document Layouts table
-- Date: 2024-12-02
-- Description: Table pour stocker les modèles globaux d'en-tête et de pied de page par organisation

-- Table: global_document_layouts
CREATE TABLE IF NOT EXISTS public.global_document_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Header configuration
  header_content TEXT, -- HTML content du header
  header_enabled BOOLEAN DEFAULT true,
  header_height INTEGER DEFAULT 100, -- in pixels
  header_logo_url TEXT, -- URL du logo dans Supabase Storage
  header_image_url TEXT, -- URL d'une image/photo dans Supabase Storage
  
  -- Footer configuration
  footer_content TEXT, -- HTML content du footer
  footer_enabled BOOLEAN DEFAULT true,
  footer_height INTEGER DEFAULT 60, -- in pixels
  footer_logo_url TEXT, -- URL du logo dans le footer (optionnel)
  footer_image_url TEXT, -- URL d'une image dans le footer (optionnel)
  
  -- Settings
  repeat_on_all_pages BOOLEAN DEFAULT true, -- Répéter header/footer sur toutes les pages
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
  
  -- Note: On utilise une logique applicative pour s'assurer qu'une seule configuration est active
  -- La contrainte unique ne peut pas être appliquée directement sur is_active car plusieurs lignes peuvent être false
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_global_document_layouts_organization 
  ON public.global_document_layouts(organization_id);
CREATE INDEX IF NOT EXISTS idx_global_document_layouts_active 
  ON public.global_document_layouts(organization_id, is_active) 
  WHERE is_active = true;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_global_document_layouts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe avant de le recréer
DROP TRIGGER IF EXISTS update_global_document_layouts_timestamp ON public.global_document_layouts;

CREATE TRIGGER update_global_document_layouts_timestamp
  BEFORE UPDATE ON public.global_document_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_global_document_layouts_timestamp();

-- RLS Policies
ALTER TABLE public.global_document_layouts ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS existantes avant de les recréer pour idempotence
DROP POLICY IF EXISTS "Users can view global layouts from their organization" ON public.global_document_layouts;
DROP POLICY IF EXISTS "Users can create global layouts in their organization" ON public.global_document_layouts;
DROP POLICY IF EXISTS "Users can update global layouts from their organization" ON public.global_document_layouts;
DROP POLICY IF EXISTS "Users can delete global layouts from their organization" ON public.global_document_layouts;

-- Policy: Users can only access layouts from their organization
CREATE POLICY "Users can view global layouts from their organization"
  ON public.global_document_layouts FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create global layouts in their organization"
  ON public.global_document_layouts FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update global layouts from their organization"
  ON public.global_document_layouts FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete global layouts from their organization"
  ON public.global_document_layouts FOR DELETE
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Commentaires
COMMENT ON TABLE public.global_document_layouts IS 'Modèles globaux d''en-tête et de pied de page pour les documents';
COMMENT ON COLUMN public.global_document_layouts.header_content IS 'Contenu HTML de l''en-tête';
COMMENT ON COLUMN public.global_document_layouts.footer_content IS 'Contenu HTML du pied de page';
COMMENT ON COLUMN public.global_document_layouts.header_logo_url IS 'URL du logo dans l''en-tête (Supabase Storage)';
COMMENT ON COLUMN public.global_document_layouts.header_image_url IS 'URL d''une image/photo dans l''en-tête (Supabase Storage)';
COMMENT ON COLUMN public.global_document_layouts.repeat_on_all_pages IS 'Répéter l''en-tête et le pied de page sur toutes les pages';


-- Description: Table pour stocker les modèles globaux d'en-tête et de pied de page par organisation

-- Table: global_document_layouts
CREATE TABLE IF NOT EXISTS public.global_document_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Header configuration
  header_content TEXT, -- HTML content du header
  header_enabled BOOLEAN DEFAULT true,
  header_height INTEGER DEFAULT 100, -- in pixels
  header_logo_url TEXT, -- URL du logo dans Supabase Storage
  header_image_url TEXT, -- URL d'une image/photo dans Supabase Storage
  
  -- Footer configuration
  footer_content TEXT, -- HTML content du footer
  footer_enabled BOOLEAN DEFAULT true,
  footer_height INTEGER DEFAULT 60, -- in pixels
  footer_logo_url TEXT, -- URL du logo dans le footer (optionnel)
  footer_image_url TEXT, -- URL d'une image dans le footer (optionnel)
  
  -- Settings
  repeat_on_all_pages BOOLEAN DEFAULT true, -- Répéter header/footer sur toutes les pages
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
  
  -- Note: On utilise une logique applicative pour s'assurer qu'une seule configuration est active
  -- La contrainte unique ne peut pas être appliquée directement sur is_active car plusieurs lignes peuvent être false
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_global_document_layouts_organization 
  ON public.global_document_layouts(organization_id);
CREATE INDEX IF NOT EXISTS idx_global_document_layouts_active 
  ON public.global_document_layouts(organization_id, is_active) 
  WHERE is_active = true;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_global_document_layouts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe avant de le recréer
DROP TRIGGER IF EXISTS update_global_document_layouts_timestamp ON public.global_document_layouts;

CREATE TRIGGER update_global_document_layouts_timestamp
  BEFORE UPDATE ON public.global_document_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_global_document_layouts_timestamp();

-- RLS Policies
ALTER TABLE public.global_document_layouts ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS existantes avant de les recréer pour idempotence
DROP POLICY IF EXISTS "Users can view global layouts from their organization" ON public.global_document_layouts;
DROP POLICY IF EXISTS "Users can create global layouts in their organization" ON public.global_document_layouts;
DROP POLICY IF EXISTS "Users can update global layouts from their organization" ON public.global_document_layouts;
DROP POLICY IF EXISTS "Users can delete global layouts from their organization" ON public.global_document_layouts;

-- Policy: Users can only access layouts from their organization
CREATE POLICY "Users can view global layouts from their organization"
  ON public.global_document_layouts FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create global layouts in their organization"
  ON public.global_document_layouts FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update global layouts from their organization"
  ON public.global_document_layouts FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete global layouts from their organization"
  ON public.global_document_layouts FOR DELETE
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Commentaires
COMMENT ON TABLE public.global_document_layouts IS 'Modèles globaux d''en-tête et de pied de page pour les documents';
COMMENT ON COLUMN public.global_document_layouts.header_content IS 'Contenu HTML de l''en-tête';
COMMENT ON COLUMN public.global_document_layouts.footer_content IS 'Contenu HTML du pied de page';
COMMENT ON COLUMN public.global_document_layouts.header_logo_url IS 'URL du logo dans l''en-tête (Supabase Storage)';
COMMENT ON COLUMN public.global_document_layouts.header_image_url IS 'URL d''une image/photo dans l''en-tête (Supabase Storage)';
COMMENT ON COLUMN public.global_document_layouts.repeat_on_all_pages IS 'Répéter l''en-tête et le pied de page sur toutes les pages';


-- Description: Table pour stocker les modèles globaux d'en-tête et de pied de page par organisation

-- Table: global_document_layouts
CREATE TABLE IF NOT EXISTS public.global_document_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Header configuration
  header_content TEXT, -- HTML content du header
  header_enabled BOOLEAN DEFAULT true,
  header_height INTEGER DEFAULT 100, -- in pixels
  header_logo_url TEXT, -- URL du logo dans Supabase Storage
  header_image_url TEXT, -- URL d'une image/photo dans Supabase Storage
  
  -- Footer configuration
  footer_content TEXT, -- HTML content du footer
  footer_enabled BOOLEAN DEFAULT true,
  footer_height INTEGER DEFAULT 60, -- in pixels
  footer_logo_url TEXT, -- URL du logo dans le footer (optionnel)
  footer_image_url TEXT, -- URL d'une image dans le footer (optionnel)
  
  -- Settings
  repeat_on_all_pages BOOLEAN DEFAULT true, -- Répéter header/footer sur toutes les pages
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
  
  -- Note: On utilise une logique applicative pour s'assurer qu'une seule configuration est active
  -- La contrainte unique ne peut pas être appliquée directement sur is_active car plusieurs lignes peuvent être false
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_global_document_layouts_organization 
  ON public.global_document_layouts(organization_id);
CREATE INDEX IF NOT EXISTS idx_global_document_layouts_active 
  ON public.global_document_layouts(organization_id, is_active) 
  WHERE is_active = true;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_global_document_layouts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe avant de le recréer
DROP TRIGGER IF EXISTS update_global_document_layouts_timestamp ON public.global_document_layouts;

CREATE TRIGGER update_global_document_layouts_timestamp
  BEFORE UPDATE ON public.global_document_layouts
  FOR EACH ROW
  EXECUTE FUNCTION update_global_document_layouts_timestamp();

-- RLS Policies
ALTER TABLE public.global_document_layouts ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques RLS existantes avant de les recréer pour idempotence
DROP POLICY IF EXISTS "Users can view global layouts from their organization" ON public.global_document_layouts;
DROP POLICY IF EXISTS "Users can create global layouts in their organization" ON public.global_document_layouts;
DROP POLICY IF EXISTS "Users can update global layouts from their organization" ON public.global_document_layouts;
DROP POLICY IF EXISTS "Users can delete global layouts from their organization" ON public.global_document_layouts;

-- Policy: Users can only access layouts from their organization
CREATE POLICY "Users can view global layouts from their organization"
  ON public.global_document_layouts FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create global layouts in their organization"
  ON public.global_document_layouts FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update global layouts from their organization"
  ON public.global_document_layouts FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete global layouts from their organization"
  ON public.global_document_layouts FOR DELETE
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- Commentaires
COMMENT ON TABLE public.global_document_layouts IS 'Modèles globaux d''en-tête et de pied de page pour les documents';
COMMENT ON COLUMN public.global_document_layouts.header_content IS 'Contenu HTML de l''en-tête';
COMMENT ON COLUMN public.global_document_layouts.footer_content IS 'Contenu HTML du pied de page';
COMMENT ON COLUMN public.global_document_layouts.header_logo_url IS 'URL du logo dans l''en-tête (Supabase Storage)';
COMMENT ON COLUMN public.global_document_layouts.header_image_url IS 'URL d''une image/photo dans l''en-tête (Supabase Storage)';
COMMENT ON COLUMN public.global_document_layouts.repeat_on_all_pages IS 'Répéter l''en-tête et le pied de page sur toutes les pages';





