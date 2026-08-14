-- La table public.notifications existe déjà en production, mais les fonctions
-- RPC create_notification/mark_notification_read/mark_all_notifications_read/
-- cleanup_expired_notifications (définies dans 20251227000004_create_notifications_system.sql)
-- n'ont jamais été appliquées — ce fichier partage le même préfixe de date
-- (20251227000004) qu'une autre migration (20251227000004_create_ab_testing_system.sql),
-- ce qui a empêché son suivi/application normale via `supabase db push`.
--
-- Conséquence concrète : NotificationService.create() (utilisé entre autres par
-- l'envoi de relances aux formateurs, /api/teacher-documents/relance) échouait
-- systématiquement avec "Could not find the function public.create_notification"
-- → 500 sur toute relance.
--
-- Cette migration recrée uniquement les fonctions manquantes (vérifié une à une
-- en production : create_notification, mark_notification_read,
-- mark_all_notifications_read, cleanup_expired_notifications). La table et ses
-- policies existent déjà et ne sont pas touchées ici. get_unread_notifications_count
-- existe déjà aussi et n'est pas recréée.

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

COMMENT ON FUNCTION public.create_notification IS 'Crée une nouvelle notification pour un utilisateur. Utilise SECURITY DEFINER pour bypasser RLS.';
COMMENT ON FUNCTION public.mark_notification_read IS 'Marque une notification comme lue. Vérifie que l''utilisateur est le propriétaire.';
COMMENT ON FUNCTION public.mark_all_notifications_read IS 'Marque toutes les notifications non lues d''un utilisateur comme lues.';
COMMENT ON FUNCTION public.cleanup_expired_notifications IS 'Nettoie les notifications expirées. À exécuter via CRON.';
