-- Migration pour permettre aux étudiants d'insérer des messages
-- Les étudiants utilisent le client apprenant (anon) et n'ont pas d'auth.uid()
-- On doit donc créer une fonction RPC ou une politique spéciale

-- Fonction RPC pour permettre aux étudiants d'insérer des messages
-- Cette fonction utilise SECURITY DEFINER pour bypasser RLS
CREATE OR REPLACE FUNCTION public.insert_student_message(
  p_conversation_id UUID,
  p_student_id UUID,
  p_content TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
  v_message jsonb;
BEGIN
  -- Vérifier que l'étudiant est participant de la conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'L''étudiant n''est pas participant de cette conversation';
  END IF;

  -- Chercher un user_id correspondant à l'étudiant (via email)
  SELECT u.id INTO v_user_id
  FROM public.students s
  INNER JOIN public.users u ON u.email = s.email
  WHERE s.id = p_student_id
  LIMIT 1;

  -- Si aucun user_id trouvé, créer un message avec sender_id NULL
  -- (nécessitera peut-être une modification du schéma pour permettre sender_id NULL)
  -- Pour l'instant, on utilise le user_id trouvé ou on lève une erreur
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun compte utilisateur trouvé pour cet étudiant. Veuillez contacter l''administrateur.';
  END IF;

  -- Insérer le message
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    content,
    is_deleted,
    is_edited
  )
  VALUES (
    p_conversation_id,
    v_user_id,
    p_content,
    false,
    false
  )
  RETURNING id INTO v_message_id;

  -- Récupérer le message inséré
  SELECT to_jsonb(m.*)
  INTO v_message
  FROM public.messages m
  WHERE m.id = v_message_id;

  RETURN v_message;
END;
$$;

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.insert_student_message(UUID, UUID, TEXT) TO anon, authenticated;

-- Commentaire
COMMENT ON FUNCTION public.insert_student_message(UUID, UUID, TEXT) IS 
  'Permet aux étudiants d''insérer des messages dans leurs conversations. Utilise SECURITY DEFINER pour bypasser RLS.';

