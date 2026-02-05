-- =====================================================
-- BPF RPC Functions - Version simplifiée pour diagnostic
-- Exécuter cette migration si 20260201000002 ne fonctionne pas
-- =====================================================

-- Fonction 1: get_bpf_stats
CREATE OR REPLACE FUNCTION public.get_bpf_stats(
  target_org_id UUID,
  target_year INTEGER
)
RETURNS TABLE (
  total_hours_realized NUMERIC,
  total_trainee_hours NUMERIC,
  total_students_count INTEGER,
  total_sessions_count INTEGER,
  total_programs_count INTEGER,
  attendance_rate NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE := (target_year || '-01-01')::DATE;
  v_end_date DATE := (target_year || '-12-31')::DATE;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(p.duration_hours), 0)::NUMERIC,
    COALESCE(SUM(p.duration_hours) * COUNT(DISTINCT e.student_id), 0)::NUMERIC,
    COUNT(DISTINCT e.student_id)::INTEGER,
    COUNT(DISTINCT s.id)::INTEGER,
    COUNT(DISTINCT s.program_id)::INTEGER,
    0::NUMERIC
  FROM sessions s
  LEFT JOIN programs p ON p.id = s.program_id
  LEFT JOIN enrollments e ON e.session_id = s.id
  WHERE s.organization_id = target_org_id
  AND s.start_date >= v_start_date
  AND s.start_date <= v_end_date;
END;
$$;

-- Fonction 2: get_bpf_revenue_breakdown
CREATE OR REPLACE FUNCTION public.get_bpf_revenue_breakdown(
  target_org_id UUID,
  target_year INTEGER
)
RETURNS TABLE (
  total_revenue NUMERIC,
  revenue_cpf NUMERIC,
  revenue_opco NUMERIC,
  revenue_companies NUMERIC,
  revenue_individuals NUMERIC,
  revenue_pole_emploi NUMERIC,
  revenue_regions NUMERIC,
  revenue_state NUMERIC,
  revenue_other NUMERIC,
  breakdown_details JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE := (target_year || '-01-01')::DATE;
  v_end_date DATE := (target_year || '-12-31')::DATE;
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(pay.amount), 0)::NUMERIC,
    0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC,
    0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC,
    '{}'::JSONB
  FROM payments pay
  WHERE pay.organization_id = target_org_id
  AND pay.payment_date >= v_start_date
  AND pay.payment_date <= v_end_date
  AND pay.status = 'completed';
END;
$$;

-- Fonction 3: get_bpf_student_breakdown
CREATE OR REPLACE FUNCTION public.get_bpf_student_breakdown(
  target_org_id UUID,
  target_year INTEGER
)
RETURNS TABLE (
  total_students INTEGER,
  students_men INTEGER,
  students_women INTEGER,
  students_under_26 INTEGER,
  students_26_to_45 INTEGER,
  students_over_45 INTEGER,
  students_disabled INTEGER,
  age_breakdown JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_start_date DATE := (target_year || '-01-01')::DATE;
  v_end_date DATE := (target_year || '-12-31')::DATE;
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT st.id)::INTEGER,
    0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER,
    '{}'::JSONB
  FROM students st
  JOIN enrollments e ON e.student_id = st.id
  JOIN sessions s ON s.id = e.session_id
  WHERE st.organization_id = target_org_id
  AND s.start_date >= v_start_date
  AND s.start_date <= v_end_date;
END;
$$;

-- Fonction 4: get_bpf_inconsistencies
CREATE OR REPLACE FUNCTION public.get_bpf_inconsistencies(
  target_org_id UUID,
  target_year INTEGER
)
RETURNS TABLE (
  inconsistency_type TEXT,
  severity TEXT,
  description TEXT,
  affected_count INTEGER,
  details JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'none'::TEXT,
    'info'::TEXT,
    'Aucune incohérence détectée'::TEXT,
    0::INTEGER,
    '{}'::JSONB
  WHERE FALSE;
END;
$$;

-- Fonction 5: get_bpf_drill_down
CREATE OR REPLACE FUNCTION public.get_bpf_drill_down(
  target_org_id UUID,
  target_year INTEGER,
  metric_type TEXT,
  page_num INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  total_count INTEGER,
  items JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT 0::INTEGER, '[]'::JSONB;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_bpf_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bpf_revenue_breakdown(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bpf_student_breakdown(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bpf_inconsistencies(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bpf_drill_down(UUID, INTEGER, TEXT, INTEGER, INTEGER) TO authenticated;

-- Vérification
SELECT proname, pronargs FROM pg_proc WHERE proname LIKE 'get_bpf%';
