-- create_notification() ne retournait que l'id de la notif créée.
-- NotificationService.create() (lib/services/notification.service.ts) faisait
-- ensuite un SELECT de relecture avec le client scopé RLS de l'appelant. Or la
-- seule policy SELECT sur notifications est "user_id = auth.uid()" : dès qu'un
-- admin crée une notification pour un AUTRE utilisateur (ex: relance de
-- documents formateur), le SELECT ne retourne aucune ligne, .single() échoue,
-- et toute la création de notification part en erreur (500 sur
-- /api/teacher-documents/relance, mais impacte tout code créant une
-- notification pour quelqu'un d'autre).
--
-- Fix : la fonction (SECURITY DEFINER, donc pas soumise à RLS) renvoie
-- directement la ligne complète insérée, ce qui supprime le besoin du SELECT
-- de relecture.

DROP FUNCTION IF EXISTS public.create_notification(uuid, uuid, text, text, text, jsonb, text, timestamptz);

CREATE FUNCTION public.create_notification(
  p_user_id UUID,
  p_organization_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::jsonb,
  p_link TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS SETOF public.notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
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
  RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.create_notification IS 'Crée une notification et renvoie la ligne complète (SECURITY DEFINER, évite un SELECT de relecture soumis à RLS côté appelant).';
