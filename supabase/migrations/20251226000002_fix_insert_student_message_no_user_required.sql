-- Migration pour corriger la fonction insert_student_message
-- Les étudiants peuvent maintenant envoyer des messages sans avoir besoin d'un compte utilisateur
-- Les messages sont insérés avec student_sender_id uniquement

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

  -- Insérer le message avec student_sender_id uniquement (pas besoin de sender_id)
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    student_sender_id,
    content,
    is_deleted,
    is_edited
  ) VALUES (
    p_conversation_id,
    NULL, -- Pas besoin de sender_id pour les étudiants
    p_student_id,
    p_content,
    false,
    false
  )
  RETURNING id INTO v_message_id;

  -- Récupérer le message créé avec les données de l'étudiant
  SELECT to_jsonb(m.*)
  INTO v_message
  FROM public.messages m
  WHERE m.id = v_message_id;

  -- Mettre à jour last_message_at de la conversation
  UPDATE public.conversations
  SET last_message_at = NOW()
  WHERE id = p_conversation_id;

  RETURN v_message;
END;
$$;

-- Commentaire mis à jour
COMMENT ON FUNCTION public.insert_student_message(UUID, UUID, TEXT) IS 
  'Permet aux étudiants d''insérer des messages dans leurs conversations sans avoir besoin d''un compte utilisateur. Utilise SECURITY DEFINER pour bypasser RLS. Les messages sont insérés avec student_sender_id uniquement.';

