-- Migration pour les rapports financiers détaillés (cashflow, prévisions)

-- 1. Table pour les catégories de dépenses
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- 2. Table pour les dépenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  expense_date DATE NOT NULL,
  payment_method TEXT, -- 'cash', 'bank_transfer', 'card', 'mobile_money', etc.
  vendor TEXT, -- Fournisseur
  invoice_number TEXT, -- Numéro de facture fournisseur
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Table pour les prévisions financières
CREATE TABLE IF NOT EXISTS public.financial_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  forecast_type TEXT NOT NULL, -- 'revenue', 'expense', 'cashflow'
  period_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Montants prévus
  forecasted_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  -- Montants réels (mis à jour automatiquement)
  actual_amount NUMERIC(10,2),
  -- Catégorie (pour les dépenses)
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  -- Métadonnées
  notes TEXT,
  confidence_level INTEGER DEFAULT 50, -- 0-100, niveau de confiance de la prévision
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4. Table pour les rapports financiers générés
CREATE TABLE IF NOT EXISTS public.financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'cashflow', 'income_statement', 'balance_sheet', 'forecast'
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Données du rapport (JSON)
  report_data JSONB NOT NULL,
  -- Métadonnées
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_url TEXT, -- URL du fichier PDF/Excel généré
  status TEXT DEFAULT 'draft', -- 'draft', 'final', 'archived'
  UNIQUE(organization_id, report_type, period_type, period_start, period_end)
);

-- 5. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON public.expenses(organization_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_org_period ON public.financial_forecasts(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_forecasts_type ON public.financial_forecasts(forecast_type, period_type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_org_period ON public.financial_reports(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON public.financial_reports(report_type, period_type);

-- 6. Fonction pour calculer le cashflow
CREATE OR REPLACE FUNCTION public.calculate_cashflow(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  period_date DATE,
  revenue NUMERIC,
  expenses NUMERIC,
  cashflow NUMERIC,
  cumulative_cashflow NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH daily_revenue AS (
    SELECT 
      DATE(p.paid_at) as period_date,
      COALESCE(SUM(p.amount), 0) as revenue
    FROM public.payments p
    WHERE p.organization_id = p_organization_id
      AND p.status = 'completed'
      AND DATE(p.paid_at) >= p_start_date
      AND DATE(p.paid_at) <= p_end_date
    GROUP BY DATE(p.paid_at)
  ),
  daily_expenses AS (
    SELECT 
      e.expense_date as period_date,
      COALESCE(SUM(e.amount), 0) as expenses
    FROM public.expenses e
    WHERE e.organization_id = p_organization_id
      AND e.expense_date >= p_start_date
      AND e.expense_date <= p_end_date
    GROUP BY e.expense_date
  ),
  daily_data AS (
    SELECT 
      COALESCE(r.period_date, e.period_date) as period_date,
      COALESCE(r.revenue, 0) as revenue,
      COALESCE(e.expenses, 0) as expenses,
      (COALESCE(r.revenue, 0) - COALESCE(e.expenses, 0)) as cashflow
    FROM daily_revenue r
    FULL OUTER JOIN daily_expenses e ON r.period_date = e.period_date
  ),
  with_cumulative AS (
    SELECT 
      period_date,
      revenue,
      expenses,
      cashflow,
      SUM(cashflow) OVER (ORDER BY period_date) as cumulative_cashflow
    FROM daily_data
  )
  SELECT 
    wc.period_date,
    wc.revenue,
    wc.expenses,
    wc.cashflow,
    wc.cumulative_cashflow
  FROM with_cumulative wc
  ORDER BY wc.period_date;
END;
$$;

-- 7. Fonction pour calculer les prévisions basées sur l'historique
CREATE OR REPLACE FUNCTION public.calculate_revenue_forecast(
  p_organization_id UUID,
  p_months_ahead INTEGER DEFAULT 3
)
RETURNS TABLE (
  forecast_month DATE,
  forecasted_revenue NUMERIC,
  confidence_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_monthly_revenue NUMERIC;
  v_trend NUMERIC;
  v_start_date DATE;
BEGIN
  -- Calculer la moyenne des revenus mensuels des 6 derniers mois
  SELECT 
    COALESCE(AVG(monthly_revenue), 0),
    COALESCE(
      (MAX(monthly_revenue) - MIN(monthly_revenue)) / NULLIF(COUNT(*), 0),
      0
    )
  INTO v_avg_monthly_revenue, v_trend
  FROM (
    SELECT 
      DATE_TRUNC('month', paid_at) as month,
      SUM(amount) as monthly_revenue
    FROM public.payments
    WHERE organization_id = p_organization_id
      AND status = 'completed'
      AND paid_at >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', paid_at)
  ) monthly_stats;

  -- Générer les prévisions pour les mois à venir
  v_start_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

  RETURN QUERY
  SELECT 
    (v_start_date + (generate_series(0, p_months_ahead - 1) || ' months')::INTERVAL)::DATE as forecast_month,
    ROUND(v_avg_monthly_revenue + (v_trend * generate_series(0, p_months_ahead - 1)), 2) as forecasted_revenue,
    CASE 
      WHEN generate_series(0, p_months_ahead - 1) <= 1 THEN 80
      WHEN generate_series(0, p_months_ahead - 1) <= 3 THEN 60
      ELSE 40
    END as confidence_level
  FROM generate_series(0, p_months_ahead - 1);
END;
$$;

-- 8. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_financial_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_expense_categories_timestamp ON public.expense_categories;
CREATE TRIGGER update_expense_categories_timestamp
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_timestamp();

DROP TRIGGER IF EXISTS update_expenses_timestamp ON public.expenses;
CREATE TRIGGER update_expenses_timestamp
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_timestamp();

DROP TRIGGER IF EXISTS update_financial_forecasts_timestamp ON public.financial_forecasts;
CREATE TRIGGER update_financial_forecasts_timestamp
  BEFORE UPDATE ON public.financial_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_timestamp();

-- 9. RLS Policies pour expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expense categories in their organization" ON public.expense_categories;
CREATE POLICY "Users can view expense categories in their organization"
  ON public.expense_categories
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage expense categories in their organization" ON public.expense_categories;
CREATE POLICY "Users can manage expense categories in their organization"
  ON public.expense_categories
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 10. RLS Policies pour expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expenses in their organization" ON public.expenses;
CREATE POLICY "Users can view expenses in their organization"
  ON public.expenses
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create expenses in their organization" ON public.expenses;
CREATE POLICY "Users can create expenses in their organization"
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update expenses in their organization" ON public.expenses;
CREATE POLICY "Users can update expenses in their organization"
  ON public.expenses
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete expenses in their organization" ON public.expenses;
CREATE POLICY "Users can delete expenses in their organization"
  ON public.expenses
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 11. RLS Policies pour financial_forecasts
ALTER TABLE public.financial_forecasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view forecasts in their organization" ON public.financial_forecasts;
CREATE POLICY "Users can view forecasts in their organization"
  ON public.financial_forecasts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage forecasts in their organization" ON public.financial_forecasts;
CREATE POLICY "Users can manage forecasts in their organization"
  ON public.financial_forecasts
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 12. RLS Policies pour financial_reports
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view financial reports in their organization" ON public.financial_reports;
CREATE POLICY "Users can view financial reports in their organization"
  ON public.financial_reports
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage financial reports in their organization" ON public.financial_reports;
CREATE POLICY "Users can manage financial reports in their organization"
  ON public.financial_reports
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 13. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_forecasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_reports TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_cashflow TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_revenue_forecast TO authenticated;

-- 14. Insérer des catégories de dépenses par défaut
INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Salaires',
  'SALARIES',
  'Salaires et charges sociales'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'SALARIES'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Loyer',
  'RENT',
  'Loyer et charges locatives'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'RENT'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Matériel pédagogique',
  'MATERIALS',
  'Achat de matériel pédagogique'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'MATERIALS'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Marketing',
  'MARKETING',
  'Dépenses marketing et publicité'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'MARKETING'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Autres',
  'OTHER',
  'Autres dépenses'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'OTHER'
)
ON CONFLICT DO NOTHING;


-- 1. Table pour les catégories de dépenses
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- 2. Table pour les dépenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  expense_date DATE NOT NULL,
  payment_method TEXT, -- 'cash', 'bank_transfer', 'card', 'mobile_money', etc.
  vendor TEXT, -- Fournisseur
  invoice_number TEXT, -- Numéro de facture fournisseur
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Table pour les prévisions financières
CREATE TABLE IF NOT EXISTS public.financial_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  forecast_type TEXT NOT NULL, -- 'revenue', 'expense', 'cashflow'
  period_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Montants prévus
  forecasted_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  -- Montants réels (mis à jour automatiquement)
  actual_amount NUMERIC(10,2),
  -- Catégorie (pour les dépenses)
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  -- Métadonnées
  notes TEXT,
  confidence_level INTEGER DEFAULT 50, -- 0-100, niveau de confiance de la prévision
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4. Table pour les rapports financiers générés
CREATE TABLE IF NOT EXISTS public.financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'cashflow', 'income_statement', 'balance_sheet', 'forecast'
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Données du rapport (JSON)
  report_data JSONB NOT NULL,
  -- Métadonnées
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_url TEXT, -- URL du fichier PDF/Excel généré
  status TEXT DEFAULT 'draft', -- 'draft', 'final', 'archived'
  UNIQUE(organization_id, report_type, period_type, period_start, period_end)
);

-- 5. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON public.expenses(organization_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_org_period ON public.financial_forecasts(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_forecasts_type ON public.financial_forecasts(forecast_type, period_type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_org_period ON public.financial_reports(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON public.financial_reports(report_type, period_type);

-- 6. Fonction pour calculer le cashflow
CREATE OR REPLACE FUNCTION public.calculate_cashflow(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  period_date DATE,
  revenue NUMERIC,
  expenses NUMERIC,
  cashflow NUMERIC,
  cumulative_cashflow NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH daily_revenue AS (
    SELECT 
      DATE(p.paid_at) as period_date,
      COALESCE(SUM(p.amount), 0) as revenue
    FROM public.payments p
    WHERE p.organization_id = p_organization_id
      AND p.status = 'completed'
      AND DATE(p.paid_at) >= p_start_date
      AND DATE(p.paid_at) <= p_end_date
    GROUP BY DATE(p.paid_at)
  ),
  daily_expenses AS (
    SELECT 
      e.expense_date as period_date,
      COALESCE(SUM(e.amount), 0) as expenses
    FROM public.expenses e
    WHERE e.organization_id = p_organization_id
      AND e.expense_date >= p_start_date
      AND e.expense_date <= p_end_date
    GROUP BY e.expense_date
  ),
  daily_data AS (
    SELECT 
      COALESCE(r.period_date, e.period_date) as period_date,
      COALESCE(r.revenue, 0) as revenue,
      COALESCE(e.expenses, 0) as expenses,
      (COALESCE(r.revenue, 0) - COALESCE(e.expenses, 0)) as cashflow
    FROM daily_revenue r
    FULL OUTER JOIN daily_expenses e ON r.period_date = e.period_date
  ),
  with_cumulative AS (
    SELECT 
      period_date,
      revenue,
      expenses,
      cashflow,
      SUM(cashflow) OVER (ORDER BY period_date) as cumulative_cashflow
    FROM daily_data
  )
  SELECT 
    wc.period_date,
    wc.revenue,
    wc.expenses,
    wc.cashflow,
    wc.cumulative_cashflow
  FROM with_cumulative wc
  ORDER BY wc.period_date;
END;
$$;

-- 7. Fonction pour calculer les prévisions basées sur l'historique
CREATE OR REPLACE FUNCTION public.calculate_revenue_forecast(
  p_organization_id UUID,
  p_months_ahead INTEGER DEFAULT 3
)
RETURNS TABLE (
  forecast_month DATE,
  forecasted_revenue NUMERIC,
  confidence_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_monthly_revenue NUMERIC;
  v_trend NUMERIC;
  v_start_date DATE;
BEGIN
  -- Calculer la moyenne des revenus mensuels des 6 derniers mois
  SELECT 
    COALESCE(AVG(monthly_revenue), 0),
    COALESCE(
      (MAX(monthly_revenue) - MIN(monthly_revenue)) / NULLIF(COUNT(*), 0),
      0
    )
  INTO v_avg_monthly_revenue, v_trend
  FROM (
    SELECT 
      DATE_TRUNC('month', paid_at) as month,
      SUM(amount) as monthly_revenue
    FROM public.payments
    WHERE organization_id = p_organization_id
      AND status = 'completed'
      AND paid_at >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', paid_at)
  ) monthly_stats;

  -- Générer les prévisions pour les mois à venir
  v_start_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

  RETURN QUERY
  SELECT 
    (v_start_date + (generate_series(0, p_months_ahead - 1) || ' months')::INTERVAL)::DATE as forecast_month,
    ROUND(v_avg_monthly_revenue + (v_trend * generate_series(0, p_months_ahead - 1)), 2) as forecasted_revenue,
    CASE 
      WHEN generate_series(0, p_months_ahead - 1) <= 1 THEN 80
      WHEN generate_series(0, p_months_ahead - 1) <= 3 THEN 60
      ELSE 40
    END as confidence_level
  FROM generate_series(0, p_months_ahead - 1);
END;
$$;

-- 8. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_financial_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_expense_categories_timestamp ON public.expense_categories;
CREATE TRIGGER update_expense_categories_timestamp
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_timestamp();

DROP TRIGGER IF EXISTS update_expenses_timestamp ON public.expenses;
CREATE TRIGGER update_expenses_timestamp
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_timestamp();

DROP TRIGGER IF EXISTS update_financial_forecasts_timestamp ON public.financial_forecasts;
CREATE TRIGGER update_financial_forecasts_timestamp
  BEFORE UPDATE ON public.financial_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_timestamp();

-- 9. RLS Policies pour expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expense categories in their organization" ON public.expense_categories;
CREATE POLICY "Users can view expense categories in their organization"
  ON public.expense_categories
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage expense categories in their organization" ON public.expense_categories;
CREATE POLICY "Users can manage expense categories in their organization"
  ON public.expense_categories
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 10. RLS Policies pour expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expenses in their organization" ON public.expenses;
CREATE POLICY "Users can view expenses in their organization"
  ON public.expenses
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create expenses in their organization" ON public.expenses;
CREATE POLICY "Users can create expenses in their organization"
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update expenses in their organization" ON public.expenses;
CREATE POLICY "Users can update expenses in their organization"
  ON public.expenses
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete expenses in their organization" ON public.expenses;
CREATE POLICY "Users can delete expenses in their organization"
  ON public.expenses
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 11. RLS Policies pour financial_forecasts
ALTER TABLE public.financial_forecasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view forecasts in their organization" ON public.financial_forecasts;
CREATE POLICY "Users can view forecasts in their organization"
  ON public.financial_forecasts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage forecasts in their organization" ON public.financial_forecasts;
CREATE POLICY "Users can manage forecasts in their organization"
  ON public.financial_forecasts
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 12. RLS Policies pour financial_reports
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view financial reports in their organization" ON public.financial_reports;
CREATE POLICY "Users can view financial reports in their organization"
  ON public.financial_reports
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage financial reports in their organization" ON public.financial_reports;
CREATE POLICY "Users can manage financial reports in their organization"
  ON public.financial_reports
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 13. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_forecasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_reports TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_cashflow TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_revenue_forecast TO authenticated;

-- 14. Insérer des catégories de dépenses par défaut
INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Salaires',
  'SALARIES',
  'Salaires et charges sociales'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'SALARIES'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Loyer',
  'RENT',
  'Loyer et charges locatives'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'RENT'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Matériel pédagogique',
  'MATERIALS',
  'Achat de matériel pédagogique'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'MATERIALS'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Marketing',
  'MARKETING',
  'Dépenses marketing et publicité'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'MARKETING'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Autres',
  'OTHER',
  'Autres dépenses'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'OTHER'
)
ON CONFLICT DO NOTHING;


-- 1. Table pour les catégories de dépenses
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- 2. Table pour les dépenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  expense_date DATE NOT NULL,
  payment_method TEXT, -- 'cash', 'bank_transfer', 'card', 'mobile_money', etc.
  vendor TEXT, -- Fournisseur
  invoice_number TEXT, -- Numéro de facture fournisseur
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Table pour les prévisions financières
CREATE TABLE IF NOT EXISTS public.financial_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  forecast_type TEXT NOT NULL, -- 'revenue', 'expense', 'cashflow'
  period_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Montants prévus
  forecasted_amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  -- Montants réels (mis à jour automatiquement)
  actual_amount NUMERIC(10,2),
  -- Catégorie (pour les dépenses)
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  -- Métadonnées
  notes TEXT,
  confidence_level INTEGER DEFAULT 50, -- 0-100, niveau de confiance de la prévision
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4. Table pour les rapports financiers générés
CREATE TABLE IF NOT EXISTS public.financial_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL, -- 'cashflow', 'income_statement', 'balance_sheet', 'forecast'
  period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  -- Données du rapport (JSON)
  report_data JSONB NOT NULL,
  -- Métadonnées
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_url TEXT, -- URL du fichier PDF/Excel généré
  status TEXT DEFAULT 'draft', -- 'draft', 'final', 'archived'
  UNIQUE(organization_id, report_type, period_type, period_start, period_end)
);

-- 5. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON public.expenses(organization_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_org_period ON public.financial_forecasts(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_forecasts_type ON public.financial_forecasts(forecast_type, period_type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_org_period ON public.financial_reports(organization_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON public.financial_reports(report_type, period_type);

-- 6. Fonction pour calculer le cashflow
CREATE OR REPLACE FUNCTION public.calculate_cashflow(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  period_date DATE,
  revenue NUMERIC,
  expenses NUMERIC,
  cashflow NUMERIC,
  cumulative_cashflow NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH daily_revenue AS (
    SELECT 
      DATE(p.paid_at) as period_date,
      COALESCE(SUM(p.amount), 0) as revenue
    FROM public.payments p
    WHERE p.organization_id = p_organization_id
      AND p.status = 'completed'
      AND DATE(p.paid_at) >= p_start_date
      AND DATE(p.paid_at) <= p_end_date
    GROUP BY DATE(p.paid_at)
  ),
  daily_expenses AS (
    SELECT 
      e.expense_date as period_date,
      COALESCE(SUM(e.amount), 0) as expenses
    FROM public.expenses e
    WHERE e.organization_id = p_organization_id
      AND e.expense_date >= p_start_date
      AND e.expense_date <= p_end_date
    GROUP BY e.expense_date
  ),
  daily_data AS (
    SELECT 
      COALESCE(r.period_date, e.period_date) as period_date,
      COALESCE(r.revenue, 0) as revenue,
      COALESCE(e.expenses, 0) as expenses,
      (COALESCE(r.revenue, 0) - COALESCE(e.expenses, 0)) as cashflow
    FROM daily_revenue r
    FULL OUTER JOIN daily_expenses e ON r.period_date = e.period_date
  ),
  with_cumulative AS (
    SELECT 
      period_date,
      revenue,
      expenses,
      cashflow,
      SUM(cashflow) OVER (ORDER BY period_date) as cumulative_cashflow
    FROM daily_data
  )
  SELECT 
    wc.period_date,
    wc.revenue,
    wc.expenses,
    wc.cashflow,
    wc.cumulative_cashflow
  FROM with_cumulative wc
  ORDER BY wc.period_date;
END;
$$;

-- 7. Fonction pour calculer les prévisions basées sur l'historique
CREATE OR REPLACE FUNCTION public.calculate_revenue_forecast(
  p_organization_id UUID,
  p_months_ahead INTEGER DEFAULT 3
)
RETURNS TABLE (
  forecast_month DATE,
  forecasted_revenue NUMERIC,
  confidence_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg_monthly_revenue NUMERIC;
  v_trend NUMERIC;
  v_start_date DATE;
BEGIN
  -- Calculer la moyenne des revenus mensuels des 6 derniers mois
  SELECT 
    COALESCE(AVG(monthly_revenue), 0),
    COALESCE(
      (MAX(monthly_revenue) - MIN(monthly_revenue)) / NULLIF(COUNT(*), 0),
      0
    )
  INTO v_avg_monthly_revenue, v_trend
  FROM (
    SELECT 
      DATE_TRUNC('month', paid_at) as month,
      SUM(amount) as monthly_revenue
    FROM public.payments
    WHERE organization_id = p_organization_id
      AND status = 'completed'
      AND paid_at >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', paid_at)
  ) monthly_stats;

  -- Générer les prévisions pour les mois à venir
  v_start_date := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';

  RETURN QUERY
  SELECT 
    (v_start_date + (generate_series(0, p_months_ahead - 1) || ' months')::INTERVAL)::DATE as forecast_month,
    ROUND(v_avg_monthly_revenue + (v_trend * generate_series(0, p_months_ahead - 1)), 2) as forecasted_revenue,
    CASE 
      WHEN generate_series(0, p_months_ahead - 1) <= 1 THEN 80
      WHEN generate_series(0, p_months_ahead - 1) <= 3 THEN 60
      ELSE 40
    END as confidence_level
  FROM generate_series(0, p_months_ahead - 1);
END;
$$;

-- 8. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_financial_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_expense_categories_timestamp ON public.expense_categories;
CREATE TRIGGER update_expense_categories_timestamp
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_timestamp();

DROP TRIGGER IF EXISTS update_expenses_timestamp ON public.expenses;
CREATE TRIGGER update_expenses_timestamp
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_timestamp();

DROP TRIGGER IF EXISTS update_financial_forecasts_timestamp ON public.financial_forecasts;
CREATE TRIGGER update_financial_forecasts_timestamp
  BEFORE UPDATE ON public.financial_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_financial_timestamp();

-- 9. RLS Policies pour expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expense categories in their organization" ON public.expense_categories;
CREATE POLICY "Users can view expense categories in their organization"
  ON public.expense_categories
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage expense categories in their organization" ON public.expense_categories;
CREATE POLICY "Users can manage expense categories in their organization"
  ON public.expense_categories
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 10. RLS Policies pour expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view expenses in their organization" ON public.expenses;
CREATE POLICY "Users can view expenses in their organization"
  ON public.expenses
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create expenses in their organization" ON public.expenses;
CREATE POLICY "Users can create expenses in their organization"
  ON public.expenses
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update expenses in their organization" ON public.expenses;
CREATE POLICY "Users can update expenses in their organization"
  ON public.expenses
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete expenses in their organization" ON public.expenses;
CREATE POLICY "Users can delete expenses in their organization"
  ON public.expenses
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 11. RLS Policies pour financial_forecasts
ALTER TABLE public.financial_forecasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view forecasts in their organization" ON public.financial_forecasts;
CREATE POLICY "Users can view forecasts in their organization"
  ON public.financial_forecasts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage forecasts in their organization" ON public.financial_forecasts;
CREATE POLICY "Users can manage forecasts in their organization"
  ON public.financial_forecasts
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 12. RLS Policies pour financial_reports
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view financial reports in their organization" ON public.financial_reports;
CREATE POLICY "Users can view financial reports in their organization"
  ON public.financial_reports
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage financial reports in their organization" ON public.financial_reports;
CREATE POLICY "Users can manage financial reports in their organization"
  ON public.financial_reports
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

-- 13. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_forecasts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_reports TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_cashflow TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_revenue_forecast TO authenticated;

-- 14. Insérer des catégories de dépenses par défaut
INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Salaires',
  'SALARIES',
  'Salaires et charges sociales'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'SALARIES'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Loyer',
  'RENT',
  'Loyer et charges locatives'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'RENT'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Matériel pédagogique',
  'MATERIALS',
  'Achat de matériel pédagogique'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'MATERIALS'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Marketing',
  'MARKETING',
  'Dépenses marketing et publicité'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'MARKETING'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.expense_categories (organization_id, name, code, description)
SELECT 
  o.id,
  'Autres',
  'OTHER',
  'Autres dépenses'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.expense_categories ec 
  WHERE ec.organization_id = o.id AND ec.code = 'OTHER'
)
ON CONFLICT DO NOTHING;





