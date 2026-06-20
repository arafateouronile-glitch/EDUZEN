-- Permet de restreindre la visibilité d'une ressource à des apprenants spécifiques
-- d'une session (subset optionnel de visibility_session_id).
-- NULL = tous les apprenants de la session ; tableau non vide = apprenants sélectionnés seulement.

ALTER TABLE public.educational_resources
  ADD COLUMN IF NOT EXISTS visibility_learner_ids uuid[] DEFAULT NULL;

COMMENT ON COLUMN public.educational_resources.visibility_learner_ids IS
  'UUIDs des apprenants (students.id) qui peuvent voir la ressource. NULL = tous les apprenants de la session. Utilisé conjointement avec visibility_scope = ''session''.';

CREATE INDEX IF NOT EXISTS idx_educational_resources_visibility_learners
  ON public.educational_resources USING GIN (visibility_learner_ids)
  WHERE visibility_learner_ids IS NOT NULL;
