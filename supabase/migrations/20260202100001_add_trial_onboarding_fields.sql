-- Migration: Ajout des champs pour gestion essai gratuit et onboarding
-- Date: 2026-02-02

-- =============================================================================
-- 1. AJOUT DES CHAMPS À LA TABLE SUBSCRIPTIONS
-- =============================================================================

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS trial_start_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_end_at timestamptz,
ADD COLUMN IF NOT EXISTS payment_method_id text;

-- Commentaires pour documentation
COMMENT ON COLUMN subscriptions.trial_start_at IS 'Date de début de l''essai gratuit';
COMMENT ON COLUMN subscriptions.trial_end_at IS 'Date de fin de l''essai gratuit (14 jours après début)';
COMMENT ON COLUMN subscriptions.payment_method_id IS 'ID de la payment method Stripe attachée';

-- Index pour rechercher les essais qui se terminent (utile pour notifications)
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end_at
ON subscriptions(trial_end_at)
WHERE status = 'trialing';

-- Index pour rechercher par payment_method_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_method_id
ON subscriptions(payment_method_id)
WHERE payment_method_id IS NOT NULL;

-- =============================================================================
-- 2. AJOUT DES CHAMPS À LA TABLE USERS (infos personnelles)
-- =============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS job_title text;

-- Commentaires
COMMENT ON COLUMN users.first_name IS 'Prénom du responsable';
COMMENT ON COLUMN users.last_name IS 'Nom du responsable';
COMMENT ON COLUMN users.job_title IS 'Poste/Fonction du responsable';

-- Migration des données existantes depuis full_name si disponible
UPDATE users
SET
  first_name = CASE
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0
    THEN split_part(full_name, ' ', 1)
    ELSE full_name
  END,
  last_name = CASE
    WHEN full_name IS NOT NULL AND position(' ' in full_name) > 0
    THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE NULL
  END
WHERE full_name IS NOT NULL
  AND first_name IS NULL;

-- =============================================================================
-- 3. VUE POUR STATUT ONBOARDING
-- =============================================================================

CREATE OR REPLACE VIEW organization_onboarding_status AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  COALESCE((o.settings->>'onboarding_completed')::boolean, false) AS onboarding_completed,
  o.settings->>'onboarding_completed_at' AS onboarding_completed_at,
  COALESCE((o.settings->>'payment_method_added')::boolean, false) AS payment_method_added,
  o.settings->>'payment_method_added_at' AS payment_method_added_at,
  o.settings->>'selected_plan_id' AS selected_plan_id,
  s.status AS subscription_status,
  s.trial_start_at,
  s.trial_end_at,
  p.name AS plan_name,
  CASE
    WHEN COALESCE((o.settings->>'payment_method_added')::boolean, false) = true
      AND s.id IS NOT NULL THEN 'complete'
    WHEN COALESCE((o.settings->>'onboarding_completed')::boolean, false) = true THEN 'pending_payment'
    ELSE 'incomplete'
  END AS onboarding_stage
FROM organizations o
LEFT JOIN subscriptions s ON o.id = s.organization_id
LEFT JOIN plans p ON s.plan_id = p.id;

-- Politique RLS pour la vue
GRANT SELECT ON organization_onboarding_status TO authenticated;

-- =============================================================================
-- 4. FONCTION POUR VÉRIFIER SI ONBOARDING EST COMPLET
-- =============================================================================

CREATE OR REPLACE FUNCTION check_onboarding_complete(org_id uuid)
RETURNS TABLE (
  is_complete boolean,
  has_payment_method boolean,
  trial_ends_at timestamptz,
  days_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE((o.settings->>'payment_method_added')::boolean, false) AS is_complete,
    COALESCE((o.settings->>'payment_method_added')::boolean, false) AS has_payment_method,
    s.trial_end_at,
    CASE
      WHEN s.trial_end_at IS NOT NULL
      THEN GREATEST(0, EXTRACT(DAY FROM (s.trial_end_at - now()))::integer)
      ELSE NULL
    END AS days_remaining
  FROM organizations o
  LEFT JOIN subscriptions s ON o.id = s.organization_id
  WHERE o.id = org_id;
END;
$$;

-- =============================================================================
-- 5. FONCTION POUR MARQUER ONBOARDING COMME COMPLET
-- =============================================================================

CREATE OR REPLACE FUNCTION complete_onboarding_with_payment(
  p_organization_id uuid,
  p_plan_id uuid,
  p_payment_method_id text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_trial_days integer DEFAULT 14
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial_start timestamptz := now();
  v_trial_end timestamptz := now() + (p_trial_days || ' days')::interval;
  v_subscription_id uuid;
  v_result jsonb;
BEGIN
  -- Mettre à jour les settings de l'organisation
  UPDATE organizations
  SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object(
    'onboarding_completed', true,
    'onboarding_completed_at', now(),
    'payment_method_added', true,
    'payment_method_added_at', now(),
    'selected_plan_id', p_plan_id
  ),
  subscription_status = 'active',
  updated_at = now()
  WHERE id = p_organization_id;

  -- Créer ou mettre à jour la subscription
  INSERT INTO subscriptions (
    organization_id,
    plan_id,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    payment_method_id,
    trial_start_at,
    trial_end_at,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  ) VALUES (
    p_organization_id,
    p_plan_id,
    'trialing',
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_payment_method_id,
    v_trial_start,
    v_trial_end,
    v_trial_start,
    v_trial_end,
    now(),
    now()
  )
  ON CONFLICT (organization_id)
  DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    stripe_customer_id = EXCLUDED.stripe_customer_id,
    stripe_subscription_id = EXCLUDED.stripe_subscription_id,
    payment_method_id = EXCLUDED.payment_method_id,
    trial_start_at = EXCLUDED.trial_start_at,
    trial_end_at = EXCLUDED.trial_end_at,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    updated_at = now()
  RETURNING id INTO v_subscription_id;

  -- Construire le résultat
  v_result := jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'trial_start_at', v_trial_start,
    'trial_end_at', v_trial_end,
    'plan_id', p_plan_id
  );

  RETURN v_result;
END;
$$;

-- Accorder l'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION complete_onboarding_with_payment TO authenticated;
GRANT EXECUTE ON FUNCTION check_onboarding_complete TO authenticated;
