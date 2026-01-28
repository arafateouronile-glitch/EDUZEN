-- Migration: Création des tables plans et subscriptions pour le système de quotas
-- Date: 2026-01-23

-- Table des plans (Starter, Pro, Enterprise)
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text,
  stripe_price_id text,
  max_students integer, -- NULL = illimité
  max_sessions_per_month integer, -- NULL = illimité
  features jsonb DEFAULT '{}'::jsonb,
  price_monthly_ht decimal(10, 2),
  price_yearly_ht decimal(10, 2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des souscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  plan_id uuid REFERENCES plans(id) NOT NULL,
  status text NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'trialing', 'incomplete'
  current_period_start timestamptz,
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id) -- Une organisation ne peut avoir qu'une seule souscription active
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Vue pour calculer l'usage en temps réel
CREATE OR REPLACE VIEW organization_usage AS
SELECT 
    o.id AS organization_id,
    o.name AS organization_name,
    p.id AS plan_id,
    p.name AS plan_name,
    p.max_students,
    (SELECT count(*) FROM students s 
     WHERE s.organization_id = o.id 
     AND s.status = 'active') AS current_student_count,
    p.max_sessions_per_month,
    (SELECT count(*) FROM sessions sess 
     JOIN formations f ON sess.formation_id = f.id
     WHERE f.organization_id = o.id 
     AND sess.created_at >= date_trunc('month', now())) AS current_sessions_count,
    s.status AS subscription_status,
    s.current_period_end,
    p.features
FROM organizations o
LEFT JOIN subscriptions s ON o.id = s.organization_id AND s.status = 'active'
LEFT JOIN plans p ON s.plan_id = p.id;

-- Fonction pour vérifier si une organisation peut ajouter un étudiant
CREATE OR REPLACE FUNCTION can_add_student(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_students integer;
  v_current_count integer;
  v_plan_name text;
BEGIN
  SELECT 
    max_students,
    current_student_count,
    plan_name
  INTO v_max_students, v_current_count, v_plan_name
  FROM organization_usage
  WHERE organization_id = org_id;

  -- Si pas de plan ou plan illimité
  IF v_plan_name IS NULL OR v_max_students IS NULL THEN
    RETURN true;
  END IF;

  -- Vérifier la limite
  RETURN v_current_count < v_max_students;
END;
$$;

-- Fonction pour vérifier si une organisation peut créer une session
CREATE OR REPLACE FUNCTION can_create_session(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_sessions integer;
  v_current_count integer;
  v_plan_name text;
BEGIN
  SELECT 
    max_sessions_per_month,
    current_sessions_count,
    plan_name
  INTO v_max_sessions, v_current_count, v_plan_name
  FROM organization_usage
  WHERE organization_id = org_id;

  -- Si pas de plan ou plan illimité
  IF v_plan_name IS NULL OR v_max_sessions IS NULL THEN
    RETURN true;
  END IF;

  -- Vérifier la limite
  RETURN v_current_count < v_max_sessions;
END;
$$;

-- Fonction pour obtenir l'usage d'une organisation
CREATE OR REPLACE FUNCTION get_organization_usage(org_id uuid)
RETURNS TABLE (
  plan_name text,
  max_students integer,
  current_student_count bigint,
  max_sessions_per_month integer,
  current_sessions_count bigint,
  subscription_status text,
  features jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    ou.features
  FROM organization_usage ou
  WHERE ou.organization_id = org_id;
END;
$$;

-- RLS pour plans (lecture publique)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
  ON plans FOR SELECT
  USING (is_active = true);

-- RLS pour subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's subscription"
  ON subscriptions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Insérer les plans par défaut
INSERT INTO plans (name, description, max_students, max_sessions_per_month, features, price_monthly_ht, price_yearly_ht) VALUES
(
  'Starter',
  'L''essentiel pour débuter',
  20,
  5,
  '{
    "bpf_export": false,
    "white_label": false,
    "multi_establishments": false,
    "e_learning": false,
    "automated_reminders": false,
    "qualiopi_dashboard": false,
    "document_generation": "standard"
  }'::jsonb,
  79.00,
  790.00
),
(
  'Pro',
  'La sérénité administrative',
  100,
  20,
  '{
    "bpf_export": true,
    "white_label": false,
    "multi_establishments": false,
    "e_learning": true,
    "automated_reminders": true,
    "qualiopi_dashboard": true,
    "document_generation": "unlimited"
  }'::jsonb,
  169.00,
  1690.00
),
(
  'Enterprise',
  'Pour changer d''échelle',
  NULL, -- Illimité
  NULL, -- Illimité
  '{
    "bpf_export": true,
    "white_label": true,
    "multi_establishments": true,
    "e_learning": true,
    "automated_reminders": true,
    "qualiopi_dashboard": true,
    "document_generation": "custom",
    "dedicated_support": true
  }'::jsonb,
  349.00,
  3490.00
)
ON CONFLICT (name) DO NOTHING;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
