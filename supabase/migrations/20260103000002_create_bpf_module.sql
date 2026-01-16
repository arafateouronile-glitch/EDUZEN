-- =====================================================
-- EDUZEN - Module Bilan Pédagogique et Financier (BPF)
-- =====================================================
-- Description: Module pour le rapport annuel obligatoire des Organismes de Formation
-- Date: 2026-01-03
-- Author: EDUZEN Team
-- =====================================================

-- =====================================================
-- 1. TABLE: bpf_reports
-- Rapports BPF annuels
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bpf_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Année fiscale
  year INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'in_progress', 'completed', 'submitted'

  -- ===== DONNÉES FINANCIÈRES =====
  -- Chiffre d'affaires total et répartition par source de financement
  total_revenue DECIMAL(15,2) DEFAULT 0,
  revenue_cpf DECIMAL(15,2) DEFAULT 0, -- Mon Compte Formation
  revenue_opco DECIMAL(15,2) DEFAULT 0, -- Opérateurs de compétences
  revenue_companies DECIMAL(15,2) DEFAULT 0, -- Entreprises
  revenue_individuals DECIMAL(15,2) DEFAULT 0, -- Particuliers
  revenue_pole_emploi DECIMAL(15,2) DEFAULT 0, -- Pôle Emploi
  revenue_regions DECIMAL(15,2) DEFAULT 0, -- Régions
  revenue_state DECIMAL(15,2) DEFAULT 0, -- État
  revenue_other DECIMAL(15,2) DEFAULT 0, -- Autres

  -- ===== DONNÉES PÉDAGOGIQUES =====
  -- Stagiaires
  total_students INTEGER DEFAULT 0, -- Nombre total de stagiaires
  students_men INTEGER DEFAULT 0, -- Hommes
  students_women INTEGER DEFAULT 0, -- Femmes
  students_under_26 INTEGER DEFAULT 0, -- Moins de 26 ans
  students_over_45 INTEGER DEFAULT 0, -- Plus de 45 ans
  students_disabled INTEGER DEFAULT 0, -- En situation de handicap

  -- Heures de formation
  total_training_hours DECIMAL(10,2) DEFAULT 0, -- Heures totales dispensées
  total_trainee_hours DECIMAL(15,2) DEFAULT 0, -- Heures x stagiaires

  -- Programmes et actions
  total_programs INTEGER DEFAULT 0, -- Nombre de formations différentes
  total_sessions INTEGER DEFAULT 0, -- Nombre de sessions réalisées

  -- Taux de performance
  success_rate DECIMAL(5,2), -- Taux de réussite (%)
  completion_rate DECIMAL(5,2), -- Taux d'achèvement (%)
  employment_rate DECIMAL(5,2), -- Taux d'insertion professionnelle (%)
  satisfaction_rate DECIMAL(5,2), -- Taux de satisfaction (%)

  -- ===== MOYENS DE L'OF =====
  -- Formateurs
  total_trainers INTEGER DEFAULT 0, -- Nombre total de formateurs
  permanent_trainers INTEGER DEFAULT 0, -- Formateurs permanents
  freelance_trainers INTEGER DEFAULT 0, -- Formateurs externes/vacataires
  trainer_hours DECIMAL(10,2) DEFAULT 0, -- Heures formateurs

  -- Locaux et équipements
  training_locations INTEGER DEFAULT 0, -- Nombre de sites de formation
  owned_locations INTEGER DEFAULT 0, -- Sites en propriété
  rented_locations INTEGER DEFAULT 0, -- Sites en location
  total_capacity INTEGER DEFAULT 0, -- Capacité d'accueil totale

  -- Sous-traitance
  subcontracting_amount DECIMAL(15,2) DEFAULT 0, -- Montant de sous-traitance

  -- ===== MÉTADONNÉES =====
  generated_at TIMESTAMPTZ,
  generated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Données complètes au format JSON pour export
  report_data JSONB DEFAULT '{}'::jsonb,

  -- Notes et commentaires
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte unicité: un seul rapport par organisation et année
  UNIQUE(organization_id, year)
);

COMMENT ON TABLE public.bpf_reports IS 'Bilan Pédagogique et Financier annuel des Organismes de Formation';
COMMENT ON COLUMN public.bpf_reports.year IS 'Année fiscale du rapport (ex: 2024)';
COMMENT ON COLUMN public.bpf_reports.total_trainee_hours IS 'Heures x stagiaires (ex: 10 stagiaires x 35h = 350h)';

CREATE INDEX idx_bpf_reports_org_year ON public.bpf_reports(organization_id, year);
CREATE INDEX idx_bpf_reports_status ON public.bpf_reports(status);
CREATE INDEX idx_bpf_reports_submitted ON public.bpf_reports(submitted_at);

-- =====================================================
-- 2. TABLE: bpf_training_domains
-- Répartition par domaine de formation (NSF/FORMACODE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bpf_training_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bpf_report_id UUID NOT NULL REFERENCES public.bpf_reports(id) ON DELETE CASCADE,

  -- Code et libellé du domaine
  domain_code VARCHAR(10), -- Code NSF (ex: 324) ou FORMACODE (ex: 31054)
  domain_name VARCHAR(200) NOT NULL,
  domain_category VARCHAR(100), -- Catégorie principale

  -- Métriques
  students_count INTEGER DEFAULT 0,
  training_hours DECIMAL(10,2) DEFAULT 0,
  revenue DECIMAL(15,2) DEFAULT 0,
  programs_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.bpf_training_domains IS 'Répartition des activités par domaine de formation';
COMMENT ON COLUMN public.bpf_training_domains.domain_code IS 'Code NSF ou FORMACODE du domaine';

CREATE INDEX idx_bpf_training_domains_report ON public.bpf_training_domains(bpf_report_id);
CREATE INDEX idx_bpf_training_domains_code ON public.bpf_training_domains(domain_code);

-- =====================================================
-- 3. TABLE: bpf_monthly_snapshots
-- Snapshots mensuels pour calcul annuel automatique
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bpf_monthly_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Date du snapshot (premier jour du mois)
  snapshot_date DATE NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),

  -- Métriques du mois
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Calculé automatiquement
  auto_generated BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, snapshot_date)
);

COMMENT ON TABLE public.bpf_monthly_snapshots IS 'Snapshots mensuels des métriques pour calcul BPF automatique';
COMMENT ON COLUMN public.bpf_monthly_snapshots.metrics IS 'Toutes les métriques du mois au format JSON';

CREATE INDEX idx_bpf_snapshots_org_date ON public.bpf_monthly_snapshots(organization_id, snapshot_date);
CREATE INDEX idx_bpf_snapshots_year ON public.bpf_monthly_snapshots(year);

-- =====================================================
-- 4. FONCTIONS SQL
-- =====================================================

-- Fonction pour calculer les métriques BPF d'une année
CREATE OR REPLACE FUNCTION calculate_bpf_metrics(
  org_id UUID,
  year_val INTEGER
)
RETURNS JSONB AS $$
DECLARE
  metrics JSONB := '{}'::jsonb;
  start_date DATE := (year_val || '-01-01')::DATE;
  end_date DATE := (year_val || '-12-31')::DATE;
  student_count INTEGER := 0;
  training_hours_sum NUMERIC := 0;
  revenue_sum NUMERIC := 0;
  program_count INTEGER := 0;
  session_count INTEGER := 0;
BEGIN
  -- Calcul des stagiaires (avec gestion d'erreur si table n'existe pas)
  BEGIN
    SELECT COUNT(DISTINCT s.id) INTO student_count
    FROM students s
    JOIN enrollments e ON e.student_id = s.id
    JOIN sessions sess ON sess.id = e.session_id
    WHERE s.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date;
  EXCEPTION
    WHEN undefined_table THEN
      student_count := 0;
  END;
  metrics := jsonb_set(metrics, '{total_students}', to_jsonb(student_count));

  -- Calcul des heures de formation
  BEGIN
    SELECT COALESCE(SUM(p.duration_hours), 0) INTO training_hours_sum
    FROM sessions sess
    JOIN programs p ON p.id = sess.program_id
    WHERE sess.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date
    AND sess.status = 'completed';
  EXCEPTION
    WHEN undefined_table THEN
      training_hours_sum := 0;
  END;
  metrics := jsonb_set(metrics, '{total_training_hours}', to_jsonb(training_hours_sum));

  -- Calcul du CA total
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO revenue_sum
    FROM payments
    WHERE organization_id = org_id
    AND payment_date >= start_date
    AND payment_date <= end_date
    AND status = 'completed';
  EXCEPTION
    WHEN undefined_table THEN
      revenue_sum := 0;
  END;
  metrics := jsonb_set(metrics, '{total_revenue}', to_jsonb(revenue_sum));

  -- Nombre de programmes
  BEGIN
    SELECT COUNT(DISTINCT program_id) INTO program_count
    FROM sessions
    WHERE organization_id = org_id
    AND start_date >= start_date
    AND start_date <= end_date;
  EXCEPTION
    WHEN undefined_table THEN
      program_count := 0;
  END;
  metrics := jsonb_set(metrics, '{total_programs}', to_jsonb(program_count));

  -- Nombre de sessions
  BEGIN
    SELECT COUNT(*) INTO session_count
    FROM sessions
    WHERE organization_id = org_id
    AND start_date >= start_date
    AND start_date <= end_date;
  EXCEPTION
    WHEN undefined_table THEN
      session_count := 0;
  END;
  metrics := jsonb_set(metrics, '{total_sessions}', to_jsonb(session_count));

  RETURN metrics;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_bpf_metrics IS 'Calcule automatiquement les métriques BPF pour une année donnée';

-- Fonction pour générer un snapshot mensuel
CREATE OR REPLACE FUNCTION generate_monthly_bpf_snapshot(
  org_id UUID,
  month_date DATE
)
RETURNS VOID AS $$
DECLARE
  year_val INTEGER := EXTRACT(YEAR FROM month_date);
  month_val INTEGER := EXTRACT(MONTH FROM month_date);
  snapshot_data JSONB;
BEGIN
  -- Calculer les métriques du mois
  snapshot_data := calculate_bpf_metrics(org_id, year_val);

  -- Insérer ou mettre à jour le snapshot
  INSERT INTO public.bpf_monthly_snapshots (
    organization_id,
    snapshot_date,
    year,
    month,
    metrics
  ) VALUES (
    org_id,
    month_date,
    year_val,
    month_val,
    snapshot_data
  )
  ON CONFLICT (organization_id, snapshot_date)
  DO UPDATE SET
    metrics = EXCLUDED.metrics,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_monthly_bpf_snapshot IS 'Génère un snapshot mensuel des métriques BPF';

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_bpf_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bpf_reports_updated_at
  BEFORE UPDATE ON public.bpf_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_bpf_updated_at();

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

ALTER TABLE public.bpf_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpf_training_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpf_monthly_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies pour bpf_reports
CREATE POLICY "Users can view BPF reports from their org"
  ON public.bpf_reports FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage BPF reports"
  ON public.bpf_reports FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'super_admin', 'accountant')
    )
  );

-- Policies pour bpf_training_domains
CREATE POLICY "Users can view BPF domains from their org"
  ON public.bpf_training_domains FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bpf_reports
      WHERE id = bpf_report_id
      AND organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage BPF domains"
  ON public.bpf_training_domains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bpf_reports br
      JOIN public.users u ON u.organization_id = br.organization_id
      WHERE br.id = bpf_report_id
      AND u.id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('admin', 'super_admin', 'accountant')
      )
    )
  );

-- Policies pour bpf_monthly_snapshots
CREATE POLICY "Users can view snapshots from their org"
  ON public.bpf_monthly_snapshots FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can manage snapshots"
  ON public.bpf_monthly_snapshots FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );
