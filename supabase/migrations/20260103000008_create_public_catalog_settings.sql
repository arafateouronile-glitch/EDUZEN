-- =====================================================
-- EDUZEN - Paramètres du catalogue public (site vitrine)
-- =====================================================
-- Description: Table pour stocker les paramètres de personnalisation du site vitrine
-- Date: 2026-01-03
-- =====================================================

-- Table pour les paramètres du catalogue public
CREATE TABLE IF NOT EXISTS public.public_catalog_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Activation du site vitrine
  is_enabled BOOLEAN DEFAULT false,
  
  -- Informations de base
  site_title TEXT,
  site_description TEXT,
  site_keywords TEXT[], -- Mots-clés SEO
  
  -- Personnalisation visuelle
  primary_color TEXT DEFAULT '#274472', -- Couleur principale (brand-blue)
  secondary_color TEXT, -- Couleur secondaire
  accent_color TEXT, -- Couleur d'accent
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#000000',
  
  -- Logo et images
  logo_url TEXT, -- Logo principal (peut être différent du logo organisation)
  favicon_url TEXT,
  cover_image_url TEXT, -- Image de couverture/hero
  footer_image_url TEXT,
  
  -- Contenu personnalisé
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_description TEXT,
  hero_button_text TEXT DEFAULT 'Découvrir nos formations',
  hero_button_link TEXT,
  
  -- Section "À propos"
  about_title TEXT,
  about_content TEXT,
  about_image_url TEXT,
  
  -- Section contact
  contact_email TEXT,
  contact_phone TEXT,
  contact_address TEXT,
  show_contact_form BOOLEAN DEFAULT true,
  
  -- Footer
  footer_text TEXT,
  footer_links JSONB, -- [{label: string, url: string}]
  social_links JSONB, -- {facebook: string, linkedin: string, twitter: string, etc.}
  
  -- SEO
  google_analytics_id TEXT,
  google_tag_manager_id TEXT,
  meta_title TEXT,
  meta_description TEXT,
  meta_image_url TEXT,
  
  -- Domaine personnalisé (future fonctionnalité)
  custom_domain TEXT,
  
  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Contraintes
  UNIQUE(organization_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_public_catalog_settings_org ON public.public_catalog_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_public_catalog_settings_enabled ON public.public_catalog_settings(is_enabled) WHERE is_enabled = true;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_public_catalog_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_public_catalog_settings_updated_at
  BEFORE UPDATE ON public.public_catalog_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_public_catalog_settings_updated_at();

-- RLS Policies
ALTER TABLE public.public_catalog_settings ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent voir les settings de leur organisation
CREATE POLICY "Users can view their organization catalog settings"
  ON public.public_catalog_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Les admins peuvent modifier les settings de leur organisation
CREATE POLICY "Admins can manage their organization catalog settings"
  ON public.public_catalog_settings
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Le catalogue public est visible par tous (lecture seule pour non authentifiés)
CREATE POLICY "Public catalog settings are readable by everyone"
  ON public.public_catalog_settings
  FOR SELECT
  USING (is_enabled = true);

-- Commentaires
COMMENT ON TABLE public.public_catalog_settings IS 'Paramètres de personnalisation du site vitrine/catalogue public pour chaque organisation';
COMMENT ON COLUMN public.public_catalog_settings.is_enabled IS 'Si true, le site vitrine est actif et accessible publiquement';
COMMENT ON COLUMN public.public_catalog_settings.primary_color IS 'Couleur principale du site (hex)';
COMMENT ON COLUMN public.public_catalog_settings.footer_links IS 'Liens du footer au format JSON: [{label: string, url: string}]';
COMMENT ON COLUMN public.public_catalog_settings.social_links IS 'Liens sociaux au format JSON: {facebook: string, linkedin: string, etc.}';



