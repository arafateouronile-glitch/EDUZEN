-- Capture le motif et les suggestions donnés par un client lors de la résiliation
-- de son abonnement (parcours "Annuler mon abonnement" dans les paramètres).
-- Aucune table équivalente n'existe pour le schéma d'abonnement réellement utilisé
-- (subscriptions/plans) — organization_subscriptions a bien des colonnes
-- canceled_at/cancel_reason mais cette table n'est jamais alimentée par le vrai
-- flux Stripe, donc inutilisable ici.

CREATE TABLE subscription_cancellation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reason_code text CHECK (reason_code IN ('too_expensive','missing_features','not_using','technical_issues','switching_solution','other')),
  reason_detail text,
  improvement_suggestions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_cancellation_feedback_org ON subscription_cancellation_feedback(organization_id);

ALTER TABLE subscription_cancellation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can insert their own org's cancellation feedback"
ON subscription_cancellation_feedback FOR INSERT TO authenticated
WITH CHECK (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Super admins can view cancellation feedback"
ON subscription_cancellation_feedback FOR SELECT TO authenticated
USING (public.is_super_admin());
