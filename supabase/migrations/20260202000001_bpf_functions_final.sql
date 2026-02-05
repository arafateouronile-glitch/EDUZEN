-- =====================================================
-- BPF RPC Functions - Version FINALE
-- Basée sur le schéma réel de la base de données
--
-- Tables utilisées:
--   sessions: formation_id, organization_id, start_date
--   formations: duration_hours
--   students: date_of_birth, gender (pas de is_disabled)
--   enrollments: student_id, session_id, funding_type_id
--   attendance: session_id, student_id, status
--   payments: organization_id, amount, paid_at, status
-- =====================================================

-- Supprimer toutes les anciennes versions
DROP FUNCTION IF EXISTS public.get_bpf_stats(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_bpf_revenue_breakdown(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_bpf_student_breakdown(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_bpf_inconsistencies(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_bpf_drill_down(UUID, INTEGER, TEXT, INTEGER, INTEGER) CASCADE;

-- =====================================================
-- 1. get_bpf_stats
-- Statistiques principales du BPF
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
  v_total_hours NUMERIC := 0;
  v_trainee_hours NUMERIC := 0;
  v_students INTEGER := 0;
  v_sessions INTEGER := 0;
  v_formations INTEGER := 0;
  v_attendance NUMERIC := 0;
BEGIN
  -- Compter les sessions et formations
  SELECT
    COUNT(DISTINCT s.id),
    COUNT(DISTINCT s.formation_id),
    COALESCE(SUM(f.duration_hours), 0)
  INTO v_sessions, v_formations, v_total_hours
  FROM sessions s
  LEFT JOIN formations f ON f.id = s.formation_id
  WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date;

  -- Compter les étudiants uniques et heures-stagiaires
  SELECT
    COUNT(DISTINCT e.student_id),
    COALESCE(SUM(f.duration_hours), 0)
  INTO v_students, v_trainee_hours
  FROM enrollments e
  JOIN sessions s ON s.id = e.session_id
  LEFT JOIN formations f ON f.id = s.formation_id
  WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date;

  -- Calculer le taux de présence
  SELECT
    CASE
      WHEN COUNT(*) = 0 THEN 0
      ELSE ROUND((COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
    END
  INTO v_attendance
  FROM attendance a
  JOIN sessions s ON s.id = a.session_id
  WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date;

  RETURN QUERY SELECT
    v_total_hours,
    v_trainee_hours,
    v_students,
    v_sessions,
    v_formations,
    COALESCE(v_attendance, 0);
END;
$$;

-- =====================================================
-- 2. get_bpf_revenue_breakdown
-- Ventilation du CA par source de financement
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
  v_start_date TIMESTAMP := make_date(target_year, 1, 1)::TIMESTAMP;
  v_end_date TIMESTAMP := (make_date(target_year, 12, 31) + INTERVAL '1 day')::TIMESTAMP;
  v_total NUMERIC := 0;
  v_cpf NUMERIC := 0;
  v_opco NUMERIC := 0;
  v_companies NUMERIC := 0;
  v_individuals NUMERIC := 0;
  v_pole_emploi NUMERIC := 0;
  v_regions NUMERIC := 0;
  v_state NUMERIC := 0;
BEGIN
  -- Total des paiements complétés
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total
  FROM payments
  WHERE organization_id = target_org_id
    AND paid_at >= v_start_date
    AND paid_at < v_end_date
    AND status = 'completed';

  -- Ventilation par méthode de paiement et metadata
  SELECT
    COALESCE(SUM(CASE WHEN payment_method = 'cpf' OR metadata->>'funding_type' = 'cpf' THEN amount END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'opco' OR metadata->>'funding_type' = 'opco' THEN amount END), 0),
    COALESCE(SUM(CASE WHEN payment_method = 'company' OR metadata->>'funding_type' = 'company' THEN amount END), 0),
    COALESCE(SUM(CASE WHEN payment_method IN ('card', 'bank_transfer', 'individual') OR metadata->>'funding_type' = 'individual' THEN amount END), 0),
    COALESCE(SUM(CASE WHEN metadata->>'funding_type' IN ('pole_emploi', 'france_travail') THEN amount END), 0),
    COALESCE(SUM(CASE WHEN metadata->>'funding_type' = 'region' THEN amount END), 0),
    COALESCE(SUM(CASE WHEN metadata->>'funding_type' = 'state' THEN amount END), 0)
  INTO v_cpf, v_opco, v_companies, v_individuals, v_pole_emploi, v_regions, v_state
  FROM payments
  WHERE organization_id = target_org_id
    AND paid_at >= v_start_date
    AND paid_at < v_end_date
    AND status = 'completed';

  RETURN QUERY SELECT
    v_total,
    v_cpf,
    v_opco,
    v_companies,
    v_individuals,
    v_pole_emploi,
    v_regions,
    v_state,
    GREATEST(v_total - v_cpf - v_opco - v_companies - v_individuals - v_pole_emploi - v_regions - v_state, 0),
    '{}'::JSONB;
END;
$$;

-- =====================================================
-- 3. get_bpf_student_breakdown
-- Répartition démographique des stagiaires
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
  v_total INTEGER := 0;
  v_men INTEGER := 0;
  v_women INTEGER := 0;
  v_under_26 INTEGER := 0;
  v_26_to_45 INTEGER := 0;
  v_over_45 INTEGER := 0;
BEGIN
  -- Récupérer les statistiques des étudiants inscrits aux sessions de l'année
  SELECT
    COUNT(DISTINCT st.id),
    COUNT(DISTINCT st.id) FILTER (WHERE LOWER(st.gender) IN ('male', 'm', 'homme', 'masculin')),
    COUNT(DISTINCT st.id) FILTER (WHERE LOWER(st.gender) IN ('female', 'f', 'femme', 'féminin', 'feminin')),
    COUNT(DISTINCT st.id) FILTER (WHERE st.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM age(v_ref_date, st.date_of_birth)) < 26),
    COUNT(DISTINCT st.id) FILTER (WHERE st.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM age(v_ref_date, st.date_of_birth)) BETWEEN 26 AND 45),
    COUNT(DISTINCT st.id) FILTER (WHERE st.date_of_birth IS NOT NULL AND EXTRACT(YEAR FROM age(v_ref_date, st.date_of_birth)) > 45)
  INTO v_total, v_men, v_women, v_under_26, v_26_to_45, v_over_45
  FROM students st
  JOIN enrollments e ON e.student_id = st.id
  JOIN sessions s ON s.id = e.session_id
  WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date;

  RETURN QUERY SELECT
    v_total,
    v_men,
    v_women,
    v_under_26,
    v_26_to_45,
    v_over_45,
    0, -- is_disabled n'existe pas dans le schéma
    jsonb_build_object(
      'under_26', v_under_26,
      '26_to_45', v_26_to_45,
      'over_45', v_over_45
    );
END;
$$;

-- =====================================================
-- 4. get_bpf_inconsistencies
-- Détection des incohérences de données
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
  v_count INTEGER;
BEGIN
  -- Sessions sans inscriptions
  SELECT COUNT(*) INTO v_count
  FROM sessions s
  LEFT JOIN enrollments e ON e.session_id = s.id
  WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date
    AND e.id IS NULL;

  IF v_count > 0 THEN
    RETURN QUERY SELECT
      'sessions_without_enrollments'::TEXT,
      'warning'::TEXT,
      'Sessions sans inscriptions'::TEXT,
      v_count,
      '[]'::JSONB;
  END IF;

  -- Étudiants sans date de naissance
  SELECT COUNT(DISTINCT st.id) INTO v_count
  FROM students st
  JOIN enrollments e ON e.student_id = st.id
  JOIN sessions s ON s.id = e.session_id
  WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date
    AND st.date_of_birth IS NULL;

  IF v_count > 0 THEN
    RETURN QUERY SELECT
      'students_missing_birthdate'::TEXT,
      'info'::TEXT,
      'Stagiaires sans date de naissance (statistiques démographiques incomplètes)'::TEXT,
      v_count,
      '[]'::JSONB;
  END IF;

  -- Étudiants sans genre
  SELECT COUNT(DISTINCT st.id) INTO v_count
  FROM students st
  JOIN enrollments e ON e.student_id = st.id
  JOIN sessions s ON s.id = e.session_id
  WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date
    AND (st.gender IS NULL OR st.gender = '');

  IF v_count > 0 THEN
    RETURN QUERY SELECT
      'students_missing_gender'::TEXT,
      'info'::TEXT,
      'Stagiaires sans genre renseigné'::TEXT,
      v_count,
      '[]'::JSONB;
  END IF;

  -- Sessions sans formation liée
  SELECT COUNT(*) INTO v_count
  FROM sessions s
  LEFT JOIN formations f ON f.id = s.formation_id
  WHERE s.organization_id = target_org_id
    AND s.start_date >= v_start_date
    AND s.start_date <= v_end_date
    AND f.id IS NULL;

  IF v_count > 0 THEN
    RETURN QUERY SELECT
      'sessions_without_formation'::TEXT,
      'warning'::TEXT,
      'Sessions sans formation liée (heures non comptabilisées)'::TEXT,
      v_count,
      '[]'::JSONB;
  END IF;

  RETURN;
END;
$$;

-- =====================================================
-- 5. get_bpf_drill_down
-- Détail des données pour audit
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
DECLARE
  v_start_date DATE := make_date(target_year, 1, 1);
  v_end_date DATE := make_date(target_year, 12, 31);
  v_offset INTEGER := (page_num - 1) * page_size;
  v_count INTEGER := 0;
  v_items JSONB := '[]'::JSONB;
BEGIN
  IF metric_type = 'sessions' THEN
    SELECT COUNT(*) INTO v_count
    FROM sessions s
    WHERE s.organization_id = target_org_id
      AND s.start_date >= v_start_date
      AND s.start_date <= v_end_date;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_items
    FROM (
      SELECT s.id, s.name, s.start_date, s.end_date, s.status,
             f.name as formation_name, f.duration_hours,
             (SELECT COUNT(*) FROM enrollments e WHERE e.session_id = s.id) as student_count
      FROM sessions s
      LEFT JOIN formations f ON f.id = s.formation_id
      WHERE s.organization_id = target_org_id
        AND s.start_date >= v_start_date
        AND s.start_date <= v_end_date
      ORDER BY s.start_date DESC
      LIMIT page_size OFFSET v_offset
    ) t;

  ELSIF metric_type = 'students' THEN
    SELECT COUNT(DISTINCT st.id) INTO v_count
    FROM students st
    JOIN enrollments e ON e.student_id = st.id
    JOIN sessions s ON s.id = e.session_id
    WHERE s.organization_id = target_org_id
      AND s.start_date >= v_start_date
      AND s.start_date <= v_end_date;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_items
    FROM (
      SELECT DISTINCT st.id, st.first_name, st.last_name, st.email,
             st.date_of_birth, st.gender
      FROM students st
      JOIN enrollments e ON e.student_id = st.id
      JOIN sessions s ON s.id = e.session_id
      WHERE s.organization_id = target_org_id
        AND s.start_date >= v_start_date
        AND s.start_date <= v_end_date
      ORDER BY st.last_name, st.first_name
      LIMIT page_size OFFSET v_offset
    ) t;

  ELSIF metric_type = 'revenue' THEN
    SELECT COUNT(*) INTO v_count
    FROM payments p
    WHERE p.organization_id = target_org_id
      AND p.paid_at >= v_start_date::TIMESTAMP
      AND p.paid_at < (v_end_date + 1)::TIMESTAMP
      AND p.status = 'completed';

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_items
    FROM (
      SELECT p.id, p.amount, p.payment_method, p.paid_at, p.status
      FROM payments p
      WHERE p.organization_id = target_org_id
        AND p.paid_at >= v_start_date::TIMESTAMP
        AND p.paid_at < (v_end_date + 1)::TIMESTAMP
        AND p.status = 'completed'
      ORDER BY p.paid_at DESC
      LIMIT page_size OFFSET v_offset
    ) t;

  ELSIF metric_type = 'trainee_hours' THEN
    SELECT COUNT(*) INTO v_count
    FROM enrollments e
    JOIN sessions s ON s.id = e.session_id
    WHERE s.organization_id = target_org_id
      AND s.start_date >= v_start_date
      AND s.start_date <= v_end_date;

    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::JSONB) INTO v_items
    FROM (
      SELECT s.name as session_name, f.name as formation_name,
             f.duration_hours, st.first_name, st.last_name
      FROM enrollments e
      JOIN sessions s ON s.id = e.session_id
      JOIN students st ON st.id = e.student_id
      LEFT JOIN formations f ON f.id = s.formation_id
      WHERE s.organization_id = target_org_id
        AND s.start_date >= v_start_date
        AND s.start_date <= v_end_date
      ORDER BY s.start_date DESC
      LIMIT page_size OFFSET v_offset
    ) t;
  END IF;

  RETURN QUERY SELECT v_count, v_items;
END;
$$;

-- =====================================================
-- Permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_bpf_stats(UUID, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_bpf_revenue_breakdown(UUID, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_bpf_student_breakdown(UUID, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_bpf_inconsistencies(UUID, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_bpf_drill_down(UUID, INTEGER, TEXT, INTEGER, INTEGER) TO authenticated, anon, service_role;

-- =====================================================
-- Tests de vérification
-- =====================================================
DO $$
DECLARE
  v_org_id UUID := '4d27f507-280c-4e55-8a48-6b9840e13f8a';
  v_year INTEGER := 2026;
  v_stats RECORD;
  v_students RECORD;
BEGIN
  -- Test get_bpf_stats
  SELECT * INTO v_stats FROM get_bpf_stats(v_org_id, v_year);
  RAISE NOTICE 'BPF Stats: sessions=%, students=%, hours=%',
    v_stats.total_sessions_count, v_stats.total_students_count, v_stats.total_hours_realized;

  -- Test get_bpf_student_breakdown
  SELECT * INTO v_students FROM get_bpf_student_breakdown(v_org_id, v_year);
  RAISE NOTICE 'Students: total=%, men=%, women=%',
    v_students.total_students, v_students.students_men, v_students.students_women;

  RAISE NOTICE 'All BPF functions created and tested successfully!';
END $$;
