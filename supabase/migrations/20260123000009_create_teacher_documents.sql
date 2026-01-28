-- Migration pour créer la table teacher_documents
-- Permet aux enseignants d'uploader leurs documents administratifs et diplômes
-- Visibles uniquement par l'enseignant, l'administrateur et le secrétaire

-- Créer la table teacher_documents
CREATE TABLE IF NOT EXISTS public.teacher_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Informations du document
  title VARCHAR(500) NOT NULL,
  description TEXT,
  document_type VARCHAR(100) NOT NULL CHECK (document_type IN ('diploma', 'administrative', 'certification', 'identity', 'other')),
  
  -- Fichier (Supabase Storage)
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  
  -- Métadonnées
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uploaded_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_teacher_documents_teacher_id ON public.teacher_documents(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_documents_organization_id ON public.teacher_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_teacher_documents_document_type ON public.teacher_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_teacher_documents_uploaded_at ON public.teacher_documents(uploaded_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_teacher_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_teacher_documents_timestamp ON public.teacher_documents;
CREATE TRIGGER update_teacher_documents_timestamp
  BEFORE UPDATE ON public.teacher_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_documents_updated_at();

-- Activer RLS
ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;

-- Politique : Les enseignants peuvent voir et créer leurs propres documents
DROP POLICY IF EXISTS "Teachers can view their own documents" ON public.teacher_documents;
CREATE POLICY "Teachers can view their own documents"
  ON public.teacher_documents FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid()
  );

DROP POLICY IF EXISTS "Teachers can create their own documents" ON public.teacher_documents;
CREATE POLICY "Teachers can create their own documents"
  ON public.teacher_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'teacher'
      AND organization_id = teacher_documents.organization_id
    )
  );

DROP POLICY IF EXISTS "Teachers can update their own documents" ON public.teacher_documents;
CREATE POLICY "Teachers can update their own documents"
  ON public.teacher_documents FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid()
  )
  WITH CHECK (
    teacher_id = auth.uid()
  );

DROP POLICY IF EXISTS "Teachers can delete their own documents" ON public.teacher_documents;
CREATE POLICY "Teachers can delete their own documents"
  ON public.teacher_documents FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid()
  );

-- Politique : Les administrateurs et secrétaires peuvent voir tous les documents des enseignants de leur organisation
DROP POLICY IF EXISTS "Admins and secretaries can view all teacher documents" ON public.teacher_documents;
CREATE POLICY "Admins and secretaries can view all teacher documents"
  ON public.teacher_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'secretary')
      AND organization_id = teacher_documents.organization_id
    )
  );

-- Politique : Les administrateurs et secrétaires peuvent vérifier les documents
DROP POLICY IF EXISTS "Admins and secretaries can verify documents" ON public.teacher_documents;
CREATE POLICY "Admins and secretaries can verify documents"
  ON public.teacher_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'secretary')
      AND organization_id = teacher_documents.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'secretary')
      AND organization_id = teacher_documents.organization_id
    )
  );

-- Commentaires
COMMENT ON TABLE public.teacher_documents IS 'Documents administratifs et diplômes des enseignants';
COMMENT ON COLUMN public.teacher_documents.document_type IS 'Type de document : diploma, administrative, certification, identity, other';
COMMENT ON COLUMN public.teacher_documents.verified IS 'Indique si le document a été vérifié par un admin/secrétaire';

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_documents TO authenticated;
