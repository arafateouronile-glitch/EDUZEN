-- Migration pour corriger définitivement la fonction get_unread_notifications_count
-- Supprime toutes les versions existantes et crée une nouvelle version propre

-- Supprimer toutes les versions possibles de la fonction
DROP FUNCTION IF EXISTS public.get_unread_notifications_count();
DROP FUNCTION IF EXISTS public.get_unread_notifications_count(UUID);

-- Fonction pour obtenir le nombre de notifications non lues
-- Utilise toujours auth.uid() pour simplifier l'appel
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_user_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur authentifié
  v_user_id := auth.uid();
  
  -- Si pas d'utilisateur authentifié, retourner 0
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Compter les notifications non lues
  SELECT COUNT(*)
  INTO v_count
  FROM public.notifications
  WHERE user_id = v_user_id
    AND read_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_unread_notifications_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notifications_count() TO anon;

COMMENT ON FUNCTION public.get_unread_notifications_count() IS 'Retourne le nombre de notifications non lues pour l''utilisateur authentifié (auth.uid()).';



