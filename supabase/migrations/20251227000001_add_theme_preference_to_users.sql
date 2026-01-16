-- Migration pour ajouter la colonne theme_preference à la table users
-- Permet de sauvegarder la préférence de thème (light, dark, system) de chaque utilisateur

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_users_theme_preference ON public.users(theme_preference) WHERE theme_preference IS NOT NULL;

-- Commentaire
COMMENT ON COLUMN public.users.theme_preference IS 'Préférence de thème de l''utilisateur : light, dark, ou system (auto-détection)';



