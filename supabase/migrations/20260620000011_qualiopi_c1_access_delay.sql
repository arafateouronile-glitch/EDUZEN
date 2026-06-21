-- Fonction RPC : statistiques délais d'accès pour Qualiopi Indicateur 3
-- Calcule le délai entre la date d'inscription et le début de session

CREATE OR REPLACE FUNCTION get_c1_access_delay_stats(org_id UUID)
RETURNS TABLE (
  avg_days    NUMERIC,
  median_days NUMERIC,
  min_days    INTEGER,
  max_days    INTEGER,
  pct_under_10  NUMERIC,
  pct_under_30  NUMERIC,
  total_enrollments BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH delay_data AS (
    SELECT
      (s.start_date::date - e.enrollment_date::date)::integer AS delay_days
    FROM enrollments e
    JOIN sessions s ON s.id = e.session_id
    WHERE s.organization_id = org_id
      AND e.enrollment_date IS NOT NULL
      AND s.start_date IS NOT NULL
      AND (s.start_date::date - e.enrollment_date::date) >= 0
  )
  SELECT
    ROUND(AVG(dd.delay_days)::numeric, 1)                                                            AS avg_days,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dd.delay_days)::numeric, 1)                   AS median_days,
    MIN(dd.delay_days)                                                                               AS min_days,
    MAX(dd.delay_days)                                                                               AS max_days,
    ROUND(100.0 * COUNT(*) FILTER (WHERE dd.delay_days < 10)  / NULLIF(COUNT(*), 0), 1)             AS pct_under_10,
    ROUND(100.0 * COUNT(*) FILTER (WHERE dd.delay_days < 30)  / NULLIF(COUNT(*), 0), 1)             AS pct_under_30,
    COUNT(*)                                                                                         AS total_enrollments
  FROM delay_data dd;
END;
$$;

GRANT EXECUTE ON FUNCTION get_c1_access_delay_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_c1_access_delay_stats(UUID) TO anon;
