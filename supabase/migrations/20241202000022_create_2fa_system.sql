-- Migration pour le système 2FA (Two-Factor Authentication)

-- 1. Table pour les configurations 2FA des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Secret TOTP (Time-based One-Time Password)
  secret TEXT NOT NULL, -- Secret partagé pour générer les codes TOTP
  backup_codes TEXT[], -- Codes de récupération (hashés)
  -- Statut
  is_enabled BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Vérifié lors de l'activation
  -- Métadonnées
  method TEXT DEFAULT 'totp', -- 'totp', 'sms', 'email'
  phone_number TEXT, -- Pour SMS 2FA
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Table pour l'historique des tentatives de vérification 2FA
CREATE TABLE IF NOT EXISTS public.user_2fa_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- Code utilisé (hashé)
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les sessions 2FA (sessions temporaires après vérification 2FA)
CREATE TABLE IF NOT EXISTS public.user_2fa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE, -- Token temporaire après vérification 2FA
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_token)
);

-- 4. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_2fa_user ON public.user_2fa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_enabled ON public.user_2fa(user_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_user_2fa_attempts_user ON public.user_2fa_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_token ON public.user_2fa_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_user ON public.user_2fa_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_expires ON public.user_2fa_sessions(expires_at);

-- 5. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_user_2fa_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 6. Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_user_2fa_timestamp ON public.user_2fa;
CREATE TRIGGER update_user_2fa_timestamp
  BEFORE UPDATE ON public.user_2fa
  FOR EACH ROW
  EXECUTE FUNCTION update_user_2fa_updated_at();

-- 6. Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.user_2fa_sessions
  WHERE expires_at < NOW();
END;
$$;

-- 7. RLS Policies pour user_2fa
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own 2FA configuration" ON public.user_2fa;
CREATE POLICY "Users can view their own 2FA configuration"
  ON public.user_2fa
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own 2FA configuration" ON public.user_2fa;
CREATE POLICY "Users can manage their own 2FA configuration"
  ON public.user_2fa
  FOR ALL
  USING (user_id = auth.uid());

-- 8. RLS Policies pour user_2fa_attempts
ALTER TABLE public.user_2fa_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own 2FA attempts" ON public.user_2fa_attempts;
CREATE POLICY "Users can view their own 2FA attempts"
  ON public.user_2fa_attempts
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create 2FA attempts" ON public.user_2fa_attempts;
CREATE POLICY "System can create 2FA attempts"
  ON public.user_2fa_attempts
  FOR INSERT
  WITH CHECK (true); -- Permet au système de créer des tentatives pour tous les utilisateurs

-- 9. RLS Policies pour user_2fa_sessions
ALTER TABLE public.user_2fa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own 2FA sessions" ON public.user_2fa_sessions;
CREATE POLICY "Users can view their own 2FA sessions"
  ON public.user_2fa_sessions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage 2FA sessions" ON public.user_2fa_sessions;
CREATE POLICY "System can manage 2FA sessions"
  ON public.user_2fa_sessions
  FOR ALL
  USING (true); -- Permet au système de gérer toutes les sessions

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_2fa TO authenticated;
GRANT SELECT, INSERT ON public.user_2fa_attempts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_2fa_sessions TO authenticated;

-- 11. Fonction pour nettoyer les sessions expirées (déjà définie plus haut)
-- 12. Fonction pour générer des codes de récupération
CREATE OR REPLACE FUNCTION public.generate_2fa_backup_codes(count INTEGER DEFAULT 10)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
  codes TEXT[];
  i INTEGER;
  code TEXT;
BEGIN
  codes := ARRAY[]::TEXT[];
  FOR i IN 1..count LOOP
    -- Générer un code aléatoire de 8 caractères
    code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || NOW()::TEXT || i::TEXT),
        1,
        8
      )
    );
    codes := array_append(codes, code);
  END LOOP;
  RETURN codes;
END;
$$;


-- 1. Table pour les configurations 2FA des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Secret TOTP (Time-based One-Time Password)
  secret TEXT NOT NULL, -- Secret partagé pour générer les codes TOTP
  backup_codes TEXT[], -- Codes de récupération (hashés)
  -- Statut
  is_enabled BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Vérifié lors de l'activation
  -- Métadonnées
  method TEXT DEFAULT 'totp', -- 'totp', 'sms', 'email'
  phone_number TEXT, -- Pour SMS 2FA
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Table pour l'historique des tentatives de vérification 2FA
CREATE TABLE IF NOT EXISTS public.user_2fa_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- Code utilisé (hashé)
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les sessions 2FA (sessions temporaires après vérification 2FA)
CREATE TABLE IF NOT EXISTS public.user_2fa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE, -- Token temporaire après vérification 2FA
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_token)
);

-- 4. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_2fa_user ON public.user_2fa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_enabled ON public.user_2fa(user_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_user_2fa_attempts_user ON public.user_2fa_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_token ON public.user_2fa_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_user ON public.user_2fa_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_expires ON public.user_2fa_sessions(expires_at);

-- 5. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_user_2fa_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 6. Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_user_2fa_timestamp ON public.user_2fa;
CREATE TRIGGER update_user_2fa_timestamp
  BEFORE UPDATE ON public.user_2fa
  FOR EACH ROW
  EXECUTE FUNCTION update_user_2fa_updated_at();

-- 6. Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.user_2fa_sessions
  WHERE expires_at < NOW();
END;
$$;

-- 7. RLS Policies pour user_2fa
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own 2FA configuration" ON public.user_2fa;
CREATE POLICY "Users can view their own 2FA configuration"
  ON public.user_2fa
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own 2FA configuration" ON public.user_2fa;
CREATE POLICY "Users can manage their own 2FA configuration"
  ON public.user_2fa
  FOR ALL
  USING (user_id = auth.uid());

-- 8. RLS Policies pour user_2fa_attempts
ALTER TABLE public.user_2fa_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own 2FA attempts" ON public.user_2fa_attempts;
CREATE POLICY "Users can view their own 2FA attempts"
  ON public.user_2fa_attempts
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create 2FA attempts" ON public.user_2fa_attempts;
CREATE POLICY "System can create 2FA attempts"
  ON public.user_2fa_attempts
  FOR INSERT
  WITH CHECK (true); -- Permet au système de créer des tentatives pour tous les utilisateurs

-- 9. RLS Policies pour user_2fa_sessions
ALTER TABLE public.user_2fa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own 2FA sessions" ON public.user_2fa_sessions;
CREATE POLICY "Users can view their own 2FA sessions"
  ON public.user_2fa_sessions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage 2FA sessions" ON public.user_2fa_sessions;
CREATE POLICY "System can manage 2FA sessions"
  ON public.user_2fa_sessions
  FOR ALL
  USING (true); -- Permet au système de gérer toutes les sessions

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_2fa TO authenticated;
GRANT SELECT, INSERT ON public.user_2fa_attempts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_2fa_sessions TO authenticated;

-- 11. Fonction pour nettoyer les sessions expirées (déjà définie plus haut)
-- 12. Fonction pour générer des codes de récupération
CREATE OR REPLACE FUNCTION public.generate_2fa_backup_codes(count INTEGER DEFAULT 10)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
  codes TEXT[];
  i INTEGER;
  code TEXT;
BEGIN
  codes := ARRAY[]::TEXT[];
  FOR i IN 1..count LOOP
    -- Générer un code aléatoire de 8 caractères
    code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || NOW()::TEXT || i::TEXT),
        1,
        8
      )
    );
    codes := array_append(codes, code);
  END LOOP;
  RETURN codes;
END;
$$;


-- 1. Table pour les configurations 2FA des utilisateurs
CREATE TABLE IF NOT EXISTS public.user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Secret TOTP (Time-based One-Time Password)
  secret TEXT NOT NULL, -- Secret partagé pour générer les codes TOTP
  backup_codes TEXT[], -- Codes de récupération (hashés)
  -- Statut
  is_enabled BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Vérifié lors de l'activation
  -- Métadonnées
  method TEXT DEFAULT 'totp', -- 'totp', 'sms', 'email'
  phone_number TEXT, -- Pour SMS 2FA
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Table pour l'historique des tentatives de vérification 2FA
CREATE TABLE IF NOT EXISTS public.user_2fa_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- Code utilisé (hashé)
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les sessions 2FA (sessions temporaires après vérification 2FA)
CREATE TABLE IF NOT EXISTS public.user_2fa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE, -- Token temporaire après vérification 2FA
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_token)
);

-- 4. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_2fa_user ON public.user_2fa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_enabled ON public.user_2fa(user_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_user_2fa_attempts_user ON public.user_2fa_attempts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_token ON public.user_2fa_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_user ON public.user_2fa_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_2fa_sessions_expires ON public.user_2fa_sessions(expires_at);

-- 5. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_user_2fa_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 6. Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_user_2fa_timestamp ON public.user_2fa;
CREATE TRIGGER update_user_2fa_timestamp
  BEFORE UPDATE ON public.user_2fa
  FOR EACH ROW
  EXECUTE FUNCTION update_user_2fa_updated_at();

-- 6. Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION public.cleanup_expired_2fa_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.user_2fa_sessions
  WHERE expires_at < NOW();
END;
$$;

-- 7. RLS Policies pour user_2fa
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own 2FA configuration" ON public.user_2fa;
CREATE POLICY "Users can view their own 2FA configuration"
  ON public.user_2fa
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own 2FA configuration" ON public.user_2fa;
CREATE POLICY "Users can manage their own 2FA configuration"
  ON public.user_2fa
  FOR ALL
  USING (user_id = auth.uid());

-- 8. RLS Policies pour user_2fa_attempts
ALTER TABLE public.user_2fa_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own 2FA attempts" ON public.user_2fa_attempts;
CREATE POLICY "Users can view their own 2FA attempts"
  ON public.user_2fa_attempts
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create 2FA attempts" ON public.user_2fa_attempts;
CREATE POLICY "System can create 2FA attempts"
  ON public.user_2fa_attempts
  FOR INSERT
  WITH CHECK (true); -- Permet au système de créer des tentatives pour tous les utilisateurs

-- 9. RLS Policies pour user_2fa_sessions
ALTER TABLE public.user_2fa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own 2FA sessions" ON public.user_2fa_sessions;
CREATE POLICY "Users can view their own 2FA sessions"
  ON public.user_2fa_sessions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can manage 2FA sessions" ON public.user_2fa_sessions;
CREATE POLICY "System can manage 2FA sessions"
  ON public.user_2fa_sessions
  FOR ALL
  USING (true); -- Permet au système de gérer toutes les sessions

-- 10. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_2fa TO authenticated;
GRANT SELECT, INSERT ON public.user_2fa_attempts TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_2fa_sessions TO authenticated;

-- 11. Fonction pour nettoyer les sessions expirées (déjà définie plus haut)
-- 12. Fonction pour générer des codes de récupération
CREATE OR REPLACE FUNCTION public.generate_2fa_backup_codes(count INTEGER DEFAULT 10)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
  codes TEXT[];
  i INTEGER;
  code TEXT;
BEGIN
  codes := ARRAY[]::TEXT[];
  FOR i IN 1..count LOOP
    -- Générer un code aléatoire de 8 caractères
    code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || NOW()::TEXT || i::TEXT),
        1,
        8
      )
    );
    codes := array_append(codes, code);
  END LOOP;
  RETURN codes;
END;
$$;





