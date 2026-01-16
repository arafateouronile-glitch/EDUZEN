-- Migration pour corriger les politiques RLS de conversation_participants
-- Évite la récursion infinie en utilisant une approche différente

-- 1. Supprimer toutes les politiques existantes sur conversation_participants
-- (Supprime toutes les politiques pour éviter les conflits)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'conversation_participants' 
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversation_participants', r.policyname);
  END LOOP;
END $$;

-- 2. Créer une fonction helper pour vérifier si un utilisateur est participant d'une conversation
-- (évite la récursion)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID DEFAULT auth.uid(),
  p_student_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND (
        (p_user_id IS NOT NULL AND user_id = p_user_id)
        OR (p_student_id IS NOT NULL AND student_id = p_student_id)
      )
  );
END;
$$;

-- 3. Politique SELECT : voir les participants des conversations
-- Simplifiée pour éviter la récursion
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  USING (
    -- L'utilisateur peut voir les participants si :
    -- 1. Il est lui-même participant (via user_id)
    user_id = auth.uid()
    -- 2. OU il peut voir la conversation (via la table conversations - même organisation)
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      INNER JOIN public.users u ON u.id = auth.uid()
      WHERE c.id = conversation_participants.conversation_id
        AND c.organization_id = u.organization_id
    )
  );

-- 4. Politique INSERT : ajouter des participants
CREATE POLICY "Users can add participants to conversations"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    -- L'utilisateur peut ajouter des participants si :
    -- 1. Il crée la conversation (created_by)
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_participants.conversation_id
        AND created_by = auth.uid()
    )
    -- 2. OU il ajoute son propre user_id
    OR user_id = auth.uid()
    -- 3. OU il appartient à la même organisation que la conversation
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      INNER JOIN public.users u ON u.id = auth.uid()
      WHERE c.id = conversation_participants.conversation_id
        AND c.organization_id = u.organization_id
    )
  );

-- 5. Politique UPDATE : modifier sa propre participation
CREATE POLICY "Users can update their own participation"
  ON public.conversation_participants
  FOR UPDATE
  USING (
    -- L'utilisateur peut modifier si c'est sa propre participation
    user_id = auth.uid()
  )
  WITH CHECK (
    -- L'utilisateur ne peut modifier que sa propre participation
    user_id = auth.uid()
  );

-- 6. Politique DELETE : supprimer sa propre participation ou si on a créé la conversation
CREATE POLICY "Users can delete their own participation"
  ON public.conversation_participants
  FOR DELETE
  USING (
    -- L'utilisateur peut supprimer si :
    -- 1. C'est sa propre participation
    user_id = auth.uid()
    -- 2. OU il a créé la conversation
    OR EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = conversation_participants.conversation_id
        AND created_by = auth.uid()
    )
  );

-- 7. Donner les permissions d'exécution sur la fonction
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(UUID, UUID, UUID) TO authenticated;

-- Commentaire
COMMENT ON FUNCTION public.is_conversation_participant(UUID, UUID, UUID) IS 
  'Vérifie si un utilisateur ou étudiant est participant d''une conversation. Évite la récursion dans les politiques RLS.';

