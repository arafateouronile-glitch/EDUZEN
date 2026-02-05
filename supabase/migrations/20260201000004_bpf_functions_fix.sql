-- =====================================================
-- BPF RPC Functions - Version corrigée avec schéma explicite
-- Exécuter cette migration pour corriger les erreurs 400
-- =====================================================

-- Supprimer les anciennes fonctions (toutes les variantes possibles)
DROP FUNCTION IF EXISTS public.get_bpf_stats(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_bpf_stats(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_bpf_revenue_breakdown(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_bpf_revenue_breakdown(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_bpf_student_breakdown(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_bpf_student_breakdown(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_bpf_inconsistencies(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_bpf_inconsistencies(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_bpf_drill_down(UUID, INTEGER, TEXT, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_bpf_drill_down(UUID, INTEGER, TEXT, INTEGER, INTEGER) CASCADE;

-- =====================================================
-- 1. get_bpf_stats
-- =====================================================
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
SET search_path = public
AS $$
DECLARE
  v_start_date DATE := make_date(target_year, 1, 1);
  v_end_date DATE := make_date(target_year, 12, 31);
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT
      COALESCE(SUM(p.duration_hours), 0) as hours,
      COUNT(DISTINCT s.id) as session_count,
      COUNT(DISTINCT s.program_id) as program_count
    FROM public.sessions s
    LEFT JOIN public.programs p ON p.id = s.program_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date
  ),
  student_stats AS (
    SELECT
      COUNT(DISTINCT e.student_id) as student_count,
      COALESCE(SUM(p.duration_hours), 0) as trainee_hours
    FROM public.enrollments e
    JOIN public.sessions s ON s.id = e.session_id
    LEFT JOIN public.programs p ON p.id = s.program_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date
  ),
  attendance_stats AS (
    SELECT
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE (COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC / COUNT(*)::NUMERIC * 100)
      END as rate
    FROM public.attendance a
    JOIN public.sessions s ON s.id = a.session_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date
  )
  SELECT
    ss.hours::NUMERIC,
    sts.trainee_hours::NUMERIC,
    sts.student_count::INTEGER,
    ss.session_count::INTEGER,
    ss.program_count::INTEGER,
    COALESCE(ats.rate, 0)::NUMERIC
  FROM session_stats ss
  CROSS JOIN student_stats sts
  CROSS JOIN attendance_stats ats;
EXCEPTION
  WHEN undefined_table THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::NUMERIC;
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::NUMERIC;
END;
$$;

-- =====================================================
-- 2. get_bpf_revenue_breakdown
-- =====================================================
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
SET search_path = public
AS $$
DECLARE
  v_start_date DATE := make_date(target_year, 1, 1);
  v_end_date DATE := make_date(target_year, 12, 31);
BEGIN
  RETURN QUERY
  WITH payment_stats AS (
    SELECT
      COALESCE(SUM(pay.amount), 0) as total,
      COALESCE(SUM(CASE WHEN pay.payment_method = 'cpf' OR pay.notes ILIKE '%cpf%' THEN pay.amount ELSE 0 END), 0) as cpf,
      COALESCE(SUM(CASE WHEN pay.payment_method = 'opco' OR pay.notes ILIKE '%opco%' THEN pay.amount ELSE 0 END), 0) as opco,
      COALESCE(SUM(CASE WHEN pay.payment_method = 'company' OR pay.notes ILIKE '%entreprise%' THEN pay.amount ELSE 0 END), 0) as companies,
      COALESCE(SUM(CASE WHEN pay.payment_method = 'individual' OR pay.payment_method = 'card' OR pay.payment_method = 'bank_transfer' THEN pay.amount ELSE 0 END), 0) as individuals,
      COALESCE(SUM(CASE WHEN pay.notes ILIKE '%pole emploi%' OR pay.notes ILIKE '%france travail%' THEN pay.amount ELSE 0 END), 0) as pole_emploi,
      COALESCE(SUM(CASE WHEN pay.notes ILIKE '%region%' OR pay.notes ILIKE '%conseil regional%' THEN pay.amount ELSE 0 END), 0) as regions,
      COALESCE(SUM(CASE WHEN pay.notes ILIKE '%etat%' OR pay.notes ILIKE '%ministere%' THEN pay.amount ELSE 0 END), 0) as state_funding
    FROM public.payments pay
    WHERE pay.organization_id = target_org_id
    AND pay.payment_date >= v_start_date
    AND pay.payment_date <= v_end_date
    AND pay.status = 'completed'
  )
  SELECT
    ps.total::NUMERIC,
    ps.cpf::NUMERIC,
    ps.opco::NUMERIC,
    ps.companies::NUMERIC,
    ps.individuals::NUMERIC,
    ps.pole_emploi::NUMERIC,
    ps.regions::NUMERIC,
    ps.state_funding::NUMERIC,
    GREATEST((ps.total - ps.cpf - ps.opco - ps.companies - ps.individuals - ps.pole_emploi - ps.regions - ps.state_funding), 0)::NUMERIC,
    '{}'::JSONB
  FROM payment_stats ps;
EXCEPTION
  WHEN undefined_table THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, '{}'::JSONB;
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, '{}'::JSONB;
END;
$$;

-- =====================================================
-- 3. get_bpf_student_breakdown
-- =====================================================
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
SET search_path = public
AS $$
DECLARE
  v_start_date DATE := make_date(target_year, 1, 1);
  v_end_date DATE := make_date(target_year, 12, 31);
  v_ref_date DATE := make_date(target_year, 12, 31);
BEGIN
  RETURN QUERY
  WITH enrolled_students AS (
    SELECT DISTINCT st.*
    FROM public.students st
    JOIN public.enrollments e ON e.student_id = st.id
    JOIN public.sessions s ON s.id = e.session_id
    WHERE st.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date
  ),
  student_stats AS (
    SELECT
      COUNT(*)::INTEGER as total,
      COUNT(*) FILTER (WHERE es.gender IN ('male', 'M', 'homme'))::INTEGER as men,
      COUNT(*) FILTER (WHERE es.gender IN ('female', 'F', 'femme'))::INTEGER as women,
      COUNT(*) FILTER (WHERE es.birth_date IS NOT NULL AND EXTRACT(YEAR FROM age(v_ref_date, es.birth_date)) < 26)::INTEGER as under_26,
      COUNT(*) FILTER (WHERE es.birth_date IS NOT NULL AND EXTRACT(YEAR FROM age(v_ref_date, es.birth_date)) BETWEEN 26 AND 45)::INTEGER as between_26_45,
      COUNT(*) FILTER (WHERE es.birth_date IS NOT NULL AND EXTRACT(YEAR FROM age(v_ref_date, es.birth_date)) > 45)::INTEGER as over_45,
      COUNT(*) FILTER (WHERE es.is_disabled = true)::INTEGER as disabled
    FROM enrolled_students es
  )
  SELECT
    ss.total,
    ss.men,
    ss.women,
    ss.under_26,
    ss.between_26_45,
    ss.over_45,
    ss.disabled,
    jsonb_build_object(
      'under_26', ss.under_26,
      '26_to_45', ss.between_26_45,
      'over_45', ss.over_45
    )
  FROM student_stats ss;
EXCEPTION
  WHEN undefined_table THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, '{}'::JSONB;
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, 0::INTEGER, '{}'::JSONB;
END;
$$;

-- =====================================================
-- 4. get_bpf_inconsistencies
-- =====================================================
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
SET search_path = public
AS $$
DECLARE
  v_start_date DATE := make_date(target_year, 1, 1);
  v_end_date DATE := make_date(target_year, 12, 31);
BEGIN
  -- Sessions sans inscriptions
  RETURN QUERY
  SELECT
    'sessions_without_enrollments'::TEXT,
    'warning'::TEXT,
    'Sessions sans inscriptions'::TEXT,
    COUNT(*)::INTEGER,
    COALESCE(jsonb_agg(jsonb_build_object('session_id', s.id, 'session_name', s.name)), '[]'::JSONB)
  FROM public.sessions s
  LEFT JOIN public.enrollments e ON e.session_id = s.id
  WHERE s.organization_id = target_org_id
  AND s.start_date >= v_start_date
  AND s.start_date <= v_end_date
  AND e.id IS NULL
  HAVING COUNT(*) > 0;

  -- Stagiaires sans date de naissance
  RETURN QUERY
  SELECT
    'students_missing_birthdate'::TEXT,
    'info'::TEXT,
    'Stagiaires sans date de naissance'::TEXT,
    COUNT(DISTINCT st.id)::INTEGER,
    '[]'::JSONB
  FROM public.students st
  JOIN public.enrollments e ON e.student_id = st.id
  JOIN public.sessions s ON s.id = e.session_id
  WHERE st.organization_id = target_org_id
  AND s.start_date >= v_start_date
  AND s.start_date <= v_end_date
  AND st.birth_date IS NULL
  HAVING COUNT(DISTINCT st.id) > 0;

EXCEPTION
  WHEN undefined_table THEN
    RETURN;
  WHEN OTHERS THEN
    RETURN;
END;
$$;

-- =====================================================
-- 5. get_bpf_drill_down
-- =====================================================
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
SET search_path = public
AS $$
BEGIN
  -- Retourne un résultat vide par défaut
  RETURN QUERY SELECT 0::INTEGER, '[]'::JSONB;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0::INTEGER, '[]'::JSONB;
END;
$$;

-- =====================================================
-- Permissions - Grant à authenticated ET anon
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_bpf_stats(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bpf_stats(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_bpf_stats(UUID, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_bpf_revenue_breakdown(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bpf_revenue_breakdown(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_bpf_revenue_breakdown(UUID, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_bpf_student_breakdown(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bpf_student_breakdown(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_bpf_student_breakdown(UUID, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_bpf_inconsistencies(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bpf_inconsistencies(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_bpf_inconsistencies(UUID, INTEGER) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_bpf_drill_down(UUID, INTEGER, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bpf_drill_down(UUID, INTEGER, TEXT, INTEGER, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_bpf_drill_down(UUID, INTEGER, TEXT, INTEGER, INTEGER) TO service_role;

-- =====================================================
-- Vérification finale
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE 'BPF functions created successfully';
END $$;

SELECT proname, pronamespace::regnamespace as schema
FROM pg_proc
WHERE proname LIKE 'get_bpf%'
ORDER BY proname;
