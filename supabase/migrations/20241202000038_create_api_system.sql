-- Migration pour le système d'API publique avec rate limiting

-- 1. Table pour les clés API
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Clé API
  key_hash TEXT NOT NULL UNIQUE, -- Hash de la clé API (SHA-256)
  key_prefix TEXT NOT NULL, -- Préfixe de la clé pour affichage (ex: "eduz_...")
  -- Informations
  name TEXT NOT NULL, -- Nom de la clé (ex: "Production API", "Development")
  description TEXT,
  -- Permissions
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[], -- Scopes autorisés (ex: ['read:students', 'write:documents'])
  -- Restrictions
  allowed_ips TEXT[], -- IPs autorisées (vide = toutes)
  allowed_origins TEXT[], -- Origines autorisées (CORS)
  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- Date d'expiration
  last_used_at TIMESTAMPTZ,
  -- Statistiques
  request_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour le suivi des requêtes API
CREATE TABLE IF NOT EXISTS public.api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Requête
  method TEXT NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE', etc.
  endpoint TEXT NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  -- Réponse
  status_code INTEGER,
  response_time_ms INTEGER,
  -- Métadonnées
  ip_address INET,
  user_agent TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les quotas API par organisation
CREATE TABLE IF NOT EXISTS public.api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Quotas
  requests_per_minute INTEGER DEFAULT 60,
  requests_per_hour INTEGER DEFAULT 1000,
  requests_per_day INTEGER DEFAULT 10000,
  requests_per_month INTEGER DEFAULT 100000,
  -- Période
  quota_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quota_period_end TIMESTAMPTZ,
  -- Utilisation
  requests_used_minute INTEGER DEFAULT 0,
  requests_used_hour INTEGER DEFAULT 0,
  requests_used_day INTEGER DEFAULT 0,
  requests_used_month INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- 4. Table pour les webhooks (pour api-2)
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  -- Événements
  events TEXT[] NOT NULL, -- ['document.generated', 'payment.received', etc.]
  -- Configuration
  secret TEXT NOT NULL, -- Secret pour signer les webhooks
  is_active BOOLEAN DEFAULT true,
  -- Retry
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  -- Statistiques
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les tentatives d'envoi de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  -- Événement
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  -- Envoi
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
  response_status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  -- Tentatives
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

-- 6. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_requests_key ON public.api_requests(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_org ON public.api_requests(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON public.api_requests(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_quotas_org ON public.api_quotas(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON public.webhooks(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status, next_retry_at);

-- 7. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_api_system_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 8. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_api_keys_timestamp ON public.api_keys;
CREATE TRIGGER update_api_keys_timestamp
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_system_updated_at();

DROP TRIGGER IF EXISTS update_api_quotas_timestamp ON public.api_quotas;
CREATE TRIGGER update_api_quotas_timestamp
  BEFORE UPDATE ON public.api_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_api_system_updated_at();

DROP TRIGGER IF EXISTS update_webhooks_timestamp ON public.webhooks;
CREATE TRIGGER update_webhooks_timestamp
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_api_system_updated_at();

-- 9. Fonction pour incrémenter le compteur de requêtes
CREATE OR REPLACE FUNCTION increment_api_request_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mettre à jour le compteur de la clé API
  IF NEW.api_key_id IS NOT NULL THEN
    UPDATE public.api_keys
    SET request_count = request_count + 1,
        last_used_at = NEW.created_at
    WHERE id = NEW.api_key_id;
  END IF;
  
  -- Mettre à jour les quotas de l'organisation
  IF NEW.organization_id IS NOT NULL THEN
    UPDATE public.api_quotas
    SET requests_used_minute = requests_used_minute + 1,
        requests_used_hour = requests_used_hour + 1,
        requests_used_day = requests_used_day + 1,
        requests_used_month = requests_used_month + 1,
        updated_at = NOW()
    WHERE organization_id = NEW.organization_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_api_request_count ON public.api_requests;
CREATE TRIGGER trigger_increment_api_request_count
  AFTER INSERT ON public.api_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_api_request_count();

-- 10. Fonction pour créer automatiquement un quota pour une organisation
CREATE OR REPLACE FUNCTION create_api_quota_for_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.api_quotas (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Note: Ce trigger nécessiterait d'être créé sur organizations, ce qui peut ne pas être possible
-- Il faudra créer le quota lors de la création de la clé API dans l'application

-- 11. RLS Policies pour api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's API keys" ON public.api_keys;
CREATE POLICY "Users can view their organization's API keys"
  ON public.api_keys
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create API keys for their organization" ON public.api_keys;
CREATE POLICY "Users can create API keys for their organization"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their organization's API keys" ON public.api_keys;
CREATE POLICY "Users can update their organization's API keys"
  ON public.api_keys
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their organization's API keys" ON public.api_keys;
CREATE POLICY "Users can delete their organization's API keys"
  ON public.api_keys
  FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 12. RLS Policies pour api_requests
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's API requests" ON public.api_requests;
CREATE POLICY "Users can view their organization's API requests"
  ON public.api_requests
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 13. RLS Policies pour api_quotas
ALTER TABLE public.api_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's API quotas" ON public.api_quotas;
CREATE POLICY "Users can view their organization's API quotas"
  ON public.api_quotas
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 14. RLS Policies pour webhooks
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's webhooks" ON public.webhooks;
CREATE POLICY "Users can view their organization's webhooks"
  ON public.webhooks
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their organization's webhooks" ON public.webhooks;
CREATE POLICY "Users can manage their organization's webhooks"
  ON public.webhooks
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour webhook_deliveries
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's webhook deliveries" ON public.webhook_deliveries;
CREATE POLICY "Users can view their organization's webhook deliveries"
  ON public.webhook_deliveries
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM public.webhooks
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 16. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT SELECT ON public.api_requests TO authenticated;
GRANT SELECT ON public.api_quotas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;
GRANT SELECT ON public.webhook_deliveries TO authenticated;



-- 1. Table pour les clés API
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Clé API
  key_hash TEXT NOT NULL UNIQUE, -- Hash de la clé API (SHA-256)
  key_prefix TEXT NOT NULL, -- Préfixe de la clé pour affichage (ex: "eduz_...")
  -- Informations
  name TEXT NOT NULL, -- Nom de la clé (ex: "Production API", "Development")
  description TEXT,
  -- Permissions
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[], -- Scopes autorisés (ex: ['read:students', 'write:documents'])
  -- Restrictions
  allowed_ips TEXT[], -- IPs autorisées (vide = toutes)
  allowed_origins TEXT[], -- Origines autorisées (CORS)
  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- Date d'expiration
  last_used_at TIMESTAMPTZ,
  -- Statistiques
  request_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour le suivi des requêtes API
CREATE TABLE IF NOT EXISTS public.api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Requête
  method TEXT NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE', etc.
  endpoint TEXT NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  -- Réponse
  status_code INTEGER,
  response_time_ms INTEGER,
  -- Métadonnées
  ip_address INET,
  user_agent TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les quotas API par organisation
CREATE TABLE IF NOT EXISTS public.api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Quotas
  requests_per_minute INTEGER DEFAULT 60,
  requests_per_hour INTEGER DEFAULT 1000,
  requests_per_day INTEGER DEFAULT 10000,
  requests_per_month INTEGER DEFAULT 100000,
  -- Période
  quota_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quota_period_end TIMESTAMPTZ,
  -- Utilisation
  requests_used_minute INTEGER DEFAULT 0,
  requests_used_hour INTEGER DEFAULT 0,
  requests_used_day INTEGER DEFAULT 0,
  requests_used_month INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- 4. Table pour les webhooks (pour api-2)
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  -- Événements
  events TEXT[] NOT NULL, -- ['document.generated', 'payment.received', etc.]
  -- Configuration
  secret TEXT NOT NULL, -- Secret pour signer les webhooks
  is_active BOOLEAN DEFAULT true,
  -- Retry
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  -- Statistiques
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les tentatives d'envoi de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  -- Événement
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  -- Envoi
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
  response_status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  -- Tentatives
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

-- 6. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_requests_key ON public.api_requests(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_org ON public.api_requests(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON public.api_requests(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_quotas_org ON public.api_quotas(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON public.webhooks(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status, next_retry_at);

-- 7. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_api_system_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 8. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_api_keys_timestamp ON public.api_keys;
CREATE TRIGGER update_api_keys_timestamp
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_system_updated_at();

DROP TRIGGER IF EXISTS update_api_quotas_timestamp ON public.api_quotas;
CREATE TRIGGER update_api_quotas_timestamp
  BEFORE UPDATE ON public.api_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_api_system_updated_at();

DROP TRIGGER IF EXISTS update_webhooks_timestamp ON public.webhooks;
CREATE TRIGGER update_webhooks_timestamp
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_api_system_updated_at();

-- 9. Fonction pour incrémenter le compteur de requêtes
CREATE OR REPLACE FUNCTION increment_api_request_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mettre à jour le compteur de la clé API
  IF NEW.api_key_id IS NOT NULL THEN
    UPDATE public.api_keys
    SET request_count = request_count + 1,
        last_used_at = NEW.created_at
    WHERE id = NEW.api_key_id;
  END IF;
  
  -- Mettre à jour les quotas de l'organisation
  IF NEW.organization_id IS NOT NULL THEN
    UPDATE public.api_quotas
    SET requests_used_minute = requests_used_minute + 1,
        requests_used_hour = requests_used_hour + 1,
        requests_used_day = requests_used_day + 1,
        requests_used_month = requests_used_month + 1,
        updated_at = NOW()
    WHERE organization_id = NEW.organization_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_api_request_count ON public.api_requests;
CREATE TRIGGER trigger_increment_api_request_count
  AFTER INSERT ON public.api_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_api_request_count();

-- 10. Fonction pour créer automatiquement un quota pour une organisation
CREATE OR REPLACE FUNCTION create_api_quota_for_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.api_quotas (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Note: Ce trigger nécessiterait d'être créé sur organizations, ce qui peut ne pas être possible
-- Il faudra créer le quota lors de la création de la clé API dans l'application

-- 11. RLS Policies pour api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's API keys" ON public.api_keys;
CREATE POLICY "Users can view their organization's API keys"
  ON public.api_keys
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create API keys for their organization" ON public.api_keys;
CREATE POLICY "Users can create API keys for their organization"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their organization's API keys" ON public.api_keys;
CREATE POLICY "Users can update their organization's API keys"
  ON public.api_keys
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their organization's API keys" ON public.api_keys;
CREATE POLICY "Users can delete their organization's API keys"
  ON public.api_keys
  FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 12. RLS Policies pour api_requests
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's API requests" ON public.api_requests;
CREATE POLICY "Users can view their organization's API requests"
  ON public.api_requests
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 13. RLS Policies pour api_quotas
ALTER TABLE public.api_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's API quotas" ON public.api_quotas;
CREATE POLICY "Users can view their organization's API quotas"
  ON public.api_quotas
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 14. RLS Policies pour webhooks
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's webhooks" ON public.webhooks;
CREATE POLICY "Users can view their organization's webhooks"
  ON public.webhooks
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their organization's webhooks" ON public.webhooks;
CREATE POLICY "Users can manage their organization's webhooks"
  ON public.webhooks
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour webhook_deliveries
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's webhook deliveries" ON public.webhook_deliveries;
CREATE POLICY "Users can view their organization's webhook deliveries"
  ON public.webhook_deliveries
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM public.webhooks
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 16. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT SELECT ON public.api_requests TO authenticated;
GRANT SELECT ON public.api_quotas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;
GRANT SELECT ON public.webhook_deliveries TO authenticated;



-- 1. Table pour les clés API
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Clé API
  key_hash TEXT NOT NULL UNIQUE, -- Hash de la clé API (SHA-256)
  key_prefix TEXT NOT NULL, -- Préfixe de la clé pour affichage (ex: "eduz_...")
  -- Informations
  name TEXT NOT NULL, -- Nom de la clé (ex: "Production API", "Development")
  description TEXT,
  -- Permissions
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[], -- Scopes autorisés (ex: ['read:students', 'write:documents'])
  -- Restrictions
  allowed_ips TEXT[], -- IPs autorisées (vide = toutes)
  allowed_origins TEXT[], -- Origines autorisées (CORS)
  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 60,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  rate_limit_per_day INTEGER DEFAULT 10000,
  -- Statut
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- Date d'expiration
  last_used_at TIMESTAMPTZ,
  -- Statistiques
  request_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour le suivi des requêtes API
CREATE TABLE IF NOT EXISTS public.api_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Requête
  method TEXT NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE', etc.
  endpoint TEXT NOT NULL,
  path TEXT NOT NULL,
  query_params JSONB,
  -- Réponse
  status_code INTEGER,
  response_time_ms INTEGER,
  -- Métadonnées
  ip_address INET,
  user_agent TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les quotas API par organisation
CREATE TABLE IF NOT EXISTS public.api_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Quotas
  requests_per_minute INTEGER DEFAULT 60,
  requests_per_hour INTEGER DEFAULT 1000,
  requests_per_day INTEGER DEFAULT 10000,
  requests_per_month INTEGER DEFAULT 100000,
  -- Période
  quota_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quota_period_end TIMESTAMPTZ,
  -- Utilisation
  requests_used_minute INTEGER DEFAULT 0,
  requests_used_hour INTEGER DEFAULT 0,
  requests_used_day INTEGER DEFAULT 0,
  requests_used_month INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- 4. Table pour les webhooks (pour api-2)
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  -- Événements
  events TEXT[] NOT NULL, -- ['document.generated', 'payment.received', etc.]
  -- Configuration
  secret TEXT NOT NULL, -- Secret pour signer les webhooks
  is_active BOOLEAN DEFAULT true,
  -- Retry
  retry_count INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  -- Statistiques
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les tentatives d'envoi de webhooks
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  -- Événement
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  -- Envoi
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retrying'
  response_status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  -- Tentatives
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ
);

-- 6. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON public.api_keys(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_requests_key ON public.api_requests(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_org ON public.api_requests(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_requests_endpoint ON public.api_requests(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_quotas_org ON public.api_quotas(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_org ON public.webhooks(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries(status, next_retry_at);

-- 7. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_api_system_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 8. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_api_keys_timestamp ON public.api_keys;
CREATE TRIGGER update_api_keys_timestamp
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_system_updated_at();

DROP TRIGGER IF EXISTS update_api_quotas_timestamp ON public.api_quotas;
CREATE TRIGGER update_api_quotas_timestamp
  BEFORE UPDATE ON public.api_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_api_system_updated_at();

DROP TRIGGER IF EXISTS update_webhooks_timestamp ON public.webhooks;
CREATE TRIGGER update_webhooks_timestamp
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_api_system_updated_at();

-- 9. Fonction pour incrémenter le compteur de requêtes
CREATE OR REPLACE FUNCTION increment_api_request_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mettre à jour le compteur de la clé API
  IF NEW.api_key_id IS NOT NULL THEN
    UPDATE public.api_keys
    SET request_count = request_count + 1,
        last_used_at = NEW.created_at
    WHERE id = NEW.api_key_id;
  END IF;
  
  -- Mettre à jour les quotas de l'organisation
  IF NEW.organization_id IS NOT NULL THEN
    UPDATE public.api_quotas
    SET requests_used_minute = requests_used_minute + 1,
        requests_used_hour = requests_used_hour + 1,
        requests_used_day = requests_used_day + 1,
        requests_used_month = requests_used_month + 1,
        updated_at = NOW()
    WHERE organization_id = NEW.organization_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_increment_api_request_count ON public.api_requests;
CREATE TRIGGER trigger_increment_api_request_count
  AFTER INSERT ON public.api_requests
  FOR EACH ROW
  EXECUTE FUNCTION increment_api_request_count();

-- 10. Fonction pour créer automatiquement un quota pour une organisation
CREATE OR REPLACE FUNCTION create_api_quota_for_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.api_quotas (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Note: Ce trigger nécessiterait d'être créé sur organizations, ce qui peut ne pas être possible
-- Il faudra créer le quota lors de la création de la clé API dans l'application

-- 11. RLS Policies pour api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's API keys" ON public.api_keys;
CREATE POLICY "Users can view their organization's API keys"
  ON public.api_keys
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create API keys for their organization" ON public.api_keys;
CREATE POLICY "Users can create API keys for their organization"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their organization's API keys" ON public.api_keys;
CREATE POLICY "Users can update their organization's API keys"
  ON public.api_keys
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their organization's API keys" ON public.api_keys;
CREATE POLICY "Users can delete their organization's API keys"
  ON public.api_keys
  FOR DELETE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 12. RLS Policies pour api_requests
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's API requests" ON public.api_requests;
CREATE POLICY "Users can view their organization's API requests"
  ON public.api_requests
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 13. RLS Policies pour api_quotas
ALTER TABLE public.api_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's API quotas" ON public.api_quotas;
CREATE POLICY "Users can view their organization's API quotas"
  ON public.api_quotas
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 14. RLS Policies pour webhooks
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's webhooks" ON public.webhooks;
CREATE POLICY "Users can view their organization's webhooks"
  ON public.webhooks
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can manage their organization's webhooks" ON public.webhooks;
CREATE POLICY "Users can manage their organization's webhooks"
  ON public.webhooks
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour webhook_deliveries
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's webhook deliveries" ON public.webhook_deliveries;
CREATE POLICY "Users can view their organization's webhook deliveries"
  ON public.webhook_deliveries
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM public.webhooks
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
  );

-- 16. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT SELECT ON public.api_requests TO authenticated;
GRANT SELECT ON public.api_quotas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhooks TO authenticated;
GRANT SELECT ON public.webhook_deliveries TO authenticated;


