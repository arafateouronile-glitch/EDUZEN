-- Migration: Corrige le comptage des sessions du mois pour le quota de plan
-- Date: 2026-07-17
--
-- organization_usage (migration 20260123000001) comptait les sessions du
-- mois via `sessions JOIN formations ON sessions.formation_id = formations.id`,
-- ce qui ignore les sessions indépendantes (formation_id NULL, créées via
-- createIndependentSession) : elles ne comptaient jamais dans le quota
-- max_sessions_per_month. La colonne sessions.organization_id (ajoutée par
-- backfill en 20241204000002) est désormais fiablement renseignée à
-- l'insertion (cf. session.service.ts) : on l'utilise directement.

-- Backfill des lignes historiques dont organization_id n'a pas été renseigné
-- (créées avant que session.service.ts ne le fasse systématiquement).
UPDATE sessions s
SET organization_id = f.organization_id
FROM formations f
WHERE s.formation_id = f.id
  AND s.organization_id IS NULL;

CREATE OR REPLACE VIEW organization_usage AS
SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    p.id AS plan_id,
    p.name AS plan_name,
    p.max_students,
    (SELECT count(*) FROM students st
     WHERE st.organization_id = o.id
     AND st.status = 'active') AS current_student_count,
    p.max_sessions_per_month,
    (SELECT count(*) FROM sessions sess
     WHERE sess.organization_id = o.id
     AND sess.created_at >= date_trunc('month', now())) AS current_sessions_count,
    s.status AS subscription_status,
    s.current_period_end,
    p.features,
    COALESCE(s.grandfathered, false) AS grandfathered
FROM organizations o
LEFT JOIN subscriptions s ON o.id = s.organization_id AND s.status = 'active'
LEFT JOIN plans p ON s.plan_id = p.id;
