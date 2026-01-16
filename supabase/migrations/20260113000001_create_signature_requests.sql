-- Migration: Create signature_requests table
-- Description: Table pour gérer les demandes de signature électronique par email

-- Create signature_requests table
CREATE TABLE IF NOT EXISTS signature_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Recipient information
  recipient_email text NOT NULL,
  recipient_name text NOT NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('student', 'funder', 'teacher', 'other')),
  recipient_id uuid, -- Optional reference to student, funder, or teacher

  -- Request details
  subject text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired', 'declined', 'cancelled')),

  -- Signature tracking
  signature_token text NOT NULL UNIQUE,
  signature_id uuid REFERENCES document_signatures(id) ON DELETE SET NULL,
  signed_at timestamptz,

  -- Expiration and reminders
  expires_at timestamptz,
  reminder_frequency text DEFAULT 'none' CHECK (reminder_frequency IN ('daily', 'weekly', 'none')),
  reminder_count integer DEFAULT 0,
  last_reminder_sent_at timestamptz,

  -- Additional options
  requires_notarization boolean DEFAULT false,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signature_requests_organization ON signature_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_document ON signature_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_requester ON signature_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_recipient_email ON signature_requests(recipient_email);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_token ON signature_requests(signature_token);
CREATE INDEX IF NOT EXISTS idx_signature_requests_expires_at ON signature_requests(expires_at) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for signature_requests

-- Admin and staff can view all signature requests in their organization
DROP POLICY IF EXISTS "Admin and staff can view signature requests" ON signature_requests;
CREATE POLICY "Admin and staff can view signature requests"
  ON signature_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = signature_requests.organization_id
      AND users.role IN ('admin', 'secretary', 'teacher')
    )
  );

-- Admin and staff can create signature requests
DROP POLICY IF EXISTS "Admin and staff can create signature requests" ON signature_requests;
CREATE POLICY "Admin and staff can create signature requests"
  ON signature_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = signature_requests.organization_id
      AND users.role IN ('admin', 'secretary', 'teacher')
    )
  );

-- Admin and staff can update signature requests
DROP POLICY IF EXISTS "Admin and staff can update signature requests" ON signature_requests;
CREATE POLICY "Admin and staff can update signature requests"
  ON signature_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = signature_requests.organization_id
      AND users.role IN ('admin', 'secretary', 'teacher')
    )
  );

-- Anyone with the signature token can view the request (for public signature page)
DROP POLICY IF EXISTS "Public can view signature request with token" ON signature_requests;
CREATE POLICY "Public can view signature request with token"
  ON signature_requests FOR SELECT
  USING (true); -- Token validation will be done in the application layer

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_signature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS signature_requests_updated_at ON signature_requests;
CREATE TRIGGER signature_requests_updated_at
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_requests_updated_at();

-- Function to automatically expire signature requests
CREATE OR REPLACE FUNCTION expire_signature_requests()
RETURNS void AS $$
BEGIN
  UPDATE signature_requests
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Comment on table
COMMENT ON TABLE signature_requests IS 'Gère les demandes de signature électronique envoyées par email';
COMMENT ON COLUMN signature_requests.signature_token IS 'Token unique pour accéder à la page de signature';
COMMENT ON COLUMN signature_requests.recipient_type IS 'Type de destinataire: student (apprenant), funder (financeur), teacher, other';
COMMENT ON COLUMN signature_requests.reminder_frequency IS 'Fréquence des rappels automatiques';
