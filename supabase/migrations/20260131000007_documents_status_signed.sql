-- Migration: Ajout des colonnes statut et signature sur la table documents
-- Permet d'afficher "Signé" dans l'interface de gestion une fois le document signé.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS status text;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS signed_file_path text;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS signed_file_url text;

COMMENT ON COLUMN public.documents.status IS 'Statut du document : draft, pending, signed, etc.';
COMMENT ON COLUMN public.documents.signed_at IS 'Date et heure de signature du document';
COMMENT ON COLUMN public.documents.signed_file_path IS 'Chemin Storage du PDF signé';
COMMENT ON COLUMN public.documents.signed_file_url IS 'URL publique du PDF signé';

CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status) WHERE status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_signed_at ON public.documents(signed_at DESC) WHERE signed_at IS NOT NULL;
