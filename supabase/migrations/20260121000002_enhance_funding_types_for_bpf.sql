-- Migration: Amélioration des types de financement pour le module BPF
-- Date: 2026-01-21
-- Description: Ajoute le mapping vers les catégories BPF et améliore la fonction de calcul

-- ============================================
-- MODIFICATION: Ajout du champ bpf_category à funding_types
-- ============================================

-- Ajouter la colonne bpf_category pour mapper vers les catégories BPF
ALTER TABLE public.funding_types
  ADD COLUMN IF NOT EXISTS bpf_category VARCHAR(50);

-- Commentaire
COMMENT ON COLUMN public.funding_types.bpf_category IS 'Catégorie BPF correspondante: cpf, opco, companies, individuals, pole_emploi, regions, state, other';

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_funding_types_bpf_category ON public.funding_types(organization_id, bpf_category) WHERE bpf_category IS NOT NULL;

-- ============================================
-- AMÉLIORATION: Fonction calculate_bpf_metrics pour utiliser funding_types
-- ============================================

-- Recréer la fonction calculate_bpf_metrics avec calcul par type de financement
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
  -- Revenus par catégorie BPF
  revenue_cpf_sum NUMERIC := 0;
  revenue_opco_sum NUMERIC := 0;
  revenue_companies_sum NUMERIC := 0;
  revenue_individuals_sum NUMERIC := 0;
  revenue_pole_emploi_sum NUMERIC := 0;
  revenue_regions_sum NUMERIC := 0;
  revenue_state_sum NUMERIC := 0;
  revenue_other_sum NUMERIC := 0;
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

  -- Calcul du CA total et répartition par type de financement
  BEGIN
    -- CA total depuis les paiements
    SELECT COALESCE(SUM(amount), 0) INTO revenue_sum
    FROM payments
    WHERE organization_id = org_id
    AND payment_date >= start_date
    AND payment_date <= end_date
    AND status = 'completed';
    
    -- Répartition par type de financement depuis les inscriptions
    -- CPF
    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_cpf_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date
    AND ft.bpf_category = 'cpf';
    
    -- OPCO
    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_opco_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date
    AND ft.bpf_category = 'opco';
    
    -- Entreprises
    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_companies_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date
    AND ft.bpf_category = 'companies';
    
    -- Particuliers
    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_individuals_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    LEFT JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date
    AND (ft.bpf_category = 'individuals' OR e.funding_type_id IS NULL);
    
    -- Pôle Emploi
    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_pole_emploi_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date
    AND ft.bpf_category = 'pole_emploi';
    
    -- Régions
    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_regions_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date
    AND ft.bpf_category = 'regions';
    
    -- État
    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_state_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date
    AND ft.bpf_category = 'state';
    
    -- Autres
    SELECT COALESCE(SUM(e.total_amount), 0) INTO revenue_other_sum
    FROM enrollments e
    JOIN sessions sess ON sess.id = e.session_id
    JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE sess.organization_id = org_id
    AND sess.start_date >= start_date
    AND sess.start_date <= end_date
    AND ft.bpf_category = 'other';
    
  EXCEPTION
    WHEN undefined_table THEN
      revenue_sum := 0;
      revenue_cpf_sum := 0;
      revenue_opco_sum := 0;
      revenue_companies_sum := 0;
      revenue_individuals_sum := 0;
      revenue_pole_emploi_sum := 0;
      revenue_regions_sum := 0;
      revenue_state_sum := 0;
      revenue_other_sum := 0;
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

COMMENT ON FUNCTION calculate_bpf_metrics IS 'Calcule automatiquement les métriques BPF pour une année donnée, incluant la répartition par type de financement';
