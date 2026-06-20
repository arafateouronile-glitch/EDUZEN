-- Ajout de la date d'expiration pour les diplômes et certifications des enseignants
-- NULL = pas d'expiration (ex: pièce d'identité sans date limite)

ALTER TABLE public.teacher_documents
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

COMMENT ON COLUMN public.teacher_documents.expiry_date IS
  'Date d''expiration du diplôme ou de la certification. NULL = pas d''expiration.';

CREATE INDEX IF NOT EXISTS idx_teacher_documents_expiry_date
  ON public.teacher_documents (expiry_date)
  WHERE expiry_date IS NOT NULL;
