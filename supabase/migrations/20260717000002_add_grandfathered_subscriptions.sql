-- Migration: Grandfathering des abonnements actifs avant l'enforcement des quotas/features
-- Date: 2026-07-17
--
-- Contexte: les quotas (max_students, max_sessions_per_month) et les features
-- du plan (bpf_export, e_learning, qualiopi_dashboard, automated_reminders)
-- vont être réellement appliqués côté application pour la première fois.
-- Décision produit: les organisations déjà abonnées au moment de ce
-- déploiement ne doivent jamais être restreintes rétroactivement — seules
-- les souscriptions créées après cette migration sont soumises aux limites
-- de leur plan. Le flag `grandfathered` fige donc la liste des abonnements
-- actifs à l'instant du backfill ci-dessous ; toute nouvelle ligne
-- `subscriptions` créée après (nouvel abonné, changement de plan avec
-- recréation de la ligne, etc.) démarre à `false`.

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS grandfathered boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN subscriptions.grandfathered IS
  'Exemption permanente des quotas/features du plan. Vrai pour tout abonnement actif au moment du déploiement de l''enforcement (2026-07-17) ; toujours faux pour les nouvelles souscriptions. Ne pas réutiliser pour un autre usage.';

-- Backfill unique: protège tous les abonnements actifs existants au moment
-- de ce déploiement. Ne pas rejouer manuellement après coup (idempotent
-- mais volontairement figé à cette date par le déploiement initial).
UPDATE subscriptions SET grandfathered = true WHERE status = 'active';

-- Vue d'usage: propage le flag pour que la couche applicative (QuotaService)
-- puisse court-circuiter les vérifications de limites.
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
     JOIN formations f ON sess.formation_id = f.id
     WHERE f.organization_id = o.id
     AND sess.created_at >= date_trunc('month', now())) AS current_sessions_count,
    s.status AS subscription_status,
    s.current_period_end,
    p.features,
    COALESCE(s.grandfathered, false) AS grandfathered
FROM organizations o
LEFT JOIN subscriptions s ON o.id = s.organization_id AND s.status = 'active'
LEFT JOIN plans p ON s.plan_id = p.id;

CREATE OR REPLACE FUNCTION can_add_student(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_students integer;
  v_current_count integer;
  v_plan_name text;
  v_grandfathered boolean;
BEGIN
  SELECT
    max_students,
    current_student_count,
    plan_name,
    grandfathered
  INTO v_max_students, v_current_count, v_plan_name, v_grandfathered
  FROM organization_usage
  WHERE organization_id = org_id;

  IF v_grandfathered IS TRUE THEN
    RETURN true;
  END IF;

  -- Si pas de plan ou plan illimité
  IF v_plan_name IS NULL OR v_max_students IS NULL THEN
    RETURN true;
  END IF;

  -- Vérifier la limite
  RETURN v_current_count < v_max_students;
END;
$$;

CREATE OR REPLACE FUNCTION can_create_session(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_sessions integer;
  v_current_count integer;
  v_plan_name text;
  v_grandfathered boolean;
BEGIN
  SELECT
    max_sessions_per_month,
    current_sessions_count,
    plan_name,
    grandfathered
  INTO v_max_sessions, v_current_count, v_plan_name, v_grandfathered
  FROM organization_usage
  WHERE organization_id = org_id;

  IF v_grandfathered IS TRUE THEN
    RETURN true;
  END IF;

  -- Si pas de plan ou plan illimité
  IF v_plan_name IS NULL OR v_max_sessions IS NULL THEN
    RETURN true;
  END IF;

  -- Vérifier la limite
  RETURN v_current_count < v_max_sessions;
END;
$$;

-- Le type de retour change (ajout de la colonne grandfathered) : CREATE OR
-- REPLACE ne peut pas modifier les colonnes OUT d'une fonction existante,
-- il faut la supprimer d'abord (cf. erreur postgres 42P13).
DROP FUNCTION IF EXISTS get_organization_usage(uuid);

CREATE FUNCTION get_organization_usage(org_id uuid)
RETURNS TABLE (
  plan_name text,
  max_students integer,
  current_student_count bigint,
  max_sessions_per_month integer,
  current_sessions_count bigint,
  subscription_status text,
  features jsonb,
  grandfathered boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ou.plan_name,
    ou.max_students,
    ou.current_student_count,
    ou.max_sessions_per_month,
    ou.current_sessions_count,
    ou.subscription_status,
    ou.features,
    ou.grandfathered
  FROM organization_usage ou
  WHERE ou.organization_id = org_id;
END;
$$;
