-- Migration pour créer le système de notifications
-- Supporte les notifications en temps réel via Supabase Realtime

-- Table des notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error', 'message', 'payment', 'attendance', 'grade', 'document', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  CONSTRAINT notifications_user_org_check CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = notifications.user_id
        AND users.organization_id = notifications.organization_id
    )
  )
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs peuvent voir leurs propres notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent marquer leurs notifications comme lues
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Le système peut créer des notifications (via service role)
-- Note: Cette policy permet aux fonctions RPC avec SECURITY DEFINER de créer des notifications
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = notifications.user_id
        AND users.organization_id = notifications.organization_id
    )
  );

-- Fonction pour créer une notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_organization_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_link TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    organization_id,
    type,
    title,
    message,
    data,
    link,
    expires_at
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_type,
    p_title,
    p_message,
    p_data,
    p_link,
    p_expires_at
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Fonction pour marquer une notification comme lue
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND read_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Fonction pour marquer toutes les notifications comme lues
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_actual_user_id UUID;
BEGIN
  v_actual_user_id := COALESCE(p_user_id, auth.uid());

  UPDATE public.notifications
  SET read_at = NOW()
  WHERE user_id = v_actual_user_id
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Fonction pour obtenir le nombre de notifications non lues
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count(
  p_user_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_actual_user_id UUID;
BEGIN
  v_actual_user_id := COALESCE(p_user_id, auth.uid());

  SELECT COUNT(*)
  INTO v_count
  FROM public.notifications
  WHERE user_id = v_actual_user_id
    AND read_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Fonction pour nettoyer les notifications expirées (à exécuter via CRON)
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Activer Realtime pour la table notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Commentaires
COMMENT ON TABLE public.notifications IS 'Table des notifications utilisateur. Supporte les notifications en temps réel via Supabase Realtime.';
COMMENT ON COLUMN public.notifications.type IS 'Type de notification: info, success, warning, error, message, payment, attendance, grade, document, system';
COMMENT ON COLUMN public.notifications.data IS 'Données supplémentaires au format JSON pour la notification';
COMMENT ON COLUMN public.notifications.link IS 'Lien vers la ressource associée à la notification';
COMMENT ON COLUMN public.notifications.read_at IS 'Date de lecture de la notification. NULL si non lue.';
COMMENT ON COLUMN public.notifications.expires_at IS 'Date d''expiration de la notification. NULL si n''expire jamais.';

COMMENT ON FUNCTION public.create_notification IS 'Crée une nouvelle notification pour un utilisateur. Utilise SECURITY DEFINER pour bypasser RLS.';
COMMENT ON FUNCTION public.mark_notification_read IS 'Marque une notification comme lue. Vérifie que l''utilisateur est le propriétaire.';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Marque toutes les notifications non lues d''un utilisateur comme lues.';
COMMENT ON FUNCTION public.get_unread_notifications_count IS 'Retourne le nombre de notifications non lues pour un utilisateur.';
COMMENT ON FUNCTION public.cleanup_expired_notifications IS 'Nettoie les notifications expirées. À exécuter via CRON.';



