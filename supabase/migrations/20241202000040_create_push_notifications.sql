-- Migration pour le système de notifications push natives

-- 1. Table pour les devices (appareils) enregistrés pour les notifications push
CREATE TABLE IF NOT EXISTS public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Informations du device
  device_token TEXT NOT NULL, -- Token unique du device (FCM, APNS, etc.)
  device_type TEXT NOT NULL, -- 'ios', 'android', 'web'
  platform TEXT, -- 'fcm', 'apns', 'web-push'
  -- Métadonnées
  device_name TEXT, -- Nom du device (ex: "iPhone de Jean")
  device_model TEXT, -- Modèle du device (ex: "iPhone 13 Pro")
  os_version TEXT, -- Version de l'OS
  app_version TEXT, -- Version de l'application
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'fr',
  timezone TEXT,
  -- Statistiques
  last_notification_at TIMESTAMPTZ,
  notification_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- 2. Table pour les préférences de notifications par utilisateur
CREATE TABLE IF NOT EXISTS public.push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Préférences par type d'événement
  enable_payments BOOLEAN DEFAULT true,
  enable_attendance BOOLEAN DEFAULT true,
  enable_documents BOOLEAN DEFAULT true,
  enable_evaluations BOOLEAN DEFAULT true,
  enable_messages BOOLEAN DEFAULT true,
  enable_events BOOLEAN DEFAULT true,
  enable_reminders BOOLEAN DEFAULT true,
  enable_announcements BOOLEAN DEFAULT true,
  -- Préférences générales
  quiet_hours_start TIME, -- Heure de début des heures silencieuses (ex: 22:00)
  quiet_hours_end TIME, -- Heure de fin des heures silencieuses (ex: 08:00)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Table pour les notifications envoyées
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.push_devices(id) ON DELETE SET NULL,
  -- Notification
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Données supplémentaires (payload)
  -- Type et catégorie
  notification_type TEXT NOT NULL, -- 'payment', 'attendance', 'document', 'evaluation', 'message', 'event', 'reminder', 'announcement'
  category TEXT, -- Catégorie pour le grouping (iOS)
  -- Priorité
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
  sound TEXT DEFAULT 'default', -- Nom du son (ou 'none')
  badge INTEGER, -- Badge count (iOS)
  -- Statut
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
  -- Métadonnées
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les templates de notifications
CREATE TABLE IF NOT EXISTS public.push_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Template
  name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title_template TEXT NOT NULL, -- Template avec variables (ex: "Nouveau paiement de {{amount}}")
  body_template TEXT NOT NULL,
  -- Configuration
  priority TEXT DEFAULT 'normal',
  sound TEXT DEFAULT 'default',
  data_template JSONB, -- Template pour les données supplémentaires
  -- Statut
  is_active BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les campagnes de notifications (notifications groupées)
CREATE TABLE IF NOT EXISTS public.push_notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Campagne
  name TEXT NOT NULL,
  description TEXT,
  -- Cible
  target_audience TEXT DEFAULT 'all', -- 'all', 'students', 'teachers', 'parents', 'custom'
  target_user_ids UUID[], -- IDs des utilisateurs cibles (si custom)
  -- Notification
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  -- Planification
  scheduled_at TIMESTAMPTZ, -- Date/heure d'envoi planifiée
  -- Statut
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- 6. Table pour les logs d'envoi de notifications
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.push_notification_campaigns(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.push_devices(id) ON DELETE SET NULL,
  -- Log
  action TEXT NOT NULL, -- 'sent', 'delivered', 'failed', 'clicked', 'dismissed'
  status_code INTEGER,
  error_message TEXT,
  provider_response JSONB, -- Réponse du provider (FCM, APNS)
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_push_devices_user ON public.push_devices(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_devices_token ON public.push_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_push_notification_preferences_user ON public.push_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_user ON public.push_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON public.push_notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_type ON public.push_notifications(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notification_templates_org ON public.push_notification_templates(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_notification_campaigns_org ON public.push_notification_campaigns(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_push_notification_campaigns_scheduled ON public.push_notification_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_notification ON public.push_notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_campaign ON public.push_notification_logs(campaign_id);

-- 8. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_push_notification_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_push_devices_timestamp ON public.push_devices;
CREATE TRIGGER update_push_devices_timestamp
  BEFORE UPDATE ON public.push_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

DROP TRIGGER IF EXISTS update_push_notification_preferences_timestamp ON public.push_notification_preferences;
CREATE TRIGGER update_push_notification_preferences_timestamp
  BEFORE UPDATE ON public.push_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

DROP TRIGGER IF EXISTS update_push_notification_templates_timestamp ON public.push_notification_templates;
CREATE TRIGGER update_push_notification_templates_timestamp
  BEFORE UPDATE ON public.push_notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

DROP TRIGGER IF EXISTS update_push_notification_campaigns_timestamp ON public.push_notification_campaigns;
CREATE TRIGGER update_push_notification_campaigns_timestamp
  BEFORE UPDATE ON public.push_notification_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

-- 10. Fonction pour mettre à jour les statistiques du device
CREATE OR REPLACE FUNCTION update_push_device_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    UPDATE public.push_devices
    SET notification_count = notification_count + 1,
        last_notification_at = NEW.sent_at
    WHERE id = NEW.device_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_device_stats ON public.push_notifications;
CREATE TRIGGER trigger_update_device_stats
  AFTER UPDATE ON public.push_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_push_device_stats();

-- 11. RLS Policies pour push_devices
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own devices" ON public.push_devices;
CREATE POLICY "Users can view their own devices"
  ON public.push_devices
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own devices" ON public.push_devices;
CREATE POLICY "Users can manage their own devices"
  ON public.push_devices
  FOR ALL
  USING (user_id = auth.uid());

-- 12. RLS Policies pour push_notification_preferences
ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.push_notification_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON public.push_notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- 13. RLS Policies pour push_notifications
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.push_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.push_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- 14. RLS Policies pour push_notification_templates
ALTER TABLE public.push_notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's templates" ON public.push_notification_templates;
CREATE POLICY "Users can view their organization's templates"
  ON public.push_notification_templates
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour push_notification_campaigns
ALTER TABLE public.push_notification_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's campaigns" ON public.push_notification_campaigns;
CREATE POLICY "Users can view their organization's campaigns"
  ON public.push_notification_campaigns
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create campaigns for their organization" ON public.push_notification_campaigns;
CREATE POLICY "Users can create campaigns for their organization"
  ON public.push_notification_campaigns
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- 16. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.push_notification_preferences TO authenticated;
GRANT SELECT ON public.push_notifications TO authenticated;
GRANT SELECT ON public.push_notification_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.push_notification_campaigns TO authenticated;
GRANT SELECT ON public.push_notification_logs TO authenticated;



-- 1. Table pour les devices (appareils) enregistrés pour les notifications push
CREATE TABLE IF NOT EXISTS public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Informations du device
  device_token TEXT NOT NULL, -- Token unique du device (FCM, APNS, etc.)
  device_type TEXT NOT NULL, -- 'ios', 'android', 'web'
  platform TEXT, -- 'fcm', 'apns', 'web-push'
  -- Métadonnées
  device_name TEXT, -- Nom du device (ex: "iPhone de Jean")
  device_model TEXT, -- Modèle du device (ex: "iPhone 13 Pro")
  os_version TEXT, -- Version de l'OS
  app_version TEXT, -- Version de l'application
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'fr',
  timezone TEXT,
  -- Statistiques
  last_notification_at TIMESTAMPTZ,
  notification_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- 2. Table pour les préférences de notifications par utilisateur
CREATE TABLE IF NOT EXISTS public.push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Préférences par type d'événement
  enable_payments BOOLEAN DEFAULT true,
  enable_attendance BOOLEAN DEFAULT true,
  enable_documents BOOLEAN DEFAULT true,
  enable_evaluations BOOLEAN DEFAULT true,
  enable_messages BOOLEAN DEFAULT true,
  enable_events BOOLEAN DEFAULT true,
  enable_reminders BOOLEAN DEFAULT true,
  enable_announcements BOOLEAN DEFAULT true,
  -- Préférences générales
  quiet_hours_start TIME, -- Heure de début des heures silencieuses (ex: 22:00)
  quiet_hours_end TIME, -- Heure de fin des heures silencieuses (ex: 08:00)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Table pour les notifications envoyées
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.push_devices(id) ON DELETE SET NULL,
  -- Notification
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Données supplémentaires (payload)
  -- Type et catégorie
  notification_type TEXT NOT NULL, -- 'payment', 'attendance', 'document', 'evaluation', 'message', 'event', 'reminder', 'announcement'
  category TEXT, -- Catégorie pour le grouping (iOS)
  -- Priorité
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
  sound TEXT DEFAULT 'default', -- Nom du son (ou 'none')
  badge INTEGER, -- Badge count (iOS)
  -- Statut
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
  -- Métadonnées
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les templates de notifications
CREATE TABLE IF NOT EXISTS public.push_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Template
  name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title_template TEXT NOT NULL, -- Template avec variables (ex: "Nouveau paiement de {{amount}}")
  body_template TEXT NOT NULL,
  -- Configuration
  priority TEXT DEFAULT 'normal',
  sound TEXT DEFAULT 'default',
  data_template JSONB, -- Template pour les données supplémentaires
  -- Statut
  is_active BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les campagnes de notifications (notifications groupées)
CREATE TABLE IF NOT EXISTS public.push_notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Campagne
  name TEXT NOT NULL,
  description TEXT,
  -- Cible
  target_audience TEXT DEFAULT 'all', -- 'all', 'students', 'teachers', 'parents', 'custom'
  target_user_ids UUID[], -- IDs des utilisateurs cibles (si custom)
  -- Notification
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  -- Planification
  scheduled_at TIMESTAMPTZ, -- Date/heure d'envoi planifiée
  -- Statut
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- 6. Table pour les logs d'envoi de notifications
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.push_notification_campaigns(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.push_devices(id) ON DELETE SET NULL,
  -- Log
  action TEXT NOT NULL, -- 'sent', 'delivered', 'failed', 'clicked', 'dismissed'
  status_code INTEGER,
  error_message TEXT,
  provider_response JSONB, -- Réponse du provider (FCM, APNS)
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_push_devices_user ON public.push_devices(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_devices_token ON public.push_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_push_notification_preferences_user ON public.push_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_user ON public.push_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON public.push_notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_type ON public.push_notifications(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notification_templates_org ON public.push_notification_templates(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_notification_campaigns_org ON public.push_notification_campaigns(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_push_notification_campaigns_scheduled ON public.push_notification_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_notification ON public.push_notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_campaign ON public.push_notification_logs(campaign_id);

-- 8. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_push_notification_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_push_devices_timestamp ON public.push_devices;
CREATE TRIGGER update_push_devices_timestamp
  BEFORE UPDATE ON public.push_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

DROP TRIGGER IF EXISTS update_push_notification_preferences_timestamp ON public.push_notification_preferences;
CREATE TRIGGER update_push_notification_preferences_timestamp
  BEFORE UPDATE ON public.push_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

DROP TRIGGER IF EXISTS update_push_notification_templates_timestamp ON public.push_notification_templates;
CREATE TRIGGER update_push_notification_templates_timestamp
  BEFORE UPDATE ON public.push_notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

DROP TRIGGER IF EXISTS update_push_notification_campaigns_timestamp ON public.push_notification_campaigns;
CREATE TRIGGER update_push_notification_campaigns_timestamp
  BEFORE UPDATE ON public.push_notification_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

-- 10. Fonction pour mettre à jour les statistiques du device
CREATE OR REPLACE FUNCTION update_push_device_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    UPDATE public.push_devices
    SET notification_count = notification_count + 1,
        last_notification_at = NEW.sent_at
    WHERE id = NEW.device_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_device_stats ON public.push_notifications;
CREATE TRIGGER trigger_update_device_stats
  AFTER UPDATE ON public.push_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_push_device_stats();

-- 11. RLS Policies pour push_devices
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own devices" ON public.push_devices;
CREATE POLICY "Users can view their own devices"
  ON public.push_devices
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own devices" ON public.push_devices;
CREATE POLICY "Users can manage their own devices"
  ON public.push_devices
  FOR ALL
  USING (user_id = auth.uid());

-- 12. RLS Policies pour push_notification_preferences
ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.push_notification_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON public.push_notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- 13. RLS Policies pour push_notifications
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.push_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.push_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- 14. RLS Policies pour push_notification_templates
ALTER TABLE public.push_notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's templates" ON public.push_notification_templates;
CREATE POLICY "Users can view their organization's templates"
  ON public.push_notification_templates
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour push_notification_campaigns
ALTER TABLE public.push_notification_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's campaigns" ON public.push_notification_campaigns;
CREATE POLICY "Users can view their organization's campaigns"
  ON public.push_notification_campaigns
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create campaigns for their organization" ON public.push_notification_campaigns;
CREATE POLICY "Users can create campaigns for their organization"
  ON public.push_notification_campaigns
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- 16. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.push_notification_preferences TO authenticated;
GRANT SELECT ON public.push_notifications TO authenticated;
GRANT SELECT ON public.push_notification_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.push_notification_campaigns TO authenticated;
GRANT SELECT ON public.push_notification_logs TO authenticated;



-- 1. Table pour les devices (appareils) enregistrés pour les notifications push
CREATE TABLE IF NOT EXISTS public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- Informations du device
  device_token TEXT NOT NULL, -- Token unique du device (FCM, APNS, etc.)
  device_type TEXT NOT NULL, -- 'ios', 'android', 'web'
  platform TEXT, -- 'fcm', 'apns', 'web-push'
  -- Métadonnées
  device_name TEXT, -- Nom du device (ex: "iPhone de Jean")
  device_model TEXT, -- Modèle du device (ex: "iPhone 13 Pro")
  os_version TEXT, -- Version de l'OS
  app_version TEXT, -- Version de l'application
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  language TEXT DEFAULT 'fr',
  timezone TEXT,
  -- Statistiques
  last_notification_at TIMESTAMPTZ,
  notification_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- 2. Table pour les préférences de notifications par utilisateur
CREATE TABLE IF NOT EXISTS public.push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Préférences par type d'événement
  enable_payments BOOLEAN DEFAULT true,
  enable_attendance BOOLEAN DEFAULT true,
  enable_documents BOOLEAN DEFAULT true,
  enable_evaluations BOOLEAN DEFAULT true,
  enable_messages BOOLEAN DEFAULT true,
  enable_events BOOLEAN DEFAULT true,
  enable_reminders BOOLEAN DEFAULT true,
  enable_announcements BOOLEAN DEFAULT true,
  -- Préférences générales
  quiet_hours_start TIME, -- Heure de début des heures silencieuses (ex: 22:00)
  quiet_hours_end TIME, -- Heure de fin des heures silencieuses (ex: 08:00)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Table pour les notifications envoyées
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.push_devices(id) ON DELETE SET NULL,
  -- Notification
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Données supplémentaires (payload)
  -- Type et catégorie
  notification_type TEXT NOT NULL, -- 'payment', 'attendance', 'document', 'evaluation', 'message', 'event', 'reminder', 'announcement'
  category TEXT, -- Catégorie pour le grouping (iOS)
  -- Priorité
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
  sound TEXT DEFAULT 'default', -- Nom du son (ou 'none')
  badge INTEGER, -- Badge count (iOS)
  -- Statut
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
  -- Métadonnées
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les templates de notifications
CREATE TABLE IF NOT EXISTS public.push_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Template
  name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  title_template TEXT NOT NULL, -- Template avec variables (ex: "Nouveau paiement de {{amount}}")
  body_template TEXT NOT NULL,
  -- Configuration
  priority TEXT DEFAULT 'normal',
  sound TEXT DEFAULT 'default',
  data_template JSONB, -- Template pour les données supplémentaires
  -- Statut
  is_active BOOLEAN DEFAULT true,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les campagnes de notifications (notifications groupées)
CREATE TABLE IF NOT EXISTS public.push_notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Campagne
  name TEXT NOT NULL,
  description TEXT,
  -- Cible
  target_audience TEXT DEFAULT 'all', -- 'all', 'students', 'teachers', 'parents', 'custom'
  target_user_ids UUID[], -- IDs des utilisateurs cibles (si custom)
  -- Notification
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  -- Planification
  scheduled_at TIMESTAMPTZ, -- Date/heure d'envoi planifiée
  -- Statut
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'cancelled'
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- 6. Table pour les logs d'envoi de notifications
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.push_notification_campaigns(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.push_devices(id) ON DELETE SET NULL,
  -- Log
  action TEXT NOT NULL, -- 'sent', 'delivered', 'failed', 'clicked', 'dismissed'
  status_code INTEGER,
  error_message TEXT,
  provider_response JSONB, -- Réponse du provider (FCM, APNS)
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_push_devices_user ON public.push_devices(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_devices_token ON public.push_devices(device_token);
CREATE INDEX IF NOT EXISTS idx_push_notification_preferences_user ON public.push_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_user ON public.push_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON public.push_notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_type ON public.push_notifications(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notification_templates_org ON public.push_notification_templates(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_notification_campaigns_org ON public.push_notification_campaigns(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_push_notification_campaigns_scheduled ON public.push_notification_campaigns(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_notification ON public.push_notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_campaign ON public.push_notification_logs(campaign_id);

-- 8. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_push_notification_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_push_devices_timestamp ON public.push_devices;
CREATE TRIGGER update_push_devices_timestamp
  BEFORE UPDATE ON public.push_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

DROP TRIGGER IF EXISTS update_push_notification_preferences_timestamp ON public.push_notification_preferences;
CREATE TRIGGER update_push_notification_preferences_timestamp
  BEFORE UPDATE ON public.push_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

DROP TRIGGER IF EXISTS update_push_notification_templates_timestamp ON public.push_notification_templates;
CREATE TRIGGER update_push_notification_templates_timestamp
  BEFORE UPDATE ON public.push_notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

DROP TRIGGER IF EXISTS update_push_notification_campaigns_timestamp ON public.push_notification_campaigns;
CREATE TRIGGER update_push_notification_campaigns_timestamp
  BEFORE UPDATE ON public.push_notification_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_push_notification_updated_at();

-- 10. Fonction pour mettre à jour les statistiques du device
CREATE OR REPLACE FUNCTION update_push_device_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    UPDATE public.push_devices
    SET notification_count = notification_count + 1,
        last_notification_at = NEW.sent_at
    WHERE id = NEW.device_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_device_stats ON public.push_notifications;
CREATE TRIGGER trigger_update_device_stats
  AFTER UPDATE ON public.push_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_push_device_stats();

-- 11. RLS Policies pour push_devices
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own devices" ON public.push_devices;
CREATE POLICY "Users can view their own devices"
  ON public.push_devices
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own devices" ON public.push_devices;
CREATE POLICY "Users can manage their own devices"
  ON public.push_devices
  FOR ALL
  USING (user_id = auth.uid());

-- 12. RLS Policies pour push_notification_preferences
ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.push_notification_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON public.push_notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- 13. RLS Policies pour push_notifications
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.push_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.push_notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- 14. RLS Policies pour push_notification_templates
ALTER TABLE public.push_notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's templates" ON public.push_notification_templates;
CREATE POLICY "Users can view their organization's templates"
  ON public.push_notification_templates
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

-- 15. RLS Policies pour push_notification_campaigns
ALTER TABLE public.push_notification_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's campaigns" ON public.push_notification_campaigns;
CREATE POLICY "Users can view their organization's campaigns"
  ON public.push_notification_campaigns
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create campaigns for their organization" ON public.push_notification_campaigns;
CREATE POLICY "Users can create campaigns for their organization"
  ON public.push_notification_campaigns
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- 16. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.push_notification_preferences TO authenticated;
GRANT SELECT ON public.push_notifications TO authenticated;
GRANT SELECT ON public.push_notification_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.push_notification_campaigns TO authenticated;
GRANT SELECT ON public.push_notification_logs TO authenticated;


