-- Migration pour le système de gestion de vidéos tutoriels

-- 1. Table pour les modules/catégories de tutoriels
CREATE TABLE IF NOT EXISTS public.tutorial_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Nom de l'icône
  color TEXT, -- Couleur du module
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les vidéos tutoriels
CREATE TABLE IF NOT EXISTS public.tutorial_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.tutorial_modules(id) ON DELETE CASCADE,
  -- Informations
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  -- Vidéo
  video_url TEXT NOT NULL, -- URL de la vidéo (YouTube, Vimeo, ou URL directe)
  video_type TEXT DEFAULT 'youtube', -- 'youtube', 'vimeo', 'direct', 'embed'
  thumbnail_url TEXT, -- Image de prévisualisation
  duration_seconds INTEGER, -- Durée en secondes
  -- Métadonnées
  order_index INTEGER DEFAULT 0,
  difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  tags TEXT[],
  -- Statistiques
  view_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  -- Statut
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, slug)
);

-- 3. Table pour le suivi de progression des utilisateurs
CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  -- Progression
  watched_seconds INTEGER DEFAULT 0, -- Secondes visionnées
  completion_percentage DECIMAL(5, 2) DEFAULT 0, -- Pourcentage de complétion (0-100)
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 4. Table pour les notes des utilisateurs sur les vidéos
CREATE TABLE IF NOT EXISTS public.tutorial_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  -- Note
  content TEXT NOT NULL,
  timestamp_seconds INTEGER, -- Timestamp dans la vidéo (optionnel)
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les favoris
CREATE TABLE IF NOT EXISTS public.tutorial_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 6. Table pour les playlists de tutoriels
CREATE TABLE IF NOT EXISTS public.tutorial_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  -- Statistiques
  video_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les vidéos dans les playlists
CREATE TABLE IF NOT EXISTS public.tutorial_playlist_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.tutorial_playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(playlist_id, video_id)
);

-- 8. Table pour les commentaires sur les vidéos
CREATE TABLE IF NOT EXISTS public.tutorial_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.tutorial_comments(id) ON DELETE CASCADE, -- Pour les réponses
  -- Commentaire
  content TEXT NOT NULL,
  timestamp_seconds INTEGER, -- Timestamp dans la vidéo (optionnel)
  -- Modération
  is_approved BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tutorial_modules_slug ON public.tutorial_modules(slug);
CREATE INDEX IF NOT EXISTS idx_tutorial_modules_active ON public.tutorial_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_tutorial_videos_module ON public.tutorial_videos(module_id, is_published);
CREATE INDEX IF NOT EXISTS idx_tutorial_videos_slug ON public.tutorial_videos(module_id, slug);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_user ON public.tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_video ON public.tutorial_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_notes_user ON public.tutorial_notes(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_favorites_user ON public.tutorial_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_playlists_user ON public.tutorial_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_playlist_videos_playlist ON public.tutorial_playlist_videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_comments_video ON public.tutorial_comments(video_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_tutorial_comments_parent ON public.tutorial_comments(parent_id);

-- 10. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_tutorial_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_tutorial_modules_timestamp ON public.tutorial_modules;
CREATE TRIGGER update_tutorial_modules_timestamp
  BEFORE UPDATE ON public.tutorial_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_videos_timestamp ON public.tutorial_videos;
CREATE TRIGGER update_tutorial_videos_timestamp
  BEFORE UPDATE ON public.tutorial_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_notes_timestamp ON public.tutorial_notes;
CREATE TRIGGER update_tutorial_notes_timestamp
  BEFORE UPDATE ON public.tutorial_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_playlists_timestamp ON public.tutorial_playlists;
CREATE TRIGGER update_tutorial_playlists_timestamp
  BEFORE UPDATE ON public.tutorial_playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_comments_timestamp ON public.tutorial_comments;
CREATE TRIGGER update_tutorial_comments_timestamp
  BEFORE UPDATE ON public.tutorial_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

-- 12. Fonction pour incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION increment_tutorial_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.tutorial_videos
  SET view_count = view_count + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_tutorial_view_count ON public.tutorial_progress;
CREATE TRIGGER trigger_increment_tutorial_view_count
  AFTER INSERT ON public.tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION increment_tutorial_view_count();

-- 13. Fonction pour mettre à jour le compteur de complétion
CREATE OR REPLACE FUNCTION update_tutorial_completion_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    UPDATE public.tutorial_videos
    SET completion_count = completion_count + 1
    WHERE id = NEW.video_id;
  ELSIF NEW.is_completed = false AND OLD.is_completed = true THEN
    UPDATE public.tutorial_videos
    SET completion_count = GREATEST(completion_count - 1, 0)
    WHERE id = NEW.video_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_completion_count ON public.tutorial_progress;
CREATE TRIGGER trigger_update_completion_count
  AFTER UPDATE ON public.tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_completion_count();

-- 14. Fonction pour mettre à jour le nombre de vidéos dans une playlist
CREATE OR REPLACE FUNCTION update_tutorial_playlist_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tutorial_playlists
    SET video_count = video_count + 1
    WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tutorial_playlists
    SET video_count = GREATEST(video_count - 1, 0)
    WHERE id = OLD.playlist_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_playlist_count_insert ON public.tutorial_playlist_videos;
CREATE TRIGGER trigger_update_playlist_count_insert
  AFTER INSERT ON public.tutorial_playlist_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_playlist_count();

DROP TRIGGER IF EXISTS trigger_update_playlist_count_delete ON public.tutorial_playlist_videos;
CREATE TRIGGER trigger_update_playlist_count_delete
  AFTER DELETE ON public.tutorial_playlist_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_playlist_count();

-- 15. RLS Policies pour tutorial_modules
ALTER TABLE public.tutorial_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active modules" ON public.tutorial_modules;
CREATE POLICY "Users can view active modules"
  ON public.tutorial_modules
  FOR SELECT
  USING (is_active = true);

-- 16. RLS Policies pour tutorial_videos
ALTER TABLE public.tutorial_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published videos" ON public.tutorial_videos;
CREATE POLICY "Users can view published videos"
  ON public.tutorial_videos
  FOR SELECT
  USING (is_published = true);

-- 17. RLS Policies pour tutorial_progress
ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own progress" ON public.tutorial_progress;
CREATE POLICY "Users can manage their own progress"
  ON public.tutorial_progress
  FOR ALL
  USING (user_id = auth.uid());

-- 18. RLS Policies pour tutorial_notes
ALTER TABLE public.tutorial_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.tutorial_notes;
CREATE POLICY "Users can manage their own notes"
  ON public.tutorial_notes
  FOR ALL
  USING (user_id = auth.uid());

-- 19. RLS Policies pour tutorial_favorites
ALTER TABLE public.tutorial_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.tutorial_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.tutorial_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 20. RLS Policies pour tutorial_playlists
ALTER TABLE public.tutorial_playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public playlists or their own" ON public.tutorial_playlists;
CREATE POLICY "Users can view public playlists or their own"
  ON public.tutorial_playlists
  FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own playlists" ON public.tutorial_playlists;
CREATE POLICY "Users can manage their own playlists"
  ON public.tutorial_playlists
  FOR ALL
  USING (user_id = auth.uid());

-- 21. RLS Policies pour tutorial_comments
ALTER TABLE public.tutorial_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approved comments" ON public.tutorial_comments;
CREATE POLICY "Users can view approved comments"
  ON public.tutorial_comments
  FOR SELECT
  USING (is_approved = true);

DROP POLICY IF EXISTS "Users can create comments" ON public.tutorial_comments;
CREATE POLICY "Users can create comments"
  ON public.tutorial_comments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own comments" ON public.tutorial_comments;
CREATE POLICY "Users can update their own comments"
  ON public.tutorial_comments
  FOR UPDATE
  USING (user_id = auth.uid());

-- 22. Grant permissions
GRANT SELECT ON public.tutorial_modules TO authenticated;
GRANT SELECT ON public.tutorial_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tutorial_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorial_notes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.tutorial_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorial_playlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorial_playlist_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tutorial_comments TO authenticated;

-- 23. Insertion des modules par défaut
INSERT INTO public.tutorial_modules (name, slug, description, icon, color, order_index) VALUES
  ('Démarrage rapide', 'getting-started', 'Tutoriels pour commencer avec EDUZEN', 'PlayCircle', '#3B82F6', 1),
  ('Gestion des étudiants', 'students', 'Tout sur la gestion des étudiants', 'Users', '#10B981', 2),
  ('Formations et sessions', 'formations', 'Créer et gérer les formations', 'GraduationCap', '#F59E0B', 3),
  ('Évaluations', 'evaluations', 'Système d''évaluations et bulletins', 'FileText', '#8B5CF6', 4),
  ('Paiements', 'payments', 'Gestion des paiements et factures', 'CreditCard', '#EF4444', 5),
  ('Présence', 'attendance', 'Gestion de la présence', 'Calendar', '#6366F1', 6),
  ('Documents', 'documents', 'Génération et gestion de documents', 'File', '#EC4899', 7),
  ('Paramètres', 'settings', 'Configuration de l''application', 'Settings', '#6B7280', 8),
  ('API et intégrations', 'api', 'Utilisation de l''API et intégrations', 'Code', '#14B8A6', 9)
ON CONFLICT (slug) DO NOTHING;



-- 1. Table pour les modules/catégories de tutoriels
CREATE TABLE IF NOT EXISTS public.tutorial_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Nom de l'icône
  color TEXT, -- Couleur du module
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les vidéos tutoriels
CREATE TABLE IF NOT EXISTS public.tutorial_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.tutorial_modules(id) ON DELETE CASCADE,
  -- Informations
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  -- Vidéo
  video_url TEXT NOT NULL, -- URL de la vidéo (YouTube, Vimeo, ou URL directe)
  video_type TEXT DEFAULT 'youtube', -- 'youtube', 'vimeo', 'direct', 'embed'
  thumbnail_url TEXT, -- Image de prévisualisation
  duration_seconds INTEGER, -- Durée en secondes
  -- Métadonnées
  order_index INTEGER DEFAULT 0,
  difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  tags TEXT[],
  -- Statistiques
  view_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  -- Statut
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, slug)
);

-- 3. Table pour le suivi de progression des utilisateurs
CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  -- Progression
  watched_seconds INTEGER DEFAULT 0, -- Secondes visionnées
  completion_percentage DECIMAL(5, 2) DEFAULT 0, -- Pourcentage de complétion (0-100)
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 4. Table pour les notes des utilisateurs sur les vidéos
CREATE TABLE IF NOT EXISTS public.tutorial_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  -- Note
  content TEXT NOT NULL,
  timestamp_seconds INTEGER, -- Timestamp dans la vidéo (optionnel)
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les favoris
CREATE TABLE IF NOT EXISTS public.tutorial_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 6. Table pour les playlists de tutoriels
CREATE TABLE IF NOT EXISTS public.tutorial_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  -- Statistiques
  video_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les vidéos dans les playlists
CREATE TABLE IF NOT EXISTS public.tutorial_playlist_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.tutorial_playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(playlist_id, video_id)
);

-- 8. Table pour les commentaires sur les vidéos
CREATE TABLE IF NOT EXISTS public.tutorial_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.tutorial_comments(id) ON DELETE CASCADE, -- Pour les réponses
  -- Commentaire
  content TEXT NOT NULL,
  timestamp_seconds INTEGER, -- Timestamp dans la vidéo (optionnel)
  -- Modération
  is_approved BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tutorial_modules_slug ON public.tutorial_modules(slug);
CREATE INDEX IF NOT EXISTS idx_tutorial_modules_active ON public.tutorial_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_tutorial_videos_module ON public.tutorial_videos(module_id, is_published);
CREATE INDEX IF NOT EXISTS idx_tutorial_videos_slug ON public.tutorial_videos(module_id, slug);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_user ON public.tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_video ON public.tutorial_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_notes_user ON public.tutorial_notes(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_favorites_user ON public.tutorial_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_playlists_user ON public.tutorial_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_playlist_videos_playlist ON public.tutorial_playlist_videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_comments_video ON public.tutorial_comments(video_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_tutorial_comments_parent ON public.tutorial_comments(parent_id);

-- 10. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_tutorial_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_tutorial_modules_timestamp ON public.tutorial_modules;
CREATE TRIGGER update_tutorial_modules_timestamp
  BEFORE UPDATE ON public.tutorial_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_videos_timestamp ON public.tutorial_videos;
CREATE TRIGGER update_tutorial_videos_timestamp
  BEFORE UPDATE ON public.tutorial_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_notes_timestamp ON public.tutorial_notes;
CREATE TRIGGER update_tutorial_notes_timestamp
  BEFORE UPDATE ON public.tutorial_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_playlists_timestamp ON public.tutorial_playlists;
CREATE TRIGGER update_tutorial_playlists_timestamp
  BEFORE UPDATE ON public.tutorial_playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_comments_timestamp ON public.tutorial_comments;
CREATE TRIGGER update_tutorial_comments_timestamp
  BEFORE UPDATE ON public.tutorial_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

-- 12. Fonction pour incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION increment_tutorial_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.tutorial_videos
  SET view_count = view_count + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_tutorial_view_count ON public.tutorial_progress;
CREATE TRIGGER trigger_increment_tutorial_view_count
  AFTER INSERT ON public.tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION increment_tutorial_view_count();

-- 13. Fonction pour mettre à jour le compteur de complétion
CREATE OR REPLACE FUNCTION update_tutorial_completion_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    UPDATE public.tutorial_videos
    SET completion_count = completion_count + 1
    WHERE id = NEW.video_id;
  ELSIF NEW.is_completed = false AND OLD.is_completed = true THEN
    UPDATE public.tutorial_videos
    SET completion_count = GREATEST(completion_count - 1, 0)
    WHERE id = NEW.video_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_completion_count ON public.tutorial_progress;
CREATE TRIGGER trigger_update_completion_count
  AFTER UPDATE ON public.tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_completion_count();

-- 14. Fonction pour mettre à jour le nombre de vidéos dans une playlist
CREATE OR REPLACE FUNCTION update_tutorial_playlist_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tutorial_playlists
    SET video_count = video_count + 1
    WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tutorial_playlists
    SET video_count = GREATEST(video_count - 1, 0)
    WHERE id = OLD.playlist_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_playlist_count_insert ON public.tutorial_playlist_videos;
CREATE TRIGGER trigger_update_playlist_count_insert
  AFTER INSERT ON public.tutorial_playlist_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_playlist_count();

DROP TRIGGER IF EXISTS trigger_update_playlist_count_delete ON public.tutorial_playlist_videos;
CREATE TRIGGER trigger_update_playlist_count_delete
  AFTER DELETE ON public.tutorial_playlist_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_playlist_count();

-- 15. RLS Policies pour tutorial_modules
ALTER TABLE public.tutorial_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active modules" ON public.tutorial_modules;
CREATE POLICY "Users can view active modules"
  ON public.tutorial_modules
  FOR SELECT
  USING (is_active = true);

-- 16. RLS Policies pour tutorial_videos
ALTER TABLE public.tutorial_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published videos" ON public.tutorial_videos;
CREATE POLICY "Users can view published videos"
  ON public.tutorial_videos
  FOR SELECT
  USING (is_published = true);

-- 17. RLS Policies pour tutorial_progress
ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own progress" ON public.tutorial_progress;
CREATE POLICY "Users can manage their own progress"
  ON public.tutorial_progress
  FOR ALL
  USING (user_id = auth.uid());

-- 18. RLS Policies pour tutorial_notes
ALTER TABLE public.tutorial_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.tutorial_notes;
CREATE POLICY "Users can manage their own notes"
  ON public.tutorial_notes
  FOR ALL
  USING (user_id = auth.uid());

-- 19. RLS Policies pour tutorial_favorites
ALTER TABLE public.tutorial_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.tutorial_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.tutorial_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 20. RLS Policies pour tutorial_playlists
ALTER TABLE public.tutorial_playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public playlists or their own" ON public.tutorial_playlists;
CREATE POLICY "Users can view public playlists or their own"
  ON public.tutorial_playlists
  FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own playlists" ON public.tutorial_playlists;
CREATE POLICY "Users can manage their own playlists"
  ON public.tutorial_playlists
  FOR ALL
  USING (user_id = auth.uid());

-- 21. RLS Policies pour tutorial_comments
ALTER TABLE public.tutorial_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approved comments" ON public.tutorial_comments;
CREATE POLICY "Users can view approved comments"
  ON public.tutorial_comments
  FOR SELECT
  USING (is_approved = true);

DROP POLICY IF EXISTS "Users can create comments" ON public.tutorial_comments;
CREATE POLICY "Users can create comments"
  ON public.tutorial_comments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own comments" ON public.tutorial_comments;
CREATE POLICY "Users can update their own comments"
  ON public.tutorial_comments
  FOR UPDATE
  USING (user_id = auth.uid());

-- 22. Grant permissions
GRANT SELECT ON public.tutorial_modules TO authenticated;
GRANT SELECT ON public.tutorial_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tutorial_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorial_notes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.tutorial_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorial_playlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorial_playlist_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tutorial_comments TO authenticated;

-- 23. Insertion des modules par défaut
INSERT INTO public.tutorial_modules (name, slug, description, icon, color, order_index) VALUES
  ('Démarrage rapide', 'getting-started', 'Tutoriels pour commencer avec EDUZEN', 'PlayCircle', '#3B82F6', 1),
  ('Gestion des étudiants', 'students', 'Tout sur la gestion des étudiants', 'Users', '#10B981', 2),
  ('Formations et sessions', 'formations', 'Créer et gérer les formations', 'GraduationCap', '#F59E0B', 3),
  ('Évaluations', 'evaluations', 'Système d''évaluations et bulletins', 'FileText', '#8B5CF6', 4),
  ('Paiements', 'payments', 'Gestion des paiements et factures', 'CreditCard', '#EF4444', 5),
  ('Présence', 'attendance', 'Gestion de la présence', 'Calendar', '#6366F1', 6),
  ('Documents', 'documents', 'Génération et gestion de documents', 'File', '#EC4899', 7),
  ('Paramètres', 'settings', 'Configuration de l''application', 'Settings', '#6B7280', 8),
  ('API et intégrations', 'api', 'Utilisation de l''API et intégrations', 'Code', '#14B8A6', 9)
ON CONFLICT (slug) DO NOTHING;



-- 1. Table pour les modules/catégories de tutoriels
CREATE TABLE IF NOT EXISTS public.tutorial_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Nom de l'icône
  color TEXT, -- Couleur du module
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les vidéos tutoriels
CREATE TABLE IF NOT EXISTS public.tutorial_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.tutorial_modules(id) ON DELETE CASCADE,
  -- Informations
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  -- Vidéo
  video_url TEXT NOT NULL, -- URL de la vidéo (YouTube, Vimeo, ou URL directe)
  video_type TEXT DEFAULT 'youtube', -- 'youtube', 'vimeo', 'direct', 'embed'
  thumbnail_url TEXT, -- Image de prévisualisation
  duration_seconds INTEGER, -- Durée en secondes
  -- Métadonnées
  order_index INTEGER DEFAULT 0,
  difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  tags TEXT[],
  -- Statistiques
  view_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  -- Statut
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(module_id, slug)
);

-- 3. Table pour le suivi de progression des utilisateurs
CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  -- Progression
  watched_seconds INTEGER DEFAULT 0, -- Secondes visionnées
  completion_percentage DECIMAL(5, 2) DEFAULT 0, -- Pourcentage de complétion (0-100)
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  -- Dates
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 4. Table pour les notes des utilisateurs sur les vidéos
CREATE TABLE IF NOT EXISTS public.tutorial_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  -- Note
  content TEXT NOT NULL,
  timestamp_seconds INTEGER, -- Timestamp dans la vidéo (optionnel)
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les favoris
CREATE TABLE IF NOT EXISTS public.tutorial_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 6. Table pour les playlists de tutoriels
CREATE TABLE IF NOT EXISTS public.tutorial_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  -- Statistiques
  video_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les vidéos dans les playlists
CREATE TABLE IF NOT EXISTS public.tutorial_playlist_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.tutorial_playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(playlist_id, video_id)
);

-- 8. Table pour les commentaires sur les vidéos
CREATE TABLE IF NOT EXISTS public.tutorial_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.tutorial_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.tutorial_comments(id) ON DELETE CASCADE, -- Pour les réponses
  -- Commentaire
  content TEXT NOT NULL,
  timestamp_seconds INTEGER, -- Timestamp dans la vidéo (optionnel)
  -- Modération
  is_approved BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_tutorial_modules_slug ON public.tutorial_modules(slug);
CREATE INDEX IF NOT EXISTS idx_tutorial_modules_active ON public.tutorial_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_tutorial_videos_module ON public.tutorial_videos(module_id, is_published);
CREATE INDEX IF NOT EXISTS idx_tutorial_videos_slug ON public.tutorial_videos(module_id, slug);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_user ON public.tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_video ON public.tutorial_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_notes_user ON public.tutorial_notes(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_favorites_user ON public.tutorial_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_playlists_user ON public.tutorial_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_playlist_videos_playlist ON public.tutorial_playlist_videos(playlist_id);
CREATE INDEX IF NOT EXISTS idx_tutorial_comments_video ON public.tutorial_comments(video_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_tutorial_comments_parent ON public.tutorial_comments(parent_id);

-- 10. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_tutorial_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_tutorial_modules_timestamp ON public.tutorial_modules;
CREATE TRIGGER update_tutorial_modules_timestamp
  BEFORE UPDATE ON public.tutorial_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_videos_timestamp ON public.tutorial_videos;
CREATE TRIGGER update_tutorial_videos_timestamp
  BEFORE UPDATE ON public.tutorial_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_notes_timestamp ON public.tutorial_notes;
CREATE TRIGGER update_tutorial_notes_timestamp
  BEFORE UPDATE ON public.tutorial_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_playlists_timestamp ON public.tutorial_playlists;
CREATE TRIGGER update_tutorial_playlists_timestamp
  BEFORE UPDATE ON public.tutorial_playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

DROP TRIGGER IF EXISTS update_tutorial_comments_timestamp ON public.tutorial_comments;
CREATE TRIGGER update_tutorial_comments_timestamp
  BEFORE UPDATE ON public.tutorial_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_updated_at();

-- 12. Fonction pour incrémenter le compteur de vues
CREATE OR REPLACE FUNCTION increment_tutorial_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.tutorial_videos
  SET view_count = view_count + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_tutorial_view_count ON public.tutorial_progress;
CREATE TRIGGER trigger_increment_tutorial_view_count
  AFTER INSERT ON public.tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION increment_tutorial_view_count();

-- 13. Fonction pour mettre à jour le compteur de complétion
CREATE OR REPLACE FUNCTION update_tutorial_completion_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    UPDATE public.tutorial_videos
    SET completion_count = completion_count + 1
    WHERE id = NEW.video_id;
  ELSIF NEW.is_completed = false AND OLD.is_completed = true THEN
    UPDATE public.tutorial_videos
    SET completion_count = GREATEST(completion_count - 1, 0)
    WHERE id = NEW.video_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_completion_count ON public.tutorial_progress;
CREATE TRIGGER trigger_update_completion_count
  AFTER UPDATE ON public.tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_completion_count();

-- 14. Fonction pour mettre à jour le nombre de vidéos dans une playlist
CREATE OR REPLACE FUNCTION update_tutorial_playlist_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tutorial_playlists
    SET video_count = video_count + 1
    WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tutorial_playlists
    SET video_count = GREATEST(video_count - 1, 0)
    WHERE id = OLD.playlist_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_playlist_count_insert ON public.tutorial_playlist_videos;
CREATE TRIGGER trigger_update_playlist_count_insert
  AFTER INSERT ON public.tutorial_playlist_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_playlist_count();

DROP TRIGGER IF EXISTS trigger_update_playlist_count_delete ON public.tutorial_playlist_videos;
CREATE TRIGGER trigger_update_playlist_count_delete
  AFTER DELETE ON public.tutorial_playlist_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_tutorial_playlist_count();

-- 15. RLS Policies pour tutorial_modules
ALTER TABLE public.tutorial_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view active modules" ON public.tutorial_modules;
CREATE POLICY "Users can view active modules"
  ON public.tutorial_modules
  FOR SELECT
  USING (is_active = true);

-- 16. RLS Policies pour tutorial_videos
ALTER TABLE public.tutorial_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view published videos" ON public.tutorial_videos;
CREATE POLICY "Users can view published videos"
  ON public.tutorial_videos
  FOR SELECT
  USING (is_published = true);

-- 17. RLS Policies pour tutorial_progress
ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own progress" ON public.tutorial_progress;
CREATE POLICY "Users can manage their own progress"
  ON public.tutorial_progress
  FOR ALL
  USING (user_id = auth.uid());

-- 18. RLS Policies pour tutorial_notes
ALTER TABLE public.tutorial_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notes" ON public.tutorial_notes;
CREATE POLICY "Users can manage their own notes"
  ON public.tutorial_notes
  FOR ALL
  USING (user_id = auth.uid());

-- 19. RLS Policies pour tutorial_favorites
ALTER TABLE public.tutorial_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.tutorial_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON public.tutorial_favorites
  FOR ALL
  USING (user_id = auth.uid());

-- 20. RLS Policies pour tutorial_playlists
ALTER TABLE public.tutorial_playlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view public playlists or their own" ON public.tutorial_playlists;
CREATE POLICY "Users can view public playlists or their own"
  ON public.tutorial_playlists
  FOR SELECT
  USING (is_public = true OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own playlists" ON public.tutorial_playlists;
CREATE POLICY "Users can manage their own playlists"
  ON public.tutorial_playlists
  FOR ALL
  USING (user_id = auth.uid());

-- 21. RLS Policies pour tutorial_comments
ALTER TABLE public.tutorial_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view approved comments" ON public.tutorial_comments;
CREATE POLICY "Users can view approved comments"
  ON public.tutorial_comments
  FOR SELECT
  USING (is_approved = true);

DROP POLICY IF EXISTS "Users can create comments" ON public.tutorial_comments;
CREATE POLICY "Users can create comments"
  ON public.tutorial_comments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own comments" ON public.tutorial_comments;
CREATE POLICY "Users can update their own comments"
  ON public.tutorial_comments
  FOR UPDATE
  USING (user_id = auth.uid());

-- 22. Grant permissions
GRANT SELECT ON public.tutorial_modules TO authenticated;
GRANT SELECT ON public.tutorial_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tutorial_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorial_notes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.tutorial_favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorial_playlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorial_playlist_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tutorial_comments TO authenticated;

-- 23. Insertion des modules par défaut
INSERT INTO public.tutorial_modules (name, slug, description, icon, color, order_index) VALUES
  ('Démarrage rapide', 'getting-started', 'Tutoriels pour commencer avec EDUZEN', 'PlayCircle', '#3B82F6', 1),
  ('Gestion des étudiants', 'students', 'Tout sur la gestion des étudiants', 'Users', '#10B981', 2),
  ('Formations et sessions', 'formations', 'Créer et gérer les formations', 'GraduationCap', '#F59E0B', 3),
  ('Évaluations', 'evaluations', 'Système d''évaluations et bulletins', 'FileText', '#8B5CF6', 4),
  ('Paiements', 'payments', 'Gestion des paiements et factures', 'CreditCard', '#EF4444', 5),
  ('Présence', 'attendance', 'Gestion de la présence', 'Calendar', '#6366F1', 6),
  ('Documents', 'documents', 'Génération et gestion de documents', 'File', '#EC4899', 7),
  ('Paramètres', 'settings', 'Configuration de l''application', 'Settings', '#6B7280', 8),
  ('API et intégrations', 'api', 'Utilisation de l''API et intégrations', 'Code', '#14B8A6', 9)
ON CONFLICT (slug) DO NOTHING;


