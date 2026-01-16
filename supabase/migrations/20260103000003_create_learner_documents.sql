-- =====================================================
-- EDUZEN - Module Documents Espace Apprenant
-- =====================================================
-- Description: Permet d'envoyer des documents vers l'espace apprenant des étudiants
-- Date: 2026-01-03
-- =====================================================

-- =====================================================
-- TABLE: learner_documents
-- Documents envoyés dans l'espace apprenant
-- =====================================================

CREATE TABLE IF NOT EXISTS public.learner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,

  -- Informations du document
  title VARCHAR(500) NOT NULL,
  file_url TEXT NOT NULL,
  type VARCHAR(100), -- Type de document (attestation, certificat, etc.)
  description TEXT,

  -- Métadonnées
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ, -- Date de première consultation par l'apprenant
  downloaded_at TIMESTAMPTZ, -- Date de téléchargement par l'apprenant

  -- Notifications
  notified BOOLEAN DEFAULT FALSE, -- Email envoyé à l'apprenant
  notified_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.learner_documents IS 'Documents envoyés dans l''espace apprenant des étudiants';
COMMENT ON COLUMN public.learner_documents.viewed_at IS 'Date de première consultation du document par l''apprenant';
COMMENT ON COLUMN public.learner_documents.downloaded_at IS 'Date de téléchargement du document par l''apprenant';

-- =====================================================
-- INDEX
-- =====================================================

CREATE INDEX idx_learner_documents_student ON public.learner_documents(student_id);
CREATE INDEX idx_learner_documents_org ON public.learner_documents(organization_id);
CREATE INDEX idx_learner_documents_sent_at ON public.learner_documents(sent_at DESC);
CREATE INDEX idx_learner_documents_viewed ON public.learner_documents(viewed_at) WHERE viewed_at IS NOT NULL;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_learner_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_learner_documents_updated_at
  BEFORE UPDATE ON public.learner_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_learner_documents_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.learner_documents ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir les documents de leur organisation
CREATE POLICY "Users can view learner documents from their org"
  ON public.learner_documents FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Les apprenants peuvent voir leurs propres documents
CREATE POLICY "Learners can view their own documents"
  ON public.learner_documents FOR SELECT
  USING (
    student_id = public.learner_student_id()
  );

-- Les utilisateurs peuvent créer des documents pour leur organisation
CREATE POLICY "Users can create learner documents"
  ON public.learner_documents FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Les utilisateurs peuvent modifier les documents de leur organisation
CREATE POLICY "Users can update learner documents from their org"
  ON public.learner_documents FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Les apprenants peuvent marquer leurs documents comme vus/téléchargés
CREATE POLICY "Learners can update their own documents status"
  ON public.learner_documents FOR UPDATE
  USING (
    student_id = public.learner_student_id()
  )
  WITH CHECK (
    student_id = public.learner_student_id()
  );

-- Les utilisateurs peuvent supprimer les documents de leur organisation
CREATE POLICY "Users can delete learner documents from their org"
  ON public.learner_documents FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );
