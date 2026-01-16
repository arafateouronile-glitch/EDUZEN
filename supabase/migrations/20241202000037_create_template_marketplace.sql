-- Migration pour le marketplace de templates de documents partagés

-- 1. Table pour les catégories du marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Nom de l'icône
  color TEXT, -- Couleur de la catégorie
  parent_id UUID REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les templates dans le marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  -- Informations du marketplace
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description TEXT,
  -- Catégorie
  category_id UUID REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  -- Métadonnées
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT, -- Nom de l'auteur (peut être différent du compte)
  author_organization TEXT, -- Organisation de l'auteur
  -- Visibilité
  visibility TEXT DEFAULT 'public', -- 'public', 'unlisted', 'private'
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Template vérifié par l'équipe
  -- Statistiques
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3, 2) DEFAULT 0, -- Moyenne des notes (0-5)
  rating_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  -- Tags
  tags TEXT[],
  -- Images
  thumbnail_url TEXT,
  preview_images TEXT[], -- Images de prévisualisation
  -- Prix
  is_free BOOLEAN DEFAULT true,
  price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'XOF',
  -- Licence
  license_type TEXT DEFAULT 'mit', -- 'mit', 'cc-by', 'cc-by-sa', 'commercial', 'custom'
  license_text TEXT,
  -- Statut
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'archived'
  rejection_reason TEXT,
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id)
);

-- 3. Table pour les téléchargements de templates
CREATE TABLE IF NOT EXISTS public.marketplace_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Informations du téléchargement
  downloaded_template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL, -- Template créé à partir du téléchargement
  -- Dates
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les favoris du marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(marketplace_template_id, user_id)
);

-- 5. Table pour les notes et avis sur les templates
CREATE TABLE IF NOT EXISTS public.marketplace_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Évaluation
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  -- Utilité
  was_helpful BOOLEAN,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(marketplace_template_id, user_id)
);

-- 6. Table pour les collections de templates (playlists)
CREATE TABLE IF NOT EXISTS public.marketplace_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  -- Visibilité
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  -- Statistiques
  template_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les templates dans les collections
CREATE TABLE IF NOT EXISTS public.marketplace_collection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.marketplace_collections(id) ON DELETE CASCADE,
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, marketplace_template_id)
);

-- 8. Table pour les rapports de templates (signalement)
CREATE TABLE IF NOT EXISTS public.marketplace_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Raison
  reason TEXT NOT NULL, -- 'inappropriate', 'spam', 'copyright', 'misleading', 'other'
  description TEXT,
  -- Statut
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Table pour les transactions (si templates payants)
CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Transaction
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  platform_fee DECIMAL(10, 2) DEFAULT 0, -- Commission de la plateforme
  seller_amount DECIMAL(10, 2), -- Montant reçu par le vendeur
  -- Paiement
  payment_method TEXT, -- 'card', 'mobile_money', 'bank_transfer', etc.
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_transaction_id TEXT, -- ID de transaction externe
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 10. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_slug ON public.marketplace_categories(slug);
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_parent ON public.marketplace_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_status ON public.marketplace_templates(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_category ON public.marketplace_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_author ON public.marketplace_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_featured ON public.marketplace_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_slug ON public.marketplace_templates(slug);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_tags ON public.marketplace_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_marketplace_downloads_template ON public.marketplace_downloads(marketplace_template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_downloads_user ON public.marketplace_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_template ON public.marketplace_favorites(marketplace_template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_user ON public.marketplace_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_template ON public.marketplace_ratings(marketplace_template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_user ON public.marketplace_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_collections_user ON public.marketplace_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_collection_templates_collection ON public.marketplace_collection_templates(collection_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reports_template ON public.marketplace_reports(marketplace_template_id, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON public.marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON public.marketplace_transactions(seller_id);

-- 11. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_marketplace_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_marketplace_categories_timestamp ON public.marketplace_categories;
CREATE TRIGGER update_marketplace_categories_timestamp
  BEFORE UPDATE ON public.marketplace_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS update_marketplace_templates_timestamp ON public.marketplace_templates;
CREATE TRIGGER update_marketplace_templates_timestamp
  BEFORE UPDATE ON public.marketplace_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS update_marketplace_ratings_timestamp ON public.marketplace_ratings;
CREATE TRIGGER update_marketplace_ratings_timestamp
  BEFORE UPDATE ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS update_marketplace_collections_timestamp ON public.marketplace_collections;
CREATE TRIGGER update_marketplace_collections_timestamp
  BEFORE UPDATE ON public.marketplace_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

-- 13. Fonction pour incrémenter le compteur de téléchargements
CREATE OR REPLACE FUNCTION increment_marketplace_download_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.marketplace_templates
  SET download_count = download_count + 1
  WHERE id = NEW.marketplace_template_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_marketplace_download_count ON public.marketplace_downloads;
CREATE TRIGGER trigger_increment_marketplace_download_count
  AFTER INSERT ON public.marketplace_downloads
  FOR EACH ROW
  EXECUTE FUNCTION increment_marketplace_download_count();

-- 14. Fonction pour mettre à jour la moyenne des notes
CREATE OR REPLACE FUNCTION update_marketplace_rating_average()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating DECIMAL(3, 2);
  rating_count INTEGER;
BEGIN
  SELECT AVG(rating)::DECIMAL(3, 2), COUNT(*)
  INTO avg_rating, rating_count
  FROM public.marketplace_ratings
  WHERE marketplace_template_id = COALESCE(NEW.marketplace_template_id, OLD.marketplace_template_id);
  
  UPDATE public.marketplace_templates
  SET rating_average = COALESCE(avg_rating, 0),
      rating_count = rating_count
  WHERE id = COALESCE(NEW.marketplace_template_id, OLD.marketplace_template_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_rating_average_insert ON public.marketplace_ratings;
CREATE TRIGGER trigger_update_rating_average_insert
  AFTER INSERT ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_rating_average();

DROP TRIGGER IF EXISTS trigger_update_rating_average_update ON public.marketplace_ratings;
CREATE TRIGGER trigger_update_rating_average_update
  AFTER UPDATE ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_rating_average();

DROP TRIGGER IF EXISTS trigger_update_rating_average_delete ON public.marketplace_ratings;
CREATE TRIGGER trigger_update_rating_average_delete
  AFTER DELETE ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_rating_average();

-- 15. Fonction pour mettre à jour le nombre de templates dans une collection
CREATE OR REPLACE FUNCTION update_marketplace_collection_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.marketplace_collections
    SET template_count = template_count + 1
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.marketplace_collections
    SET template_count = template_count - 1
    WHERE id = OLD.collection_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_collection_count_insert ON public.marketplace_collection_templates;
CREATE TRIGGER trigger_update_collection_count_insert
  AFTER INSERT ON public.marketplace_collection_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_collection_count();

DROP TRIGGER IF EXISTS trigger_update_collection_count_delete ON public.marketplace_collection_templates;
CREATE TRIGGER trigger_update_collection_count_delete
  AFTER DELETE ON public.marketplace_collection_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_collection_count();

-- 16. RLS Policies pour marketplace_categories
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active categories" ON public.marketplace_categories;
CREATE POLICY "Users can view active categories"
  ON public.marketplace_categories
  FOR SELECT
  USING (is_active = true);

-- 17. RLS Policies pour marketplace_templates
ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approved public templates" ON public.marketplace_templates;
CREATE POLICY "Users can view approved public templates"
  ON public.marketplace_templates
  FOR SELECT
  USING (
    status = 'approved'
    AND (visibility = 'public' OR visibility = 'unlisted')
  );

DROP POLICY IF EXISTS "Authors can view their own templates" ON public.marketplace_templates;
CREATE POLICY "Authors can view their own templates"
  ON public.marketplace_templates
  FOR SELECT
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can create templates" ON public.marketplace_templates;
CREATE POLICY "Authors can create templates"
  ON public.marketplace_templates
  FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update their own templates" ON public.marketplace_templates;
CREATE POLICY "Authors can update their own templates"
  ON public.marketplace_templates
  FOR UPDATE
  USING (author_id = auth.uid());

-- 18. RLS Policies pour marketplace_downloads
ALTER TABLE public.marketplace_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create downloads" ON public.marketplace_downloads;
CREATE POLICY "Users can create downloads"
  ON public.marketplace_downloads
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND marketplace_template_id IN (
      SELECT id FROM public.marketplace_templates
      WHERE status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can view their own downloads" ON public.marketplace_downloads;
CREATE POLICY "Users can view their own downloads"
  ON public.marketplace_downloads
  FOR SELECT
  USING (user_id = auth.uid());

-- 19. RLS Policies pour marketplace_favorites
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.marketplace_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.marketplace_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 20. RLS Policies pour marketplace_ratings
ALTER TABLE public.marketplace_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ratings" ON public.marketplace_ratings;
CREATE POLICY "Users can view ratings"
  ON public.marketplace_ratings
  FOR SELECT
  USING (
    marketplace_template_id IN (
      SELECT id FROM public.marketplace_templates
      WHERE status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can create ratings" ON public.marketplace_ratings;
CREATE POLICY "Users can create ratings"
  ON public.marketplace_ratings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND marketplace_template_id IN (
      SELECT id FROM public.marketplace_templates
      WHERE status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can update their own ratings" ON public.marketplace_ratings;
CREATE POLICY "Users can update their own ratings"
  ON public.marketplace_ratings
  FOR UPDATE
  USING (user_id = auth.uid());

-- 21. RLS Policies pour marketplace_collections
ALTER TABLE public.marketplace_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public collections or their own" ON public.marketplace_collections;
CREATE POLICY "Users can view public collections or their own"
  ON public.marketplace_collections
  FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own collections" ON public.marketplace_collections;
CREATE POLICY "Users can manage their own collections"
  ON public.marketplace_collections
  FOR ALL
  USING (user_id = auth.uid());

-- 22. RLS Policies pour marketplace_reports
ALTER TABLE public.marketplace_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON public.marketplace_reports;
CREATE POLICY "Users can create reports"
  ON public.marketplace_reports
  FOR INSERT
  WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "Admins can view reports" ON public.marketplace_reports;
CREATE POLICY "Admins can view reports"
  ON public.marketplace_reports
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 23. RLS Policies pour marketplace_transactions
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.marketplace_transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.marketplace_transactions
  FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- 24. Grant permissions
GRANT SELECT ON public.marketplace_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_templates TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_downloads TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.marketplace_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_collection_templates TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_reports TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_transactions TO authenticated;

-- 25. Insertion des catégories par défaut
INSERT INTO public.marketplace_categories (name, slug, description, icon, color) VALUES
  ('Éducation', 'education', 'Templates pour le secteur éducatif', 'GraduationCap', '#3B82F6'),
  ('Administration', 'administration', 'Templates administratifs', 'FileText', '#10B981'),
  ('Finances', 'finances', 'Templates financiers et comptables', 'CreditCard', '#F59E0B'),
  ('Ressources Humaines', 'rh', 'Templates pour les RH', 'Users', '#8B5CF6'),
  ('Marketing', 'marketing', 'Templates marketing et communication', 'Megaphone', '#EF4444'),
  ('Légal', 'legal', 'Templates juridiques', 'Scale', '#6366F1'),
  ('Santé', 'health', 'Templates pour le secteur de la santé', 'Heart', '#EC4899'),
  ('Général', 'general', 'Templates généraux', 'File', '#6B7280')
ON CONFLICT (slug) DO NOTHING;



-- 1. Table pour les catégories du marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Nom de l'icône
  color TEXT, -- Couleur de la catégorie
  parent_id UUID REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les templates dans le marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  -- Informations du marketplace
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description TEXT,
  -- Catégorie
  category_id UUID REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  -- Métadonnées
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT, -- Nom de l'auteur (peut être différent du compte)
  author_organization TEXT, -- Organisation de l'auteur
  -- Visibilité
  visibility TEXT DEFAULT 'public', -- 'public', 'unlisted', 'private'
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Template vérifié par l'équipe
  -- Statistiques
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3, 2) DEFAULT 0, -- Moyenne des notes (0-5)
  rating_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  -- Tags
  tags TEXT[],
  -- Images
  thumbnail_url TEXT,
  preview_images TEXT[], -- Images de prévisualisation
  -- Prix
  is_free BOOLEAN DEFAULT true,
  price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'XOF',
  -- Licence
  license_type TEXT DEFAULT 'mit', -- 'mit', 'cc-by', 'cc-by-sa', 'commercial', 'custom'
  license_text TEXT,
  -- Statut
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'archived'
  rejection_reason TEXT,
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id)
);

-- 3. Table pour les téléchargements de templates
CREATE TABLE IF NOT EXISTS public.marketplace_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Informations du téléchargement
  downloaded_template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL, -- Template créé à partir du téléchargement
  -- Dates
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les favoris du marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(marketplace_template_id, user_id)
);

-- 5. Table pour les notes et avis sur les templates
CREATE TABLE IF NOT EXISTS public.marketplace_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Évaluation
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  -- Utilité
  was_helpful BOOLEAN,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(marketplace_template_id, user_id)
);

-- 6. Table pour les collections de templates (playlists)
CREATE TABLE IF NOT EXISTS public.marketplace_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  -- Visibilité
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  -- Statistiques
  template_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les templates dans les collections
CREATE TABLE IF NOT EXISTS public.marketplace_collection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.marketplace_collections(id) ON DELETE CASCADE,
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, marketplace_template_id)
);

-- 8. Table pour les rapports de templates (signalement)
CREATE TABLE IF NOT EXISTS public.marketplace_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Raison
  reason TEXT NOT NULL, -- 'inappropriate', 'spam', 'copyright', 'misleading', 'other'
  description TEXT,
  -- Statut
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Table pour les transactions (si templates payants)
CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Transaction
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  platform_fee DECIMAL(10, 2) DEFAULT 0, -- Commission de la plateforme
  seller_amount DECIMAL(10, 2), -- Montant reçu par le vendeur
  -- Paiement
  payment_method TEXT, -- 'card', 'mobile_money', 'bank_transfer', etc.
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_transaction_id TEXT, -- ID de transaction externe
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 10. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_slug ON public.marketplace_categories(slug);
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_parent ON public.marketplace_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_status ON public.marketplace_templates(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_category ON public.marketplace_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_author ON public.marketplace_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_featured ON public.marketplace_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_slug ON public.marketplace_templates(slug);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_tags ON public.marketplace_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_marketplace_downloads_template ON public.marketplace_downloads(marketplace_template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_downloads_user ON public.marketplace_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_template ON public.marketplace_favorites(marketplace_template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_user ON public.marketplace_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_template ON public.marketplace_ratings(marketplace_template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_user ON public.marketplace_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_collections_user ON public.marketplace_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_collection_templates_collection ON public.marketplace_collection_templates(collection_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reports_template ON public.marketplace_reports(marketplace_template_id, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON public.marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON public.marketplace_transactions(seller_id);

-- 11. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_marketplace_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_marketplace_categories_timestamp ON public.marketplace_categories;
CREATE TRIGGER update_marketplace_categories_timestamp
  BEFORE UPDATE ON public.marketplace_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS update_marketplace_templates_timestamp ON public.marketplace_templates;
CREATE TRIGGER update_marketplace_templates_timestamp
  BEFORE UPDATE ON public.marketplace_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS update_marketplace_ratings_timestamp ON public.marketplace_ratings;
CREATE TRIGGER update_marketplace_ratings_timestamp
  BEFORE UPDATE ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS update_marketplace_collections_timestamp ON public.marketplace_collections;
CREATE TRIGGER update_marketplace_collections_timestamp
  BEFORE UPDATE ON public.marketplace_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

-- 13. Fonction pour incrémenter le compteur de téléchargements
CREATE OR REPLACE FUNCTION increment_marketplace_download_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.marketplace_templates
  SET download_count = download_count + 1
  WHERE id = NEW.marketplace_template_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_marketplace_download_count ON public.marketplace_downloads;
CREATE TRIGGER trigger_increment_marketplace_download_count
  AFTER INSERT ON public.marketplace_downloads
  FOR EACH ROW
  EXECUTE FUNCTION increment_marketplace_download_count();

-- 14. Fonction pour mettre à jour la moyenne des notes
CREATE OR REPLACE FUNCTION update_marketplace_rating_average()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating DECIMAL(3, 2);
  rating_count INTEGER;
BEGIN
  SELECT AVG(rating)::DECIMAL(3, 2), COUNT(*)
  INTO avg_rating, rating_count
  FROM public.marketplace_ratings
  WHERE marketplace_template_id = COALESCE(NEW.marketplace_template_id, OLD.marketplace_template_id);
  
  UPDATE public.marketplace_templates
  SET rating_average = COALESCE(avg_rating, 0),
      rating_count = rating_count
  WHERE id = COALESCE(NEW.marketplace_template_id, OLD.marketplace_template_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_rating_average_insert ON public.marketplace_ratings;
CREATE TRIGGER trigger_update_rating_average_insert
  AFTER INSERT ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_rating_average();

DROP TRIGGER IF EXISTS trigger_update_rating_average_update ON public.marketplace_ratings;
CREATE TRIGGER trigger_update_rating_average_update
  AFTER UPDATE ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_rating_average();

DROP TRIGGER IF EXISTS trigger_update_rating_average_delete ON public.marketplace_ratings;
CREATE TRIGGER trigger_update_rating_average_delete
  AFTER DELETE ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_rating_average();

-- 15. Fonction pour mettre à jour le nombre de templates dans une collection
CREATE OR REPLACE FUNCTION update_marketplace_collection_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.marketplace_collections
    SET template_count = template_count + 1
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.marketplace_collections
    SET template_count = template_count - 1
    WHERE id = OLD.collection_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_collection_count_insert ON public.marketplace_collection_templates;
CREATE TRIGGER trigger_update_collection_count_insert
  AFTER INSERT ON public.marketplace_collection_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_collection_count();

DROP TRIGGER IF EXISTS trigger_update_collection_count_delete ON public.marketplace_collection_templates;
CREATE TRIGGER trigger_update_collection_count_delete
  AFTER DELETE ON public.marketplace_collection_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_collection_count();

-- 16. RLS Policies pour marketplace_categories
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active categories" ON public.marketplace_categories;
CREATE POLICY "Users can view active categories"
  ON public.marketplace_categories
  FOR SELECT
  USING (is_active = true);

-- 17. RLS Policies pour marketplace_templates
ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approved public templates" ON public.marketplace_templates;
CREATE POLICY "Users can view approved public templates"
  ON public.marketplace_templates
  FOR SELECT
  USING (
    status = 'approved'
    AND (visibility = 'public' OR visibility = 'unlisted')
  );

DROP POLICY IF EXISTS "Authors can view their own templates" ON public.marketplace_templates;
CREATE POLICY "Authors can view their own templates"
  ON public.marketplace_templates
  FOR SELECT
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can create templates" ON public.marketplace_templates;
CREATE POLICY "Authors can create templates"
  ON public.marketplace_templates
  FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update their own templates" ON public.marketplace_templates;
CREATE POLICY "Authors can update their own templates"
  ON public.marketplace_templates
  FOR UPDATE
  USING (author_id = auth.uid());

-- 18. RLS Policies pour marketplace_downloads
ALTER TABLE public.marketplace_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create downloads" ON public.marketplace_downloads;
CREATE POLICY "Users can create downloads"
  ON public.marketplace_downloads
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND marketplace_template_id IN (
      SELECT id FROM public.marketplace_templates
      WHERE status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can view their own downloads" ON public.marketplace_downloads;
CREATE POLICY "Users can view their own downloads"
  ON public.marketplace_downloads
  FOR SELECT
  USING (user_id = auth.uid());

-- 19. RLS Policies pour marketplace_favorites
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.marketplace_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.marketplace_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 20. RLS Policies pour marketplace_ratings
ALTER TABLE public.marketplace_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ratings" ON public.marketplace_ratings;
CREATE POLICY "Users can view ratings"
  ON public.marketplace_ratings
  FOR SELECT
  USING (
    marketplace_template_id IN (
      SELECT id FROM public.marketplace_templates
      WHERE status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can create ratings" ON public.marketplace_ratings;
CREATE POLICY "Users can create ratings"
  ON public.marketplace_ratings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND marketplace_template_id IN (
      SELECT id FROM public.marketplace_templates
      WHERE status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can update their own ratings" ON public.marketplace_ratings;
CREATE POLICY "Users can update their own ratings"
  ON public.marketplace_ratings
  FOR UPDATE
  USING (user_id = auth.uid());

-- 21. RLS Policies pour marketplace_collections
ALTER TABLE public.marketplace_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public collections or their own" ON public.marketplace_collections;
CREATE POLICY "Users can view public collections or their own"
  ON public.marketplace_collections
  FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own collections" ON public.marketplace_collections;
CREATE POLICY "Users can manage their own collections"
  ON public.marketplace_collections
  FOR ALL
  USING (user_id = auth.uid());

-- 22. RLS Policies pour marketplace_reports
ALTER TABLE public.marketplace_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON public.marketplace_reports;
CREATE POLICY "Users can create reports"
  ON public.marketplace_reports
  FOR INSERT
  WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "Admins can view reports" ON public.marketplace_reports;
CREATE POLICY "Admins can view reports"
  ON public.marketplace_reports
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 23. RLS Policies pour marketplace_transactions
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.marketplace_transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.marketplace_transactions
  FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- 24. Grant permissions
GRANT SELECT ON public.marketplace_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_templates TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_downloads TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.marketplace_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_collection_templates TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_reports TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_transactions TO authenticated;

-- 25. Insertion des catégories par défaut
INSERT INTO public.marketplace_categories (name, slug, description, icon, color) VALUES
  ('Éducation', 'education', 'Templates pour le secteur éducatif', 'GraduationCap', '#3B82F6'),
  ('Administration', 'administration', 'Templates administratifs', 'FileText', '#10B981'),
  ('Finances', 'finances', 'Templates financiers et comptables', 'CreditCard', '#F59E0B'),
  ('Ressources Humaines', 'rh', 'Templates pour les RH', 'Users', '#8B5CF6'),
  ('Marketing', 'marketing', 'Templates marketing et communication', 'Megaphone', '#EF4444'),
  ('Légal', 'legal', 'Templates juridiques', 'Scale', '#6366F1'),
  ('Santé', 'health', 'Templates pour le secteur de la santé', 'Heart', '#EC4899'),
  ('Général', 'general', 'Templates généraux', 'File', '#6B7280')
ON CONFLICT (slug) DO NOTHING;



-- 1. Table pour les catégories du marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Nom de l'icône
  color TEXT, -- Couleur de la catégorie
  parent_id UUID REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les templates dans le marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  -- Informations du marketplace
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description TEXT,
  -- Catégorie
  category_id UUID REFERENCES public.marketplace_categories(id) ON DELETE SET NULL,
  -- Métadonnées
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT, -- Nom de l'auteur (peut être différent du compte)
  author_organization TEXT, -- Organisation de l'auteur
  -- Visibilité
  visibility TEXT DEFAULT 'public', -- 'public', 'unlisted', 'private'
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Template vérifié par l'équipe
  -- Statistiques
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3, 2) DEFAULT 0, -- Moyenne des notes (0-5)
  rating_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  -- Tags
  tags TEXT[],
  -- Images
  thumbnail_url TEXT,
  preview_images TEXT[], -- Images de prévisualisation
  -- Prix
  is_free BOOLEAN DEFAULT true,
  price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'XOF',
  -- Licence
  license_type TEXT DEFAULT 'mit', -- 'mit', 'cc-by', 'cc-by-sa', 'commercial', 'custom'
  license_text TEXT,
  -- Statut
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'archived'
  rejection_reason TEXT,
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(template_id)
);

-- 3. Table pour les téléchargements de templates
CREATE TABLE IF NOT EXISTS public.marketplace_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Informations du téléchargement
  downloaded_template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL, -- Template créé à partir du téléchargement
  -- Dates
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les favoris du marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(marketplace_template_id, user_id)
);

-- 5. Table pour les notes et avis sur les templates
CREATE TABLE IF NOT EXISTS public.marketplace_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Évaluation
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  -- Utilité
  was_helpful BOOLEAN,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(marketplace_template_id, user_id)
);

-- 6. Table pour les collections de templates (playlists)
CREATE TABLE IF NOT EXISTS public.marketplace_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  -- Visibilité
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  -- Statistiques
  template_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les templates dans les collections
CREATE TABLE IF NOT EXISTS public.marketplace_collection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.marketplace_collections(id) ON DELETE CASCADE,
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, marketplace_template_id)
);

-- 8. Table pour les rapports de templates (signalement)
CREATE TABLE IF NOT EXISTS public.marketplace_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Raison
  reason TEXT NOT NULL, -- 'inappropriate', 'spam', 'copyright', 'misleading', 'other'
  description TEXT,
  -- Statut
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Table pour les transactions (si templates payants)
CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Transaction
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  platform_fee DECIMAL(10, 2) DEFAULT 0, -- Commission de la plateforme
  seller_amount DECIMAL(10, 2), -- Montant reçu par le vendeur
  -- Paiement
  payment_method TEXT, -- 'card', 'mobile_money', 'bank_transfer', etc.
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  payment_transaction_id TEXT, -- ID de transaction externe
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 10. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_slug ON public.marketplace_categories(slug);
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_parent ON public.marketplace_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_status ON public.marketplace_templates(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_category ON public.marketplace_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_author ON public.marketplace_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_featured ON public.marketplace_templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_slug ON public.marketplace_templates(slug);
CREATE INDEX IF NOT EXISTS idx_marketplace_templates_tags ON public.marketplace_templates USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_marketplace_downloads_template ON public.marketplace_downloads(marketplace_template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_downloads_user ON public.marketplace_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_template ON public.marketplace_favorites(marketplace_template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_user ON public.marketplace_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_template ON public.marketplace_ratings(marketplace_template_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_ratings_user ON public.marketplace_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_collections_user ON public.marketplace_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_collection_templates_collection ON public.marketplace_collection_templates(collection_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_reports_template ON public.marketplace_reports(marketplace_template_id, status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON public.marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON public.marketplace_transactions(seller_id);

-- 11. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_marketplace_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_marketplace_categories_timestamp ON public.marketplace_categories;
CREATE TRIGGER update_marketplace_categories_timestamp
  BEFORE UPDATE ON public.marketplace_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS update_marketplace_templates_timestamp ON public.marketplace_templates;
CREATE TRIGGER update_marketplace_templates_timestamp
  BEFORE UPDATE ON public.marketplace_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS update_marketplace_ratings_timestamp ON public.marketplace_ratings;
CREATE TRIGGER update_marketplace_ratings_timestamp
  BEFORE UPDATE ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

DROP TRIGGER IF EXISTS update_marketplace_collections_timestamp ON public.marketplace_collections;
CREATE TRIGGER update_marketplace_collections_timestamp
  BEFORE UPDATE ON public.marketplace_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

-- 13. Fonction pour incrémenter le compteur de téléchargements
CREATE OR REPLACE FUNCTION increment_marketplace_download_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.marketplace_templates
  SET download_count = download_count + 1
  WHERE id = NEW.marketplace_template_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_marketplace_download_count ON public.marketplace_downloads;
CREATE TRIGGER trigger_increment_marketplace_download_count
  AFTER INSERT ON public.marketplace_downloads
  FOR EACH ROW
  EXECUTE FUNCTION increment_marketplace_download_count();

-- 14. Fonction pour mettre à jour la moyenne des notes
CREATE OR REPLACE FUNCTION update_marketplace_rating_average()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating DECIMAL(3, 2);
  rating_count INTEGER;
BEGIN
  SELECT AVG(rating)::DECIMAL(3, 2), COUNT(*)
  INTO avg_rating, rating_count
  FROM public.marketplace_ratings
  WHERE marketplace_template_id = COALESCE(NEW.marketplace_template_id, OLD.marketplace_template_id);
  
  UPDATE public.marketplace_templates
  SET rating_average = COALESCE(avg_rating, 0),
      rating_count = rating_count
  WHERE id = COALESCE(NEW.marketplace_template_id, OLD.marketplace_template_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_rating_average_insert ON public.marketplace_ratings;
CREATE TRIGGER trigger_update_rating_average_insert
  AFTER INSERT ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_rating_average();

DROP TRIGGER IF EXISTS trigger_update_rating_average_update ON public.marketplace_ratings;
CREATE TRIGGER trigger_update_rating_average_update
  AFTER UPDATE ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_rating_average();

DROP TRIGGER IF EXISTS trigger_update_rating_average_delete ON public.marketplace_ratings;
CREATE TRIGGER trigger_update_rating_average_delete
  AFTER DELETE ON public.marketplace_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_rating_average();

-- 15. Fonction pour mettre à jour le nombre de templates dans une collection
CREATE OR REPLACE FUNCTION update_marketplace_collection_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.marketplace_collections
    SET template_count = template_count + 1
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.marketplace_collections
    SET template_count = template_count - 1
    WHERE id = OLD.collection_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_collection_count_insert ON public.marketplace_collection_templates;
CREATE TRIGGER trigger_update_collection_count_insert
  AFTER INSERT ON public.marketplace_collection_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_collection_count();

DROP TRIGGER IF EXISTS trigger_update_collection_count_delete ON public.marketplace_collection_templates;
CREATE TRIGGER trigger_update_collection_count_delete
  AFTER DELETE ON public.marketplace_collection_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_collection_count();

-- 16. RLS Policies pour marketplace_categories
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active categories" ON public.marketplace_categories;
CREATE POLICY "Users can view active categories"
  ON public.marketplace_categories
  FOR SELECT
  USING (is_active = true);

-- 17. RLS Policies pour marketplace_templates
ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approved public templates" ON public.marketplace_templates;
CREATE POLICY "Users can view approved public templates"
  ON public.marketplace_templates
  FOR SELECT
  USING (
    status = 'approved'
    AND (visibility = 'public' OR visibility = 'unlisted')
  );

DROP POLICY IF EXISTS "Authors can view their own templates" ON public.marketplace_templates;
CREATE POLICY "Authors can view their own templates"
  ON public.marketplace_templates
  FOR SELECT
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can create templates" ON public.marketplace_templates;
CREATE POLICY "Authors can create templates"
  ON public.marketplace_templates
  FOR INSERT
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can update their own templates" ON public.marketplace_templates;
CREATE POLICY "Authors can update their own templates"
  ON public.marketplace_templates
  FOR UPDATE
  USING (author_id = auth.uid());

-- 18. RLS Policies pour marketplace_downloads
ALTER TABLE public.marketplace_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create downloads" ON public.marketplace_downloads;
CREATE POLICY "Users can create downloads"
  ON public.marketplace_downloads
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND marketplace_template_id IN (
      SELECT id FROM public.marketplace_templates
      WHERE status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can view their own downloads" ON public.marketplace_downloads;
CREATE POLICY "Users can view their own downloads"
  ON public.marketplace_downloads
  FOR SELECT
  USING (user_id = auth.uid());

-- 19. RLS Policies pour marketplace_favorites
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.marketplace_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.marketplace_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 20. RLS Policies pour marketplace_ratings
ALTER TABLE public.marketplace_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ratings" ON public.marketplace_ratings;
CREATE POLICY "Users can view ratings"
  ON public.marketplace_ratings
  FOR SELECT
  USING (
    marketplace_template_id IN (
      SELECT id FROM public.marketplace_templates
      WHERE status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can create ratings" ON public.marketplace_ratings;
CREATE POLICY "Users can create ratings"
  ON public.marketplace_ratings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND marketplace_template_id IN (
      SELECT id FROM public.marketplace_templates
      WHERE status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can update their own ratings" ON public.marketplace_ratings;
CREATE POLICY "Users can update their own ratings"
  ON public.marketplace_ratings
  FOR UPDATE
  USING (user_id = auth.uid());

-- 21. RLS Policies pour marketplace_collections
ALTER TABLE public.marketplace_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public collections or their own" ON public.marketplace_collections;
CREATE POLICY "Users can view public collections or their own"
  ON public.marketplace_collections
  FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own collections" ON public.marketplace_collections;
CREATE POLICY "Users can manage their own collections"
  ON public.marketplace_collections
  FOR ALL
  USING (user_id = auth.uid());

-- 22. RLS Policies pour marketplace_reports
ALTER TABLE public.marketplace_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON public.marketplace_reports;
CREATE POLICY "Users can create reports"
  ON public.marketplace_reports
  FOR INSERT
  WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "Admins can view reports" ON public.marketplace_reports;
CREATE POLICY "Admins can view reports"
  ON public.marketplace_reports
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 23. RLS Policies pour marketplace_transactions
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.marketplace_transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.marketplace_transactions
  FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- 24. Grant permissions
GRANT SELECT ON public.marketplace_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_templates TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_downloads TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.marketplace_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_collection_templates TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_reports TO authenticated;
GRANT SELECT, INSERT ON public.marketplace_transactions TO authenticated;

-- 25. Insertion des catégories par défaut
INSERT INTO public.marketplace_categories (name, slug, description, icon, color) VALUES
  ('Éducation', 'education', 'Templates pour le secteur éducatif', 'GraduationCap', '#3B82F6'),
  ('Administration', 'administration', 'Templates administratifs', 'FileText', '#10B981'),
  ('Finances', 'finances', 'Templates financiers et comptables', 'CreditCard', '#F59E0B'),
  ('Ressources Humaines', 'rh', 'Templates pour les RH', 'Users', '#8B5CF6'),
  ('Marketing', 'marketing', 'Templates marketing et communication', 'Megaphone', '#EF4444'),
  ('Légal', 'legal', 'Templates juridiques', 'Scale', '#6366F1'),
  ('Santé', 'health', 'Templates pour le secteur de la santé', 'Heart', '#EC4899'),
  ('Général', 'general', 'Templates généraux', 'File', '#6B7280')
ON CONFLICT (slug) DO NOTHING;


