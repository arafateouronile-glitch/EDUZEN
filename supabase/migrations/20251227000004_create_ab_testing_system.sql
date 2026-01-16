-- Migration pour créer le système de tests A/B
CREATE TABLE IF NOT EXISTS public.experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  variants JSONB NOT NULL, -- Array of ExperimentVariant
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  traffic_allocation INTEGER DEFAULT 100 CHECK (traffic_allocation >= 0 AND traffic_allocation <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  experiment_id UUID REFERENCES public.experiments(id) ON DELETE CASCADE NOT NULL,
  variant_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, experiment_id)
);

CREATE TABLE IF NOT EXISTS public.experiment_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  experiment_id UUID REFERENCES public.experiments(id) ON DELETE CASCADE NOT NULL,
  variant_id TEXT NOT NULL,
  conversion_name TEXT NOT NULL,
  value NUMERIC,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_experiments_organization_id ON public.experiments(organization_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON public.experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user_id ON public.experiment_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_experiment_id ON public.experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user_experiment ON public.experiment_assignments(user_id, experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_conversions_user_id ON public.experiment_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_experiment_conversions_experiment_id ON public.experiment_conversions(experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_conversions_variant_id ON public.experiment_conversions(variant_id);
CREATE INDEX IF NOT EXISTS idx_experiment_conversions_conversion_name ON public.experiment_conversions(conversion_name);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_experiments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_experiments_updated_at
  BEFORE UPDATE ON public.experiments
  FOR EACH ROW
  EXECUTE FUNCTION update_experiments_updated_at();

-- RLS Policies
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_conversions ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir les expériences de leur organisation
CREATE POLICY "Users can view their organization's experiments"
  ON public.experiments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Policy: Les admins peuvent créer des expériences
CREATE POLICY "Admins can create experiments"
  ON public.experiments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND organization_id = public.experiments.organization_id
      AND role IN ('super_admin', 'admin')
    )
  );

-- Policy: Les admins peuvent mettre à jour les expériences
CREATE POLICY "Admins can update experiments"
  ON public.experiments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND organization_id = public.experiments.organization_id
      AND role IN ('super_admin', 'admin')
    )
  );

-- Policy: Les utilisateurs peuvent voir leurs propres assignations
CREATE POLICY "Users can view their own assignments"
  ON public.experiment_assignments FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Le système peut créer des assignations (via service role)
CREATE POLICY "System can create assignments"
  ON public.experiment_assignments FOR INSERT
  WITH CHECK (true); -- RLS sera géré par le service

-- Policy: Les utilisateurs peuvent voir leurs propres conversions
CREATE POLICY "Users can view their own conversions"
  ON public.experiment_conversions FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Le système peut créer des conversions (via service role)
CREATE POLICY "System can create conversions"
  ON public.experiment_conversions FOR INSERT
  WITH CHECK (true); -- RLS sera géré par le service

-- Commentaires
COMMENT ON TABLE public.experiments IS 'Expériences A/B pour tester différentes variantes de fonctionnalités';
COMMENT ON TABLE public.experiment_assignments IS 'Assignations des utilisateurs aux variantes d''expériences';
COMMENT ON TABLE public.experiment_conversions IS 'Conversions trackées pour les expériences A/B';
COMMENT ON COLUMN public.experiments.variants IS 'Array JSON des variantes avec leurs poids et configurations';
COMMENT ON COLUMN public.experiments.traffic_allocation IS 'Pourcentage de trafic à inclure dans l''expérience (0-100)';
COMMENT ON COLUMN public.experiment_conversions.value IS 'Valeur numérique de la conversion (ex: montant d''un achat)';

