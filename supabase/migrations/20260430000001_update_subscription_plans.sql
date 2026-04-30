-- Aligner subscription_plans avec les tarifs affichés sur la landing page
-- Plans : Starter (79€), Pro (169€), Enterprise (349€) + Trial (gratuit)

-- Supprimer les anciens plans devenus obsolètes
DELETE FROM public.subscription_plans WHERE code IN ('free', 'premium');

-- Upsert des plans corrects
INSERT INTO public.subscription_plans (name, code, description, price_monthly, price_yearly, features, max_users, max_students, max_storage_gb, display_order, is_active)
VALUES
  (
    'Essai Gratuit', 'trial',
    'Essayez EDUZEN gratuitement pendant 14 jours',
    0, 0,
    '["Accès complet pendant 14 jours", "20 stagiaires", "Toutes les fonctionnalités Starter", "Support Email"]',
    NULL, 20, 5,
    0, true
  ),
  (
    'Starter', 'starter',
    "L''essentiel pour débuter",
    79, 790,
    '["20 stagiaires / mois", "Gestion Pédagogique", "Émargement QR & Signature", "Génération de Documents", "Facturation & Paiements", "Support Email (48h)"]',
    NULL, 20, 10,
    1, true
  ),
  (
    'Pro', 'pro',
    'La sérénité administrative',
    169, 1690,
    '["100 stagiaires / mois", "Tout du plan Starter", "Dashboard Qualiopi", "Automate BPF", "Portail E-learning", "Support Prioritaire (24h)"]',
    NULL, 100, 50,
    2, true
  ),
  (
    'Enterprise', 'enterprise',
    'Pour changer d''échelle',
    349, 3490,
    '["Stagiaires illimités", "Tout du plan Pro", "Marque Blanche / URL", "API & Intégrations", "Account Manager dédié", "Support Téléphone"]',
    NULL, NULL, NULL,
    3, true
  )
ON CONFLICT (code) DO UPDATE SET
  name             = EXCLUDED.name,
  description      = EXCLUDED.description,
  price_monthly    = EXCLUDED.price_monthly,
  price_yearly     = EXCLUDED.price_yearly,
  features         = EXCLUDED.features,
  max_users        = EXCLUDED.max_users,
  max_students     = EXCLUDED.max_students,
  max_storage_gb   = EXCLUDED.max_storage_gb,
  display_order    = EXCLUDED.display_order,
  is_active        = EXCLUDED.is_active,
  updated_at       = NOW();
