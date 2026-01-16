-- Migration pour créer le système de feedback utilisateur
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature_request', 'improvement', 'question', 'other')),
  category TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT,
  user_agent TEXT,
  screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'in_progress', 'resolved', 'closed', 'rejected')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_feedback_organization_id ON public.user_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_student_id ON public.user_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_feedback_type ON public.user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON public.user_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_assigned_to ON public.user_feedback(assigned_to) WHERE assigned_to IS NOT NULL;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON public.user_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_user_feedback_updated_at();

-- RLS Policies
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir les feedbacks de leur organisation
CREATE POLICY "Users can view their organization's feedback"
  ON public.user_feedback FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Les utilisateurs peuvent créer des feedbacks pour leur organisation
CREATE POLICY "Users can create feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- Policy: Les utilisateurs peuvent mettre à jour leurs propres feedbacks ou ceux assignés
CREATE POLICY "Users can update feedback"
  ON public.user_feedback FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND (
      user_id = auth.uid() OR
      assigned_to = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
      )
    )
  );

-- Policy: Les admins peuvent supprimer des feedbacks
CREATE POLICY "Admins can delete feedback"
  ON public.user_feedback FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin')
      AND organization_id = user_feedback.organization_id
    )
  );

-- Commentaires
COMMENT ON TABLE public.user_feedback IS 'Système de feedback utilisateur pour collecter les retours, bugs, demandes de fonctionnalités, etc.';
COMMENT ON COLUMN public.user_feedback.feedback_type IS 'Type de feedback : bug, feature_request, improvement, question, other';
COMMENT ON COLUMN public.user_feedback.status IS 'Statut du feedback : pending, reviewing, in_progress, resolved, closed, rejected';
COMMENT ON COLUMN public.user_feedback.priority IS 'Priorité : low, medium, high, urgent';
COMMENT ON COLUMN public.user_feedback.page_url IS 'URL de la page où le feedback a été soumis';
COMMENT ON COLUMN public.user_feedback.screenshot_url IS 'URL de la capture d''écran (stockée dans Supabase Storage)';



