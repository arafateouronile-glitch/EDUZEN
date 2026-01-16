-- Migration pour l'émargement par QR Code

-- 1. Table pour les QR codes de session
CREATE TABLE IF NOT EXISTS public.session_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  qr_code_token TEXT NOT NULL UNIQUE, -- Token unique pour le QR code
  qr_code_data TEXT NOT NULL, -- Données encodées dans le QR code (JSON)
  -- Configuration
  expires_at TIMESTAMPTZ NOT NULL, -- Expiration du QR code
  is_active BOOLEAN DEFAULT true,
  max_scans INTEGER DEFAULT NULL, -- Nombre maximum de scans (NULL = illimité)
  current_scans INTEGER DEFAULT 0, -- Nombre de scans actuels
  -- Restrictions
  require_location BOOLEAN DEFAULT false, -- Exiger la géolocalisation
  allowed_radius_meters INTEGER DEFAULT NULL, -- Rayon autorisé en mètres
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les scans de QR code (émargements)
CREATE TABLE IF NOT EXISTS public.qr_code_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES public.session_qr_codes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  -- Informations du scan
  scan_token TEXT NOT NULL UNIQUE, -- Token unique du scan
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Géolocalisation
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy DECIMAL(10, 2), -- Précision en mètres
  -- Informations de l'appareil
  device_info JSONB, -- Informations de l'appareil (user agent, etc.)
  ip_address INET,
  -- Statut
  is_valid BOOLEAN DEFAULT true,
  validation_error TEXT, -- Erreur si le scan est invalide
  -- Métadonnées
  metadata JSONB,
  UNIQUE(qr_code_id, student_id) -- Un étudiant ne peut scanner qu'une fois par QR code
);

-- 3. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_session_qr_codes_session ON public.session_qr_codes(session_id, is_active);
CREATE INDEX IF NOT EXISTS idx_session_qr_codes_token ON public.session_qr_codes(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_session_qr_codes_expires ON public.session_qr_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_qr_code ON public.qr_code_scans(qr_code_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_student ON public.qr_code_scans(student_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_session ON public.qr_code_scans(session_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_token ON public.qr_code_scans(scan_token);

-- 4. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_session_qr_codes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_session_qr_codes_timestamp ON public.session_qr_codes;
CREATE TRIGGER update_session_qr_codes_timestamp
  BEFORE UPDATE ON public.session_qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_session_qr_codes_updated_at();

-- 6. Fonction pour nettoyer les QR codes expirés
CREATE OR REPLACE FUNCTION cleanup_expired_qr_codes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.session_qr_codes
  SET is_active = false
  WHERE expires_at < NOW()
    AND is_active = true;
END;
$$;

-- 7. RLS Policies pour session_qr_codes
ALTER TABLE public.session_qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view QR codes for their sessions" ON public.session_qr_codes;
CREATE POLICY "Teachers can view QR codes for their sessions"
  ON public.session_qr_codes
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can manage QR codes for their sessions" ON public.session_qr_codes;
CREATE POLICY "Teachers can manage QR codes for their sessions"
  ON public.session_qr_codes
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE teacher_id = auth.uid()
    )
  );

-- 8. RLS Policies pour qr_code_scans
ALTER TABLE public.qr_code_scans ENABLE ROW LEVEL SECURITY;

-- Permettre à tous les utilisateurs authentifiés de créer des scans
-- La validation que l'étudiant est bien inscrit à la session se fait côté application
DROP POLICY IF EXISTS "Authenticated users can create QR code scans" ON public.qr_code_scans;
CREATE POLICY "Authenticated users can create QR code scans"
  ON public.qr_code_scans
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Permettre aux utilisateurs de voir leurs propres scans
-- (validation via student_id sera faite côté application)
DROP POLICY IF EXISTS "Users can view QR code scans" ON public.qr_code_scans;
CREATE POLICY "Users can view QR code scans"
  ON public.qr_code_scans
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Teachers can view QR code scans for their sessions" ON public.qr_code_scans;
CREATE POLICY "Teachers can view QR code scans for their sessions"
  ON public.qr_code_scans
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE teacher_id = auth.uid()
    )
  );

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_qr_codes TO authenticated;
GRANT SELECT, INSERT ON public.qr_code_scans TO authenticated;


-- 1. Table pour les QR codes de session
CREATE TABLE IF NOT EXISTS public.session_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  qr_code_token TEXT NOT NULL UNIQUE, -- Token unique pour le QR code
  qr_code_data TEXT NOT NULL, -- Données encodées dans le QR code (JSON)
  -- Configuration
  expires_at TIMESTAMPTZ NOT NULL, -- Expiration du QR code
  is_active BOOLEAN DEFAULT true,
  max_scans INTEGER DEFAULT NULL, -- Nombre maximum de scans (NULL = illimité)
  current_scans INTEGER DEFAULT 0, -- Nombre de scans actuels
  -- Restrictions
  require_location BOOLEAN DEFAULT false, -- Exiger la géolocalisation
  allowed_radius_meters INTEGER DEFAULT NULL, -- Rayon autorisé en mètres
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les scans de QR code (émargements)
CREATE TABLE IF NOT EXISTS public.qr_code_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES public.session_qr_codes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  -- Informations du scan
  scan_token TEXT NOT NULL UNIQUE, -- Token unique du scan
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Géolocalisation
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy DECIMAL(10, 2), -- Précision en mètres
  -- Informations de l'appareil
  device_info JSONB, -- Informations de l'appareil (user agent, etc.)
  ip_address INET,
  -- Statut
  is_valid BOOLEAN DEFAULT true,
  validation_error TEXT, -- Erreur si le scan est invalide
  -- Métadonnées
  metadata JSONB,
  UNIQUE(qr_code_id, student_id) -- Un étudiant ne peut scanner qu'une fois par QR code
);

-- 3. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_session_qr_codes_session ON public.session_qr_codes(session_id, is_active);
CREATE INDEX IF NOT EXISTS idx_session_qr_codes_token ON public.session_qr_codes(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_session_qr_codes_expires ON public.session_qr_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_qr_code ON public.qr_code_scans(qr_code_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_student ON public.qr_code_scans(student_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_session ON public.qr_code_scans(session_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_token ON public.qr_code_scans(scan_token);

-- 4. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_session_qr_codes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_session_qr_codes_timestamp ON public.session_qr_codes;
CREATE TRIGGER update_session_qr_codes_timestamp
  BEFORE UPDATE ON public.session_qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_session_qr_codes_updated_at();

-- 6. Fonction pour nettoyer les QR codes expirés
CREATE OR REPLACE FUNCTION cleanup_expired_qr_codes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.session_qr_codes
  SET is_active = false
  WHERE expires_at < NOW()
    AND is_active = true;
END;
$$;

-- 7. RLS Policies pour session_qr_codes
ALTER TABLE public.session_qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view QR codes for their sessions" ON public.session_qr_codes;
CREATE POLICY "Teachers can view QR codes for their sessions"
  ON public.session_qr_codes
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can manage QR codes for their sessions" ON public.session_qr_codes;
CREATE POLICY "Teachers can manage QR codes for their sessions"
  ON public.session_qr_codes
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE teacher_id = auth.uid()
    )
  );

-- 8. RLS Policies pour qr_code_scans
ALTER TABLE public.qr_code_scans ENABLE ROW LEVEL SECURITY;

-- Permettre à tous les utilisateurs authentifiés de créer des scans
-- La validation que l'étudiant est bien inscrit à la session se fait côté application
DROP POLICY IF EXISTS "Authenticated users can create QR code scans" ON public.qr_code_scans;
CREATE POLICY "Authenticated users can create QR code scans"
  ON public.qr_code_scans
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Permettre aux utilisateurs de voir leurs propres scans
-- (validation via student_id sera faite côté application)
DROP POLICY IF EXISTS "Users can view QR code scans" ON public.qr_code_scans;
CREATE POLICY "Users can view QR code scans"
  ON public.qr_code_scans
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Teachers can view QR code scans for their sessions" ON public.qr_code_scans;
CREATE POLICY "Teachers can view QR code scans for their sessions"
  ON public.qr_code_scans
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE teacher_id = auth.uid()
    )
  );

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_qr_codes TO authenticated;
GRANT SELECT, INSERT ON public.qr_code_scans TO authenticated;


-- 1. Table pour les QR codes de session
CREATE TABLE IF NOT EXISTS public.session_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  qr_code_token TEXT NOT NULL UNIQUE, -- Token unique pour le QR code
  qr_code_data TEXT NOT NULL, -- Données encodées dans le QR code (JSON)
  -- Configuration
  expires_at TIMESTAMPTZ NOT NULL, -- Expiration du QR code
  is_active BOOLEAN DEFAULT true,
  max_scans INTEGER DEFAULT NULL, -- Nombre maximum de scans (NULL = illimité)
  current_scans INTEGER DEFAULT 0, -- Nombre de scans actuels
  -- Restrictions
  require_location BOOLEAN DEFAULT false, -- Exiger la géolocalisation
  allowed_radius_meters INTEGER DEFAULT NULL, -- Rayon autorisé en mètres
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les scans de QR code (émargements)
CREATE TABLE IF NOT EXISTS public.qr_code_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code_id UUID NOT NULL REFERENCES public.session_qr_codes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  -- Informations du scan
  scan_token TEXT NOT NULL UNIQUE, -- Token unique du scan
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Géolocalisation
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  accuracy DECIMAL(10, 2), -- Précision en mètres
  -- Informations de l'appareil
  device_info JSONB, -- Informations de l'appareil (user agent, etc.)
  ip_address INET,
  -- Statut
  is_valid BOOLEAN DEFAULT true,
  validation_error TEXT, -- Erreur si le scan est invalide
  -- Métadonnées
  metadata JSONB,
  UNIQUE(qr_code_id, student_id) -- Un étudiant ne peut scanner qu'une fois par QR code
);

-- 3. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_session_qr_codes_session ON public.session_qr_codes(session_id, is_active);
CREATE INDEX IF NOT EXISTS idx_session_qr_codes_token ON public.session_qr_codes(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_session_qr_codes_expires ON public.session_qr_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_qr_code ON public.qr_code_scans(qr_code_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_student ON public.qr_code_scans(student_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_session ON public.qr_code_scans(session_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_code_scans_token ON public.qr_code_scans(scan_token);

-- 4. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_session_qr_codes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_session_qr_codes_timestamp ON public.session_qr_codes;
CREATE TRIGGER update_session_qr_codes_timestamp
  BEFORE UPDATE ON public.session_qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_session_qr_codes_updated_at();

-- 6. Fonction pour nettoyer les QR codes expirés
CREATE OR REPLACE FUNCTION cleanup_expired_qr_codes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.session_qr_codes
  SET is_active = false
  WHERE expires_at < NOW()
    AND is_active = true;
END;
$$;

-- 7. RLS Policies pour session_qr_codes
ALTER TABLE public.session_qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view QR codes for their sessions" ON public.session_qr_codes;
CREATE POLICY "Teachers can view QR codes for their sessions"
  ON public.session_qr_codes
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Teachers can manage QR codes for their sessions" ON public.session_qr_codes;
CREATE POLICY "Teachers can manage QR codes for their sessions"
  ON public.session_qr_codes
  FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE teacher_id = auth.uid()
    )
  );

-- 8. RLS Policies pour qr_code_scans
ALTER TABLE public.qr_code_scans ENABLE ROW LEVEL SECURITY;

-- Permettre à tous les utilisateurs authentifiés de créer des scans
-- La validation que l'étudiant est bien inscrit à la session se fait côté application
DROP POLICY IF EXISTS "Authenticated users can create QR code scans" ON public.qr_code_scans;
CREATE POLICY "Authenticated users can create QR code scans"
  ON public.qr_code_scans
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Permettre aux utilisateurs de voir leurs propres scans
-- (validation via student_id sera faite côté application)
DROP POLICY IF EXISTS "Users can view QR code scans" ON public.qr_code_scans;
CREATE POLICY "Users can view QR code scans"
  ON public.qr_code_scans
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Teachers can view QR code scans for their sessions" ON public.qr_code_scans;
CREATE POLICY "Teachers can view QR code scans for their sessions"
  ON public.qr_code_scans
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE teacher_id = auth.uid()
    )
  );

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_qr_codes TO authenticated;
GRANT SELECT, INSERT ON public.qr_code_scans TO authenticated;





