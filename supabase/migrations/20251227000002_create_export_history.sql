-- Migration pour créer la table d'historique des exports
CREATE TABLE IF NOT EXISTS public.export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL CHECK (export_type IN ('excel', 'csv', 'pdf')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('students', 'documents', 'payments', 'dashboard_report', 'attendance_report', 'other')),
  filename TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes INTEGER,
  filters JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_export_history_organization_id ON public.export_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_export_history_user_id ON public.export_history(user_id);
CREATE INDEX IF NOT EXISTS idx_export_history_created_at ON public.export_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_history_export_type ON public.export_history(export_type);
CREATE INDEX IF NOT EXISTS idx_export_history_entity_type ON public.export_history(entity_type);

-- RLS Policies
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres exports et ceux de leur organisation
CREATE POLICY "Users can view their organization's export history"
  ON public.export_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Les utilisateurs peuvent créer des exports pour leur organisation
CREATE POLICY "Users can create export history"
  ON public.export_history FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Les utilisateurs peuvent supprimer leurs propres exports
CREATE POLICY "Users can delete their own export history"
  ON public.export_history FOR DELETE
  USING (user_id = auth.uid());

-- Commentaires
COMMENT ON TABLE public.export_history IS 'Historique des exports effectués par les utilisateurs (Excel, CSV, PDF)';
COMMENT ON COLUMN public.export_history.export_type IS 'Type d''export : excel, csv, ou pdf';
COMMENT ON COLUMN public.export_history.entity_type IS 'Type d''entité exportée : students, documents, payments, dashboard_report, attendance_report, other';
COMMENT ON COLUMN public.export_history.filters IS 'Filtres appliqués lors de l''export (JSON)';
COMMENT ON COLUMN public.export_history.file_size_bytes IS 'Taille du fichier exporté en octets (si disponible)';



