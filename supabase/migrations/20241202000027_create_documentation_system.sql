-- Migration pour le système de documentation

-- 1. Table pour les catégories de documentation
CREATE TABLE IF NOT EXISTS public.documentation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  order_index INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false, -- Documentation publique ou privée à l'organisation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Table pour les articles de documentation
CREATE TABLE IF NOT EXISTS public.documentation_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.documentation_categories(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL, -- Contenu en Markdown
  excerpt TEXT, -- Résumé de l'article
  -- Métadonnées
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  -- Ordre et organisation
  order_index INTEGER DEFAULT 0,
  tags TEXT[], -- Tags pour la recherche
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- 3. Table pour les sections de documentation (pour organiser les articles)
CREATE TABLE IF NOT EXISTS public.documentation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Contenu en Markdown
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les favoris de documentation
CREATE TABLE IF NOT EXISTS public.documentation_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- 5. Table pour les notes de documentation (notes personnelles sur les articles)
CREATE TABLE IF NOT EXISTS public.documentation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table pour les feedbacks sur la documentation
CREATE TABLE IF NOT EXISTS public.documentation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Note de 1 à 5
  comment TEXT,
  is_helpful BOOLEAN, -- "Cet article vous a-t-il été utile ?"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour l'historique de recherche dans la documentation
CREATE TABLE IF NOT EXISTS public.documentation_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_documentation_categories_org ON public.documentation_categories(organization_id, is_public);
CREATE INDEX IF NOT EXISTS idx_documentation_categories_slug ON public.documentation_categories(slug);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_category ON public.documentation_articles(category_id, status);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_org ON public.documentation_articles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_slug ON public.documentation_articles(slug);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_published ON public.documentation_articles(published_at) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_documentation_articles_tags ON public.documentation_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documentation_sections_article ON public.documentation_sections(article_id, order_index);
CREATE INDEX IF NOT EXISTS idx_documentation_favorites_user ON public.documentation_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_documentation_notes_user ON public.documentation_notes(user_id, article_id);
CREATE INDEX IF NOT EXISTS idx_documentation_feedback_article ON public.documentation_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_documentation_search_history_user ON public.documentation_search_history(user_id, created_at);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_documentation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_documentation_categories_timestamp ON public.documentation_categories;
CREATE TRIGGER update_documentation_categories_timestamp
  BEFORE UPDATE ON public.documentation_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

DROP TRIGGER IF EXISTS update_documentation_articles_timestamp ON public.documentation_articles;
CREATE TRIGGER update_documentation_articles_timestamp
  BEFORE UPDATE ON public.documentation_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

DROP TRIGGER IF EXISTS update_documentation_sections_timestamp ON public.documentation_sections;
CREATE TRIGGER update_documentation_sections_timestamp
  BEFORE UPDATE ON public.documentation_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

DROP TRIGGER IF EXISTS update_documentation_notes_timestamp ON public.documentation_notes;
CREATE TRIGGER update_documentation_notes_timestamp
  BEFORE UPDATE ON public.documentation_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

-- 11. Fonction pour incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION increment_article_view_count(article_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.documentation_articles
  SET view_count = view_count + 1
  WHERE id = article_uuid;
END;
$$;

-- 12. RLS Policies pour documentation_categories
ALTER TABLE public.documentation_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public categories" ON public.documentation_categories;
CREATE POLICY "Users can view public categories"
  ON public.documentation_categories
  FOR SELECT
  USING (is_public = true OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON public.documentation_categories;
CREATE POLICY "Admins can manage categories in their organization"
  ON public.documentation_categories
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 13. RLS Policies pour documentation_articles
ALTER TABLE public.documentation_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published articles" ON public.documentation_articles;
CREATE POLICY "Users can view published articles"
  ON public.documentation_articles
  FOR SELECT
  USING (
    status = 'published'
    AND (
      category_id IN (SELECT id FROM public.documentation_categories WHERE is_public = true)
      OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authors can view their own articles" ON public.documentation_articles;
CREATE POLICY "Authors can view their own articles"
  ON public.documentation_articles
  FOR SELECT
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage articles in their organization" ON public.documentation_articles;
CREATE POLICY "Admins can manage articles in their organization"
  ON public.documentation_articles
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 14. RLS Policies pour documentation_sections
ALTER TABLE public.documentation_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sections of published articles" ON public.documentation_sections;
CREATE POLICY "Users can view sections of published articles"
  ON public.documentation_sections
  FOR SELECT
  USING (
    article_id IN (
      SELECT id FROM public.documentation_articles
      WHERE status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage sections" ON public.documentation_sections;
CREATE POLICY "Admins can manage sections"
  ON public.documentation_sections
  FOR ALL
  USING (
    article_id IN (
      SELECT id FROM public.documentation_articles
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 15. RLS Policies pour documentation_favorites
ALTER TABLE public.documentation_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.documentation_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.documentation_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 16. RLS Policies pour documentation_notes
ALTER TABLE public.documentation_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.documentation_notes;
CREATE POLICY "Users can manage their own notes"
  ON public.documentation_notes
  FOR ALL
  USING (user_id = auth.uid());

-- 17. RLS Policies pour documentation_feedback
ALTER TABLE public.documentation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create feedback" ON public.documentation_feedback;
CREATE POLICY "Users can create feedback"
  ON public.documentation_feedback
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view feedback" ON public.documentation_feedback;
CREATE POLICY "Users can view feedback"
  ON public.documentation_feedback
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 18. RLS Policies pour documentation_search_history
ALTER TABLE public.documentation_search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own search history" ON public.documentation_search_history;
CREATE POLICY "Users can manage their own search history"
  ON public.documentation_search_history
  FOR ALL
  USING (user_id = auth.uid());

-- 19. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_articles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_sections TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.documentation_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_notes TO authenticated;
GRANT SELECT, INSERT ON public.documentation_feedback TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.documentation_search_history TO authenticated;



-- 1. Table pour les catégories de documentation
CREATE TABLE IF NOT EXISTS public.documentation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  order_index INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false, -- Documentation publique ou privée à l'organisation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Table pour les articles de documentation
CREATE TABLE IF NOT EXISTS public.documentation_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.documentation_categories(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL, -- Contenu en Markdown
  excerpt TEXT, -- Résumé de l'article
  -- Métadonnées
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  -- Ordre et organisation
  order_index INTEGER DEFAULT 0,
  tags TEXT[], -- Tags pour la recherche
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- 3. Table pour les sections de documentation (pour organiser les articles)
CREATE TABLE IF NOT EXISTS public.documentation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Contenu en Markdown
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les favoris de documentation
CREATE TABLE IF NOT EXISTS public.documentation_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- 5. Table pour les notes de documentation (notes personnelles sur les articles)
CREATE TABLE IF NOT EXISTS public.documentation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table pour les feedbacks sur la documentation
CREATE TABLE IF NOT EXISTS public.documentation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Note de 1 à 5
  comment TEXT,
  is_helpful BOOLEAN, -- "Cet article vous a-t-il été utile ?"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour l'historique de recherche dans la documentation
CREATE TABLE IF NOT EXISTS public.documentation_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_documentation_categories_org ON public.documentation_categories(organization_id, is_public);
CREATE INDEX IF NOT EXISTS idx_documentation_categories_slug ON public.documentation_categories(slug);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_category ON public.documentation_articles(category_id, status);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_org ON public.documentation_articles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_slug ON public.documentation_articles(slug);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_published ON public.documentation_articles(published_at) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_documentation_articles_tags ON public.documentation_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documentation_sections_article ON public.documentation_sections(article_id, order_index);
CREATE INDEX IF NOT EXISTS idx_documentation_favorites_user ON public.documentation_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_documentation_notes_user ON public.documentation_notes(user_id, article_id);
CREATE INDEX IF NOT EXISTS idx_documentation_feedback_article ON public.documentation_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_documentation_search_history_user ON public.documentation_search_history(user_id, created_at);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_documentation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_documentation_categories_timestamp ON public.documentation_categories;
CREATE TRIGGER update_documentation_categories_timestamp
  BEFORE UPDATE ON public.documentation_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

DROP TRIGGER IF EXISTS update_documentation_articles_timestamp ON public.documentation_articles;
CREATE TRIGGER update_documentation_articles_timestamp
  BEFORE UPDATE ON public.documentation_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

DROP TRIGGER IF EXISTS update_documentation_sections_timestamp ON public.documentation_sections;
CREATE TRIGGER update_documentation_sections_timestamp
  BEFORE UPDATE ON public.documentation_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

DROP TRIGGER IF EXISTS update_documentation_notes_timestamp ON public.documentation_notes;
CREATE TRIGGER update_documentation_notes_timestamp
  BEFORE UPDATE ON public.documentation_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

-- 11. Fonction pour incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION increment_article_view_count(article_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.documentation_articles
  SET view_count = view_count + 1
  WHERE id = article_uuid;
END;
$$;

-- 12. RLS Policies pour documentation_categories
ALTER TABLE public.documentation_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public categories" ON public.documentation_categories;
CREATE POLICY "Users can view public categories"
  ON public.documentation_categories
  FOR SELECT
  USING (is_public = true OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON public.documentation_categories;
CREATE POLICY "Admins can manage categories in their organization"
  ON public.documentation_categories
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 13. RLS Policies pour documentation_articles
ALTER TABLE public.documentation_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published articles" ON public.documentation_articles;
CREATE POLICY "Users can view published articles"
  ON public.documentation_articles
  FOR SELECT
  USING (
    status = 'published'
    AND (
      category_id IN (SELECT id FROM public.documentation_categories WHERE is_public = true)
      OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authors can view their own articles" ON public.documentation_articles;
CREATE POLICY "Authors can view their own articles"
  ON public.documentation_articles
  FOR SELECT
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage articles in their organization" ON public.documentation_articles;
CREATE POLICY "Admins can manage articles in their organization"
  ON public.documentation_articles
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 14. RLS Policies pour documentation_sections
ALTER TABLE public.documentation_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sections of published articles" ON public.documentation_sections;
CREATE POLICY "Users can view sections of published articles"
  ON public.documentation_sections
  FOR SELECT
  USING (
    article_id IN (
      SELECT id FROM public.documentation_articles
      WHERE status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage sections" ON public.documentation_sections;
CREATE POLICY "Admins can manage sections"
  ON public.documentation_sections
  FOR ALL
  USING (
    article_id IN (
      SELECT id FROM public.documentation_articles
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 15. RLS Policies pour documentation_favorites
ALTER TABLE public.documentation_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.documentation_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.documentation_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 16. RLS Policies pour documentation_notes
ALTER TABLE public.documentation_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.documentation_notes;
CREATE POLICY "Users can manage their own notes"
  ON public.documentation_notes
  FOR ALL
  USING (user_id = auth.uid());

-- 17. RLS Policies pour documentation_feedback
ALTER TABLE public.documentation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create feedback" ON public.documentation_feedback;
CREATE POLICY "Users can create feedback"
  ON public.documentation_feedback
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view feedback" ON public.documentation_feedback;
CREATE POLICY "Users can view feedback"
  ON public.documentation_feedback
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 18. RLS Policies pour documentation_search_history
ALTER TABLE public.documentation_search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own search history" ON public.documentation_search_history;
CREATE POLICY "Users can manage their own search history"
  ON public.documentation_search_history
  FOR ALL
  USING (user_id = auth.uid());

-- 19. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_articles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_sections TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.documentation_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_notes TO authenticated;
GRANT SELECT, INSERT ON public.documentation_feedback TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.documentation_search_history TO authenticated;



-- 1. Table pour les catégories de documentation
CREATE TABLE IF NOT EXISTS public.documentation_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  order_index INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT false, -- Documentation publique ou privée à l'organisation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Table pour les articles de documentation
CREATE TABLE IF NOT EXISTS public.documentation_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.documentation_categories(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL, -- Contenu en Markdown
  excerpt TEXT, -- Résumé de l'article
  -- Métadonnées
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  -- Ordre et organisation
  order_index INTEGER DEFAULT 0,
  tags TEXT[], -- Tags pour la recherche
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, slug)
);

-- 3. Table pour les sections de documentation (pour organiser les articles)
CREATE TABLE IF NOT EXISTS public.documentation_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Contenu en Markdown
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les favoris de documentation
CREATE TABLE IF NOT EXISTS public.documentation_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- 5. Table pour les notes de documentation (notes personnelles sur les articles)
CREATE TABLE IF NOT EXISTS public.documentation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Table pour les feedbacks sur la documentation
CREATE TABLE IF NOT EXISTS public.documentation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.documentation_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Note de 1 à 5
  comment TEXT,
  is_helpful BOOLEAN, -- "Cet article vous a-t-il été utile ?"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour l'historique de recherche dans la documentation
CREATE TABLE IF NOT EXISTS public.documentation_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_documentation_categories_org ON public.documentation_categories(organization_id, is_public);
CREATE INDEX IF NOT EXISTS idx_documentation_categories_slug ON public.documentation_categories(slug);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_category ON public.documentation_articles(category_id, status);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_org ON public.documentation_articles(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_slug ON public.documentation_articles(slug);
CREATE INDEX IF NOT EXISTS idx_documentation_articles_published ON public.documentation_articles(published_at) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_documentation_articles_tags ON public.documentation_articles USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documentation_sections_article ON public.documentation_sections(article_id, order_index);
CREATE INDEX IF NOT EXISTS idx_documentation_favorites_user ON public.documentation_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_documentation_notes_user ON public.documentation_notes(user_id, article_id);
CREATE INDEX IF NOT EXISTS idx_documentation_feedback_article ON public.documentation_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_documentation_search_history_user ON public.documentation_search_history(user_id, created_at);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_documentation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_documentation_categories_timestamp ON public.documentation_categories;
CREATE TRIGGER update_documentation_categories_timestamp
  BEFORE UPDATE ON public.documentation_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

DROP TRIGGER IF EXISTS update_documentation_articles_timestamp ON public.documentation_articles;
CREATE TRIGGER update_documentation_articles_timestamp
  BEFORE UPDATE ON public.documentation_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

DROP TRIGGER IF EXISTS update_documentation_sections_timestamp ON public.documentation_sections;
CREATE TRIGGER update_documentation_sections_timestamp
  BEFORE UPDATE ON public.documentation_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

DROP TRIGGER IF EXISTS update_documentation_notes_timestamp ON public.documentation_notes;
CREATE TRIGGER update_documentation_notes_timestamp
  BEFORE UPDATE ON public.documentation_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_documentation_updated_at();

-- 11. Fonction pour incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION increment_article_view_count(article_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.documentation_articles
  SET view_count = view_count + 1
  WHERE id = article_uuid;
END;
$$;

-- 12. RLS Policies pour documentation_categories
ALTER TABLE public.documentation_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public categories" ON public.documentation_categories;
CREATE POLICY "Users can view public categories"
  ON public.documentation_categories
  FOR SELECT
  USING (is_public = true OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON public.documentation_categories;
CREATE POLICY "Admins can manage categories in their organization"
  ON public.documentation_categories
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 13. RLS Policies pour documentation_articles
ALTER TABLE public.documentation_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published articles" ON public.documentation_articles;
CREATE POLICY "Users can view published articles"
  ON public.documentation_articles
  FOR SELECT
  USING (
    status = 'published'
    AND (
      category_id IN (SELECT id FROM public.documentation_categories WHERE is_public = true)
      OR organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authors can view their own articles" ON public.documentation_articles;
CREATE POLICY "Authors can view their own articles"
  ON public.documentation_articles
  FOR SELECT
  USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage articles in their organization" ON public.documentation_articles;
CREATE POLICY "Admins can manage articles in their organization"
  ON public.documentation_articles
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 14. RLS Policies pour documentation_sections
ALTER TABLE public.documentation_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sections of published articles" ON public.documentation_sections;
CREATE POLICY "Users can view sections of published articles"
  ON public.documentation_sections
  FOR SELECT
  USING (
    article_id IN (
      SELECT id FROM public.documentation_articles
      WHERE status = 'published'
    )
  );

DROP POLICY IF EXISTS "Admins can manage sections" ON public.documentation_sections;
CREATE POLICY "Admins can manage sections"
  ON public.documentation_sections
  FOR ALL
  USING (
    article_id IN (
      SELECT id FROM public.documentation_articles
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 15. RLS Policies pour documentation_favorites
ALTER TABLE public.documentation_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.documentation_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.documentation_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 16. RLS Policies pour documentation_notes
ALTER TABLE public.documentation_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.documentation_notes;
CREATE POLICY "Users can manage their own notes"
  ON public.documentation_notes
  FOR ALL
  USING (user_id = auth.uid());

-- 17. RLS Policies pour documentation_feedback
ALTER TABLE public.documentation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create feedback" ON public.documentation_feedback;
CREATE POLICY "Users can create feedback"
  ON public.documentation_feedback
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view feedback" ON public.documentation_feedback;
CREATE POLICY "Users can view feedback"
  ON public.documentation_feedback
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 18. RLS Policies pour documentation_search_history
ALTER TABLE public.documentation_search_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own search history" ON public.documentation_search_history;
CREATE POLICY "Users can manage their own search history"
  ON public.documentation_search_history
  FOR ALL
  USING (user_id = auth.uid());

-- 19. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_articles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_sections TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.documentation_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentation_notes TO authenticated;
GRANT SELECT, INSERT ON public.documentation_feedback TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.documentation_search_history TO authenticated;


