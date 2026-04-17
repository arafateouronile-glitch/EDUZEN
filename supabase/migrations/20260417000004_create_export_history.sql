-- Création de la table export_history pour tracer les exports de données
CREATE TABLE IF NOT EXISTS public.export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  export_type text NOT NULL CHECK (export_type IN ('excel', 'csv', 'pdf')),
  entity_type text NOT NULL CHECK (entity_type IN ('students', 'documents', 'payments', 'dashboard_report', 'attendance_report', 'other')),
  filename text NOT NULL,
  record_count integer NOT NULL DEFAULT 0,
  file_size_bytes bigint,
  filters text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS export_history_organization_id_idx ON public.export_history(organization_id);
CREATE INDEX IF NOT EXISTS export_history_created_at_idx ON public.export_history(created_at DESC);

-- RLS
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization export history"
  ON public.export_history FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can create export history"
  ON public.export_history FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.get_user_organization_id());
