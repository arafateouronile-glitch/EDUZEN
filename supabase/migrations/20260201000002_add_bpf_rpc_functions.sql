-- =====================================================
-- Add missing BPF RPC functions
-- These functions are called by the BPFService but were not in the original migration
-- =====================================================

-- Drop existing functions first to allow changing return types
-- Using CASCADE to also drop dependent objects (views, etc.)
DROP FUNCTION IF EXISTS get_bpf_stats(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_bpf_revenue_breakdown(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_bpf_student_breakdown(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_bpf_inconsistencies(UUID, INTEGER) CASCADE;
-- Drop all overloads of get_bpf_drill_down
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT oid::regprocedure as func_sig
           FROM pg_proc
           WHERE proname = 'get_bpf_drill_down'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
  END LOOP;
END $$;

-- =====================================================
-- 1. get_bpf_stats - Get BPF statistics for an organization and year
-- =====================================================
CREATE OR REPLACE FUNCTION get_bpf_stats(
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
) AS $$
DECLARE
  start_date DATE := (target_year || '-01-01')::DATE;
  end_date DATE := (target_year || '-12-31')::DATE;
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT
      COALESCE(SUM(p.duration_hours), 0) as hours,
      COUNT(DISTINCT s.id) as session_count,
      COUNT(DISTINCT s.program_id) as program_count
    FROM sessions s
    LEFT JOIN programs p ON p.id = s.program_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= start_date
    AND s.start_date <= end_date
  ),
  student_stats AS (
    SELECT
      COUNT(DISTINCT e.student_id) as student_count,
      COALESCE(SUM(p.duration_hours), 0) as trainee_hours
    FROM enrollments e
    JOIN sessions s ON s.id = e.session_id
    LEFT JOIN programs p ON p.id = s.program_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= start_date
    AND s.start_date <= end_date
  ),
  attendance_stats AS (
    SELECT
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE (COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC / COUNT(*)::NUMERIC * 100)
      END as rate
    FROM attendance a
    JOIN sessions s ON s.id = a.session_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= start_date
    AND s.start_date <= end_date
  )
  SELECT
    ss.hours::NUMERIC as total_hours_realized,
    sts.trainee_hours::NUMERIC as total_trainee_hours,
    sts.student_count::INTEGER as total_students_count,
    ss.session_count::INTEGER as total_sessions_count,
    ss.program_count::INTEGER as total_programs_count,
    COALESCE(ats.rate, 0)::NUMERIC as attendance_rate
  FROM session_stats ss
  CROSS JOIN student_stats sts
  CROSS JOIN attendance_stats ats;

EXCEPTION
  WHEN undefined_table THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::NUMERIC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_bpf_stats IS 'Get BPF statistics for an organization and year';

-- =====================================================
-- 2. get_bpf_revenue_breakdown - Get revenue breakdown by funding source
-- =====================================================
CREATE OR REPLACE FUNCTION get_bpf_revenue_breakdown(
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
) AS $$
DECLARE
  start_date DATE := (target_year || '-01-01')::DATE;
  end_date DATE := (target_year || '-12-31')::DATE;
BEGIN
  RETURN QUERY
  WITH payment_stats AS (
    SELECT
      COALESCE(SUM(p.amount), 0) as total,
      COALESCE(SUM(CASE WHEN p.payment_method = 'cpf' OR p.notes ILIKE '%cpf%' THEN p.amount ELSE 0 END), 0) as cpf,
      COALESCE(SUM(CASE WHEN p.payment_method = 'opco' OR p.notes ILIKE '%opco%' THEN p.amount ELSE 0 END), 0) as opco,
      COALESCE(SUM(CASE WHEN p.payment_method = 'company' OR p.notes ILIKE '%entreprise%' THEN p.amount ELSE 0 END), 0) as companies,
      COALESCE(SUM(CASE WHEN p.payment_method = 'individual' OR p.payment_method = 'card' OR p.payment_method = 'bank_transfer' THEN p.amount ELSE 0 END), 0) as individuals,
      COALESCE(SUM(CASE WHEN p.notes ILIKE '%pole emploi%' OR p.notes ILIKE '%france travail%' THEN p.amount ELSE 0 END), 0) as pole_emploi,
      COALESCE(SUM(CASE WHEN p.notes ILIKE '%region%' OR p.notes ILIKE '%conseil regional%' THEN p.amount ELSE 0 END), 0) as regions,
      COALESCE(SUM(CASE WHEN p.notes ILIKE '%etat%' OR p.notes ILIKE '%ministere%' THEN p.amount ELSE 0 END), 0) as state
    FROM payments p
    WHERE p.organization_id = target_org_id
    AND p.payment_date >= start_date
    AND p.payment_date <= end_date
    AND p.status = 'completed'
  )
  SELECT
    ps.total::NUMERIC as total_revenue,
    ps.cpf::NUMERIC as revenue_cpf,
    ps.opco::NUMERIC as revenue_opco,
    ps.companies::NUMERIC as revenue_companies,
    ps.individuals::NUMERIC as revenue_individuals,
    ps.pole_emploi::NUMERIC as revenue_pole_emploi,
    ps.regions::NUMERIC as revenue_regions,
    ps.state::NUMERIC as revenue_state,
    (ps.total - ps.cpf - ps.opco - ps.companies - ps.individuals - ps.pole_emploi - ps.regions - ps.state)::NUMERIC as revenue_other,
    '{}'::JSONB as breakdown_details
  FROM payment_stats ps;

EXCEPTION
  WHEN undefined_table THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, '{}'::JSONB;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_bpf_revenue_breakdown IS 'Get revenue breakdown by funding source for BPF';

-- =====================================================
-- 3. get_bpf_student_breakdown - Get student demographics breakdown
-- =====================================================
CREATE OR REPLACE FUNCTION get_bpf_student_breakdown(
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
) AS $$
DECLARE
  start_date DATE := (target_year || '-01-01')::DATE;
  end_date DATE := (target_year || '-12-31')::DATE;
  ref_date DATE := (target_year || '-12-31')::DATE;
BEGIN
  RETURN QUERY
  WITH enrolled_students AS (
    SELECT DISTINCT st.*
    FROM students st
    JOIN enrollments e ON e.student_id = st.id
    JOIN sessions s ON s.id = e.session_id
    WHERE st.organization_id = target_org_id
    AND s.start_date >= start_date
    AND s.start_date <= end_date
  ),
  student_stats AS (
    SELECT
      COUNT(*)::INTEGER as total,
      COUNT(*) FILTER (WHERE es.gender = 'male' OR es.gender = 'M' OR es.gender = 'homme')::INTEGER as men,
      COUNT(*) FILTER (WHERE es.gender = 'female' OR es.gender = 'F' OR es.gender = 'femme')::INTEGER as women,
      COUNT(*) FILTER (WHERE es.birth_date IS NOT NULL AND EXTRACT(YEAR FROM age(ref_date, es.birth_date)) < 26)::INTEGER as under_26,
      COUNT(*) FILTER (WHERE es.birth_date IS NOT NULL AND EXTRACT(YEAR FROM age(ref_date, es.birth_date)) BETWEEN 26 AND 45)::INTEGER as between_26_45,
      COUNT(*) FILTER (WHERE es.birth_date IS NOT NULL AND EXTRACT(YEAR FROM age(ref_date, es.birth_date)) > 45)::INTEGER as over_45,
      COUNT(*) FILTER (WHERE es.is_disabled = true OR es.disability_status IS NOT NULL)::INTEGER as disabled
    FROM enrolled_students es
  )
  SELECT
    ss.total as total_students,
    ss.men as students_men,
    ss.women as students_women,
    ss.under_26 as students_under_26,
    ss.between_26_45 as students_26_to_45,
    ss.over_45 as students_over_45,
    ss.disabled as students_disabled,
    jsonb_build_object(
      'under_18', 0,
      '18_25', ss.under_26,
      '26_35', 0,
      '36_45', ss.between_26_45,
      '46_55', 0,
      'over_55', ss.over_45
    ) as age_breakdown
  FROM student_stats ss;

EXCEPTION
  WHEN undefined_table THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, '{}'::JSONB;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_bpf_student_breakdown IS 'Get student demographics breakdown for BPF';

-- =====================================================
-- 4. get_bpf_inconsistencies - Detect data inconsistencies
-- =====================================================
CREATE OR REPLACE FUNCTION get_bpf_inconsistencies(
  target_org_id UUID,
  target_year INTEGER
)
RETURNS TABLE (
  inconsistency_type TEXT,
  severity TEXT,
  description TEXT,
  affected_count INTEGER,
  details JSONB
) AS $$
DECLARE
  start_date DATE := (target_year || '-01-01')::DATE;
  end_date DATE := (target_year || '-12-31')::DATE;
BEGIN
  -- Check for sessions without enrollments
  RETURN QUERY
  SELECT
    'sessions_without_enrollments'::TEXT as inconsistency_type,
    'warning'::TEXT as severity,
    'Sessions sans inscriptions'::TEXT as description,
    COUNT(*)::INTEGER as affected_count,
    jsonb_agg(jsonb_build_object('session_id', s.id, 'session_name', s.name)) as details
  FROM sessions s
  LEFT JOIN enrollments e ON e.session_id = s.id
  WHERE s.organization_id = target_org_id
  AND s.start_date >= start_date
  AND s.start_date <= end_date
  AND e.id IS NULL
  GROUP BY s.organization_id
  HAVING COUNT(*) > 0;

  -- Check for students without birth_date
  RETURN QUERY
  SELECT
    'students_missing_birthdate'::TEXT as inconsistency_type,
    'info'::TEXT as severity,
    'Stagiaires sans date de naissance (affecte les statistiques démographiques)'::TEXT as description,
    COUNT(DISTINCT st.id)::INTEGER as affected_count,
    '[]'::JSONB as details
  FROM students st
  JOIN enrollments e ON e.student_id = st.id
  JOIN sessions s ON s.id = e.session_id
  WHERE st.organization_id = target_org_id
  AND s.start_date >= start_date
  AND s.start_date <= end_date
  AND st.birth_date IS NULL
  HAVING COUNT(DISTINCT st.id) > 0;

  -- Check for payments without session link
  RETURN QUERY
  SELECT
    'orphan_payments'::TEXT as inconsistency_type,
    'warning'::TEXT as severity,
    'Paiements non liés à une session'::TEXT as description,
    COUNT(*)::INTEGER as affected_count,
    '[]'::JSONB as details
  FROM payments p
  WHERE p.organization_id = target_org_id
  AND p.payment_date >= start_date
  AND p.payment_date <= end_date
  AND p.enrollment_id IS NULL
  AND p.session_id IS NULL
  HAVING COUNT(*) > 0;

EXCEPTION
  WHEN undefined_table THEN
    -- Return empty result if tables don't exist
    RETURN;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_bpf_inconsistencies IS 'Detect data inconsistencies that could affect BPF accuracy';

-- =====================================================
-- 5. get_bpf_drill_down - Get detailed data for a specific metric
-- =====================================================
CREATE OR REPLACE FUNCTION get_bpf_drill_down(
  target_org_id UUID,
  target_year INTEGER,
  metric_type TEXT,
  page_num INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  total_count INTEGER,
  items JSONB
) AS $$
DECLARE
  start_date DATE := (target_year || '-01-01')::DATE;
  end_date DATE := (target_year || '-12-31')::DATE;
  offset_val INTEGER := (page_num - 1) * page_size;
BEGIN
  IF metric_type = 'trainee_hours' THEN
    RETURN QUERY
    SELECT
      COUNT(*)::INTEGER as total_count,
      COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) as items
    FROM (
      SELECT
        s.id as session_id,
        s.name as session_name,
        p.duration_hours,
        COUNT(DISTINCT e.student_id) as student_count,
        (p.duration_hours * COUNT(DISTINCT e.student_id)) as trainee_hours
      FROM sessions s
      LEFT JOIN programs p ON p.id = s.program_id
      LEFT JOIN enrollments e ON e.session_id = s.id
      WHERE s.organization_id = target_org_id
      AND s.start_date >= start_date
      AND s.start_date <= end_date
      GROUP BY s.id, s.name, p.duration_hours
      ORDER BY trainee_hours DESC
      LIMIT page_size OFFSET offset_val
    ) t;

  ELSIF metric_type = 'revenue' THEN
    RETURN QUERY
    SELECT
      COUNT(*)::INTEGER as total_count,
      COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) as items
    FROM (
      SELECT
        p.id as payment_id,
        p.amount,
        p.payment_method,
        p.payment_date,
        s.name as session_name
      FROM payments p
      LEFT JOIN sessions s ON s.id = p.session_id
      WHERE p.organization_id = target_org_id
      AND p.payment_date >= start_date
      AND p.payment_date <= end_date
      AND p.status = 'completed'
      ORDER BY p.payment_date DESC
      LIMIT page_size OFFSET offset_val
    ) t;

  ELSIF metric_type = 'students' THEN
    RETURN QUERY
    SELECT
      COUNT(DISTINCT st.id)::INTEGER as total_count,
      COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) as items
    FROM (
      SELECT DISTINCT
        st.id as student_id,
        st.first_name,
        st.last_name,
        st.email,
        st.birth_date,
        st.gender
      FROM students st
      JOIN enrollments e ON e.student_id = st.id
      JOIN sessions s ON s.id = e.session_id
      WHERE st.organization_id = target_org_id
      AND s.start_date >= start_date
      AND s.start_date <= end_date
      ORDER BY st.last_name, st.first_name
      LIMIT page_size OFFSET offset_val
    ) t;

  ELSIF metric_type = 'sessions' THEN
    RETURN QUERY
    SELECT
      COUNT(*)::INTEGER as total_count,
      COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) as items
    FROM (
      SELECT
        s.id as session_id,
        s.name as session_name,
        s.start_date,
        s.end_date,
        s.status,
        p.name as program_name,
        COUNT(DISTINCT e.student_id) as student_count
      FROM sessions s
      LEFT JOIN programs p ON p.id = s.program_id
      LEFT JOIN enrollments e ON e.session_id = s.id
      WHERE s.organization_id = target_org_id
      AND s.start_date >= start_date
      AND s.start_date <= end_date
      GROUP BY s.id, s.name, s.start_date, s.end_date, s.status, p.name
      ORDER BY s.start_date DESC
      LIMIT page_size OFFSET offset_val
    ) t;

  ELSE
    RETURN QUERY SELECT 0::INTEGER, '[]'::JSONB;
  END IF;

EXCEPTION
  WHEN undefined_table THEN
    RETURN QUERY SELECT 0::INTEGER, '[]'::JSONB;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_bpf_drill_down IS 'Get detailed data for a specific BPF metric';

-- =====================================================
-- Grant execute permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_bpf_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_bpf_revenue_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION get_bpf_student_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION get_bpf_inconsistencies TO authenticated;
GRANT EXECUTE ON FUNCTION get_bpf_drill_down TO authenticated;
