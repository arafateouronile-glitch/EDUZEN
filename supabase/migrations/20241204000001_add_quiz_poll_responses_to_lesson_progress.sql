-- Migration pour ajouter les colonnes quiz_responses et poll_votes à lesson_progress
-- Ces colonnes stockent les réponses aux quiz et les votes aux sondages dans les leçons

ALTER TABLE public.lesson_progress
ADD COLUMN IF NOT EXISTS quiz_responses JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS poll_votes JSONB DEFAULT NULL;

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN public.lesson_progress.quiz_responses IS 'Stocke les réponses aux quiz intégrés dans les leçons. Format: {block_id: {answer: string, answered_at: timestamp}}';
COMMENT ON COLUMN public.lesson_progress.poll_votes IS 'Stocke les votes aux sondages intégrés dans les leçons. Format: {block_id: {option_id: string, voted_at: timestamp}}';





