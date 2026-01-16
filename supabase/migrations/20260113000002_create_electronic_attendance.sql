-- Migration: Create electronic attendance system
-- Description: Système de gestion des émargements électroniques pour les sessions

-- Create electronic_attendance_sessions table
CREATE TABLE IF NOT EXISTS electronic_attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Session details
  title text NOT NULL,
  date date NOT NULL,
  start_time time,
  end_time time,

  -- Attendance configuration
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'cancelled')),
  mode text NOT NULL DEFAULT 'electronic' CHECK (mode IN ('electronic', 'manual', 'hybrid')),

  -- Electronic attendance settings
  require_signature boolean DEFAULT true,
  require_geolocation boolean DEFAULT false,
  allowed_radius_meters integer DEFAULT 100,
  qr_code_enabled boolean DEFAULT false,
  qr_code_data text, -- QR code content for quick check-in

  -- Session location (for geolocation validation)
  latitude double precision,
  longitude double precision,
  location_name text,

  -- Timing
  opens_at timestamptz,
  closes_at timestamptz,

  -- Statistics
  total_expected integer DEFAULT 0,
  total_signed integer DEFAULT 0,

  -- Metadata
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create electronic_attendance_requests table
CREATE TABLE IF NOT EXISTS electronic_attendance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  attendance_session_id uuid NOT NULL REFERENCES electronic_attendance_sessions(id) ON DELETE CASCADE,

  -- Student information
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_email text NOT NULL,
  student_name text NOT NULL,

  -- Request details
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'expired', 'declined')),
  signature_token text NOT NULL UNIQUE,

  -- Signature tracking
  signature_data text, -- Base64 signature image
  signed_at timestamptz,
  attendance_id uuid REFERENCES attendance(id) ON DELETE SET NULL,

  -- Geolocation data (if captured)
  latitude double precision,
  longitude double precision,
  location_accuracy double precision,
  location_verified boolean DEFAULT false,

  -- Device information
  ip_address inet,
  user_agent text,

  -- Reminders
  reminder_count integer DEFAULT 0,
  last_reminder_sent_at timestamptz,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for electronic_attendance_sessions
CREATE INDEX IF NOT EXISTS idx_electronic_attendance_sessions_org ON electronic_attendance_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_electronic_attendance_sessions_session ON electronic_attendance_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_electronic_attendance_sessions_date ON electronic_attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_electronic_attendance_sessions_status ON electronic_attendance_sessions(status);

-- Create indexes for electronic_attendance_requests
CREATE INDEX IF NOT EXISTS idx_electronic_attendance_requests_org ON electronic_attendance_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_electronic_attendance_requests_session ON electronic_attendance_requests(attendance_session_id);
CREATE INDEX IF NOT EXISTS idx_electronic_attendance_requests_student ON electronic_attendance_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_electronic_attendance_requests_token ON electronic_attendance_requests(signature_token);
CREATE INDEX IF NOT EXISTS idx_electronic_attendance_requests_status ON electronic_attendance_requests(status);
CREATE INDEX IF NOT EXISTS idx_electronic_attendance_requests_email ON electronic_attendance_requests(student_email);

-- Enable RLS
ALTER TABLE electronic_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE electronic_attendance_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for electronic_attendance_sessions

-- Admin and staff can view all attendance sessions in their organization
DROP POLICY IF EXISTS "Admin and staff can view attendance sessions" ON electronic_attendance_sessions;
CREATE POLICY "Admin and staff can view attendance sessions"
  ON electronic_attendance_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = electronic_attendance_sessions.organization_id
      AND users.role IN ('admin', 'secretary', 'teacher')
    )
  );

-- Admin and staff can create attendance sessions
DROP POLICY IF EXISTS "Admin and staff can create attendance sessions" ON electronic_attendance_sessions;
CREATE POLICY "Admin and staff can create attendance sessions"
  ON electronic_attendance_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = electronic_attendance_sessions.organization_id
      AND users.role IN ('admin', 'secretary', 'teacher')
    )
  );

-- Admin and staff can update attendance sessions
DROP POLICY IF EXISTS "Admin and staff can update attendance sessions" ON electronic_attendance_sessions;
CREATE POLICY "Admin and staff can update attendance sessions"
  ON electronic_attendance_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = electronic_attendance_sessions.organization_id
      AND users.role IN ('admin', 'secretary', 'teacher')
    )
  );

-- Admin and staff can delete attendance sessions
DROP POLICY IF EXISTS "Admin and staff can delete attendance sessions" ON electronic_attendance_sessions;
CREATE POLICY "Admin and staff can delete attendance sessions"
  ON electronic_attendance_sessions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = electronic_attendance_sessions.organization_id
      AND users.role IN ('admin', 'secretary')
    )
  );

-- RLS Policies for electronic_attendance_requests

-- Admin and staff can view all attendance requests in their organization
DROP POLICY IF EXISTS "Admin and staff can view attendance requests" ON electronic_attendance_requests;
CREATE POLICY "Admin and staff can view attendance requests"
  ON electronic_attendance_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = electronic_attendance_requests.organization_id
      AND users.role IN ('admin', 'secretary', 'teacher')
    )
  );

-- Admin and staff can create attendance requests
DROP POLICY IF EXISTS "Admin and staff can create attendance requests" ON electronic_attendance_requests;
CREATE POLICY "Admin and staff can create attendance requests"
  ON electronic_attendance_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = electronic_attendance_requests.organization_id
      AND users.role IN ('admin', 'secretary', 'teacher')
    )
  );

-- Anyone with the signature token can view the request (for public attendance page)
DROP POLICY IF EXISTS "Public can view attendance request with token" ON electronic_attendance_requests;
CREATE POLICY "Public can view attendance request with token"
  ON electronic_attendance_requests FOR SELECT
  USING (true); -- Token validation will be done in the application layer

-- Anyone with the signature token can update the request (for signing)
DROP POLICY IF EXISTS "Public can update attendance request with token" ON electronic_attendance_requests;
CREATE POLICY "Public can update attendance request with token"
  ON electronic_attendance_requests FOR UPDATE
  USING (true); -- Token validation will be done in the application layer

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_electronic_attendance_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS electronic_attendance_sessions_updated_at ON electronic_attendance_sessions;
CREATE TRIGGER electronic_attendance_sessions_updated_at
  BEFORE UPDATE ON electronic_attendance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_electronic_attendance_sessions_updated_at();

CREATE OR REPLACE FUNCTION update_electronic_attendance_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS electronic_attendance_requests_updated_at ON electronic_attendance_requests;
CREATE TRIGGER electronic_attendance_requests_updated_at
  BEFORE UPDATE ON electronic_attendance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_electronic_attendance_requests_updated_at();

-- Function to update attendance session statistics
CREATE OR REPLACE FUNCTION update_attendance_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE electronic_attendance_sessions
  SET total_signed = (
    SELECT COUNT(*)
    FROM electronic_attendance_requests
    WHERE attendance_session_id = NEW.attendance_session_id
    AND status = 'signed'
  )
  WHERE id = NEW.attendance_session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_attendance_stats_on_sign ON electronic_attendance_requests;
CREATE TRIGGER update_attendance_stats_on_sign
  AFTER INSERT OR UPDATE ON electronic_attendance_requests
  FOR EACH ROW
  WHEN (NEW.status = 'signed')
  EXECUTE FUNCTION update_attendance_session_stats();

-- Function to automatically expire attendance requests
CREATE OR REPLACE FUNCTION expire_attendance_requests()
RETURNS void AS $$
BEGIN
  -- Expire requests for closed attendance sessions
  UPDATE electronic_attendance_requests
  SET status = 'expired'
  WHERE status = 'pending'
  AND attendance_session_id IN (
    SELECT id FROM electronic_attendance_sessions
    WHERE status = 'closed'
    OR (closes_at IS NOT NULL AND closes_at < now())
  );
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE electronic_attendance_sessions IS 'Sessions d''émargement électronique pour les formations';
COMMENT ON TABLE electronic_attendance_requests IS 'Demandes d''émargement électronique envoyées aux apprenants';
COMMENT ON COLUMN electronic_attendance_sessions.mode IS 'Mode d''émargement: electronic (signature électronique), manual (papier), hybrid (les deux)';
COMMENT ON COLUMN electronic_attendance_requests.signature_token IS 'Token unique pour accéder à la page d''émargement';
COMMENT ON COLUMN electronic_attendance_requests.location_verified IS 'Indique si la géolocalisation a été vérifiée et validée';
