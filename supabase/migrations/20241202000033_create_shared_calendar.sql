-- Migration pour le calendrier partagé avec synchronisation

-- 1. Table pour les calendriers
CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6', -- Couleur du calendrier (hex)
  -- Propriétaire
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Visibilité
  is_public BOOLEAN DEFAULT false, -- Calendrier public dans l'organisation
  is_default BOOLEAN DEFAULT false, -- Calendrier par défaut de l'utilisateur
  -- Synchronisation
  sync_enabled BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les événements
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations de l'événement
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  -- Dates et heures
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'Africa/Abidjan',
  -- Répétition
  recurrence_rule TEXT, -- Format RRULE (iCal)
  recurrence_end_date TIMESTAMPTZ,
  -- Type d'événement
  event_type TEXT DEFAULT 'event', -- 'event', 'meeting', 'reminder', 'deadline', 'holiday'
  -- Statut
  status TEXT DEFAULT 'confirmed', -- 'tentative', 'confirmed', 'cancelled'
  -- Couleur
  color TEXT, -- Couleur spécifique pour cet événement
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les participants aux événements
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- Pour les participants externes
  -- Statut de participation
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'tentative'
  -- Rôle
  role TEXT DEFAULT 'attendee', -- 'organizer', 'attendee', 'optional'
  -- Notifications
  send_notifications BOOLEAN DEFAULT true,
  -- Dates
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id),
  UNIQUE(event_id, email)
);

-- 4. Table pour les rappels/notifications
CREATE TABLE IF NOT EXISTS public.event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Configuration du rappel
  reminder_type TEXT DEFAULT 'notification', -- 'notification', 'email', 'sms'
  minutes_before INTEGER NOT NULL, -- Minutes avant l'événement (ex: 15, 30, 60)
  -- Statut
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les partages de calendrier
CREATE TABLE IF NOT EXISTS public.calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT, -- Pour partage externe
  -- Permissions
  permission_level TEXT DEFAULT 'view', -- 'view', 'edit', 'manage'
  -- Statut
  is_accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  -- Dates
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(calendar_id, shared_with_user_id),
  UNIQUE(calendar_id, shared_with_email)
);

-- 6. Table pour les exceptions de récurrence
CREATE TABLE IF NOT EXISTS public.event_recurrence_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  original_start_time TIMESTAMPTZ NOT NULL,
  exception_date TIMESTAMPTZ NOT NULL,
  -- Modification
  is_cancelled BOOLEAN DEFAULT false,
  modified_title TEXT,
  modified_start_time TIMESTAMPTZ,
  modified_end_time TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, exception_date)
);

-- 7. Table pour les préférences de calendrier utilisateur
CREATE TABLE IF NOT EXISTS public.user_calendar_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Vue par défaut
  default_view TEXT DEFAULT 'month', -- 'day', 'week', 'month', 'agenda'
  -- Heure de début de journée
  day_start_hour INTEGER DEFAULT 8,
  day_end_hour INTEGER DEFAULT 18,
  -- Week-end
  show_weekends BOOLEAN DEFAULT true,
  -- Fuseau horaire
  timezone TEXT DEFAULT 'Africa/Abidjan',
  -- Notifications
  default_reminder_minutes INTEGER DEFAULT 15,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_calendars_org ON public.calendars(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendars_owner ON public.calendars(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON public.calendar_events(calendar_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON public.calendar_events(organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON public.calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON public.event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON public.event_reminders(event_id, is_sent);
CREATE INDEX IF NOT EXISTS idx_event_reminders_user ON public.event_reminders(user_id, is_sent);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_calendar ON public.calendar_shares(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_user ON public.calendar_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_exceptions_event ON public.event_recurrence_exceptions(event_id);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_calendars_timestamp ON public.calendars;
CREATE TRIGGER update_calendars_timestamp
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

DROP TRIGGER IF EXISTS update_calendar_events_timestamp ON public.calendar_events;
CREATE TRIGGER update_calendar_events_timestamp
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

DROP TRIGGER IF EXISTS update_user_calendar_preferences_timestamp ON public.user_calendar_preferences;
CREATE TRIGGER update_user_calendar_preferences_timestamp
  BEFORE UPDATE ON public.user_calendar_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

-- 11. Fonction pour créer un calendrier par défaut pour un nouvel utilisateur
CREATE OR REPLACE FUNCTION create_default_calendar_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Récupérer l'organization_id de l'utilisateur
  SELECT organization_id INTO org_id
  FROM public.users
  WHERE id = NEW.id;
  
  IF org_id IS NOT NULL THEN
    -- Créer un calendrier par défaut
    INSERT INTO public.calendars (
      organization_id,
      name,
      owner_id,
      is_default,
      color
    ) VALUES (
      org_id,
      'Mon calendrier',
      NEW.id,
      true,
      '#3B82F6'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: Ce trigger nécessiterait d'être créé sur auth.users, ce qui n'est pas possible directement
-- Il faudra créer le calendrier par défaut lors de la création du compte utilisateur dans l'application

-- 12. RLS Policies pour calendars
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view calendars in their organization" ON public.calendars;
CREATE POLICY "Users can view calendars in their organization"
  ON public.calendars
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      is_public = true
      OR owner_id = auth.uid()
      OR id IN (SELECT calendar_id FROM public.calendar_shares WHERE shared_with_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create calendars in their organization" ON public.calendars;
CREATE POLICY "Users can create calendars in their organization"
  ON public.calendars
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can update their calendars" ON public.calendars;
CREATE POLICY "Owners can update their calendars"
  ON public.calendars
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT calendar_id FROM public.calendar_shares
      WHERE shared_with_user_id = auth.uid() AND permission_level IN ('edit', 'manage')
    )
  );

-- 13. RLS Policies pour calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events in accessible calendars" ON public.calendar_events;
CREATE POLICY "Users can view events in accessible calendars"
  ON public.calendar_events
  FOR SELECT
  USING (
    calendar_id IN (
      SELECT id FROM public.calendars
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      AND (
        is_public = true
        OR owner_id = auth.uid()
        OR id IN (SELECT calendar_id FROM public.calendar_shares WHERE shared_with_user_id = auth.uid())
      )
    )
    OR id IN (SELECT event_id FROM public.event_participants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create events in their calendars" ON public.calendar_events;
CREATE POLICY "Users can create events in their calendars"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (
    calendar_id IN (
      SELECT id FROM public.calendars
      WHERE owner_id = auth.uid()
      OR id IN (
        SELECT calendar_id FROM public.calendar_shares
        WHERE shared_with_user_id = auth.uid() AND permission_level IN ('edit', 'manage')
      )
    )
  );

DROP POLICY IF EXISTS "Users can update events they can edit" ON public.calendar_events;
CREATE POLICY "Users can update events they can edit"
  ON public.calendar_events
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR calendar_id IN (
      SELECT id FROM public.calendars
      WHERE owner_id = auth.uid()
      OR id IN (
        SELECT calendar_id FROM public.calendar_shares
        WHERE shared_with_user_id = auth.uid() AND permission_level IN ('edit', 'manage')
      )
    )
  );

-- 14. RLS Policies pour event_participants
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view participants of accessible events" ON public.event_participants;
CREATE POLICY "Users can view participants of accessible events"
  ON public.event_participants
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM public.calendar_events
      WHERE calendar_id IN (
        SELECT id FROM public.calendars
        WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage their own participation" ON public.event_participants;
CREATE POLICY "Users can manage their own participation"
  ON public.event_participants
  FOR ALL
  USING (
    user_id = auth.uid()
    OR event_id IN (
      SELECT id FROM public.calendar_events WHERE created_by = auth.uid()
    )
  );

-- 15. RLS Policies pour event_reminders
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own reminders" ON public.event_reminders;
CREATE POLICY "Users can manage their own reminders"
  ON public.event_reminders
  FOR ALL
  USING (user_id = auth.uid());

-- 16. RLS Policies pour calendar_shares
ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shares of their calendars or shared with them" ON public.calendar_shares;
CREATE POLICY "Users can view shares of their calendars or shared with them"
  ON public.calendar_shares
  FOR SELECT
  USING (
    calendar_id IN (SELECT id FROM public.calendars WHERE owner_id = auth.uid())
    OR shared_with_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Calendar owners can manage shares" ON public.calendar_shares;
CREATE POLICY "Calendar owners can manage shares"
  ON public.calendar_shares
  FOR ALL
  USING (
    calendar_id IN (SELECT id FROM public.calendars WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can accept shares" ON public.calendar_shares;
CREATE POLICY "Users can accept shares"
  ON public.calendar_shares
  FOR UPDATE
  USING (shared_with_user_id = auth.uid());

-- 17. RLS Policies pour user_calendar_preferences
ALTER TABLE public.user_calendar_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_calendar_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON public.user_calendar_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- 18. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_recurrence_exceptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_calendar_preferences TO authenticated;



-- 1. Table pour les calendriers
CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6', -- Couleur du calendrier (hex)
  -- Propriétaire
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Visibilité
  is_public BOOLEAN DEFAULT false, -- Calendrier public dans l'organisation
  is_default BOOLEAN DEFAULT false, -- Calendrier par défaut de l'utilisateur
  -- Synchronisation
  sync_enabled BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les événements
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations de l'événement
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  -- Dates et heures
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'Africa/Abidjan',
  -- Répétition
  recurrence_rule TEXT, -- Format RRULE (iCal)
  recurrence_end_date TIMESTAMPTZ,
  -- Type d'événement
  event_type TEXT DEFAULT 'event', -- 'event', 'meeting', 'reminder', 'deadline', 'holiday'
  -- Statut
  status TEXT DEFAULT 'confirmed', -- 'tentative', 'confirmed', 'cancelled'
  -- Couleur
  color TEXT, -- Couleur spécifique pour cet événement
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les participants aux événements
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- Pour les participants externes
  -- Statut de participation
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'tentative'
  -- Rôle
  role TEXT DEFAULT 'attendee', -- 'organizer', 'attendee', 'optional'
  -- Notifications
  send_notifications BOOLEAN DEFAULT true,
  -- Dates
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id),
  UNIQUE(event_id, email)
);

-- 4. Table pour les rappels/notifications
CREATE TABLE IF NOT EXISTS public.event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Configuration du rappel
  reminder_type TEXT DEFAULT 'notification', -- 'notification', 'email', 'sms'
  minutes_before INTEGER NOT NULL, -- Minutes avant l'événement (ex: 15, 30, 60)
  -- Statut
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les partages de calendrier
CREATE TABLE IF NOT EXISTS public.calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT, -- Pour partage externe
  -- Permissions
  permission_level TEXT DEFAULT 'view', -- 'view', 'edit', 'manage'
  -- Statut
  is_accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  -- Dates
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(calendar_id, shared_with_user_id),
  UNIQUE(calendar_id, shared_with_email)
);

-- 6. Table pour les exceptions de récurrence
CREATE TABLE IF NOT EXISTS public.event_recurrence_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  original_start_time TIMESTAMPTZ NOT NULL,
  exception_date TIMESTAMPTZ NOT NULL,
  -- Modification
  is_cancelled BOOLEAN DEFAULT false,
  modified_title TEXT,
  modified_start_time TIMESTAMPTZ,
  modified_end_time TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, exception_date)
);

-- 7. Table pour les préférences de calendrier utilisateur
CREATE TABLE IF NOT EXISTS public.user_calendar_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Vue par défaut
  default_view TEXT DEFAULT 'month', -- 'day', 'week', 'month', 'agenda'
  -- Heure de début de journée
  day_start_hour INTEGER DEFAULT 8,
  day_end_hour INTEGER DEFAULT 18,
  -- Week-end
  show_weekends BOOLEAN DEFAULT true,
  -- Fuseau horaire
  timezone TEXT DEFAULT 'Africa/Abidjan',
  -- Notifications
  default_reminder_minutes INTEGER DEFAULT 15,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_calendars_org ON public.calendars(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendars_owner ON public.calendars(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON public.calendar_events(calendar_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON public.calendar_events(organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON public.calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON public.event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON public.event_reminders(event_id, is_sent);
CREATE INDEX IF NOT EXISTS idx_event_reminders_user ON public.event_reminders(user_id, is_sent);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_calendar ON public.calendar_shares(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_user ON public.calendar_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_exceptions_event ON public.event_recurrence_exceptions(event_id);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_calendars_timestamp ON public.calendars;
CREATE TRIGGER update_calendars_timestamp
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

DROP TRIGGER IF EXISTS update_calendar_events_timestamp ON public.calendar_events;
CREATE TRIGGER update_calendar_events_timestamp
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

DROP TRIGGER IF EXISTS update_user_calendar_preferences_timestamp ON public.user_calendar_preferences;
CREATE TRIGGER update_user_calendar_preferences_timestamp
  BEFORE UPDATE ON public.user_calendar_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

-- 11. Fonction pour créer un calendrier par défaut pour un nouvel utilisateur
CREATE OR REPLACE FUNCTION create_default_calendar_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Récupérer l'organization_id de l'utilisateur
  SELECT organization_id INTO org_id
  FROM public.users
  WHERE id = NEW.id;
  
  IF org_id IS NOT NULL THEN
    -- Créer un calendrier par défaut
    INSERT INTO public.calendars (
      organization_id,
      name,
      owner_id,
      is_default,
      color
    ) VALUES (
      org_id,
      'Mon calendrier',
      NEW.id,
      true,
      '#3B82F6'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: Ce trigger nécessiterait d'être créé sur auth.users, ce qui n'est pas possible directement
-- Il faudra créer le calendrier par défaut lors de la création du compte utilisateur dans l'application

-- 12. RLS Policies pour calendars
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view calendars in their organization" ON public.calendars;
CREATE POLICY "Users can view calendars in their organization"
  ON public.calendars
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      is_public = true
      OR owner_id = auth.uid()
      OR id IN (SELECT calendar_id FROM public.calendar_shares WHERE shared_with_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create calendars in their organization" ON public.calendars;
CREATE POLICY "Users can create calendars in their organization"
  ON public.calendars
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can update their calendars" ON public.calendars;
CREATE POLICY "Owners can update their calendars"
  ON public.calendars
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT calendar_id FROM public.calendar_shares
      WHERE shared_with_user_id = auth.uid() AND permission_level IN ('edit', 'manage')
    )
  );

-- 13. RLS Policies pour calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events in accessible calendars" ON public.calendar_events;
CREATE POLICY "Users can view events in accessible calendars"
  ON public.calendar_events
  FOR SELECT
  USING (
    calendar_id IN (
      SELECT id FROM public.calendars
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      AND (
        is_public = true
        OR owner_id = auth.uid()
        OR id IN (SELECT calendar_id FROM public.calendar_shares WHERE shared_with_user_id = auth.uid())
      )
    )
    OR id IN (SELECT event_id FROM public.event_participants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create events in their calendars" ON public.calendar_events;
CREATE POLICY "Users can create events in their calendars"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (
    calendar_id IN (
      SELECT id FROM public.calendars
      WHERE owner_id = auth.uid()
      OR id IN (
        SELECT calendar_id FROM public.calendar_shares
        WHERE shared_with_user_id = auth.uid() AND permission_level IN ('edit', 'manage')
      )
    )
  );

DROP POLICY IF EXISTS "Users can update events they can edit" ON public.calendar_events;
CREATE POLICY "Users can update events they can edit"
  ON public.calendar_events
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR calendar_id IN (
      SELECT id FROM public.calendars
      WHERE owner_id = auth.uid()
      OR id IN (
        SELECT calendar_id FROM public.calendar_shares
        WHERE shared_with_user_id = auth.uid() AND permission_level IN ('edit', 'manage')
      )
    )
  );

-- 14. RLS Policies pour event_participants
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view participants of accessible events" ON public.event_participants;
CREATE POLICY "Users can view participants of accessible events"
  ON public.event_participants
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM public.calendar_events
      WHERE calendar_id IN (
        SELECT id FROM public.calendars
        WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage their own participation" ON public.event_participants;
CREATE POLICY "Users can manage their own participation"
  ON public.event_participants
  FOR ALL
  USING (
    user_id = auth.uid()
    OR event_id IN (
      SELECT id FROM public.calendar_events WHERE created_by = auth.uid()
    )
  );

-- 15. RLS Policies pour event_reminders
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own reminders" ON public.event_reminders;
CREATE POLICY "Users can manage their own reminders"
  ON public.event_reminders
  FOR ALL
  USING (user_id = auth.uid());

-- 16. RLS Policies pour calendar_shares
ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shares of their calendars or shared with them" ON public.calendar_shares;
CREATE POLICY "Users can view shares of their calendars or shared with them"
  ON public.calendar_shares
  FOR SELECT
  USING (
    calendar_id IN (SELECT id FROM public.calendars WHERE owner_id = auth.uid())
    OR shared_with_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Calendar owners can manage shares" ON public.calendar_shares;
CREATE POLICY "Calendar owners can manage shares"
  ON public.calendar_shares
  FOR ALL
  USING (
    calendar_id IN (SELECT id FROM public.calendars WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can accept shares" ON public.calendar_shares;
CREATE POLICY "Users can accept shares"
  ON public.calendar_shares
  FOR UPDATE
  USING (shared_with_user_id = auth.uid());

-- 17. RLS Policies pour user_calendar_preferences
ALTER TABLE public.user_calendar_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_calendar_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON public.user_calendar_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- 18. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_recurrence_exceptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_calendar_preferences TO authenticated;



-- 1. Table pour les calendriers
CREATE TABLE IF NOT EXISTS public.calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6', -- Couleur du calendrier (hex)
  -- Propriétaire
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Visibilité
  is_public BOOLEAN DEFAULT false, -- Calendrier public dans l'organisation
  is_default BOOLEAN DEFAULT false, -- Calendrier par défaut de l'utilisateur
  -- Synchronisation
  sync_enabled BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table pour les événements
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Informations de l'événement
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  -- Dates et heures
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'Africa/Abidjan',
  -- Répétition
  recurrence_rule TEXT, -- Format RRULE (iCal)
  recurrence_end_date TIMESTAMPTZ,
  -- Type d'événement
  event_type TEXT DEFAULT 'event', -- 'event', 'meeting', 'reminder', 'deadline', 'holiday'
  -- Statut
  status TEXT DEFAULT 'confirmed', -- 'tentative', 'confirmed', 'cancelled'
  -- Couleur
  color TEXT, -- Couleur spécifique pour cet événement
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les participants aux événements
CREATE TABLE IF NOT EXISTS public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, -- Pour les participants externes
  -- Statut de participation
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'tentative'
  -- Rôle
  role TEXT DEFAULT 'attendee', -- 'organizer', 'attendee', 'optional'
  -- Notifications
  send_notifications BOOLEAN DEFAULT true,
  -- Dates
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id),
  UNIQUE(event_id, email)
);

-- 4. Table pour les rappels/notifications
CREATE TABLE IF NOT EXISTS public.event_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Configuration du rappel
  reminder_type TEXT DEFAULT 'notification', -- 'notification', 'email', 'sms'
  minutes_before INTEGER NOT NULL, -- Minutes avant l'événement (ex: 15, 30, 60)
  -- Statut
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les partages de calendrier
CREATE TABLE IF NOT EXISTS public.calendar_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT, -- Pour partage externe
  -- Permissions
  permission_level TEXT DEFAULT 'view', -- 'view', 'edit', 'manage'
  -- Statut
  is_accepted BOOLEAN DEFAULT false,
  accepted_at TIMESTAMPTZ,
  -- Dates
  shared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(calendar_id, shared_with_user_id),
  UNIQUE(calendar_id, shared_with_email)
);

-- 6. Table pour les exceptions de récurrence
CREATE TABLE IF NOT EXISTS public.event_recurrence_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  original_start_time TIMESTAMPTZ NOT NULL,
  exception_date TIMESTAMPTZ NOT NULL,
  -- Modification
  is_cancelled BOOLEAN DEFAULT false,
  modified_title TEXT,
  modified_start_time TIMESTAMPTZ,
  modified_end_time TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, exception_date)
);

-- 7. Table pour les préférences de calendrier utilisateur
CREATE TABLE IF NOT EXISTS public.user_calendar_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Vue par défaut
  default_view TEXT DEFAULT 'month', -- 'day', 'week', 'month', 'agenda'
  -- Heure de début de journée
  day_start_hour INTEGER DEFAULT 8,
  day_end_hour INTEGER DEFAULT 18,
  -- Week-end
  show_weekends BOOLEAN DEFAULT true,
  -- Fuseau horaire
  timezone TEXT DEFAULT 'Africa/Abidjan',
  -- Notifications
  default_reminder_minutes INTEGER DEFAULT 15,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_calendars_org ON public.calendars(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendars_owner ON public.calendars(owner_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_calendar ON public.calendar_events(calendar_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_org ON public.calendar_events(organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON public.calendar_events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user ON public.event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_event ON public.event_reminders(event_id, is_sent);
CREATE INDEX IF NOT EXISTS idx_event_reminders_user ON public.event_reminders(user_id, is_sent);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_calendar ON public.calendar_shares(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_user ON public.calendar_shares(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_recurrence_exceptions_event ON public.event_recurrence_exceptions(event_id);

-- 9. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 10. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_calendars_timestamp ON public.calendars;
CREATE TRIGGER update_calendars_timestamp
  BEFORE UPDATE ON public.calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

DROP TRIGGER IF EXISTS update_calendar_events_timestamp ON public.calendar_events;
CREATE TRIGGER update_calendar_events_timestamp
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

DROP TRIGGER IF EXISTS update_user_calendar_preferences_timestamp ON public.user_calendar_preferences;
CREATE TRIGGER update_user_calendar_preferences_timestamp
  BEFORE UPDATE ON public.user_calendar_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_updated_at();

-- 11. Fonction pour créer un calendrier par défaut pour un nouvel utilisateur
CREATE OR REPLACE FUNCTION create_default_calendar_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Récupérer l'organization_id de l'utilisateur
  SELECT organization_id INTO org_id
  FROM public.users
  WHERE id = NEW.id;
  
  IF org_id IS NOT NULL THEN
    -- Créer un calendrier par défaut
    INSERT INTO public.calendars (
      organization_id,
      name,
      owner_id,
      is_default,
      color
    ) VALUES (
      org_id,
      'Mon calendrier',
      NEW.id,
      true,
      '#3B82F6'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: Ce trigger nécessiterait d'être créé sur auth.users, ce qui n'est pas possible directement
-- Il faudra créer le calendrier par défaut lors de la création du compte utilisateur dans l'application

-- 12. RLS Policies pour calendars
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view calendars in their organization" ON public.calendars;
CREATE POLICY "Users can view calendars in their organization"
  ON public.calendars
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (
      is_public = true
      OR owner_id = auth.uid()
      OR id IN (SELECT calendar_id FROM public.calendar_shares WHERE shared_with_user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create calendars in their organization" ON public.calendars;
CREATE POLICY "Users can create calendars in their organization"
  ON public.calendars
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can update their calendars" ON public.calendars;
CREATE POLICY "Owners can update their calendars"
  ON public.calendars
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR id IN (
      SELECT calendar_id FROM public.calendar_shares
      WHERE shared_with_user_id = auth.uid() AND permission_level IN ('edit', 'manage')
    )
  );

-- 13. RLS Policies pour calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events in accessible calendars" ON public.calendar_events;
CREATE POLICY "Users can view events in accessible calendars"
  ON public.calendar_events
  FOR SELECT
  USING (
    calendar_id IN (
      SELECT id FROM public.calendars
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      AND (
        is_public = true
        OR owner_id = auth.uid()
        OR id IN (SELECT calendar_id FROM public.calendar_shares WHERE shared_with_user_id = auth.uid())
      )
    )
    OR id IN (SELECT event_id FROM public.event_participants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create events in their calendars" ON public.calendar_events;
CREATE POLICY "Users can create events in their calendars"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (
    calendar_id IN (
      SELECT id FROM public.calendars
      WHERE owner_id = auth.uid()
      OR id IN (
        SELECT calendar_id FROM public.calendar_shares
        WHERE shared_with_user_id = auth.uid() AND permission_level IN ('edit', 'manage')
      )
    )
  );

DROP POLICY IF EXISTS "Users can update events they can edit" ON public.calendar_events;
CREATE POLICY "Users can update events they can edit"
  ON public.calendar_events
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR calendar_id IN (
      SELECT id FROM public.calendars
      WHERE owner_id = auth.uid()
      OR id IN (
        SELECT calendar_id FROM public.calendar_shares
        WHERE shared_with_user_id = auth.uid() AND permission_level IN ('edit', 'manage')
      )
    )
  );

-- 14. RLS Policies pour event_participants
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view participants of accessible events" ON public.event_participants;
CREATE POLICY "Users can view participants of accessible events"
  ON public.event_participants
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM public.calendar_events
      WHERE calendar_id IN (
        SELECT id FROM public.calendars
        WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage their own participation" ON public.event_participants;
CREATE POLICY "Users can manage their own participation"
  ON public.event_participants
  FOR ALL
  USING (
    user_id = auth.uid()
    OR event_id IN (
      SELECT id FROM public.calendar_events WHERE created_by = auth.uid()
    )
  );

-- 15. RLS Policies pour event_reminders
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own reminders" ON public.event_reminders;
CREATE POLICY "Users can manage their own reminders"
  ON public.event_reminders
  FOR ALL
  USING (user_id = auth.uid());

-- 16. RLS Policies pour calendar_shares
ALTER TABLE public.calendar_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shares of their calendars or shared with them" ON public.calendar_shares;
CREATE POLICY "Users can view shares of their calendars or shared with them"
  ON public.calendar_shares
  FOR SELECT
  USING (
    calendar_id IN (SELECT id FROM public.calendars WHERE owner_id = auth.uid())
    OR shared_with_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Calendar owners can manage shares" ON public.calendar_shares;
CREATE POLICY "Calendar owners can manage shares"
  ON public.calendar_shares
  FOR ALL
  USING (
    calendar_id IN (SELECT id FROM public.calendars WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can accept shares" ON public.calendar_shares;
CREATE POLICY "Users can accept shares"
  ON public.calendar_shares
  FOR UPDATE
  USING (shared_with_user_id = auth.uid());

-- 17. RLS Policies pour user_calendar_preferences
ALTER TABLE public.user_calendar_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.user_calendar_preferences;
CREATE POLICY "Users can manage their own preferences"
  ON public.user_calendar_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- 18. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_recurrence_exceptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_calendar_preferences TO authenticated;


