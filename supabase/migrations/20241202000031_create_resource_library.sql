-- Migration pour la bibliothèque de ressources pédagogiques

-- 1. Table pour les catégories de ressources
CREATE TABLE IF NOT EXISTS public.resource_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  parent_id UUID REFERENCES public.resource_categories(id) ON DELETE CASCADE, -- Catégorie parente (pour hiérarchie)
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Table pour les ressources pédagogiques
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.resource_categories(id) ON DELETE SET NULL,
  -- Informations de la ressource
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  -- Type et fichier
  resource_type TEXT NOT NULL, -- 'document', 'video', 'audio', 'image', 'link', 'presentation', 'spreadsheet', 'other'
  file_url TEXT, -- URL du fichier dans Supabase Storage
  file_name TEXT,
  file_size BIGINT, -- Taille en octets
  file_type TEXT, -- MIME type
  thumbnail_url TEXT, -- Miniature pour vidéos/images
  external_url TEXT, -- URL externe (pour type 'link')
  -- Métadonnées
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags TEXT[],
  language TEXT DEFAULT 'fr',
  -- Accessibilité
  is_public BOOLEAN DEFAULT false, -- Ressource publique ou privée
  access_level TEXT DEFAULT 'organization', -- 'public', 'organization', 'restricted'
  -- Statistiques
  download_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 3. Table pour les favoris de ressources
CREATE TABLE IF NOT EXISTS public.resource_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, resource_id)
);

-- 4. Table pour les téléchargements de ressources
CREATE TABLE IF NOT EXISTS public.resource_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- 5. Table pour les vues de ressources
CREATE TABLE IF NOT EXISTS public.resource_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- 6. Table pour les commentaires sur les ressources
CREATE TABLE IF NOT EXISTS public.resource_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.resource_comments(id) ON DELETE CASCADE, -- Pour les réponses
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les évaluations de ressources
CREATE TABLE IF NOT EXISTS public.resource_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(resource_id, user_id)
);

-- 8. Table pour les collections de ressources (playlists)
CREATE TABLE IF NOT EXISTS public.resource_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Table pour les ressources dans les collections
CREATE TABLE IF NOT EXISTS public.resource_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.resource_collections(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, resource_id)
);

-- 10. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_resource_categories_org ON public.resource_categories(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_resource_categories_parent ON public.resource_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_resource_categories_slug ON public.resource_categories(slug);
CREATE INDEX IF NOT EXISTS idx_resources_org ON public.resources(organization_id);
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_author ON public.resources(author_id);
CREATE INDEX IF NOT EXISTS idx_resources_tags ON public.resources USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_resources_slug ON public.resources(slug);
CREATE INDEX IF NOT EXISTS idx_resource_favorites_user ON public.resource_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_favorites_resource ON public.resource_favorites(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_resource ON public.resource_downloads(resource_id, downloaded_at);
CREATE INDEX IF NOT EXISTS idx_resource_downloads_user ON public.resource_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_views_resource ON public.resource_views(resource_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_resource_comments_resource ON public.resource_comments(resource_id, created_at);
CREATE INDEX IF NOT EXISTS idx_resource_comments_parent ON public.resource_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_resource_ratings_resource ON public.resource_ratings(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_collections_org ON public.resource_collections(organization_id);
CREATE INDEX IF NOT EXISTS idx_resource_collections_user ON public.resource_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_collection_items_collection ON public.resource_collection_items(collection_id, order_index);

-- 11. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_resource_library_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_resource_categories_timestamp ON public.resource_categories;
CREATE TRIGGER update_resource_categories_timestamp
  BEFORE UPDATE ON public.resource_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_library_updated_at();

DROP TRIGGER IF EXISTS update_resources_timestamp ON public.resources;
CREATE TRIGGER update_resources_timestamp
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_library_updated_at();

DROP TRIGGER IF EXISTS update_resource_comments_timestamp ON public.resource_comments;
CREATE TRIGGER update_resource_comments_timestamp
  BEFORE UPDATE ON public.resource_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_library_updated_at();

DROP TRIGGER IF EXISTS update_resource_ratings_timestamp ON public.resource_ratings;
CREATE TRIGGER update_resource_ratings_timestamp
  BEFORE UPDATE ON public.resource_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_library_updated_at();

DROP TRIGGER IF EXISTS update_resource_collections_timestamp ON public.resource_collections;
CREATE TRIGGER update_resource_collections_timestamp
  BEFORE UPDATE ON public.resource_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_library_updated_at();

-- 13. Fonction pour incrémenter le compteur de téléchargements
CREATE OR REPLACE FUNCTION increment_resource_download_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.resources
  SET download_count = download_count + 1
  WHERE id = NEW.resource_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_resource_download_count ON public.resource_downloads;
CREATE TRIGGER trigger_increment_resource_download_count
  AFTER INSERT ON public.resource_downloads
  FOR EACH ROW
  EXECUTE FUNCTION increment_resource_download_count();

-- 14. Fonction pour incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION increment_resource_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.resources
  SET view_count = view_count + 1
  WHERE id = NEW.resource_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_resource_view_count ON public.resource_views;
CREATE TRIGGER trigger_increment_resource_view_count
  AFTER INSERT ON public.resource_views
  FOR EACH ROW
  EXECUTE FUNCTION increment_resource_view_count();

-- 15. Fonction pour mettre à jour le compteur de favoris
CREATE OR REPLACE FUNCTION update_resource_favorite_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.resources
    SET favorite_count = favorite_count + 1
    WHERE id = NEW.resource_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.resources
    SET favorite_count = favorite_count - 1
    WHERE id = OLD.resource_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_resource_favorite_count_insert ON public.resource_favorites;
CREATE TRIGGER trigger_update_resource_favorite_count_insert
  AFTER INSERT ON public.resource_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_favorite_count();

DROP TRIGGER IF EXISTS trigger_update_resource_favorite_count_delete ON public.resource_favorites;
CREATE TRIGGER trigger_update_resource_favorite_count_delete
  AFTER DELETE ON public.resource_favorites
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_favorite_count();

-- 16. RLS Policies pour resource_categories
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories in their organization" ON public.resource_categories;
CREATE POLICY "Users can view categories in their organization"
  ON public.resource_categories
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON public.resource_categories;
CREATE POLICY "Admins can manage categories in their organization"
  ON public.resource_categories
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'teacher')
  );

-- 17. RLS Policies pour resources
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view resources in their organization" ON public.resources;
CREATE POLICY "Users can view resources in their organization"
  ON public.resources
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (is_public = true OR access_level = 'organization')
  );

DROP POLICY IF EXISTS "Users can create resources in their organization" ON public.resources;
CREATE POLICY "Users can create resources in their organization"
  ON public.resources
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "Authors can update their own resources" ON public.resources;
CREATE POLICY "Authors can update their own resources"
  ON public.resources
  FOR UPDATE
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage resources in their organization" ON public.resources;
CREATE POLICY "Admins can manage resources in their organization"
  ON public.resources
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 18. RLS Policies pour resource_favorites
ALTER TABLE public.resource_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.resource_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.resource_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 19. RLS Policies pour resource_downloads
ALTER TABLE public.resource_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create downloads" ON public.resource_downloads;
CREATE POLICY "Users can create downloads"
  ON public.resource_downloads
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view their own downloads" ON public.resource_downloads;
CREATE POLICY "Users can view their own downloads"
  ON public.resource_downloads
  FOR SELECT
  USING (user_id = auth.uid());

-- 20. RLS Policies pour resource_views
ALTER TABLE public.resource_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create views" ON public.resource_views;
CREATE POLICY "Users can create views"
  ON public.resource_views
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 21. RLS Policies pour resource_comments
ALTER TABLE public.resource_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments" ON public.resource_comments;
CREATE POLICY "Users can view comments"
  ON public.resource_comments
  FOR SELECT
  USING (
    resource_id IN (
      SELECT id FROM public.resources
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create comments" ON public.resource_comments;
CREATE POLICY "Users can create comments"
  ON public.resource_comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND resource_id IN (
      SELECT id FROM public.resources
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.resource_comments;
CREATE POLICY "Users can update their own comments"
  ON public.resource_comments
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.resource_comments;
CREATE POLICY "Users can delete their own comments"
  ON public.resource_comments
  FOR DELETE
  USING (user_id = auth.uid());

-- 22. RLS Policies pour resource_ratings
ALTER TABLE public.resource_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ratings" ON public.resource_ratings;
CREATE POLICY "Users can view ratings"
  ON public.resource_ratings
  FOR SELECT
  USING (
    resource_id IN (
      SELECT id FROM public.resources
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create ratings" ON public.resource_ratings;
CREATE POLICY "Users can create ratings"
  ON public.resource_ratings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND resource_id IN (
      SELECT id FROM public.resources
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own ratings" ON public.resource_ratings;
CREATE POLICY "Users can update their own ratings"
  ON public.resource_ratings
  FOR UPDATE
  USING (user_id = auth.uid());

-- 23. RLS Policies pour resource_collections
ALTER TABLE public.resource_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view collections" ON public.resource_collections;
CREATE POLICY "Users can view collections"
  ON public.resource_collections
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (is_public = true OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their own collections" ON public.resource_collections;
CREATE POLICY "Users can manage their own collections"
  ON public.resource_collections
  FOR ALL
  USING (user_id = auth.uid());

-- 24. RLS Policies pour resource_collection_items
ALTER TABLE public.resource_collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage items in their collections" ON public.resource_collection_items;
CREATE POLICY "Users can manage items in their collections"
  ON public.resource_collection_items
  FOR ALL
  USING (
    collection_id IN (SELECT id FROM public.resource_collections WHERE user_id = auth.uid())
  );

-- 25. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.resource_favorites TO authenticated;
GRANT SELECT, INSERT ON public.resource_downloads TO authenticated;
GRANT SELECT, INSERT ON public.resource_views TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.resource_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_collection_items TO authenticated;

