-- Migration pour le module CPF (Compte Personnel de Formation)
-- Intégration avec Mon Compte Formation pour les organismes de formation en France

-- 1. Table des configurations CPF
CREATE TABLE IF NOT EXISTS public.cpf_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cpf_provider_number VARCHAR(100) UNIQUE, -- Numéro d'habilitation CPF
  provider_name TEXT NOT NULL,
  siret_number VARCHAR(14) NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  api_endpoint TEXT DEFAULT 'https://api.moncompteformation.gouv.fr',
  is_active BOOLEAN DEFAULT true,
  last_sync_date TIMESTAMPTZ,
  sync_frequency VARCHAR(50) DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- 2. Table des droits CPF des stagiaires
CREATE TABLE IF NOT EXISTS public.cpf_learner_rights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cpf_account_number VARCHAR(50), -- Numéro de compte CPF
  total_credits DECIMAL(10, 2) DEFAULT 0, -- Crédits CPF totaux (en euros)
  available_credits DECIMAL(10, 2) DEFAULT 0, -- Crédits disponibles
  used_credits DECIMAL(10, 2) DEFAULT 0, -- Crédits utilisés
  last_sync_date TIMESTAMPTZ,
  sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
  sync_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, learner_id)
);

-- 3. Table des formations éligibles CPF
CREATE TABLE IF NOT EXISTS public.cpf_eligible_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  cpf_training_code VARCHAR(50), -- Code CPF de la formation
  cpf_training_title TEXT NOT NULL,
  rncp_code VARCHAR(20), -- Code RNCP si applicable
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  duration_hours INTEGER,
  duration_days INTEGER,
  certification_level VARCHAR(50), -- Niveau de certification (ex: Niveau 3, Niveau 4)
  eligibility_status VARCHAR(50) DEFAULT 'pending' CHECK (eligibility_status IN ('pending', 'eligible', 'rejected', 'expired')),
  eligibility_date DATE,
  eligibility_end_date DATE,
  cpf_funding_rate DECIMAL(5, 2) DEFAULT 100 CHECK (cpf_funding_rate >= 0 AND cpf_funding_rate <= 100), -- Pourcentage financé par CPF
  max_learners INTEGER,
  current_learners INTEGER DEFAULT 0,
  description TEXT,
  prerequisites TEXT,
  learning_objectives TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des inscriptions CPF
CREATE TABLE IF NOT EXISTS public.cpf_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.cpf_eligible_trainings(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'cancelled', 'rejected')),
  cpf_funding_amount DECIMAL(10, 2) NOT NULL, -- Montant financé par CPF
  learner_contribution DECIMAL(10, 2) DEFAULT 0, -- Participation financière du stagiaire
  total_amount DECIMAL(10, 2) NOT NULL,
  cpf_transaction_id VARCHAR(100), -- ID de transaction CPF
  cpf_attestation_number VARCHAR(100), -- Numéro d'attestation CPF
  attestation_date DATE,
  attestation_file_url TEXT,
  completion_certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des attestations CPF
CREATE TABLE IF NOT EXISTS public.cpf_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.cpf_enrollments(id) ON DELETE CASCADE,
  attestation_number VARCHAR(100) UNIQUE NOT NULL,
  attestation_type VARCHAR(50) NOT NULL CHECK (attestation_type IN ('enrollment', 'attendance', 'completion', 'partial_completion')),
  issue_date DATE NOT NULL,
  validity_start_date DATE,
  validity_end_date DATE,
  file_url TEXT,
  file_hash VARCHAR(64), -- Hash pour vérification d'intégrité
  status VARCHAR(50) DEFAULT 'issued' CHECK (status IN ('issued', 'validated', 'rejected', 'expired')),
  validation_date DATE,
  validated_by UUID REFERENCES public.users(id),
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table des financements CPF
CREATE TABLE IF NOT EXISTS public.cpf_fundings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES public.cpf_enrollments(id) ON DELETE CASCADE,
  funding_type VARCHAR(50) NOT NULL CHECK (funding_type IN ('cpf_full', 'cpf_partial', 'opco', 'pôle_emploi', 'mixed')),
  cpf_amount DECIMAL(10, 2) DEFAULT 0,
  other_funding_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid', 'rejected', 'cancelled')),
  payment_date DATE,
  payment_reference VARCHAR(100),
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des synchronisations CPF
CREATE TABLE IF NOT EXISTS public.cpf_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('rights', 'enrollments', 'attestations', 'trainings', 'full')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'partial')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table des rapports CPF
CREATE TABLE IF NOT EXISTS public.cpf_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('enrollments', 'fundings', 'attestations', 'learners', 'trainings', 'annual')),
  period_start DATE,
  period_end DATE,
  total_enrollments INTEGER DEFAULT 0,
  total_fundings DECIMAL(10, 2) DEFAULT 0,
  total_cpf_fundings DECIMAL(10, 2) DEFAULT 0,
  total_attestations INTEGER DEFAULT 0,
  summary JSONB DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES public.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_cpf_configurations_org ON public.cpf_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpf_learner_rights_org ON public.cpf_learner_rights(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpf_learner_rights_learner ON public.cpf_learner_rights(learner_id);
CREATE INDEX IF NOT EXISTS idx_cpf_eligible_trainings_org ON public.cpf_eligible_trainings(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpf_eligible_trainings_status ON public.cpf_eligible_trainings(eligibility_status);
CREATE INDEX IF NOT EXISTS idx_cpf_enrollments_org ON public.cpf_enrollments(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpf_enrollments_learner ON public.cpf_enrollments(learner_id);
CREATE INDEX IF NOT EXISTS idx_cpf_enrollments_training ON public.cpf_enrollments(training_id);
CREATE INDEX IF NOT EXISTS idx_cpf_enrollments_status ON public.cpf_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_cpf_attestations_enrollment ON public.cpf_attestations(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_cpf_attestations_number ON public.cpf_attestations(attestation_number);
CREATE INDEX IF NOT EXISTS idx_cpf_fundings_enrollment ON public.cpf_fundings(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_cpf_sync_logs_org ON public.cpf_sync_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpf_sync_logs_status ON public.cpf_sync_logs(status);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_cpf_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_cpf_configurations_updated_at
  BEFORE UPDATE ON public.cpf_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_cpf_learner_rights_updated_at
  BEFORE UPDATE ON public.cpf_learner_rights
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_cpf_eligible_trainings_updated_at
  BEFORE UPDATE ON public.cpf_eligible_trainings
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_cpf_enrollments_updated_at
  BEFORE UPDATE ON public.cpf_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_cpf_attestations_updated_at
  BEFORE UPDATE ON public.cpf_attestations
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

CREATE TRIGGER update_cpf_fundings_updated_at
  BEFORE UPDATE ON public.cpf_fundings
  FOR EACH ROW
  EXECUTE FUNCTION update_cpf_updated_at();

-- RLS Policies
ALTER TABLE public.cpf_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_learner_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_eligible_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_fundings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_reports ENABLE ROW LEVEL SECURITY;

-- Policies pour cpf_configurations
CREATE POLICY "Users can view CPF config of their organization"
  ON public.cpf_configurations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage CPF config"
  ON public.cpf_configurations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('super_admin', 'admin')
    )
  );

-- Policies similaires pour les autres tables
CREATE POLICY "Users can view CPF learner rights of their organization"
  ON public.cpf_learner_rights FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Learners can view their own CPF rights"
  ON public.cpf_learner_rights FOR SELECT
  USING (learner_id = auth.uid());

-- Commentaires
COMMENT ON TABLE public.cpf_configurations IS 'Configuration CPF pour l''intégration avec Mon Compte Formation';
COMMENT ON TABLE public.cpf_learner_rights IS 'Droits CPF des stagiaires (crédits disponibles)';
COMMENT ON TABLE public.cpf_eligible_trainings IS 'Formations éligibles au financement CPF';
COMMENT ON TABLE public.cpf_enrollments IS 'Inscriptions aux formations CPF';
COMMENT ON TABLE public.cpf_attestations IS 'Attestations CPF générées';
COMMENT ON TABLE public.cpf_fundings IS 'Financements CPF et autres financements';
COMMENT ON TABLE public.cpf_sync_logs IS 'Logs de synchronisation avec l''API Mon Compte Formation';
COMMENT ON TABLE public.cpf_reports IS 'Rapports CPF générés automatiquement';

