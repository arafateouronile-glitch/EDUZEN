-- =====================================================
-- EDUZEN - Catalogue Public et Multi-sites
-- =====================================================
-- Description: Tables pour le catalogue public des formations et gestion multi-sites/antennes
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

-- 1. Table des sites/antennes
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Informations du site
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE,
  type VARCHAR(50) DEFAULT 'site' CHECK (type IN ('headquarters', 'site', 'antenna')),
  
  -- Adresse
  address TEXT,
  city VARCHAR(255),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'FR',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Contact
  phone VARCHAR(50),
  email VARCHAR(255),
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  is_headquarters BOOLEAN DEFAULT false, -- Si true, c'est le siège principal
  
  -- Métadonnées
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_by UUID REFERENCES public.users(id),
  
  UNIQUE(organization_id, code)
);

COMMENT ON TABLE public.sites IS 'Sites et antennes des organisations (multi-sites)';
COMMENT ON COLUMN public.sites.type IS 'Type de site: headquarters (siège), site, antenna (antenne)';

-- 2. Table des formations publiques (catalogue public)
CREATE TABLE IF NOT EXISTS public.public_formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
  
  -- Visibilité publique
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false, -- Mise en avant
  published_at TIMESTAMPTZ,
  
  -- Informations publiques (peuvent différer de la formation interne)
  public_title TEXT NOT NULL,
  public_description TEXT,
  public_objectives TEXT,
  public_prerequisites TEXT,
  public_duration_hours INTEGER,
  public_duration_days INTEGER,
  public_price DECIMAL(10, 2),
  public_price_label VARCHAR(255), -- Ex: "À partir de", "Sur devis"
  
  -- Images et médias
  cover_image_url TEXT,
  gallery_images TEXT[], -- Tableau d'URLs d'images
  
  -- SEO
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[], -- Mots-clés pour le SEO
  slug VARCHAR(255) UNIQUE, -- URL slug pour le SEO
  
  -- Inscription en ligne
  allow_online_registration BOOLEAN DEFAULT true,
  registration_deadline TIMESTAMPTZ, -- Date limite d'inscription
  min_participants INTEGER,
  max_participants INTEGER,
  
  -- Sites disponibles
  available_at_sites UUID[], -- IDs des sites où cette formation est disponible
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  created_by UUID REFERENCES public.users(id)
);

COMMENT ON TABLE public.public_formations IS 'Catalogue public des formations (site vitrine)';
COMMENT ON COLUMN public.public_formations.slug IS 'Slug URL pour le SEO (ex: formation-excel-avance)';

-- 3. Table des inscriptions en ligne (depuis le catalogue public)
CREATE TABLE IF NOT EXISTS public.public_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  public_formation_id UUID NOT NULL REFERENCES public.public_formations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL, -- Session assignée après traitement
  
  -- Informations du candidat
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  
  -- Adresse
  address TEXT,
  city VARCHAR(255),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'FR',
  
  -- Statut de l'inscription
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected', 'cancelled')),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.users(id),
  
  -- Commentaires
  candidate_notes TEXT, -- Notes du candidat
  admin_notes TEXT, -- Notes administratives
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.public_enrollments IS 'Inscriptions en ligne depuis le catalogue public';

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_sites_org ON public.sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_sites_active ON public.sites(is_active);
CREATE INDEX IF NOT EXISTS idx_sites_headquarters ON public.sites(is_headquarters);

CREATE INDEX IF NOT EXISTS idx_public_formations_org ON public.public_formations(organization_id);
CREATE INDEX IF NOT EXISTS idx_public_formations_public ON public.public_formations(is_public);
CREATE INDEX IF NOT EXISTS idx_public_formations_slug ON public.public_formations(slug);
CREATE INDEX IF NOT EXISTS idx_public_formations_featured ON public.public_formations(is_featured);
CREATE INDEX IF NOT EXISTS idx_public_formations_program ON public.public_formations(program_id);

CREATE INDEX IF NOT EXISTS idx_public_enrollments_org ON public.public_enrollments(organization_id);
CREATE INDEX IF NOT EXISTS idx_public_enrollments_formation ON public.public_enrollments(public_formation_id);
CREATE INDEX IF NOT EXISTS idx_public_enrollments_status ON public.public_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_public_enrollments_email ON public.public_enrollments(email);

-- Triggers pour updated_at
CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_public_formations_updated_at
  BEFORE UPDATE ON public.public_formations
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_public_enrollments_updated_at
  BEFORE UPDATE ON public.public_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

-- RLS Policies
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies pour sites
CREATE POLICY "Users can view sites of their organization"
  ON public.sites FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public can view active sites"
  ON public.sites FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage sites"
  ON public.sites FOR ALL
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

-- Policies pour public_formations
CREATE POLICY "Users can view public formations of their organization"
  ON public.public_formations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public can view published formations"
  ON public.public_formations FOR SELECT
  USING (is_public = true AND published_at IS NOT NULL);

CREATE POLICY "Admins can manage public formations"
  ON public.public_formations FOR ALL
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

-- Policies pour public_enrollments
CREATE POLICY "Users can view enrollments of their organization"
  ON public.public_enrollments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Public can create enrollments"
  ON public.public_enrollments FOR INSERT
  WITH CHECK (true); -- Permettre à tout le monde de s'inscrire

CREATE POLICY "Admins can manage enrollments"
  ON public.public_enrollments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'secretary')
    )
  );

