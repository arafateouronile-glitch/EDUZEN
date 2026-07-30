-- Migration: Retire la limite de taille des fichiers e-learning (PDF de leçons)
-- Date: 2026-07-28
--
-- Les buckets elearning-media/course-media (migration 20251217000005) ont été
-- créés sans `file_size_limit` explicite, ce qui les faisait hériter de la
-- limite par défaut du projet Supabase. Aucun code applicatif ne limite non
-- plus la taille des PDF uploadés dans les blocs de contenu de leçon
-- (app/(dashboard)/dashboard/elearning/courses/[slug]/lessons/*). On fixe
-- ici une limite haute au niveau du bucket (500 Mo, alignée sur la plus
-- généreuse déjà utilisée dans le repo, cf. app/api/resources/upload/route.ts)
-- pour ne plus jamais bloquer un PDF de cours volumineux.
--
-- Note: la limite réellement appliquée reste plafonnée par la configuration
-- globale du projet Supabase (dashboard > Storage > Upload size limit), qui
-- n'est pas versionnée dans ce repo — si un upload est encore refusé au-delà
-- de cette valeur, c'est ce réglage projet qu'il faut relever.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('elearning-media', 'elearning-media', TRUE, 524288000),
  ('course-media', 'course-media', TRUE, 524288000)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit;
