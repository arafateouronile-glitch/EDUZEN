-- Migration: Lien public de séance + sélection apprenants + suivi signed_via
-- ============================================================

-- 1. Colonnes lien public sur electronic_attendance_sessions
ALTER TABLE electronic_attendance_sessions
  ADD COLUMN IF NOT EXISTS public_emargement_token TEXT
    UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  ADD COLUMN IF NOT EXISTS public_emargement_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_emargement_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_emargement_pin TEXT;

-- 2. Canal de signature sur les demandes
ALTER TABLE electronic_attendance_requests
  ADD COLUMN IF NOT EXISTS signed_via TEXT CHECK (signed_via IN ('email', 'public_link', 'manual'));

-- 3. Table de logs de la page publique (anti-fraude)
CREATE TABLE IF NOT EXISTS public_emargement_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token      TEXT,
  session_id UUID REFERENCES electronic_attendance_sessions(id) ON DELETE SET NULL,
  action     TEXT CHECK (action IN ('view', 'pin_attempt', 'select_learner', 'sign', 'error')),
  learner_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public_emargement_logs ENABLE ROW LEVEL SECURITY;

-- Pas de lecture publique — uniquement l'org propriétaire via la session
CREATE POLICY "public_emargement_logs_org_read"
  ON public_emargement_logs FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM electronic_attendance_sessions
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Insert ouvert sans auth (le token opaque protège implicitement)
CREATE POLICY "public_emargement_logs_insert"
  ON public_emargement_logs FOR INSERT
  WITH CHECK (true);

-- 4. Index performances
CREATE INDEX IF NOT EXISTS idx_eas_public_token ON electronic_attendance_sessions(public_emargement_token);
CREATE INDEX IF NOT EXISTS idx_pel_session ON public_emargement_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_pel_token ON public_emargement_logs(token);
