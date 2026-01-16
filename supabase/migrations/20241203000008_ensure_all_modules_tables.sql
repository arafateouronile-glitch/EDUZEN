-- Migration de sécurité pour s'assurer que toutes les tables des modules OPCO, CPF et Qualiopi existent
-- Cette migration garantit la création des tables même si les migrations précédentes n'ont pas été appliquées

-- ============================================
-- MODULE OPCO
-- ============================================

-- Table des configurations OPCO
CREATE TABLE IF NOT EXISTS public.opco_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_name VARCHAR(100) NOT NULL,
  opco_code VARCHAR(50),
  siret_number VARCHAR(14) NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  api_endpoint TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_date TIMESTAMPTZ,
  sync_frequency VARCHAR(50) DEFAULT 'daily' CHECK (sync_frequency IN ('hourly', 'daily', 'weekly', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, opco_code)
);

-- Table des conventions OPCO
CREATE TABLE IF NOT EXISTS public.opco_conventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  convention_number VARCHAR(100) UNIQUE NOT NULL,
  convention_type VARCHAR(50) NOT NULL CHECK (convention_type IN ('apprentissage', 'pro_a', 'afest', 'vae', 'other')),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'pending', 'active', 'suspended', 'terminated')),
  funding_rate DECIMAL(5, 2) DEFAULT 100 CHECK (funding_rate >= 0 AND funding_rate <= 100),
  max_funding_amount DECIMAL(10, 2),
  used_funding_amount DECIMAL(10, 2) DEFAULT 0,
  remaining_funding_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des déclarations OPCO
CREATE TABLE IF NOT EXISTS public.opco_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  convention_id UUID REFERENCES public.opco_conventions(id) ON DELETE SET NULL,
  declaration_type VARCHAR(50) NOT NULL CHECK (declaration_type IN ('activity', 'funding_request', 'completion', 'payment', 'annual')),
  declaration_period_start DATE NOT NULL,
  declaration_period_end DATE NOT NULL,
  declaration_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'validated', 'rejected', 'paid', 'cancelled')),
  total_trainees INTEGER DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,
  requested_funding DECIMAL(10, 2) DEFAULT 0,
  approved_funding DECIMAL(10, 2) DEFAULT 0,
  paid_funding DECIMAL(10, 2) DEFAULT 0,
  opco_reference VARCHAR(100),
  submission_date TIMESTAMPTZ,
  validation_date TIMESTAMPTZ,
  payment_date DATE,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des demandes de financement OPCO
CREATE TABLE IF NOT EXISTS public.opco_funding_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  convention_id UUID REFERENCES public.opco_conventions(id) ON DELETE SET NULL,
  request_number VARCHAR(100) UNIQUE,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('training', 'equipment', 'consulting', 'other')),
  training_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  requested_amount DECIMAL(10, 2) NOT NULL,
  approved_amount DECIMAL(10, 2) DEFAULT 0,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'paid', 'cancelled')),
  submission_date DATE,
  approval_date DATE,
  payment_date DATE,
  rejection_reason TEXT,
  opco_reference VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MODULE CPF
-- ============================================

-- Table des formations éligibles CPF
CREATE TABLE IF NOT EXISTS public.cpf_eligible_trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  cpf_training_code VARCHAR(50),
  cpf_training_title TEXT NOT NULL,
  rncp_code VARCHAR(20),
  price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  duration_hours INTEGER,
  duration_days INTEGER,
  certification_level VARCHAR(50),
  eligibility_status VARCHAR(50) DEFAULT 'pending' CHECK (eligibility_status IN ('pending', 'eligible', 'rejected', 'expired')),
  eligibility_date DATE,
  eligibility_end_date DATE,
  cpf_funding_rate DECIMAL(5, 2) DEFAULT 100 CHECK (cpf_funding_rate >= 0 AND cpf_funding_rate <= 100),
  max_learners INTEGER,
  current_learners INTEGER DEFAULT 0,
  description TEXT,
  prerequisites TEXT,
  learning_objectives TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des inscriptions CPF
CREATE TABLE IF NOT EXISTS public.cpf_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.cpf_eligible_trainings(id) ON DELETE CASCADE,
  enrollment_date DATE NOT NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'cancelled', 'rejected')),
  cpf_funding_amount DECIMAL(10, 2) NOT NULL,
  learner_contribution DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL,
  cpf_transaction_id VARCHAR(100),
  cpf_attestation_number VARCHAR(100),
  attestation_date DATE,
  attestation_file_url TEXT,
  completion_certificate_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MODULE QUALIOPI
-- ============================================

-- Table des indicateurs Qualiopi
CREATE TABLE IF NOT EXISTS public.qualiopi_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  indicator_code VARCHAR(50) NOT NULL,
  indicator_name TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'compliant', 'non_compliant', 'needs_improvement')),
  compliance_rate DECIMAL(5, 2) DEFAULT 0 CHECK (compliance_rate >= 0 AND compliance_rate <= 100),
  last_evaluation_date TIMESTAMPTZ,
  next_evaluation_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, indicator_code)
);

-- ============================================
-- INDEX POUR PERFORMANCE
-- ============================================

-- Index OPCO
CREATE INDEX IF NOT EXISTS idx_opco_configurations_org ON public.opco_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_conventions_org ON public.opco_conventions(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_conventions_status ON public.opco_conventions(status);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_org ON public.opco_declarations(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_status ON public.opco_declarations(status);
CREATE INDEX IF NOT EXISTS idx_opco_funding_requests_org ON public.opco_funding_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_funding_requests_status ON public.opco_funding_requests(status);

-- Index CPF
CREATE INDEX IF NOT EXISTS idx_cpf_eligible_trainings_org ON public.cpf_eligible_trainings(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpf_eligible_trainings_status ON public.cpf_eligible_trainings(eligibility_status);
CREATE INDEX IF NOT EXISTS idx_cpf_enrollments_org ON public.cpf_enrollments(organization_id);
CREATE INDEX IF NOT EXISTS idx_cpf_enrollments_learner ON public.cpf_enrollments(learner_id);
CREATE INDEX IF NOT EXISTS idx_cpf_enrollments_training ON public.cpf_enrollments(training_id);
CREATE INDEX IF NOT EXISTS idx_cpf_enrollments_status ON public.cpf_enrollments(status);

-- Index Qualiopi
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_org ON public.qualiopi_indicators(organization_id);
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_status ON public.qualiopi_indicators(status);
CREATE INDEX IF NOT EXISTS idx_qualiopi_indicators_category ON public.qualiopi_indicators(category);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.opco_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_conventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_funding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_eligible_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpf_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualiopi_indicators ENABLE ROW LEVEL SECURITY;

-- Policies OPCO - Les utilisateurs peuvent voir les données de leur organisation
DO $$
BEGIN
  -- Policies pour opco_conventions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'opco_conventions' 
    AND policyname = 'Users can view OPCO conventions of their organization'
  ) THEN
    CREATE POLICY "Users can view OPCO conventions of their organization"
      ON public.opco_conventions FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
      );
  END IF;

  -- Policies pour opco_declarations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'opco_declarations' 
    AND policyname = 'Users can view OPCO declarations of their organization'
  ) THEN
    CREATE POLICY "Users can view OPCO declarations of their organization"
      ON public.opco_declarations FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
      );
  END IF;

  -- Policies pour opco_funding_requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'opco_funding_requests' 
    AND policyname = 'Users can view OPCO funding requests of their organization'
  ) THEN
    CREATE POLICY "Users can view OPCO funding requests of their organization"
      ON public.opco_funding_requests FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
      );
  END IF;

  -- Policies pour cpf_eligible_trainings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'cpf_eligible_trainings' 
    AND policyname = 'Users can view CPF eligible trainings of their organization'
  ) THEN
    CREATE POLICY "Users can view CPF eligible trainings of their organization"
      ON public.cpf_eligible_trainings FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
      );
  END IF;

  -- Policies pour cpf_enrollments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'cpf_enrollments' 
    AND policyname = 'Users can view CPF enrollments of their organization'
  ) THEN
    CREATE POLICY "Users can view CPF enrollments of their organization"
      ON public.cpf_enrollments FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
      );
  END IF;

  -- Policies pour qualiopi_indicators
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'qualiopi_indicators' 
    AND policyname = 'Users can view Qualiopi indicators of their organization'
  ) THEN
    CREATE POLICY "Users can view Qualiopi indicators of their organization"
      ON public.qualiopi_indicators FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE public.opco_configurations IS 'Configuration OPCO pour l''intégration avec les opérateurs de compétences';
COMMENT ON TABLE public.opco_conventions IS 'Conventions signées avec les OPCO';
COMMENT ON TABLE public.opco_declarations IS 'Déclarations d''activité et demandes de financement OPCO';
COMMENT ON TABLE public.opco_funding_requests IS 'Demandes de financement OPCO';
COMMENT ON TABLE public.cpf_eligible_trainings IS 'Formations éligibles au financement CPF';
COMMENT ON TABLE public.cpf_enrollments IS 'Inscriptions aux formations CPF';
COMMENT ON TABLE public.qualiopi_indicators IS 'Indicateurs Qualiopi pour la certification qualité';













