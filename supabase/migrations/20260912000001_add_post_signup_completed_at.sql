-- Migration: colonne pour garde-fou atomique du provisioning post-inscription
-- Date: 2026-09-12
--
-- /api/users/post-signup peut être appelée en concurrence (inscription immédiate +
-- retour depuis /dashboard/onboarding après confirmation email, remounts React en dev).
-- Un flag lu puis écrit dans organizations.settings (jsonb) laisse une fenêtre de race :
-- constaté en pratique le 2026-09-12 (modèles de documents dupliqués, email de bienvenue
-- envoyé deux fois). Une colonne dédiée permet un claim atomique via
-- UPDATE ... WHERE post_signup_completed_at IS NULL ... RETURNING.

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS post_signup_completed_at timestamptz;

COMMENT ON COLUMN organizations.post_signup_completed_at IS
  'Horodatage du provisioning post-inscription (modèles par défaut, email de bienvenue, pixel TikTok). Sert de claim atomique pour éviter le double déclenchement — voir app/api/users/post-signup/route.ts.';
