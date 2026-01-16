-- Migration pour le module OPCO (Opérateurs de Compétences)
-- Gestion des déclarations et financements OPCO pour les organismes de formation en France

-- 1. Table des configurations OPCO
CREATE TABLE IF NOT EXISTS public.opco_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_name VARCHAR(100) NOT NULL, -- Ex: AFDAS, OPCO 2i, etc.
  opco_code VARCHAR(50), -- Code OPCO
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

-- 2. Table des conventions OPCO
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

-- 3. Table des déclarations OPCO
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
  opco_reference VARCHAR(100), -- Référence OPCO de la déclaration
  submission_date TIMESTAMPTZ,
  validation_date TIMESTAMPTZ,
  payment_date DATE,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des lignes de déclaration (détails par formation/stagiaire)
CREATE TABLE IF NOT EXISTS public.opco_declaration_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES public.opco_declarations(id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  learner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  training_title TEXT NOT NULL,
  learner_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  total_hours DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2) NOT NULL,
  funding_rate DECIMAL(5, 2) DEFAULT 100,
  funding_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des demandes de financement OPCO
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

-- 6. Table des paiements OPCO
CREATE TABLE IF NOT EXISTS public.opco_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  declaration_id UUID REFERENCES public.opco_declarations(id) ON DELETE SET NULL,
  funding_request_id UUID REFERENCES public.opco_funding_requests(id) ON DELETE SET NULL,
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('declaration', 'funding_request', 'advance', 'refund')),
  payment_reference VARCHAR(100) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_date DATE NOT NULL,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'rejected', 'cancelled')),
  bank_reference VARCHAR(100),
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des synchronisations OPCO
CREATE TABLE IF NOT EXISTS public.opco_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('conventions', 'declarations', 'payments', 'funding_requests', 'full')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'partial')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table des rapports OPCO
CREATE TABLE IF NOT EXISTS public.opco_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('declarations', 'funding_requests', 'payments', 'conventions', 'annual')),
  period_start DATE,
  period_end DATE,
  total_declarations INTEGER DEFAULT 0,
  total_funding_requests INTEGER DEFAULT 0,
  total_requested_funding DECIMAL(10, 2) DEFAULT 0,
  total_approved_funding DECIMAL(10, 2) DEFAULT 0,
  total_paid_funding DECIMAL(10, 2) DEFAULT 0,
  total_trainees INTEGER DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  summary JSONB DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES public.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_opco_configurations_org ON public.opco_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_conventions_org ON public.opco_conventions(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_conventions_status ON public.opco_conventions(status);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_org ON public.opco_declarations(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_opco ON public.opco_declarations(opco_config_id);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_status ON public.opco_declarations(status);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_period ON public.opco_declarations(declaration_period_start, declaration_period_end);
CREATE INDEX IF NOT EXISTS idx_opco_declaration_lines_declaration ON public.opco_declaration_lines(declaration_id);
CREATE INDEX IF NOT EXISTS idx_opco_funding_requests_org ON public.opco_funding_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_funding_requests_status ON public.opco_funding_requests(status);
CREATE INDEX IF NOT EXISTS idx_opco_payments_org ON public.opco_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_payments_status ON public.opco_payments(status);
CREATE INDEX IF NOT EXISTS idx_opco_sync_logs_org ON public.opco_sync_logs(organization_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_opco_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_opco_configurations_updated_at
  BEFORE UPDATE ON public.opco_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_conventions_updated_at
  BEFORE UPDATE ON public.opco_conventions
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_declarations_updated_at
  BEFORE UPDATE ON public.opco_declarations
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_funding_requests_updated_at
  BEFORE UPDATE ON public.opco_funding_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_payments_updated_at
  BEFORE UPDATE ON public.opco_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

-- Fonction pour calculer le montant restant d'une convention
CREATE OR REPLACE FUNCTION calculate_opco_convention_remaining(conv_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  max_amount DECIMAL(10, 2);
  used_amount DECIMAL(10, 2);
  remaining DECIMAL(10, 2);
BEGIN
  SELECT max_funding_amount, used_funding_amount
  INTO max_amount, used_amount
  FROM public.opco_conventions
  WHERE id = conv_id;

  IF max_amount IS NULL THEN
    RETURN NULL;
  END IF;

  remaining := max_amount - COALESCE(used_amount, 0);
  RETURN GREATEST(remaining, 0);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.opco_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_conventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_declaration_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_funding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_reports ENABLE ROW LEVEL SECURITY;

-- Policies pour opco_configurations
CREATE POLICY "Users can view OPCO config of their organization"
  ON public.opco_configurations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage OPCO config"
  ON public.opco_configurations FOR ALL
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
CREATE POLICY "Users can view OPCO data of their organization"
  ON public.opco_conventions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage OPCO conventions"
  ON public.opco_conventions FOR ALL
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

-- Commentaires
COMMENT ON TABLE public.opco_configurations IS 'Configuration OPCO pour l''intégration avec les opérateurs de compétences';
COMMENT ON TABLE public.opco_conventions IS 'Conventions signées avec les OPCO';
COMMENT ON TABLE public.opco_declarations IS 'Déclarations d''activité et demandes de financement OPCO';
COMMENT ON TABLE public.opco_declaration_lines IS 'Lignes détaillées des déclarations OPCO (par formation/stagiaire)';
COMMENT ON TABLE public.opco_funding_requests IS 'Demandes de financement OPCO';
COMMENT ON TABLE public.opco_payments IS 'Paiements reçus des OPCO';
COMMENT ON TABLE public.opco_sync_logs IS 'Logs de synchronisation avec les APIs OPCO';
COMMENT ON TABLE public.opco_reports IS 'Rapports OPCO générés automatiquement';

-- Gestion des déclarations et financements OPCO pour les organismes de formation en France

-- 1. Table des configurations OPCO
CREATE TABLE IF NOT EXISTS public.opco_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_name VARCHAR(100) NOT NULL, -- Ex: AFDAS, OPCO 2i, etc.
  opco_code VARCHAR(50), -- Code OPCO
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

-- 2. Table des conventions OPCO
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

-- 3. Table des déclarations OPCO
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
  opco_reference VARCHAR(100), -- Référence OPCO de la déclaration
  submission_date TIMESTAMPTZ,
  validation_date TIMESTAMPTZ,
  payment_date DATE,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des lignes de déclaration (détails par formation/stagiaire)
CREATE TABLE IF NOT EXISTS public.opco_declaration_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES public.opco_declarations(id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  learner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  training_title TEXT NOT NULL,
  learner_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  total_hours DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2) NOT NULL,
  funding_rate DECIMAL(5, 2) DEFAULT 100,
  funding_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des demandes de financement OPCO
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

-- 6. Table des paiements OPCO
CREATE TABLE IF NOT EXISTS public.opco_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  declaration_id UUID REFERENCES public.opco_declarations(id) ON DELETE SET NULL,
  funding_request_id UUID REFERENCES public.opco_funding_requests(id) ON DELETE SET NULL,
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('declaration', 'funding_request', 'advance', 'refund')),
  payment_reference VARCHAR(100) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_date DATE NOT NULL,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'rejected', 'cancelled')),
  bank_reference VARCHAR(100),
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des synchronisations OPCO
CREATE TABLE IF NOT EXISTS public.opco_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('conventions', 'declarations', 'payments', 'funding_requests', 'full')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'partial')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table des rapports OPCO
CREATE TABLE IF NOT EXISTS public.opco_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('declarations', 'funding_requests', 'payments', 'conventions', 'annual')),
  period_start DATE,
  period_end DATE,
  total_declarations INTEGER DEFAULT 0,
  total_funding_requests INTEGER DEFAULT 0,
  total_requested_funding DECIMAL(10, 2) DEFAULT 0,
  total_approved_funding DECIMAL(10, 2) DEFAULT 0,
  total_paid_funding DECIMAL(10, 2) DEFAULT 0,
  total_trainees INTEGER DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  summary JSONB DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES public.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_opco_configurations_org ON public.opco_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_conventions_org ON public.opco_conventions(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_conventions_status ON public.opco_conventions(status);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_org ON public.opco_declarations(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_opco ON public.opco_declarations(opco_config_id);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_status ON public.opco_declarations(status);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_period ON public.opco_declarations(declaration_period_start, declaration_period_end);
CREATE INDEX IF NOT EXISTS idx_opco_declaration_lines_declaration ON public.opco_declaration_lines(declaration_id);
CREATE INDEX IF NOT EXISTS idx_opco_funding_requests_org ON public.opco_funding_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_funding_requests_status ON public.opco_funding_requests(status);
CREATE INDEX IF NOT EXISTS idx_opco_payments_org ON public.opco_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_payments_status ON public.opco_payments(status);
CREATE INDEX IF NOT EXISTS idx_opco_sync_logs_org ON public.opco_sync_logs(organization_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_opco_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_opco_configurations_updated_at
  BEFORE UPDATE ON public.opco_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_conventions_updated_at
  BEFORE UPDATE ON public.opco_conventions
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_declarations_updated_at
  BEFORE UPDATE ON public.opco_declarations
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_funding_requests_updated_at
  BEFORE UPDATE ON public.opco_funding_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_payments_updated_at
  BEFORE UPDATE ON public.opco_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

-- Fonction pour calculer le montant restant d'une convention
CREATE OR REPLACE FUNCTION calculate_opco_convention_remaining(conv_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  max_amount DECIMAL(10, 2);
  used_amount DECIMAL(10, 2);
  remaining DECIMAL(10, 2);
BEGIN
  SELECT max_funding_amount, used_funding_amount
  INTO max_amount, used_amount
  FROM public.opco_conventions
  WHERE id = conv_id;

  IF max_amount IS NULL THEN
    RETURN NULL;
  END IF;

  remaining := max_amount - COALESCE(used_amount, 0);
  RETURN GREATEST(remaining, 0);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.opco_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_conventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_declaration_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_funding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_reports ENABLE ROW LEVEL SECURITY;

-- Policies pour opco_configurations
CREATE POLICY "Users can view OPCO config of their organization"
  ON public.opco_configurations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage OPCO config"
  ON public.opco_configurations FOR ALL
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
CREATE POLICY "Users can view OPCO data of their organization"
  ON public.opco_conventions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage OPCO conventions"
  ON public.opco_conventions FOR ALL
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

-- Commentaires
COMMENT ON TABLE public.opco_configurations IS 'Configuration OPCO pour l''intégration avec les opérateurs de compétences';
COMMENT ON TABLE public.opco_conventions IS 'Conventions signées avec les OPCO';
COMMENT ON TABLE public.opco_declarations IS 'Déclarations d''activité et demandes de financement OPCO';
COMMENT ON TABLE public.opco_declaration_lines IS 'Lignes détaillées des déclarations OPCO (par formation/stagiaire)';
COMMENT ON TABLE public.opco_funding_requests IS 'Demandes de financement OPCO';
COMMENT ON TABLE public.opco_payments IS 'Paiements reçus des OPCO';
COMMENT ON TABLE public.opco_sync_logs IS 'Logs de synchronisation avec les APIs OPCO';
COMMENT ON TABLE public.opco_reports IS 'Rapports OPCO générés automatiquement';

-- Gestion des déclarations et financements OPCO pour les organismes de formation en France

-- 1. Table des configurations OPCO
CREATE TABLE IF NOT EXISTS public.opco_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_name VARCHAR(100) NOT NULL, -- Ex: AFDAS, OPCO 2i, etc.
  opco_code VARCHAR(50), -- Code OPCO
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

-- 2. Table des conventions OPCO
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

-- 3. Table des déclarations OPCO
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
  opco_reference VARCHAR(100), -- Référence OPCO de la déclaration
  submission_date TIMESTAMPTZ,
  validation_date TIMESTAMPTZ,
  payment_date DATE,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table des lignes de déclaration (détails par formation/stagiaire)
CREATE TABLE IF NOT EXISTS public.opco_declaration_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  declaration_id UUID NOT NULL REFERENCES public.opco_declarations(id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
  learner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  training_title TEXT NOT NULL,
  learner_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  total_hours DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2) NOT NULL,
  funding_rate DECIMAL(5, 2) DEFAULT 100,
  funding_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table des demandes de financement OPCO
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

-- 6. Table des paiements OPCO
CREATE TABLE IF NOT EXISTS public.opco_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  declaration_id UUID REFERENCES public.opco_declarations(id) ON DELETE SET NULL,
  funding_request_id UUID REFERENCES public.opco_funding_requests(id) ON DELETE SET NULL,
  payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('declaration', 'funding_request', 'advance', 'refund')),
  payment_reference VARCHAR(100) UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  payment_date DATE NOT NULL,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'rejected', 'cancelled')),
  bank_reference VARCHAR(100),
  invoice_number VARCHAR(100),
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Table des synchronisations OPCO
CREATE TABLE IF NOT EXISTS public.opco_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('conventions', 'declarations', 'payments', 'funding_requests', 'full')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'partial')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  records_synced INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Table des rapports OPCO
CREATE TABLE IF NOT EXISTS public.opco_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  opco_config_id UUID NOT NULL REFERENCES public.opco_configurations(id) ON DELETE CASCADE,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('declarations', 'funding_requests', 'payments', 'conventions', 'annual')),
  period_start DATE,
  period_end DATE,
  total_declarations INTEGER DEFAULT 0,
  total_funding_requests INTEGER DEFAULT 0,
  total_requested_funding DECIMAL(10, 2) DEFAULT 0,
  total_approved_funding DECIMAL(10, 2) DEFAULT 0,
  total_paid_funding DECIMAL(10, 2) DEFAULT 0,
  total_trainees INTEGER DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  summary JSONB DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES public.users(id),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_opco_configurations_org ON public.opco_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_conventions_org ON public.opco_conventions(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_conventions_status ON public.opco_conventions(status);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_org ON public.opco_declarations(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_opco ON public.opco_declarations(opco_config_id);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_status ON public.opco_declarations(status);
CREATE INDEX IF NOT EXISTS idx_opco_declarations_period ON public.opco_declarations(declaration_period_start, declaration_period_end);
CREATE INDEX IF NOT EXISTS idx_opco_declaration_lines_declaration ON public.opco_declaration_lines(declaration_id);
CREATE INDEX IF NOT EXISTS idx_opco_funding_requests_org ON public.opco_funding_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_funding_requests_status ON public.opco_funding_requests(status);
CREATE INDEX IF NOT EXISTS idx_opco_payments_org ON public.opco_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_opco_payments_status ON public.opco_payments(status);
CREATE INDEX IF NOT EXISTS idx_opco_sync_logs_org ON public.opco_sync_logs(organization_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_opco_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_opco_configurations_updated_at
  BEFORE UPDATE ON public.opco_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_conventions_updated_at
  BEFORE UPDATE ON public.opco_conventions
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_declarations_updated_at
  BEFORE UPDATE ON public.opco_declarations
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_funding_requests_updated_at
  BEFORE UPDATE ON public.opco_funding_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

CREATE TRIGGER update_opco_payments_updated_at
  BEFORE UPDATE ON public.opco_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_opco_updated_at();

-- Fonction pour calculer le montant restant d'une convention
CREATE OR REPLACE FUNCTION calculate_opco_convention_remaining(conv_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  max_amount DECIMAL(10, 2);
  used_amount DECIMAL(10, 2);
  remaining DECIMAL(10, 2);
BEGIN
  SELECT max_funding_amount, used_funding_amount
  INTO max_amount, used_amount
  FROM public.opco_conventions
  WHERE id = conv_id;

  IF max_amount IS NULL THEN
    RETURN NULL;
  END IF;

  remaining := max_amount - COALESCE(used_amount, 0);
  RETURN GREATEST(remaining, 0);
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.opco_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_conventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_declaration_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_funding_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opco_reports ENABLE ROW LEVEL SECURITY;

-- Policies pour opco_configurations
CREATE POLICY "Users can view OPCO config of their organization"
  ON public.opco_configurations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage OPCO config"
  ON public.opco_configurations FOR ALL
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
CREATE POLICY "Users can view OPCO data of their organization"
  ON public.opco_conventions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage OPCO conventions"
  ON public.opco_conventions FOR ALL
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

-- Commentaires
COMMENT ON TABLE public.opco_configurations IS 'Configuration OPCO pour l''intégration avec les opérateurs de compétences';
COMMENT ON TABLE public.opco_conventions IS 'Conventions signées avec les OPCO';
COMMENT ON TABLE public.opco_declarations IS 'Déclarations d''activité et demandes de financement OPCO';
COMMENT ON TABLE public.opco_declaration_lines IS 'Lignes détaillées des déclarations OPCO (par formation/stagiaire)';
COMMENT ON TABLE public.opco_funding_requests IS 'Demandes de financement OPCO';
COMMENT ON TABLE public.opco_payments IS 'Paiements reçus des OPCO';
COMMENT ON TABLE public.opco_sync_logs IS 'Logs de synchronisation avec les APIs OPCO';
COMMENT ON TABLE public.opco_reports IS 'Rapports OPCO générés automatiquement';

