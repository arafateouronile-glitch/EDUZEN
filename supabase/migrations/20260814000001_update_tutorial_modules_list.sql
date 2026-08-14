-- Remplace la liste des 9 modules tutoriels par défaut par la liste réelle
-- demandée (10 modules). On renomme les lignes existantes plutôt que de les
-- supprimer/recréer : ça préserve leur id, donc aucune vidéo déjà créée et
-- rattachée à un module ne se retrouve orpheline (tutorial_videos.module_id
-- est en ON DELETE CASCADE).

UPDATE public.tutorial_modules SET name = 'Paramétrage', slug = 'parametrage', order_index = 1 WHERE slug = 'getting-started';
UPDATE public.tutorial_modules SET name = 'Programmes & formations', slug = 'programmes-formations', order_index = 2 WHERE slug = 'formations';
UPDATE public.tutorial_modules SET name = 'Apprenants et entreprises', slug = 'apprenants-entreprises', order_index = 3 WHERE slug = 'students';
UPDATE public.tutorial_modules SET name = 'Sessions', slug = 'sessions', order_index = 4 WHERE slug = 'settings';
UPDATE public.tutorial_modules SET name = 'Documents', slug = 'documents', order_index = 5 WHERE slug = 'documents';
UPDATE public.tutorial_modules SET name = 'Finances', slug = 'finances', order_index = 6 WHERE slug = 'payments';
UPDATE public.tutorial_modules SET name = 'Présences', slug = 'presences', order_index = 7 WHERE slug = 'attendance';
UPDATE public.tutorial_modules SET name = 'API et Intégrations', slug = 'api-integrations', order_index = 8 WHERE slug = 'api';
UPDATE public.tutorial_modules SET name = 'Qualiopi', slug = 'qualiopi', order_index = 9 WHERE slug = 'evaluations';

INSERT INTO public.tutorial_modules (name, slug, description, icon, color, order_index)
VALUES ('Autres', 'autres', 'Autres tutoriels', 'MoreHorizontal', '#6B7280', 10)
ON CONFLICT (slug) DO NOTHING;
