-- Script pour analyser les requêtes lentes dans PostgreSQL
-- À exécuter régulièrement pour identifier les goulots d'étranglement

-- 1. Requêtes les plus lentes (si pg_stat_statements est activé)
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- Plus de 100ms en moyenne
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 2. Tables avec le plus de séquential scans (peuvent bénéficier d'index)
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan AS avg_seq_read,
  CASE 
    WHEN seq_scan > 0 THEN (seq_scan::float / (seq_scan + idx_scan)) * 100
    ELSE 0
  END AS seq_scan_percent
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_scan DESC
LIMIT 20;

-- 3. Index non utilisés (peuvent être supprimés)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (
    SELECT conindid FROM pg_constraint
  )
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- 4. Index manquants potentiels (tables avec beaucoup de scans mais peu d'index)
SELECT 
  schemaname,
  tablename,
  seq_scan,
  idx_scan,
  seq_tup_read,
  n_tup_ins + n_tup_upd + n_tup_del AS total_writes,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS table_size
FROM pg_stat_user_tables
WHERE seq_scan > 1000
  AND idx_scan < seq_scan / 10
ORDER BY seq_scan DESC
LIMIT 20;

-- 5. Tables les plus grandes (candidats pour le partitionnement)
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
  n_live_tup AS row_count,
  n_dead_tup AS dead_rows,
  CASE 
    WHEN n_live_tup > 0 THEN (n_dead_tup::float / n_live_tup) * 100
    ELSE 0
  END AS dead_row_percent
FROM pg_stat_user_tables
WHERE pg_total_relation_size(schemaname||'.'||tablename) > 100 * 1024 * 1024 -- Plus de 100MB
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- 6. Requêtes avec le plus de temps d'exécution total
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  (total_exec_time / sum(total_exec_time) OVER ()) * 100 AS percent_total_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- 7. Vérifier les locks actifs (peuvent ralentir les requêtes)
SELECT 
  locktype,
  relation::regclass,
  mode,
  granted,
  pid,
  usename,
  application_name,
  state,
  query_start,
  state_change
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT granted
ORDER BY query_start;

-- 8. Tables avec beaucoup de dead tuples (nécessitent VACUUM)
SELECT 
  schemaname,
  tablename,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum,
  CASE 
    WHEN n_live_tup > 0 THEN (n_dead_tup::float / n_live_tup) * 100
    ELSE 0
  END AS dead_row_percent
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
  AND (n_dead_tup::float / NULLIF(n_live_tup, 0)) > 0.1 -- Plus de 10% de dead tuples
ORDER BY n_dead_tup DESC
LIMIT 20;

COMMENT ON FUNCTION pg_stat_statements_reset() IS 
  'Réinitialise les statistiques de pg_stat_statements. À utiliser avec précaution.';



