-- Ajouter les colonnes de réponses quiz et sondage à lesson_progress
ALTER TABLE lesson_progress
  ADD COLUMN IF NOT EXISTS quiz_responses JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS poll_votes     JSONB DEFAULT '{}';
