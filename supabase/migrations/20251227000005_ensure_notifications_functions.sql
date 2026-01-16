-- Migration pour s'assurer que les fonctions de notifications existent
-- Cette migration recrée les fonctions si elles n'existent pas

-- S'assurer que la table notifications existe
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

-- Supprimer l'ancienne fonction avec paramètre si elle existe
DROP FUNCTION IF EXISTS public.get_unread_notifications_count(UUID);

-- Fonction pour obtenir le nombre de notifications non lues
-- Utilise toujours auth.uid() pour simplifier l'appel
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
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

