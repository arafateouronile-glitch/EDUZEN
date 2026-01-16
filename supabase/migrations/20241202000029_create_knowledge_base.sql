-- Migration pour la base de connaissances (FAQ et guides)

-- 1. Table pour les catégories de FAQ
CREATE TABLE IF NOT EXISTS public.faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Table pour les questions/réponses FAQ
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.faq_categories(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL, -- Contenu en Markdown
  -- Métadonnées
  order_index INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[],
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les feedbacks sur les FAQ
CREATE TABLE IF NOT EXISTS public.faq_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id UUID NOT NULL REFERENCES public.faq_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_helpful BOOLEAN NOT NULL, -- true = utile, false = pas utile
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les guides pas à pas
CREATE TABLE IF NOT EXISTS public.guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- Contenu en Markdown
  -- Métadonnées
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT, -- 'getting_started', 'features', 'troubleshooting', 'advanced'
  difficulty TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  estimated_time_minutes INTEGER, -- Temps estimé de lecture
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  tags TEXT[],
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 5. Table pour les étapes des guides
CREATE TABLE IF NOT EXISTS public.guide_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Contenu en Markdown
  step_number INTEGER NOT NULL,
  -- Images et médias
  image_url TEXT,
  video_url TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(guide_id, step_number)
);

-- 6. Table pour les favoris de guides
CREATE TABLE IF NOT EXISTS public.guide_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, guide_id)
);

-- 7. Table pour le suivi de progression dans les guides
CREATE TABLE IF NOT EXISTS public.guide_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, guide_id)
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_faq_categories_org ON public.faq_categories(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_categories_slug ON public.faq_categories(slug);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON public.faq_items(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_org ON public.faq_items(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_featured ON public.faq_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_faq_items_tags ON public.faq_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_faq ON public.faq_feedback(faq_id);
CREATE INDEX IF NOT EXISTS idx_guides_org ON public.guides(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_guides_category ON public.guides(category);
CREATE INDEX IF NOT EXISTS idx_guides_slug ON public.guides(slug);
CREATE INDEX IF NOT EXISTS idx_guides_featured ON public.guides(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_guides_tags ON public.guides USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_guide_steps_guide ON public.guide_steps(guide_id, step_number);
CREATE INDEX IF NOT EXISTS idx_guide_favorites_user ON public.guide_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_guide_progress_user ON public.guide_progress(user_id, guide_id);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_faq_categories_timestamp ON public.faq_categories;
CREATE TRIGGER update_faq_categories_timestamp
  BEFORE UPDATE ON public.faq_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_faq_items_timestamp ON public.faq_items;
CREATE TRIGGER update_faq_items_timestamp
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_guides_timestamp ON public.guides;
CREATE TRIGGER update_guides_timestamp
  BEFORE UPDATE ON public.guides
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_guide_steps_timestamp ON public.guide_steps;
CREATE TRIGGER update_guide_steps_timestamp
  BEFORE UPDATE ON public.guide_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_guide_progress_timestamp ON public.guide_progress;
CREATE TRIGGER update_guide_progress_timestamp
  BEFORE UPDATE ON public.guide_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

-- 11. Fonction pour incrémenter le compteur de vues FAQ
CREATE OR REPLACE FUNCTION increment_faq_view_count(faq_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.faq_items
  SET view_count = view_count + 1
  WHERE id = faq_uuid;
END;
$$;

-- 12. Fonction pour incrémenter le compteur de vues guide
CREATE OR REPLACE FUNCTION increment_guide_view_count(guide_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.guides
  SET view_count = view_count + 1
  WHERE id = guide_uuid;
END;
$$;

-- 13. Fonction pour mettre à jour les compteurs de feedback FAQ
CREATE OR REPLACE FUNCTION update_faq_feedback_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_helpful = true THEN
    UPDATE public.faq_items
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.faq_id;
  ELSE
    UPDATE public.faq_items
    SET not_helpful_count = not_helpful_count + 1
    WHERE id = NEW.faq_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_faq_feedback_count ON public.faq_feedback;
CREATE TRIGGER trigger_update_faq_feedback_count
  AFTER INSERT ON public.faq_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_feedback_count();

-- 14. RLS Policies pour faq_categories
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories in their organization" ON public.faq_categories;
CREATE POLICY "Users can view categories in their organization"
  ON public.faq_categories
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON public.faq_categories;
CREATE POLICY "Admins can manage categories in their organization"
  ON public.faq_categories
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 15. RLS Policies pour faq_items
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active FAQ items" ON public.faq_items;
CREATE POLICY "Users can view active FAQ items"
  ON public.faq_items
  FOR SELECT
  USING (
    is_active = true
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage FAQ items in their organization" ON public.faq_items;
CREATE POLICY "Admins can manage FAQ items in their organization"
  ON public.faq_items
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 16. RLS Policies pour faq_feedback
ALTER TABLE public.faq_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create feedback" ON public.faq_feedback;
CREATE POLICY "Users can create feedback"
  ON public.faq_feedback
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view feedback" ON public.faq_feedback;
CREATE POLICY "Users can view feedback"
  ON public.faq_feedback
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 17. RLS Policies pour guides
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active guides" ON public.guides;
CREATE POLICY "Users can view active guides"
  ON public.guides
  FOR SELECT
  USING (
    is_active = true
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage guides in their organization" ON public.guides;
CREATE POLICY "Admins can manage guides in their organization"
  ON public.guides
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 18. RLS Policies pour guide_steps
ALTER TABLE public.guide_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view steps of active guides" ON public.guide_steps;
CREATE POLICY "Users can view steps of active guides"
  ON public.guide_steps
  FOR SELECT
  USING (
    guide_id IN (
      SELECT id FROM public.guides
      WHERE is_active = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage guide steps" ON public.guide_steps;
CREATE POLICY "Admins can manage guide steps"
  ON public.guide_steps
  FOR ALL
  USING (
    guide_id IN (
      SELECT id FROM public.guides
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 19. RLS Policies pour guide_favorites
ALTER TABLE public.guide_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.guide_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.guide_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 20. RLS Policies pour guide_progress
ALTER TABLE public.guide_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own progress" ON public.guide_progress;
CREATE POLICY "Users can manage their own progress"
  ON public.guide_progress
  FOR ALL
  USING (user_id = auth.uid());

-- 21. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;
GRANT SELECT, INSERT ON public.faq_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_steps TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.guide_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_progress TO authenticated;



-- 1. Table pour les catégories de FAQ
CREATE TABLE IF NOT EXISTS public.faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Table pour les questions/réponses FAQ
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.faq_categories(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL, -- Contenu en Markdown
  -- Métadonnées
  order_index INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[],
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les feedbacks sur les FAQ
CREATE TABLE IF NOT EXISTS public.faq_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id UUID NOT NULL REFERENCES public.faq_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_helpful BOOLEAN NOT NULL, -- true = utile, false = pas utile
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les guides pas à pas
CREATE TABLE IF NOT EXISTS public.guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- Contenu en Markdown
  -- Métadonnées
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT, -- 'getting_started', 'features', 'troubleshooting', 'advanced'
  difficulty TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  estimated_time_minutes INTEGER, -- Temps estimé de lecture
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  tags TEXT[],
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 5. Table pour les étapes des guides
CREATE TABLE IF NOT EXISTS public.guide_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Contenu en Markdown
  step_number INTEGER NOT NULL,
  -- Images et médias
  image_url TEXT,
  video_url TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(guide_id, step_number)
);

-- 6. Table pour les favoris de guides
CREATE TABLE IF NOT EXISTS public.guide_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, guide_id)
);

-- 7. Table pour le suivi de progression dans les guides
CREATE TABLE IF NOT EXISTS public.guide_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, guide_id)
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_faq_categories_org ON public.faq_categories(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_categories_slug ON public.faq_categories(slug);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON public.faq_items(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_org ON public.faq_items(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_featured ON public.faq_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_faq_items_tags ON public.faq_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_faq ON public.faq_feedback(faq_id);
CREATE INDEX IF NOT EXISTS idx_guides_org ON public.guides(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_guides_category ON public.guides(category);
CREATE INDEX IF NOT EXISTS idx_guides_slug ON public.guides(slug);
CREATE INDEX IF NOT EXISTS idx_guides_featured ON public.guides(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_guides_tags ON public.guides USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_guide_steps_guide ON public.guide_steps(guide_id, step_number);
CREATE INDEX IF NOT EXISTS idx_guide_favorites_user ON public.guide_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_guide_progress_user ON public.guide_progress(user_id, guide_id);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_faq_categories_timestamp ON public.faq_categories;
CREATE TRIGGER update_faq_categories_timestamp
  BEFORE UPDATE ON public.faq_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_faq_items_timestamp ON public.faq_items;
CREATE TRIGGER update_faq_items_timestamp
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_guides_timestamp ON public.guides;
CREATE TRIGGER update_guides_timestamp
  BEFORE UPDATE ON public.guides
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_guide_steps_timestamp ON public.guide_steps;
CREATE TRIGGER update_guide_steps_timestamp
  BEFORE UPDATE ON public.guide_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_guide_progress_timestamp ON public.guide_progress;
CREATE TRIGGER update_guide_progress_timestamp
  BEFORE UPDATE ON public.guide_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

-- 11. Fonction pour incrémenter le compteur de vues FAQ
CREATE OR REPLACE FUNCTION increment_faq_view_count(faq_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.faq_items
  SET view_count = view_count + 1
  WHERE id = faq_uuid;
END;
$$;

-- 12. Fonction pour incrémenter le compteur de vues guide
CREATE OR REPLACE FUNCTION increment_guide_view_count(guide_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.guides
  SET view_count = view_count + 1
  WHERE id = guide_uuid;
END;
$$;

-- 13. Fonction pour mettre à jour les compteurs de feedback FAQ
CREATE OR REPLACE FUNCTION update_faq_feedback_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_helpful = true THEN
    UPDATE public.faq_items
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.faq_id;
  ELSE
    UPDATE public.faq_items
    SET not_helpful_count = not_helpful_count + 1
    WHERE id = NEW.faq_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_faq_feedback_count ON public.faq_feedback;
CREATE TRIGGER trigger_update_faq_feedback_count
  AFTER INSERT ON public.faq_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_feedback_count();

-- 14. RLS Policies pour faq_categories
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories in their organization" ON public.faq_categories;
CREATE POLICY "Users can view categories in their organization"
  ON public.faq_categories
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON public.faq_categories;
CREATE POLICY "Admins can manage categories in their organization"
  ON public.faq_categories
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 15. RLS Policies pour faq_items
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active FAQ items" ON public.faq_items;
CREATE POLICY "Users can view active FAQ items"
  ON public.faq_items
  FOR SELECT
  USING (
    is_active = true
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage FAQ items in their organization" ON public.faq_items;
CREATE POLICY "Admins can manage FAQ items in their organization"
  ON public.faq_items
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 16. RLS Policies pour faq_feedback
ALTER TABLE public.faq_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create feedback" ON public.faq_feedback;
CREATE POLICY "Users can create feedback"
  ON public.faq_feedback
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view feedback" ON public.faq_feedback;
CREATE POLICY "Users can view feedback"
  ON public.faq_feedback
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 17. RLS Policies pour guides
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active guides" ON public.guides;
CREATE POLICY "Users can view active guides"
  ON public.guides
  FOR SELECT
  USING (
    is_active = true
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage guides in their organization" ON public.guides;
CREATE POLICY "Admins can manage guides in their organization"
  ON public.guides
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 18. RLS Policies pour guide_steps
ALTER TABLE public.guide_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view steps of active guides" ON public.guide_steps;
CREATE POLICY "Users can view steps of active guides"
  ON public.guide_steps
  FOR SELECT
  USING (
    guide_id IN (
      SELECT id FROM public.guides
      WHERE is_active = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage guide steps" ON public.guide_steps;
CREATE POLICY "Admins can manage guide steps"
  ON public.guide_steps
  FOR ALL
  USING (
    guide_id IN (
      SELECT id FROM public.guides
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 19. RLS Policies pour guide_favorites
ALTER TABLE public.guide_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.guide_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.guide_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 20. RLS Policies pour guide_progress
ALTER TABLE public.guide_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own progress" ON public.guide_progress;
CREATE POLICY "Users can manage their own progress"
  ON public.guide_progress
  FOR ALL
  USING (user_id = auth.uid());

-- 21. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;
GRANT SELECT, INSERT ON public.faq_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_steps TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.guide_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_progress TO authenticated;



-- 1. Table pour les catégories de FAQ
CREATE TABLE IF NOT EXISTS public.faq_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 2. Table pour les questions/réponses FAQ
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.faq_categories(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL, -- Contenu en Markdown
  -- Métadonnées
  order_index INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tags TEXT[],
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les feedbacks sur les FAQ
CREATE TABLE IF NOT EXISTS public.faq_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id UUID NOT NULL REFERENCES public.faq_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_helpful BOOLEAN NOT NULL, -- true = utile, false = pas utile
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les guides pas à pas
CREATE TABLE IF NOT EXISTS public.guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL, -- Contenu en Markdown
  -- Métadonnées
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT, -- 'getting_started', 'features', 'troubleshooting', 'advanced'
  difficulty TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  estimated_time_minutes INTEGER, -- Temps estimé de lecture
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  tags TEXT[],
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, slug)
);

-- 5. Table pour les étapes des guides
CREATE TABLE IF NOT EXISTS public.guide_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Contenu en Markdown
  step_number INTEGER NOT NULL,
  -- Images et médias
  image_url TEXT,
  video_url TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(guide_id, step_number)
);

-- 6. Table pour les favoris de guides
CREATE TABLE IF NOT EXISTS public.guide_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, guide_id)
);

-- 7. Table pour le suivi de progression dans les guides
CREATE TABLE IF NOT EXISTS public.guide_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guide_id UUID NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, guide_id)
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_faq_categories_org ON public.faq_categories(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_categories_slug ON public.faq_categories(slug);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON public.faq_items(category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_org ON public.faq_items(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_items_featured ON public.faq_items(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_faq_items_tags ON public.faq_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_faq ON public.faq_feedback(faq_id);
CREATE INDEX IF NOT EXISTS idx_guides_org ON public.guides(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_guides_category ON public.guides(category);
CREATE INDEX IF NOT EXISTS idx_guides_slug ON public.guides(slug);
CREATE INDEX IF NOT EXISTS idx_guides_featured ON public.guides(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_guides_tags ON public.guides USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_guide_steps_guide ON public.guide_steps(guide_id, step_number);
CREATE INDEX IF NOT EXISTS idx_guide_favorites_user ON public.guide_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_guide_progress_user ON public.guide_progress(user_id, guide_id);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_faq_categories_timestamp ON public.faq_categories;
CREATE TRIGGER update_faq_categories_timestamp
  BEFORE UPDATE ON public.faq_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_faq_items_timestamp ON public.faq_items;
CREATE TRIGGER update_faq_items_timestamp
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_guides_timestamp ON public.guides;
CREATE TRIGGER update_guides_timestamp
  BEFORE UPDATE ON public.guides
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_guide_steps_timestamp ON public.guide_steps;
CREATE TRIGGER update_guide_steps_timestamp
  BEFORE UPDATE ON public.guide_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

DROP TRIGGER IF EXISTS update_guide_progress_timestamp ON public.guide_progress;
CREATE TRIGGER update_guide_progress_timestamp
  BEFORE UPDATE ON public.guide_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

-- 11. Fonction pour incrémenter le compteur de vues FAQ
CREATE OR REPLACE FUNCTION increment_faq_view_count(faq_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.faq_items
  SET view_count = view_count + 1
  WHERE id = faq_uuid;
END;
$$;

-- 12. Fonction pour incrémenter le compteur de vues guide
CREATE OR REPLACE FUNCTION increment_guide_view_count(guide_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.guides
  SET view_count = view_count + 1
  WHERE id = guide_uuid;
END;
$$;

-- 13. Fonction pour mettre à jour les compteurs de feedback FAQ
CREATE OR REPLACE FUNCTION update_faq_feedback_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_helpful = true THEN
    UPDATE public.faq_items
    SET helpful_count = helpful_count + 1
    WHERE id = NEW.faq_id;
  ELSE
    UPDATE public.faq_items
    SET not_helpful_count = not_helpful_count + 1
    WHERE id = NEW.faq_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_faq_feedback_count ON public.faq_feedback;
CREATE TRIGGER trigger_update_faq_feedback_count
  AFTER INSERT ON public.faq_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_feedback_count();

-- 14. RLS Policies pour faq_categories
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories in their organization" ON public.faq_categories;
CREATE POLICY "Users can view categories in their organization"
  ON public.faq_categories
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON public.faq_categories;
CREATE POLICY "Admins can manage categories in their organization"
  ON public.faq_categories
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 15. RLS Policies pour faq_items
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active FAQ items" ON public.faq_items;
CREATE POLICY "Users can view active FAQ items"
  ON public.faq_items
  FOR SELECT
  USING (
    is_active = true
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage FAQ items in their organization" ON public.faq_items;
CREATE POLICY "Admins can manage FAQ items in their organization"
  ON public.faq_items
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 16. RLS Policies pour faq_feedback
ALTER TABLE public.faq_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create feedback" ON public.faq_feedback;
CREATE POLICY "Users can create feedback"
  ON public.faq_feedback
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view feedback" ON public.faq_feedback;
CREATE POLICY "Users can view feedback"
  ON public.faq_feedback
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 17. RLS Policies pour guides
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active guides" ON public.guides;
CREATE POLICY "Users can view active guides"
  ON public.guides
  FOR SELECT
  USING (
    is_active = true
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage guides in their organization" ON public.guides;
CREATE POLICY "Admins can manage guides in their organization"
  ON public.guides
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 18. RLS Policies pour guide_steps
ALTER TABLE public.guide_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view steps of active guides" ON public.guide_steps;
CREATE POLICY "Users can view steps of active guides"
  ON public.guide_steps
  FOR SELECT
  USING (
    guide_id IN (
      SELECT id FROM public.guides
      WHERE is_active = true
      AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage guide steps" ON public.guide_steps;
CREATE POLICY "Admins can manage guide steps"
  ON public.guide_steps
  FOR ALL
  USING (
    guide_id IN (
      SELECT id FROM public.guides
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 19. RLS Policies pour guide_favorites
ALTER TABLE public.guide_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.guide_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.guide_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 20. RLS Policies pour guide_progress
ALTER TABLE public.guide_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own progress" ON public.guide_progress;
CREATE POLICY "Users can manage their own progress"
  ON public.guide_progress
  FOR ALL
  USING (user_id = auth.uid());

-- 21. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;
GRANT SELECT, INSERT ON public.faq_feedback TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guides TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_steps TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.guide_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_progress TO authenticated;


