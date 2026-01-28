-- Migration pour ajouter les colonnes stripe_price_id_monthly et stripe_price_id_yearly
-- pour mieux gérer les abonnements mensuels et annuels

-- Ajouter les nouvelles colonnes
ALTER TABLE plans
ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT;

-- Migrer les données existantes si stripe_price_id existe
-- (supposons que l'ancien stripe_price_id était pour le mensuel)
UPDATE plans
SET stripe_price_id_monthly = stripe_price_id
WHERE stripe_price_id IS NOT NULL AND stripe_price_id_monthly IS NULL;

-- Commentaires
COMMENT ON COLUMN plans.stripe_price_id_monthly IS 'Stripe Price ID pour l''abonnement mensuel';
COMMENT ON COLUMN plans.stripe_price_id_yearly IS 'Stripe Price ID pour l''abonnement annuel';
COMMENT ON COLUMN plans.stripe_price_id IS 'DEPRECATED: Utiliser stripe_price_id_monthly ou stripe_price_id_yearly';
