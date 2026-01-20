-- Migration: Catégories de charges et charges de session pour le module BPF
-- Date: 2026-01-21
-- Description: Ajoute bpf_category aux catégories de charges et calcule les agrégats dans le BPF

-- ============================================
-- MODIFICATION: Ajout du champ bpf_category à charge_categories
-- ============================================

ALTER TABLE public.charge_categories
  ADD COLUMN IF NOT EXISTS bpf_category VARCHAR(50);

COMMENT ON COLUMN public.charge_categories.bpf_category IS 'Catégorie BPF: subcontracting, location, equipment, supplies, other';

CREATE INDEX IF NOT EXISTS idx_charge_categories_bpf ON public.charge_categories(organization_id, bpf_category) WHERE bpf_category IS NOT NULL;

-- ============================================
-- MISE À JOUR: init_default_charge_categories avec bpf_category
-- ============================================

CREATE OR REPLACE FUNCTION public.init_default_charge_categories(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.charge_categories (organization_id, name, code, description, bpf_category)
  VALUES
    (p_organization_id, 'Location de salle', 'LOCATION_SALLE', 'Frais de location de salle de formation', 'location'),
    (p_organization_id, 'Matériel pédagogique', 'MATERIEL_PEDAGOGIQUE', 'Achat de matériel pédagogique', 'equipment'),
    (p_organization_id, 'Formateur externe', 'FORMATEUR_EXTERNE', 'Rémunération de formateurs externes', 'subcontracting'),
    (p_organization_id, 'Transport', 'TRANSPORT', 'Frais de transport pour la formation', 'other'),
    (p_organization_id, 'Hébergement', 'HEBERGEMENT', 'Frais d''hébergement', 'other'),
    (p_organization_id, 'Restauration', 'RESTAURATION', 'Frais de restauration', 'supplies'),
    (p_organization_id, 'Fournitures', 'FOURNITURES', 'Fournitures diverses', 'supplies'),
    (p_organization_id, 'Communication', 'COMMUNICATION', 'Frais de communication et marketing', 'other'),
    (p_organization_id, 'Assurance', 'ASSURANCE', 'Frais d''assurance', 'other'),
    (p_organization_id, 'Sous-traitance', 'SOUS_TRAITANCE', 'Sous-traitance et prestataires externes', 'subcontracting'),
    (p_organization_id, 'Autre', 'AUTRE', 'Autres charges', 'other')
  ON CONFLICT (organization_id, code) DO UPDATE SET
    bpf_category = EXCLUDED.bpf_category,
    updated_at = NOW();
END;
$$;

-- ============================================
-- FONCTION: calculate_bpf_metrics – ajout des charges de session
-- ============================================

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
  revenue_cpf_sum NUMERIC := 0;
  revenue_opco_sum NUMERIC := 0;
  revenue_companies_sum NUMERIC := 0;
  revenue_individuals_sum NUMERIC := 0;
  revenue_pole_emploi_sum NUMERIC := 0;
  revenue_regions_sum NUMERIC := 0;
  revenue_state_sum NUMERIC := 0;
  revenue_other_sum NUMERIC := 0;
  -- Charges de session pour BPF
  subcontracting_sum NUMERIC := 0;
  charges_location_sum NUMERIC := 0;
  charges_equipment_sum NUMERIC := 0;
  charges_supplies_sum NUMERIC := 0;
  charges_other_sum NUMERIC := 0;
  charges_total_sum NUMERIC := 0;
BEGIN
  -- Stagiaires
  BEGIN
    SELECT COUNT(DISTINCT s.id) INTO student_count
    FROM students s
    JOIN enrollments e ON e.student_id = s.id
    JOIN sessions sess ON sess.id = e.session_id
    WHERE s.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date;
  EXCEPTION WHEN undefined_table THEN student_count := 0; END;
  metrics := jsonb_set(metrics, '{total_students}', to_jsonb(student_count));

  -- Heures de formation
  BEGIN
    SELECT COALESCE(SUM(p.duration_hours), 0) INTO training_hours_sum
    FROM sessions sess
    JOIN programs p ON p.id = sess.program_id
    WHERE sess.organization_id = org_id
    AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND sess.status = 'completed';
  EXCEPTION WHEN undefined_table THEN training_hours_sum := 0; END;
  metrics := jsonb_set(metrics, '{total_training_hours}', to_jsonb(training_hours_sum));

  -- CA et répartition par type de financement (inchangé)
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO revenue_sum
    FROM payments
    WHERE organization_id = org_id AND payment_date >= start_date AND payment_date <= end_date
    AND status = 'completed';

    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_cpf_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND ft.bpf_category = 'cpf';

    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_opco_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND ft.bpf_category = 'opco';

    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_companies_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND ft.bpf_category = 'companies';

    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_individuals_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    LEFT JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND (ft.bpf_category = 'individuals' OR e.funding_type_id IS NULL);

    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_pole_emploi_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND ft.bpf_category = 'pole_emploi';

    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_regions_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND ft.bpf_category = 'regions';

    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_state_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND ft.bpf_category = 'state';

    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_other_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND ft.bpf_category = 'other';
  EXCEPTION WHEN undefined_table THEN
    revenue_sum := 0; revenue_cpf_sum := 0; revenue_opco_sum := 0; revenue_companies_sum := 0;
    revenue_individuals_sum := 0; revenue_pole_emploi_sum := 0; revenue_regions_sum := 0;
    revenue_state_sum := 0; revenue_other_sum := 0;
  END;

  metrics := jsonb_set(metrics, '{total_revenue}', to_jsonb(revenue_sum));
  metrics := jsonb_set(metrics, '{revenue_cpf}', to_jsonb(revenue_cpf_sum));
  metrics := jsonb_set(metrics, '{revenue_opco}', to_jsonb(revenue_opco_sum));
  metrics := jsonb_set(metrics, '{revenue_companies}', to_jsonb(revenue_companies_sum));
  metrics := jsonb_set(metrics, '{revenue_individuals}', to_jsonb(revenue_individuals_sum));
  metrics := jsonb_set(metrics, '{revenue_pole_emploi}', to_jsonb(revenue_pole_emploi_sum));
  metrics := jsonb_set(metrics, '{revenue_regions}', to_jsonb(revenue_regions_sum));
  metrics := jsonb_set(metrics, '{revenue_state}', to_jsonb(revenue_state_sum));
  metrics := jsonb_set(metrics, '{revenue_other}', to_jsonb(revenue_other_sum));

  -- Charges de session : agrégation par bpf_category (sessions dont la date de début est dans l'année)
  BEGIN
    -- Sous-traitance (alimente bpf_reports.subcontracting_amount)
    SELECT COALESCE(SUM(sc.amount), 0) INTO subcontracting_sum
    FROM session_charges sc
    JOIN sessions sess ON sess.id = sc.session_id
    LEFT JOIN charge_categories cc ON cc.id = sc.category_id
    WHERE sc.organization_id = org_id
    AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND cc.bpf_category = 'subcontracting';

    -- Location
    SELECT COALESCE(SUM(sc.amount), 0) INTO charges_location_sum
    FROM session_charges sc
    JOIN sessions sess ON sess.id = sc.session_id
    LEFT JOIN charge_categories cc ON cc.id = sc.category_id
    WHERE sc.organization_id = org_id
    AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND cc.bpf_category = 'location';

    -- Équipements / matériel
    SELECT COALESCE(SUM(sc.amount), 0) INTO charges_equipment_sum
    FROM session_charges sc
    JOIN sessions sess ON sess.id = sc.session_id
    LEFT JOIN charge_categories cc ON cc.id = sc.category_id
    WHERE sc.organization_id = org_id
    AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND cc.bpf_category = 'equipment';

    -- Fournitures / restauration
    SELECT COALESCE(SUM(sc.amount), 0) INTO charges_supplies_sum
    FROM session_charges sc
    JOIN sessions sess ON sess.id = sc.session_id
    LEFT JOIN charge_categories cc ON cc.id = sc.category_id
    WHERE sc.organization_id = org_id
    AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND cc.bpf_category = 'supplies';

    -- Autres (et catégories sans bpf_category)
    SELECT COALESCE(SUM(sc.amount), 0) INTO charges_other_sum
    FROM session_charges sc
    JOIN sessions sess ON sess.id = sc.session_id
    LEFT JOIN charge_categories cc ON cc.id = sc.category_id
    WHERE sc.organization_id = org_id
    AND sess.start_date >= start_date AND sess.start_date <= end_date
    AND (cc.bpf_category = 'other' OR cc.bpf_category IS NULL);

    charges_total_sum := subcontracting_sum + charges_location_sum + charges_equipment_sum + charges_supplies_sum + charges_other_sum;
  EXCEPTION WHEN undefined_table THEN
    subcontracting_sum := 0; charges_location_sum := 0; charges_equipment_sum := 0;
    charges_supplies_sum := 0; charges_other_sum := 0; charges_total_sum := 0;
  END;

  metrics := jsonb_set(metrics, '{subcontracting_amount}', to_jsonb(subcontracting_sum));
  metrics := jsonb_set(metrics, '{charges_total}', to_jsonb(charges_total_sum));
  metrics := jsonb_set(metrics, '{charges_breakdown}', jsonb_build_object(
    'location', charges_location_sum,
    'equipment', charges_equipment_sum,
    'supplies', charges_supplies_sum,
    'other', charges_other_sum
  ));

  -- Programmes et sessions
  BEGIN
    SELECT COUNT(DISTINCT program_id) INTO program_count
    FROM sessions
    WHERE organization_id = org_id AND start_date >= start_date AND start_date <= end_date;
  EXCEPTION WHEN undefined_table THEN program_count := 0; END;
  metrics := jsonb_set(metrics, '{total_programs}', to_jsonb(program_count));

  BEGIN
    SELECT COUNT(*) INTO session_count
    FROM sessions
    WHERE organization_id = org_id AND start_date >= start_date AND start_date <= end_date;
  EXCEPTION WHEN undefined_table THEN session_count := 0; END;
  metrics := jsonb_set(metrics, '{total_sessions}', to_jsonb(session_count));

  RETURN metrics;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_bpf_metrics IS 'Calcule les métriques BPF: revenus par type de financement, charges de session par catégorie (sous-traitance, location, équipements, fournitures, autres)';
