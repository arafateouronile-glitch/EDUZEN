-- =====================================================
-- EDUZEN Email-Based Secure Signing System
-- =====================================================
-- Chaîne de preuve irréfutable : digital_evidence, access_token UUID v4,
-- expiration 4h pour les liens email. Conforme OPCO/Qualiopi.
-- Date: 2026-01-25
-- =====================================================

-- =====================================================
-- 1. TABLE digital_evidence (preuve immuable, INSERT uniquement)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.digital_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Type de demande : signature (convention/document) ou attendance (émargement)
  request_type text NOT NULL CHECK (request_type IN ('signature', 'attendance')),
  request_id uuid NOT NULL,

  -- Signataire
  signer_email text NOT NULL,

  -- Données de signature (base64 PNG ou SVG)
  signature_data text NOT NULL,

  -- Métadonnées capturées au moment du clic "Valider"
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Structure typique : { ip, user_agent, fingerprint, timestamp_utc, geolocation? }

  -- Scellement SHA-256 : hash(email + signature + metadata + secret)
  integrity_hash text NOT NULL,

  -- Horodatage serveur UTC
  created_at timestamptz NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS idx_digital_evidence_org ON public.digital_evidence(organization_id);
CREATE INDEX IF NOT EXISTS idx_digital_evidence_request ON public.digital_evidence(request_type, request_id);
CREATE INDEX IF NOT EXISTS idx_digital_evidence_signer ON public.digital_evidence(signer_email);
CREATE INDEX IF NOT EXISTS idx_digital_evidence_hash ON public.digital_evidence(integrity_hash);
CREATE INDEX IF NOT EXISTS idx_digital_evidence_created ON public.digital_evidence(created_at DESC);

ALTER TABLE public.digital_evidence ENABLE ROW LEVEL SECURITY;

-- RLS : INSERT uniquement (pas de UPDATE/DELETE). SELECT réservé aux membres org.
-- Les inserts sont faits via service role depuis l'API /api/sign/submit.

DROP POLICY IF EXISTS "digital_evidence_insert_only" ON public.digital_evidence;
-- La policy INSERT permet l'insertion via service role (bypass RLS) ou via une RPC SECURITY DEFINER.
-- Pour restreindre strictement : on n'autorise aucune policy INSERT pour anon/authenticated,
-- et on n'utilise que le client admin (service role) pour insérer. RLS est bypassed avec service role.
-- Policy vide INSERT = personne ne peut insérer via anon/key. Seul service role peut.

DROP POLICY IF EXISTS "digital_evidence_select_org" ON public.digital_evidence;
CREATE POLICY "digital_evidence_select_org"
  ON public.digital_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.organization_id = digital_evidence.organization_id
        AND u.role IN ('admin', 'secretary', 'teacher', 'super_admin')
    )
  );

-- Aucune policy UPDATE ni DELETE : tableau verrouillé en écriture après INSERT.
COMMENT ON TABLE public.digital_evidence IS 'Preuves numériques des signatures (chaîne irréfutable). INSERT uniquement, pas de modification.';

-- Trigger : interdire UPDATE et DELETE
CREATE OR REPLACE FUNCTION public.prevent_digital_evidence_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'digital_evidence: modification interdite (immuabilité)';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'digital_evidence: suppression interdite (immuabilité)';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_digital_evidence_update ON public.digital_evidence;
CREATE TRIGGER trg_prevent_digital_evidence_update
  BEFORE UPDATE ON public.digital_evidence
  FOR EACH ROW EXECUTE FUNCTION public.prevent_digital_evidence_modification();

DROP TRIGGER IF EXISTS trg_prevent_digital_evidence_delete ON public.digital_evidence;
CREATE TRIGGER trg_prevent_digital_evidence_delete
  BEFORE DELETE ON public.digital_evidence
  FOR EACH ROW EXECUTE FUNCTION public.prevent_digital_evidence_modification();


-- =====================================================
-- 2. access_token (UUID v4) + token_expires_at sur signature_requests
-- =====================================================

ALTER TABLE public.signature_requests
  ADD COLUMN IF NOT EXISTS access_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_signature_requests_access_token ON public.signature_requests(access_token)
  WHERE access_token IS NOT NULL;

-- Backfill : générer access_token pour les lignes existantes (NULL uniquement)
UPDATE public.signature_requests
SET access_token = gen_random_uuid()
WHERE access_token IS NULL;

ALTER TABLE public.signature_requests
  ALTER COLUMN access_token SET NOT NULL;

-- token_expires_at : par défaut 4h après created_at si non renseigné (pour nouvelles lignes, on le fixe à la création)
COMMENT ON COLUMN public.signature_requests.access_token IS 'Token UUID v4 pour lien email /sign/[token], usage unique';
COMMENT ON COLUMN public.signature_requests.token_expires_at IS 'Expiration du lien (ex. 4h après envoi email)';


-- =====================================================
-- 3. access_token (UUID v4) + token_expires_at sur electronic_attendance_requests
-- =====================================================

ALTER TABLE public.electronic_attendance_requests
  ADD COLUMN IF NOT EXISTS access_token uuid,
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz;

UPDATE public.electronic_attendance_requests
SET access_token = gen_random_uuid()
WHERE access_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_electronic_attendance_requests_access_token
  ON public.electronic_attendance_requests(access_token) WHERE access_token IS NOT NULL;

COMMENT ON COLUMN public.electronic_attendance_requests.access_token IS 'Token UUID v4 pour lien email /sign/[token]';
COMMENT ON COLUMN public.electronic_attendance_requests.token_expires_at IS 'Expiration du lien (ex. 4h après envoi email)';


-- =====================================================
-- 4. Fonction utilitaire : expiration des tokens (cron)
-- =====================================================

CREATE OR REPLACE FUNCTION public.expire_signature_tokens()
RETURNS void AS $$
BEGIN
  UPDATE public.signature_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND token_expires_at IS NOT NULL
    AND token_expires_at < (now() AT TIME ZONE 'UTC');

  UPDATE public.electronic_attendance_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND token_expires_at IS NOT NULL
    AND token_expires_at < (now() AT TIME ZONE 'UTC');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.expire_signature_tokens IS 'Marque comme expirées les demandes dont token_expires_at est dépassé (à appeler via cron)';
