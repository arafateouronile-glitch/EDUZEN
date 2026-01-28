-- =====================================================
-- EDUZEN - BPF Magic Engine
-- =====================================================
-- Description: Moteur de calcul avancé pour le BPF One-Click
-- Fonctionnalités:
--   - Calcul précis des heures-stagiaires basé sur les émargements
--   - Ventilation automatique du CA par source de financement
--   - Détection des incohérences de données
--   - Drill-down sur les chiffres
-- Date: 2026-01-24
-- =====================================================

-- =====================================================
-- 1. AJOUT COLONNE BPF_CATEGORY À FUNDING_TYPES
-- =====================================================

-- Ajouter la colonne bpf_category pour mapper les types de financement aux catégories BPF
ALTER TABLE public.funding_types
  ADD COLUMN IF NOT EXISTS bpf_category VARCHAR(50)
  CHECK (bpf_category IN ('cpf', 'opco', 'companies', 'individuals', 'pole_emploi', 'regions', 'state', 'other'));

COMMENT ON COLUMN public.funding_types.bpf_category IS 'Catégorie BPF pour la ventilation du chiffre d''affaires (cpf, opco, companies, individuals, pole_emploi, regions, state, other)';

-- Index pour améliorer les requêtes BPF
CREATE INDEX IF NOT EXISTS idx_funding_types_bpf_category ON public.funding_types(bpf_category) WHERE bpf_category IS NOT NULL;

-- =====================================================
-- 2. FONCTION: get_bpf_stats
-- Calcul précis des heures-stagiaires basé sur les émargements
-- =====================================================

CREATE OR REPLACE FUNCTION get_bpf_stats(
  target_org_id UUID,
  target_year INTEGER
)
RETURNS TABLE (
  total_hours_realized NUMERIC,
  total_trainee_hours NUMERIC,
  total_students_count BIGINT,
  total_sessions_count BIGINT,
  total_programs_count BIGINT,
  attendance_rate NUMERIC
) AS $$
DECLARE
  start_date DATE := (target_year || '-01-01')::DATE;
  end_date DATE := (target_year || '-12-31')::DATE;
BEGIN
  RETURN QUERY
  WITH session_data AS (
    -- Récupérer tous les créneaux de formation de l'année pour l'organisme
    SELECT
      s.id as session_id,
      sl.id as slot_id,
      -- Calcul de la durée du créneau en heures (différence entre fin et début)
      EXTRACT(EPOCH FROM (sl.end_time - sl.start_time)) / 3600.0 AS slot_duration_hours
    FROM sessions s
    JOIN session_slots sl ON sl.session_id = s.id
    WHERE s.organization_id = target_org_id
    AND sl.date >= start_date
    AND sl.date <= end_date
  ),
  attendance_data AS (
    -- Compter les signatures électroniques pour chaque créneau
    SELECT
      eas.session_id,
      COUNT(DISTINCT ear.student_id) as present_count
    FROM electronic_attendance_sessions eas
    JOIN electronic_attendance_requests ear ON ear.attendance_session_id = eas.id
    WHERE eas.organization_id = target_org_id
    AND eas.date >= start_date
    AND eas.date <= end_date
    AND ear.status = 'signed'
    GROUP BY eas.session_id
  ),
  enrollment_data AS (
    -- Compter les inscriptions par session pour le calcul du taux de présence
    SELECT
      e.session_id,
      COUNT(DISTINCT e.student_id) as enrolled_count
    FROM enrollments e
    JOIN sessions s ON s.id = e.session_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= start_date
    AND s.start_date <= end_date
    AND e.status IN ('confirmed', 'completed')
    GROUP BY e.session_id
  ),
  calculated_hours AS (
    SELECT
      -- Somme des heures de créneaux (heures de formation dispensées)
      COALESCE(SUM(sd.slot_duration_hours), 0) as total_hours,
      -- Somme de (durée du créneau * nombre de présents) = heures-stagiaires
      COALESCE(SUM(sd.slot_duration_hours * COALESCE(ad.present_count, 0)), 0) as trainee_hours,
      -- Nombre de sessions uniques
      COUNT(DISTINCT sd.session_id) as session_count
    FROM session_data sd
    LEFT JOIN attendance_data ad ON sd.session_id = ad.session_id
  ),
  student_stats AS (
    -- Nombre de stagiaires uniques formés dans l'année
    SELECT COUNT(DISTINCT e.student_id) as unique_students
    FROM enrollments e
    JOIN sessions s ON s.id = e.session_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= start_date
    AND s.start_date <= end_date
    AND e.status IN ('confirmed', 'completed')
  ),
  program_stats AS (
    -- Nombre de programmes uniques
    SELECT COUNT(DISTINCT s.program_id) as unique_programs
    FROM sessions s
    WHERE s.organization_id = target_org_id
    AND s.start_date >= start_date
    AND s.start_date <= end_date
  ),
  attendance_rate_calc AS (
    -- Calcul du taux de présence global
    SELECT
      CASE
        WHEN SUM(ed.enrolled_count) > 0 THEN
          ROUND((SUM(COALESCE(ad.present_count, 0))::NUMERIC / SUM(ed.enrolled_count)::NUMERIC) * 100, 2)
        ELSE 0
      END as rate
    FROM enrollment_data ed
    LEFT JOIN attendance_data ad ON ed.session_id = ad.session_id
  )
  SELECT
    ROUND(ch.total_hours::NUMERIC, 2) as total_hours_realized,
    ROUND(ch.trainee_hours::NUMERIC, 2) as total_trainee_hours,
    COALESCE(ss.unique_students, 0) as total_students_count,
    ch.session_count as total_sessions_count,
    COALESCE(ps.unique_programs, 0) as total_programs_count,
    COALESCE(arc.rate, 0) as attendance_rate
  FROM calculated_hours ch
  CROSS JOIN student_stats ss
  CROSS JOIN program_stats ps
  CROSS JOIN attendance_rate_calc arc;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_bpf_stats IS 'Calcule les statistiques BPF précises basées sur les émargements électroniques';

-- =====================================================
-- 3. FONCTION: get_bpf_revenue_breakdown
-- Ventilation du CA par source de financement
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
  WITH enrollment_revenue AS (
    -- Récupérer les revenus des inscriptions avec leur type de financement
    SELECT
      e.id as enrollment_id,
      e.total_amount,
      COALESCE(ft.bpf_category, 'other') as bpf_category,
      ft.name as funding_name,
      s.id as session_id,
      s.name as session_name,
      st.id as student_id,
      CONCAT(st.first_name, ' ', st.last_name) as student_name
    FROM enrollments e
    JOIN sessions s ON s.id = e.session_id
    JOIN students st ON st.id = e.student_id
    LEFT JOIN funding_types ft ON ft.id = e.funding_type_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= start_date
    AND s.start_date <= end_date
    AND e.status IN ('confirmed', 'completed')
  ),
  payment_revenue AS (
    -- Alternative: revenus des paiements confirmés
    SELECT
      COALESCE(SUM(p.amount), 0) as total_payments
    FROM payments p
    WHERE p.organization_id = target_org_id
    AND p.payment_date >= start_date
    AND p.payment_date <= end_date
    AND p.status = 'completed'
  ),
  revenue_by_category AS (
    SELECT
      bpf_category,
      SUM(total_amount) as amount,
      COUNT(DISTINCT enrollment_id) as enrollment_count,
      jsonb_agg(
        jsonb_build_object(
          'enrollment_id', enrollment_id,
          'amount', total_amount,
          'funding_name', funding_name,
          'session_name', session_name,
          'student_name', student_name
        )
        ORDER BY total_amount DESC
      ) as details
    FROM enrollment_revenue
    GROUP BY bpf_category
  ),
  total_calc AS (
    SELECT COALESCE(SUM(total_amount), 0) as total FROM enrollment_revenue
  )
  SELECT
    tc.total as total_revenue,
    COALESCE((SELECT amount FROM revenue_by_category WHERE bpf_category = 'cpf'), 0) as revenue_cpf,
    COALESCE((SELECT amount FROM revenue_by_category WHERE bpf_category = 'opco'), 0) as revenue_opco,
    COALESCE((SELECT amount FROM revenue_by_category WHERE bpf_category = 'companies'), 0) as revenue_companies,
    COALESCE((SELECT amount FROM revenue_by_category WHERE bpf_category = 'individuals'), 0) as revenue_individuals,
    COALESCE((SELECT amount FROM revenue_by_category WHERE bpf_category = 'pole_emploi'), 0) as revenue_pole_emploi,
    COALESCE((SELECT amount FROM revenue_by_category WHERE bpf_category = 'regions'), 0) as revenue_regions,
    COALESCE((SELECT amount FROM revenue_by_category WHERE bpf_category = 'state'), 0) as revenue_state,
    COALESCE((SELECT amount FROM revenue_by_category WHERE bpf_category = 'other'), 0) as revenue_other,
    COALESCE(
      (SELECT jsonb_object_agg(bpf_category, details) FROM revenue_by_category),
      '{}'::jsonb
    ) as breakdown_details
  FROM total_calc tc;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_bpf_revenue_breakdown IS 'Calcule la ventilation du CA par source de financement pour le BPF';

-- =====================================================
-- 4. FONCTION: get_bpf_inconsistencies
-- Détection des incohérences de données
-- =====================================================

CREATE OR REPLACE FUNCTION get_bpf_inconsistencies(
  target_org_id UUID,
  target_year INTEGER
)
RETURNS TABLE (
  inconsistency_type VARCHAR(100),
  severity VARCHAR(20),
  description TEXT,
  affected_count INTEGER,
  details JSONB
) AS $$
DECLARE
  start_date DATE := (target_year || '-01-01')::DATE;
  end_date DATE := (target_year || '-12-31')::DATE;
BEGIN
  -- 1. Inscriptions sans type de financement
  RETURN QUERY
  SELECT
    'missing_funding_type'::VARCHAR(100) as inconsistency_type,
    'warning'::VARCHAR(20) as severity,
    'Inscriptions sans type de financement renseigné'::TEXT as description,
    COUNT(*)::INTEGER as affected_count,
    jsonb_agg(
      jsonb_build_object(
        'enrollment_id', e.id,
        'student_name', CONCAT(st.first_name, ' ', st.last_name),
        'session_name', s.name,
        'amount', e.total_amount
      )
    ) as details
  FROM enrollments e
  JOIN sessions s ON s.id = e.session_id
  JOIN students st ON st.id = e.student_id
  WHERE s.organization_id = target_org_id
  AND s.start_date >= start_date
  AND s.start_date <= end_date
  AND e.funding_type_id IS NULL
  AND e.status IN ('confirmed', 'completed')
  GROUP BY 1, 2, 3
  HAVING COUNT(*) > 0;

  -- 2. Sessions sans émargements
  RETURN QUERY
  SELECT
    'missing_attendance'::VARCHAR(100) as inconsistency_type,
    'critical'::VARCHAR(20) as severity,
    'Sessions terminées sans aucun émargement enregistré'::TEXT as description,
    COUNT(DISTINCT s.id)::INTEGER as affected_count,
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'session_id', s.id,
        'session_name', s.name,
        'start_date', s.start_date,
        'enrolled_count', (SELECT COUNT(*) FROM enrollments WHERE session_id = s.id AND status IN ('confirmed', 'completed'))
      )
    ) as details
  FROM sessions s
  WHERE s.organization_id = target_org_id
  AND s.start_date >= start_date
  AND s.end_date <= end_date
  AND s.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM electronic_attendance_sessions eas
    WHERE eas.session_id = s.id
    AND eas.status = 'closed'
  )
  GROUP BY 1, 2, 3
  HAVING COUNT(DISTINCT s.id) > 0;

  -- 3. Étudiants sans informations démographiques complètes
  RETURN QUERY
  SELECT
    'incomplete_student_data'::VARCHAR(100) as inconsistency_type,
    'warning'::VARCHAR(20) as severity,
    'Stagiaires avec informations démographiques incomplètes (genre, date de naissance)'::TEXT as description,
    COUNT(DISTINCT st.id)::INTEGER as affected_count,
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'student_id', st.id,
        'student_name', CONCAT(st.first_name, ' ', st.last_name),
        'missing_gender', (st.gender IS NULL),
        'missing_birth_date', (st.birth_date IS NULL)
      )
    ) as details
  FROM students st
  JOIN enrollments e ON e.student_id = st.id
  JOIN sessions s ON s.id = e.session_id
  WHERE s.organization_id = target_org_id
  AND s.start_date >= start_date
  AND s.start_date <= end_date
  AND (st.gender IS NULL OR st.birth_date IS NULL)
  GROUP BY 1, 2, 3
  HAVING COUNT(DISTINCT st.id) > 0;

  -- 4. Paiements non liés à des inscriptions
  RETURN QUERY
  SELECT
    'orphan_payments'::VARCHAR(100) as inconsistency_type,
    'info'::VARCHAR(20) as severity,
    'Paiements non rattachés à une inscription spécifique'::TEXT as description,
    COUNT(*)::INTEGER as affected_count,
    jsonb_agg(
      jsonb_build_object(
        'payment_id', p.id,
        'amount', p.amount,
        'payment_date', p.payment_date
      )
    ) as details
  FROM payments p
  WHERE p.organization_id = target_org_id
  AND p.payment_date >= start_date
  AND p.payment_date <= end_date
  AND p.status = 'completed'
  AND p.enrollment_id IS NULL
  GROUP BY 1, 2, 3
  HAVING COUNT(*) > 0;

  -- 5. Types de financement sans catégorie BPF
  RETURN QUERY
  SELECT
    'funding_type_no_bpf_category'::VARCHAR(100) as inconsistency_type,
    'critical'::VARCHAR(20) as severity,
    'Types de financement utilisés sans catégorie BPF configurée'::TEXT as description,
    COUNT(DISTINCT ft.id)::INTEGER as affected_count,
    jsonb_agg(
      DISTINCT jsonb_build_object(
        'funding_type_id', ft.id,
        'funding_name', ft.name,
        'enrollment_count', (
          SELECT COUNT(*) FROM enrollments e2
          JOIN sessions s2 ON s2.id = e2.session_id
          WHERE e2.funding_type_id = ft.id
          AND s2.start_date >= start_date
          AND s2.start_date <= end_date
        )
      )
    ) as details
  FROM funding_types ft
  JOIN enrollments e ON e.funding_type_id = ft.id
  JOIN sessions s ON s.id = e.session_id
  WHERE ft.organization_id = target_org_id
  AND s.start_date >= start_date
  AND s.start_date <= end_date
  AND ft.bpf_category IS NULL
  AND ft.is_active = true
  GROUP BY 1, 2, 3
  HAVING COUNT(DISTINCT ft.id) > 0;

  -- 6. Sessions avec taux de présence anormalement bas
  RETURN QUERY
  WITH session_attendance AS (
    SELECT
      s.id as session_id,
      s.name as session_name,
      COUNT(DISTINCT e.student_id) as enrolled,
      COUNT(DISTINCT CASE WHEN ear.status = 'signed' THEN ear.student_id END) as present,
      CASE
        WHEN COUNT(DISTINCT e.student_id) > 0 THEN
          ROUND((COUNT(DISTINCT CASE WHEN ear.status = 'signed' THEN ear.student_id END)::NUMERIC / COUNT(DISTINCT e.student_id)::NUMERIC) * 100, 2)
        ELSE 0
      END as attendance_rate
    FROM sessions s
    JOIN enrollments e ON e.session_id = s.id
    LEFT JOIN electronic_attendance_sessions eas ON eas.session_id = s.id
    LEFT JOIN electronic_attendance_requests ear ON ear.attendance_session_id = eas.id AND ear.student_id = e.student_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= start_date
    AND s.end_date <= end_date
    AND s.status = 'completed'
    GROUP BY s.id, s.name
    HAVING COUNT(DISTINCT e.student_id) >= 3  -- Au moins 3 inscrits
  )
  SELECT
    'low_attendance_rate'::VARCHAR(100) as inconsistency_type,
    'warning'::VARCHAR(20) as severity,
    'Sessions avec taux de présence inférieur à 50%'::TEXT as description,
    COUNT(*)::INTEGER as affected_count,
    jsonb_agg(
      jsonb_build_object(
        'session_id', sa.session_id,
        'session_name', sa.session_name,
        'enrolled', sa.enrolled,
        'present', sa.present,
        'attendance_rate', sa.attendance_rate
      )
    ) as details
  FROM session_attendance sa
  WHERE sa.attendance_rate < 50
  GROUP BY 1, 2, 3
  HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_bpf_inconsistencies IS 'Détecte les incohérences de données qui pourraient fausser le BPF';

-- =====================================================
-- 5. FONCTION: get_bpf_student_breakdown
-- Détail des stagiaires pour le BPF (démographie)
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
  reference_date DATE := end_date;
BEGIN
  RETURN QUERY
  WITH student_data AS (
    SELECT DISTINCT
      st.id,
      st.gender,
      st.birth_date,
      st.disability_status,
      CASE
        WHEN st.birth_date IS NOT NULL THEN
          EXTRACT(YEAR FROM AGE(reference_date, st.birth_date))
        ELSE NULL
      END as age
    FROM students st
    JOIN enrollments e ON e.student_id = st.id
    JOIN sessions s ON s.id = e.session_id
    WHERE s.organization_id = target_org_id
    AND s.start_date >= start_date
    AND s.start_date <= end_date
    AND e.status IN ('confirmed', 'completed')
  ),
  age_groups AS (
    SELECT
      CASE
        WHEN age IS NULL THEN 'unknown'
        WHEN age < 18 THEN 'under_18'
        WHEN age < 26 THEN '18_25'
        WHEN age < 35 THEN '26_34'
        WHEN age < 45 THEN '35_44'
        WHEN age < 55 THEN '45_54'
        ELSE '55_plus'
      END as age_group,
      COUNT(*) as count
    FROM student_data
    GROUP BY 1
  )
  SELECT
    COUNT(*)::INTEGER as total_students,
    COUNT(*) FILTER (WHERE gender = 'male')::INTEGER as students_men,
    COUNT(*) FILTER (WHERE gender = 'female')::INTEGER as students_women,
    COUNT(*) FILTER (WHERE age IS NOT NULL AND age < 26)::INTEGER as students_under_26,
    COUNT(*) FILTER (WHERE age IS NOT NULL AND age >= 26 AND age <= 45)::INTEGER as students_26_to_45,
    COUNT(*) FILTER (WHERE age IS NOT NULL AND age > 45)::INTEGER as students_over_45,
    COUNT(*) FILTER (WHERE disability_status = true)::INTEGER as students_disabled,
    (SELECT jsonb_object_agg(age_group, count) FROM age_groups) as age_breakdown
  FROM student_data;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_bpf_student_breakdown IS 'Calcule la répartition démographique des stagiaires pour le BPF';

-- =====================================================
-- 6. FONCTION: get_bpf_drill_down
-- Drill-down sur un chiffre spécifique du BPF
-- =====================================================

CREATE OR REPLACE FUNCTION get_bpf_drill_down(
  target_org_id UUID,
  target_year INTEGER,
  metric_type VARCHAR(50),
  page_num INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 50
)
RETURNS TABLE (
  total_count BIGINT,
  items JSONB
) AS $$
DECLARE
  start_date DATE := (target_year || '-01-01')::DATE;
  end_date DATE := (target_year || '-12-31')::DATE;
  offset_val INTEGER := (page_num - 1) * page_size;
BEGIN
  CASE metric_type
    -- Drill-down sur les heures-stagiaires
    WHEN 'trainee_hours' THEN
      RETURN QUERY
      WITH slot_hours AS (
        SELECT
          sl.id as slot_id,
          sl.date as slot_date,
          s.id as session_id,
          s.name as session_name,
          EXTRACT(EPOCH FROM (sl.end_time - sl.start_time)) / 3600.0 as slot_hours,
          COUNT(DISTINCT ear.student_id) as present_count,
          EXTRACT(EPOCH FROM (sl.end_time - sl.start_time)) / 3600.0 * COUNT(DISTINCT ear.student_id) as trainee_hours
        FROM session_slots sl
        JOIN sessions s ON s.id = sl.session_id
        LEFT JOIN electronic_attendance_sessions eas ON eas.session_id = s.id AND eas.date = sl.date
        LEFT JOIN electronic_attendance_requests ear ON ear.attendance_session_id = eas.id AND ear.status = 'signed'
        WHERE s.organization_id = target_org_id
        AND sl.date >= start_date
        AND sl.date <= end_date
        GROUP BY sl.id, sl.date, s.id, s.name, sl.start_time, sl.end_time
        ORDER BY sl.date DESC, trainee_hours DESC
      )
      SELECT
        COUNT(*) OVER() as total_count,
        jsonb_agg(
          jsonb_build_object(
            'slot_id', sh.slot_id,
            'slot_date', sh.slot_date,
            'session_id', sh.session_id,
            'session_name', sh.session_name,
            'slot_hours', ROUND(sh.slot_hours::NUMERIC, 2),
            'present_count', sh.present_count,
            'trainee_hours', ROUND(sh.trainee_hours::NUMERIC, 2)
          )
        ) as items
      FROM (SELECT * FROM slot_hours LIMIT page_size OFFSET offset_val) sh;

    -- Drill-down sur le chiffre d'affaires
    WHEN 'revenue' THEN
      RETURN QUERY
      WITH revenue_items AS (
        SELECT
          e.id as enrollment_id,
          e.total_amount,
          COALESCE(ft.name, 'Non spécifié') as funding_name,
          COALESCE(ft.bpf_category, 'other') as bpf_category,
          s.id as session_id,
          s.name as session_name,
          st.id as student_id,
          CONCAT(st.first_name, ' ', st.last_name) as student_name,
          e.created_at
        FROM enrollments e
        JOIN sessions s ON s.id = e.session_id
        JOIN students st ON st.id = e.student_id
        LEFT JOIN funding_types ft ON ft.id = e.funding_type_id
        WHERE s.organization_id = target_org_id
        AND s.start_date >= start_date
        AND s.start_date <= end_date
        AND e.status IN ('confirmed', 'completed')
        ORDER BY e.total_amount DESC, e.created_at DESC
      )
      SELECT
        COUNT(*) OVER() as total_count,
        jsonb_agg(
          jsonb_build_object(
            'enrollment_id', ri.enrollment_id,
            'amount', ri.total_amount,
            'funding_name', ri.funding_name,
            'bpf_category', ri.bpf_category,
            'session_id', ri.session_id,
            'session_name', ri.session_name,
            'student_id', ri.student_id,
            'student_name', ri.student_name
          )
        ) as items
      FROM (SELECT * FROM revenue_items LIMIT page_size OFFSET offset_val) ri;

    -- Drill-down sur les stagiaires
    WHEN 'students' THEN
      RETURN QUERY
      WITH student_items AS (
        SELECT DISTINCT
          st.id as student_id,
          CONCAT(st.first_name, ' ', st.last_name) as student_name,
          st.email,
          st.gender,
          st.birth_date,
          COUNT(DISTINCT e.session_id) as sessions_count,
          SUM(e.total_amount) as total_spent
        FROM students st
        JOIN enrollments e ON e.student_id = st.id
        JOIN sessions s ON s.id = e.session_id
        WHERE s.organization_id = target_org_id
        AND s.start_date >= start_date
        AND s.start_date <= end_date
        AND e.status IN ('confirmed', 'completed')
        GROUP BY st.id, st.first_name, st.last_name, st.email, st.gender, st.birth_date
        ORDER BY sessions_count DESC, student_name
      )
      SELECT
        COUNT(*) OVER() as total_count,
        jsonb_agg(
          jsonb_build_object(
            'student_id', si.student_id,
            'student_name', si.student_name,
            'email', si.email,
            'gender', si.gender,
            'birth_date', si.birth_date,
            'sessions_count', si.sessions_count,
            'total_spent', si.total_spent
          )
        ) as items
      FROM (SELECT * FROM student_items LIMIT page_size OFFSET offset_val) si;

    -- Drill-down sur les sessions
    WHEN 'sessions' THEN
      RETURN QUERY
      WITH session_items AS (
        SELECT
          s.id as session_id,
          s.name as session_name,
          s.start_date,
          s.end_date,
          s.status,
          p.name as program_name,
          COUNT(DISTINCT e.student_id) as enrolled_count,
          SUM(e.total_amount) as total_revenue
        FROM sessions s
        LEFT JOIN programs p ON p.id = s.program_id
        LEFT JOIN enrollments e ON e.session_id = s.id AND e.status IN ('confirmed', 'completed')
        WHERE s.organization_id = target_org_id
        AND s.start_date >= start_date
        AND s.start_date <= end_date
        GROUP BY s.id, s.name, s.start_date, s.end_date, s.status, p.name
        ORDER BY s.start_date DESC
      )
      SELECT
        COUNT(*) OVER() as total_count,
        jsonb_agg(
          jsonb_build_object(
            'session_id', si.session_id,
            'session_name', si.session_name,
            'start_date', si.start_date,
            'end_date', si.end_date,
            'status', si.status,
            'program_name', si.program_name,
            'enrolled_count', si.enrolled_count,
            'total_revenue', si.total_revenue
          )
        ) as items
      FROM (SELECT * FROM session_items LIMIT page_size OFFSET offset_val) si;

    ELSE
      -- Type de métrique inconnu
      RETURN QUERY SELECT 0::BIGINT, '[]'::JSONB;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_bpf_drill_down IS 'Permet d''explorer le détail d''une métrique BPF (heures, CA, stagiaires, sessions)';

-- =====================================================
-- 7. VUE: bpf_summary_view
-- Vue résumée des données BPF pour l'année en cours
-- =====================================================

CREATE OR REPLACE VIEW public.bpf_current_year_summary AS
WITH current_year AS (
  SELECT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER as year
)
SELECT
  o.id as organization_id,
  o.name as organization_name,
  cy.year,
  stats.total_hours_realized,
  stats.total_trainee_hours,
  stats.total_students_count,
  stats.total_sessions_count,
  stats.total_programs_count,
  stats.attendance_rate,
  revenue.total_revenue,
  revenue.revenue_cpf,
  revenue.revenue_opco,
  revenue.revenue_companies,
  revenue.revenue_individuals,
  revenue.revenue_pole_emploi,
  revenue.revenue_regions,
  revenue.revenue_state,
  revenue.revenue_other
FROM organizations o
CROSS JOIN current_year cy
LEFT JOIN LATERAL get_bpf_stats(o.id, cy.year) stats ON true
LEFT JOIN LATERAL get_bpf_revenue_breakdown(o.id, cy.year) revenue ON true;

COMMENT ON VIEW bpf_current_year_summary IS 'Résumé BPF de l''année en cours pour toutes les organisations';

-- =====================================================
-- 8. MISE À JOUR DE calculate_bpf_metrics
-- Version améliorée utilisant les nouvelles fonctions
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_bpf_metrics(
  org_id UUID,
  year_val INTEGER
)
RETURNS JSONB AS $$
DECLARE
  metrics JSONB := '{}'::jsonb;
  stats_result RECORD;
  revenue_result RECORD;
  student_result RECORD;
BEGIN
  -- Récupérer les statistiques de base
  BEGIN
    SELECT * INTO stats_result FROM get_bpf_stats(org_id, year_val);
    metrics := metrics || jsonb_build_object(
      'total_training_hours', COALESCE(stats_result.total_hours_realized, 0),
      'total_trainee_hours', COALESCE(stats_result.total_trainee_hours, 0),
      'total_students', COALESCE(stats_result.total_students_count, 0),
      'total_sessions', COALESCE(stats_result.total_sessions_count, 0),
      'total_programs', COALESCE(stats_result.total_programs_count, 0)
    );
  EXCEPTION WHEN OTHERS THEN
    metrics := metrics || jsonb_build_object(
      'total_training_hours', 0,
      'total_trainee_hours', 0,
      'total_students', 0,
      'total_sessions', 0,
      'total_programs', 0
    );
  END;

  -- Récupérer la ventilation du CA
  BEGIN
    SELECT * INTO revenue_result FROM get_bpf_revenue_breakdown(org_id, year_val);
    metrics := metrics || jsonb_build_object(
      'total_revenue', COALESCE(revenue_result.total_revenue, 0),
      'revenue_cpf', COALESCE(revenue_result.revenue_cpf, 0),
      'revenue_opco', COALESCE(revenue_result.revenue_opco, 0),
      'revenue_companies', COALESCE(revenue_result.revenue_companies, 0),
      'revenue_individuals', COALESCE(revenue_result.revenue_individuals, 0),
      'revenue_pole_emploi', COALESCE(revenue_result.revenue_pole_emploi, 0),
      'revenue_regions', COALESCE(revenue_result.revenue_regions, 0),
      'revenue_state', COALESCE(revenue_result.revenue_state, 0),
      'revenue_other', COALESCE(revenue_result.revenue_other, 0)
    );
  EXCEPTION WHEN OTHERS THEN
    metrics := metrics || jsonb_build_object(
      'total_revenue', 0,
      'revenue_cpf', 0,
      'revenue_opco', 0,
      'revenue_companies', 0,
      'revenue_individuals', 0,
      'revenue_pole_emploi', 0,
      'revenue_regions', 0,
      'revenue_state', 0,
      'revenue_other', 0
    );
  END;

  -- Récupérer la répartition démographique
  BEGIN
    SELECT * INTO student_result FROM get_bpf_student_breakdown(org_id, year_val);
    metrics := metrics || jsonb_build_object(
      'students_men', COALESCE(student_result.students_men, 0),
      'students_women', COALESCE(student_result.students_women, 0),
      'students_under_26', COALESCE(student_result.students_under_26, 0),
      'students_over_45', COALESCE(student_result.students_over_45, 0),
      'students_disabled', COALESCE(student_result.students_disabled, 0)
    );
  EXCEPTION WHEN OTHERS THEN
    metrics := metrics || jsonb_build_object(
      'students_men', 0,
      'students_women', 0,
      'students_under_26', 0,
      'students_over_45', 0,
      'students_disabled', 0
    );
  END;

  -- Valeurs par défaut pour les champs non calculés automatiquement
  metrics := metrics || jsonb_build_object(
    'total_trainers', 0,
    'permanent_trainers', 0,
    'freelance_trainers', 0,
    'trainer_hours', 0,
    'training_locations', 0,
    'owned_locations', 0,
    'rented_locations', 0,
    'total_capacity', 0,
    'subcontracting_amount', 0,
    'success_rate', NULL,
    'completion_rate', NULL,
    'employment_rate', NULL,
    'satisfaction_rate', NULL
  );

  RETURN metrics;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_bpf_metrics IS 'Version améliorée: calcule automatiquement toutes les métriques BPF';

-- =====================================================
-- 9. GRANTS
-- =====================================================

-- Accorder les permissions aux rôles authentifiés
GRANT EXECUTE ON FUNCTION get_bpf_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_bpf_revenue_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION get_bpf_inconsistencies TO authenticated;
GRANT EXECUTE ON FUNCTION get_bpf_student_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION get_bpf_drill_down TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_bpf_metrics TO authenticated;

-- Service role a accès complet
GRANT EXECUTE ON FUNCTION get_bpf_stats TO service_role;
GRANT EXECUTE ON FUNCTION get_bpf_revenue_breakdown TO service_role;
GRANT EXECUTE ON FUNCTION get_bpf_inconsistencies TO service_role;
GRANT EXECUTE ON FUNCTION get_bpf_student_breakdown TO service_role;
GRANT EXECUTE ON FUNCTION get_bpf_drill_down TO service_role;
GRANT EXECUTE ON FUNCTION calculate_bpf_metrics TO service_role;
