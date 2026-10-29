-- Archivage des sessions : une session archivée disparaît de la liste des
-- sessions (filtre « Archivées » pour la retrouver) sans rien supprimer.

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS sessions_archived_at_idx
  ON public.sessions(organization_id)
  WHERE archived_at IS NULL;

COMMENT ON COLUMN public.sessions.archived_at IS 'Date d''archivage de la session (NULL = active, visible dans la liste)';
