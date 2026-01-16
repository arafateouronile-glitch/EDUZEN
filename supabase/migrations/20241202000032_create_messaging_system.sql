-- Migration pour la messagerie interne entre utilisateurs

-- 1. Table pour les conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type de conversation
  conversation_type TEXT DEFAULT 'direct', -- 'direct', 'group', 'channel'
  -- Informations
  name TEXT, -- Pour les conversations de groupe
  description TEXT,
  avatar_url TEXT,
  -- Configuration
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

-- 2. Table pour les participants aux conversations
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  -- Notifications
  is_muted BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "in_app": true}'::jsonb,
  -- Dates
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- 3. Table pour les messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Contenu
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', 'system', 'reply'
  -- Fichiers et médias
  attachments JSONB, -- Array d'objets {url, filename, type, size}
  -- Réponse à un message
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  -- Édition et suppression
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  -- Réactions
  reactions JSONB DEFAULT '{}'::jsonb, -- {emoji: [user_ids]}
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les messages lus
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- 5. Table pour les messages épinglés
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, message_id)
);

-- 6. Table pour les appels (audio/vidéo)
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  -- Type d'appel
  call_type TEXT DEFAULT 'audio', -- 'audio', 'video'
  -- Participants
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  status TEXT DEFAULT 'initiated', -- 'initiated', 'ringing', 'active', 'ended', 'missed', 'declined'
  -- Durée
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les participants aux appels
CREATE TABLE IF NOT EXISTS public.call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  status TEXT DEFAULT 'invited', -- 'invited', 'joined', 'left', 'declined'
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE(call_id, user_id)
);

-- 8. Table pour les notifications de messages
CREATE TABLE IF NOT EXISTS public.message_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  -- Type de notification
  notification_type TEXT DEFAULT 'message', -- 'message', 'mention', 'reply', 'call'
  -- Contenu
  title TEXT NOT NULL,
  body TEXT,
  -- Statut
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_conv ON public.pinned_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_conversation ON public.calls(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_initiator ON public.calls(initiator_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_call ON public.call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user ON public.call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_notifications_user ON public.message_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_notifications_conv ON public.message_notifications(conversation_id);

-- 10. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_messaging_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_conversations_timestamp ON public.conversations;
CREATE TRIGGER update_conversations_timestamp
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

DROP TRIGGER IF EXISTS update_messages_timestamp ON public.messages;
CREATE TRIGGER update_messages_timestamp
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

-- 12. Fonction pour mettre à jour last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_last_message ON public.messages;
CREATE TRIGGER trigger_update_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION update_conversation_last_message();

-- 13. Fonction pour créer une notification de message
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  participant RECORD;
  sender_name TEXT;
BEGIN
  -- Récupérer le nom de l'expéditeur
  SELECT full_name INTO sender_name
  FROM public.users
  WHERE id = NEW.sender_id;
  
  -- Créer une notification pour chaque participant (sauf l'expéditeur)
  FOR participant IN
    SELECT user_id
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
      AND is_muted = false
  LOOP
    INSERT INTO public.message_notifications (
      user_id,
      conversation_id,
      message_id,
      notification_type,
      title,
      body
    ) VALUES (
      participant.user_id,
      NEW.conversation_id,
      NEW.id,
      'message',
      COALESCE(sender_name, 'Nouveau message'),
      LEFT(NEW.content, 100)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_message_notification ON public.messages;
CREATE TRIGGER trigger_create_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION create_message_notification();

-- 14. RLS Policies pour conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations
  FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create conversations in their organization" ON public.conversations;
CREATE POLICY "Users can create conversations in their organization"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can update their conversations" ON public.conversations;
CREATE POLICY "Owners can update their conversations"
  ON public.conversations
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 15. RLS Policies pour conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their own participation" ON public.conversation_participants;
CREATE POLICY "Users can manage their own participation"
  ON public.conversation_participants
  FOR ALL
  USING (
    user_id = auth.uid()
    OR conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 16. RLS Policies pour messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
CREATE POLICY "Users can create messages in their conversations"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- 17. RLS Policies pour message_reads
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own message reads" ON public.message_reads;
CREATE POLICY "Users can manage their own message reads"
  ON public.message_reads
  FOR ALL
  USING (user_id = auth.uid());

-- 18. RLS Policies pour pinned_messages
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pinned messages in their conversations" ON public.pinned_messages;
CREATE POLICY "Users can view pinned messages in their conversations"
  ON public.pinned_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage pinned messages" ON public.pinned_messages;
CREATE POLICY "Admins can manage pinned messages"
  ON public.pinned_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 19. RLS Policies pour calls
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view calls in their conversations" ON public.calls;
CREATE POLICY "Users can view calls in their conversations"
  ON public.calls
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create calls in their conversations" ON public.calls;
CREATE POLICY "Users can create calls in their conversations"
  ON public.calls
  FOR INSERT
  WITH CHECK (
    initiator_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- 20. RLS Policies pour call_participants
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view call participants" ON public.call_participants;
CREATE POLICY "Users can view call participants"
  ON public.call_participants
  FOR SELECT
  USING (
    call_id IN (
      SELECT id FROM public.calls
      WHERE conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage their own call participation" ON public.call_participants;
CREATE POLICY "Users can manage their own call participation"
  ON public.call_participants
  FOR ALL
  USING (user_id = auth.uid());

-- 21. RLS Policies pour message_notifications
ALTER TABLE public.message_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.message_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.message_notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.message_notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.message_notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- 22. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.message_reads TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.pinned_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.calls TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.call_participants TO authenticated;
GRANT SELECT, UPDATE ON public.message_notifications TO authenticated;


-- 1. Table pour les conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type de conversation
  conversation_type TEXT DEFAULT 'direct', -- 'direct', 'group', 'channel'
  -- Informations
  name TEXT, -- Pour les conversations de groupe
  description TEXT,
  avatar_url TEXT,
  -- Configuration
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

-- 2. Table pour les participants aux conversations
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  -- Notifications
  is_muted BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "in_app": true}'::jsonb,
  -- Dates
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- 3. Table pour les messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Contenu
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', 'system', 'reply'
  -- Fichiers et médias
  attachments JSONB, -- Array d'objets {url, filename, type, size}
  -- Réponse à un message
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  -- Édition et suppression
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  -- Réactions
  reactions JSONB DEFAULT '{}'::jsonb, -- {emoji: [user_ids]}
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les messages lus
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- 5. Table pour les messages épinglés
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, message_id)
);

-- 6. Table pour les appels (audio/vidéo)
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  -- Type d'appel
  call_type TEXT DEFAULT 'audio', -- 'audio', 'video'
  -- Participants
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  status TEXT DEFAULT 'initiated', -- 'initiated', 'ringing', 'active', 'ended', 'missed', 'declined'
  -- Durée
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les participants aux appels
CREATE TABLE IF NOT EXISTS public.call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  status TEXT DEFAULT 'invited', -- 'invited', 'joined', 'left', 'declined'
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE(call_id, user_id)
);

-- 8. Table pour les notifications de messages
CREATE TABLE IF NOT EXISTS public.message_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  -- Type de notification
  notification_type TEXT DEFAULT 'message', -- 'message', 'mention', 'reply', 'call'
  -- Contenu
  title TEXT NOT NULL,
  body TEXT,
  -- Statut
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_conv ON public.pinned_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_conversation ON public.calls(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_initiator ON public.calls(initiator_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_call ON public.call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user ON public.call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_notifications_user ON public.message_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_notifications_conv ON public.message_notifications(conversation_id);

-- 10. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_messaging_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_conversations_timestamp ON public.conversations;
CREATE TRIGGER update_conversations_timestamp
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

DROP TRIGGER IF EXISTS update_messages_timestamp ON public.messages;
CREATE TRIGGER update_messages_timestamp
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

-- 12. Fonction pour mettre à jour last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_last_message ON public.messages;
CREATE TRIGGER trigger_update_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION update_conversation_last_message();

-- 13. Fonction pour créer une notification de message
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  participant RECORD;
  sender_name TEXT;
BEGIN
  -- Récupérer le nom de l'expéditeur
  SELECT full_name INTO sender_name
  FROM public.users
  WHERE id = NEW.sender_id;
  
  -- Créer une notification pour chaque participant (sauf l'expéditeur)
  FOR participant IN
    SELECT user_id
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
      AND is_muted = false
  LOOP
    INSERT INTO public.message_notifications (
      user_id,
      conversation_id,
      message_id,
      notification_type,
      title,
      body
    ) VALUES (
      participant.user_id,
      NEW.conversation_id,
      NEW.id,
      'message',
      COALESCE(sender_name, 'Nouveau message'),
      LEFT(NEW.content, 100)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_message_notification ON public.messages;
CREATE TRIGGER trigger_create_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION create_message_notification();

-- 14. RLS Policies pour conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations
  FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create conversations in their organization" ON public.conversations;
CREATE POLICY "Users can create conversations in their organization"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can update their conversations" ON public.conversations;
CREATE POLICY "Owners can update their conversations"
  ON public.conversations
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 15. RLS Policies pour conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their own participation" ON public.conversation_participants;
CREATE POLICY "Users can manage their own participation"
  ON public.conversation_participants
  FOR ALL
  USING (
    user_id = auth.uid()
    OR conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 16. RLS Policies pour messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
CREATE POLICY "Users can create messages in their conversations"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- 17. RLS Policies pour message_reads
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own message reads" ON public.message_reads;
CREATE POLICY "Users can manage their own message reads"
  ON public.message_reads
  FOR ALL
  USING (user_id = auth.uid());

-- 18. RLS Policies pour pinned_messages
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pinned messages in their conversations" ON public.pinned_messages;
CREATE POLICY "Users can view pinned messages in their conversations"
  ON public.pinned_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage pinned messages" ON public.pinned_messages;
CREATE POLICY "Admins can manage pinned messages"
  ON public.pinned_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 19. RLS Policies pour calls
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view calls in their conversations" ON public.calls;
CREATE POLICY "Users can view calls in their conversations"
  ON public.calls
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create calls in their conversations" ON public.calls;
CREATE POLICY "Users can create calls in their conversations"
  ON public.calls
  FOR INSERT
  WITH CHECK (
    initiator_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- 20. RLS Policies pour call_participants
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view call participants" ON public.call_participants;
CREATE POLICY "Users can view call participants"
  ON public.call_participants
  FOR SELECT
  USING (
    call_id IN (
      SELECT id FROM public.calls
      WHERE conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage their own call participation" ON public.call_participants;
CREATE POLICY "Users can manage their own call participation"
  ON public.call_participants
  FOR ALL
  USING (user_id = auth.uid());

-- 21. RLS Policies pour message_notifications
ALTER TABLE public.message_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.message_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.message_notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.message_notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.message_notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- 22. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.message_reads TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.pinned_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.calls TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.call_participants TO authenticated;
GRANT SELECT, UPDATE ON public.message_notifications TO authenticated;


-- 1. Table pour les conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Type de conversation
  conversation_type TEXT DEFAULT 'direct', -- 'direct', 'group', 'channel'
  -- Informations
  name TEXT, -- Pour les conversations de groupe
  description TEXT,
  avatar_url TEXT,
  -- Configuration
  is_archived BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  -- Métadonnées
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ
);

-- 2. Table pour les participants aux conversations
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  -- Notifications
  is_muted BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "in_app": true}'::jsonb,
  -- Dates
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- 3. Table pour les messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Contenu
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', 'system', 'reply'
  -- Fichiers et médias
  attachments JSONB, -- Array d'objets {url, filename, type, size}
  -- Réponse à un message
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  -- Édition et suppression
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  -- Réactions
  reactions JSONB DEFAULT '{}'::jsonb, -- {emoji: [user_ids]}
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les messages lus
CREATE TABLE IF NOT EXISTS public.message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- 5. Table pour les messages épinglés
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pinned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(conversation_id, message_id)
);

-- 6. Table pour les appels (audio/vidéo)
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  -- Type d'appel
  call_type TEXT DEFAULT 'audio', -- 'audio', 'video'
  -- Participants
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  status TEXT DEFAULT 'initiated', -- 'initiated', 'ringing', 'active', 'ended', 'missed', 'declined'
  -- Durée
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les participants aux appels
CREATE TABLE IF NOT EXISTS public.call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Statut
  status TEXT DEFAULT 'invited', -- 'invited', 'joined', 'left', 'declined'
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  UNIQUE(call_id, user_id)
);

-- 8. Table pour les notifications de messages
CREATE TABLE IF NOT EXISTS public.message_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  -- Type de notification
  notification_type TEXT DEFAULT 'message', -- 'message', 'mention', 'reply', 'call'
  -- Contenu
  title TEXT NOT NULL,
  body TEXT,
  -- Statut
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id, is_archived);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_message ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON public.message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_messages_conv ON public.pinned_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_calls_conversation ON public.calls(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_initiator ON public.calls(initiator_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_call ON public.call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user ON public.call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_message_notifications_user ON public.message_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_notifications_conv ON public.message_notifications(conversation_id);

-- 10. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_messaging_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 11. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_conversations_timestamp ON public.conversations;
CREATE TRIGGER update_conversations_timestamp
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

DROP TRIGGER IF EXISTS update_messages_timestamp ON public.messages;
CREATE TRIGGER update_messages_timestamp
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

-- 12. Fonction pour mettre à jour last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_last_message ON public.messages;
CREATE TRIGGER trigger_update_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION update_conversation_last_message();

-- 13. Fonction pour créer une notification de message
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  participant RECORD;
  sender_name TEXT;
BEGIN
  -- Récupérer le nom de l'expéditeur
  SELECT full_name INTO sender_name
  FROM public.users
  WHERE id = NEW.sender_id;
  
  -- Créer une notification pour chaque participant (sauf l'expéditeur)
  FOR participant IN
    SELECT user_id
    FROM public.conversation_participants
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
      AND is_muted = false
  LOOP
    INSERT INTO public.message_notifications (
      user_id,
      conversation_id,
      message_id,
      notification_type,
      title,
      body
    ) VALUES (
      participant.user_id,
      NEW.conversation_id,
      NEW.id,
      'message',
      COALESCE(sender_name, 'Nouveau message'),
      LEFT(NEW.content, 100)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_message_notification ON public.messages;
CREATE TRIGGER trigger_create_message_notification
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION create_message_notification();

-- 14. RLS Policies pour conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
CREATE POLICY "Users can view conversations they participate in"
  ON public.conversations
  FOR SELECT
  USING (
    id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create conversations in their organization" ON public.conversations;
CREATE POLICY "Users can create conversations in their organization"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Owners can update their conversations" ON public.conversations;
CREATE POLICY "Owners can update their conversations"
  ON public.conversations
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 15. RLS Policies pour conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their own participation" ON public.conversation_participants;
CREATE POLICY "Users can manage their own participation"
  ON public.conversation_participants
  FOR ALL
  USING (
    user_id = auth.uid()
    OR conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 16. RLS Policies pour messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
CREATE POLICY "Users can create messages in their conversations"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;
CREATE POLICY "Users can delete their own messages"
  ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid());

-- 17. RLS Policies pour message_reads
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own message reads" ON public.message_reads;
CREATE POLICY "Users can manage their own message reads"
  ON public.message_reads
  FOR ALL
  USING (user_id = auth.uid());

-- 18. RLS Policies pour pinned_messages
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view pinned messages in their conversations" ON public.pinned_messages;
CREATE POLICY "Users can view pinned messages in their conversations"
  ON public.pinned_messages
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage pinned messages" ON public.pinned_messages;
CREATE POLICY "Admins can manage pinned messages"
  ON public.pinned_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 19. RLS Policies pour calls
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view calls in their conversations" ON public.calls;
CREATE POLICY "Users can view calls in their conversations"
  ON public.calls
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create calls in their conversations" ON public.calls;
CREATE POLICY "Users can create calls in their conversations"
  ON public.calls
  FOR INSERT
  WITH CHECK (
    initiator_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM public.conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- 20. RLS Policies pour call_participants
ALTER TABLE public.call_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view call participants" ON public.call_participants;
CREATE POLICY "Users can view call participants"
  ON public.call_participants
  FOR SELECT
  USING (
    call_id IN (
      SELECT id FROM public.calls
      WHERE conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants
        WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage their own call participation" ON public.call_participants;
CREATE POLICY "Users can manage their own call participation"
  ON public.call_participants
  FOR ALL
  USING (user_id = auth.uid());

-- 21. RLS Policies pour message_notifications
ALTER TABLE public.message_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.message_notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.message_notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.message_notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.message_notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- 22. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.message_reads TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.pinned_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.calls TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.call_participants TO authenticated;
GRANT SELECT, UPDATE ON public.message_notifications TO authenticated;

