-- Migration: Inclut les abonnements 'trialing' dans organization_usage
-- Date: 2026-07-21
--
-- Bug : la vue organization_usage (migration 20260123000001) ne joint la
-- souscription que si `status = 'active'`. Résultat, pour toute organisation
-- en période d'essai (status = 'trialing'), la vue renvoie plan_name,
-- features et subscription_status à NULL — comme si l'organisation n'avait
-- aucun abonnement du tout. Conséquence concrète : le déblocage "tous les
-- modules pendant l'essai" (QuotaService.hasFeature, qui teste
-- usage.subscription_status === 'trialing') ne pouvait jamais se déclencher,
-- puisque ce champ n'était jamais peuplé pour les comptes en essai.
--
-- Correctif : élargir la jointure aux statuts 'active' ET 'trialing' (les
-- deux seuls statuts pour lesquels l'application a une logique définie côté
-- QuotaService). Les statuts 'canceled'/'past_due'/'incomplete' restent
-- volontairement exclus pour ne pas rendre les features premium à un compte
-- dont l'abonnement n'est plus valide.

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
LEFT JOIN subscriptions s ON o.id = s.organization_id AND s.status IN ('active', 'trialing')
LEFT JOIN plans p ON s.plan_id = p.id;
