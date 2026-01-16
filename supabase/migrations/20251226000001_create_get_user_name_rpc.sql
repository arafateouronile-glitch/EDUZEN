-- Migration pour créer une fonction RPC permettant aux étudiants de récupérer le nom des utilisateurs
-- Cette fonction utilise SECURITY DEFINER pour bypasser RLS dans l'espace apprenant

CREATE OR REPLACE FUNCTION public.get_user_name(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_record jsonb;
BEGIN
  -- Avec SECURITY DEFINER, on peut accéder directement à la table sans RLS
  -- Récupérer les données de l'utilisateur et les retourner en JSON
  SELECT to_jsonb(u.*)
  INTO user_record
  FROM public.users u
  WHERE u.id = p_user_id;
  
  RETURN user_record;
END;
$$;

-- Commentaire
COMMENT ON FUNCTION public.get_user_name(uuid) IS 
  'Fonction RPC pour récupérer les données d''un utilisateur. Utilise SECURITY DEFINER pour bypasser RLS. Permet aux étudiants dans l''espace apprenant d''accéder aux noms des utilisateurs qui leur envoient des messages.';

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.get_user_name(uuid) TO anon, authenticated;



