-- Migration : Mise à jour des Stripe Price IDs en mode Live
-- Date : 2026-03-25

UPDATE plans SET
  stripe_price_id_monthly = 'price_1TEx1GDqF3f1NwPHU0hdoKQE',
  stripe_price_id_yearly  = 'price_1TExD8DqF3f1NwPH1tmT7toZ'
WHERE name = 'Starter';

UPDATE plans SET
  stripe_price_id_monthly = 'price_1TEx3MDqF3f1NwPH3rlr01Q9',
  stripe_price_id_yearly  = 'price_1TExHeDqF3f1NwPHqjwaVTUq'
WHERE name = 'Pro';

UPDATE plans SET
  stripe_price_id_monthly = 'price_1TEx6EDqF3f1NwPHD4QKc77F',
  stripe_price_id_yearly  = 'price_1TExJyDqF3f1NwPHaLbQvYvE'
WHERE name = 'Enterprise';
