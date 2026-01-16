-- Migration pour permettre aux étudiants d'accéder à leurs conversations via student_id
-- Utilise le header x-learner-student-id envoyé par createLearnerClient

-- Note: La fonction learner_student_id() existe déjà dans la migration 20251217000009
-- On l'utilise directement sans la recréer

-- 1. Mettre à jour la politique SELECT pour conversations
-- Permettre aux étudiants de voir leurs conversations via student_id
-- IMPORTANT: Utiliser une fonction SECURITY DEFINER pour éviter la récursion

-- Fonction helper pour vérifier si un étudiant est participant d'une conversation
CREATE OR REPLACE FUNCTION public.is_student_conversation_participant(
  p_conversation_id UUID,
  p_student_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = p_conversation_id
      AND student_id = p_student_id
  );
END;
$$;

DROP POLICY IF EXISTS "Users can view conversations in their organization" ON public.conversations;
CREATE POLICY "Users can view conversations in their organization"
  ON public.conversations
  FOR SELECT
  USING (
    -- L'utilisateur authentifié peut voir les conversations de son organisation
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
          AND organization_id = conversations.organization_id
      )
    )
    -- OU l'utilisateur a créé la conversation
    OR created_by = auth.uid()
    -- OU l'étudiant (via header) est participant de la conversation
    -- Utiliser la fonction SECURITY DEFINER pour éviter la récursion
    OR (
      public.learner_student_id() IS NOT NULL
      AND public.is_student_conversation_participant(
        conversations.id,
        public.learner_student_id()
      )
    )
  );

-- 2. Mettre à jour la politique SELECT pour conversation_participants
-- Permettre aux étudiants de voir les participants de leurs conversations
-- IMPORTANT: Ne JAMAIS référencer conversation_participants dans la clause USING pour éviter la récursion
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants
  FOR SELECT
  USING (
    -- L'utilisateur authentifié peut voir les participants
    (
      auth.uid() IS NOT NULL
      AND (
        user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.conversations c
          INNER JOIN public.users u ON u.id = auth.uid()
          WHERE c.id = conversation_participants.conversation_id
            AND c.organization_id = u.organization_id
        )
      )
    )
    -- OU l'étudiant (via header) peut voir les participants de ses conversations
    -- On vérifie directement si student_id correspond OU si la conversation appartient à son organisation
    OR (
      public.learner_student_id() IS NOT NULL
      AND (
        -- L'étudiant peut voir sa propre participation
        student_id = public.learner_student_id()
        -- OU l'étudiant peut voir tous les participants si la conversation appartient à son organisation
        OR EXISTS (
          SELECT 1 FROM public.conversations c
          INNER JOIN public.students s ON s.id = public.learner_student_id()
          WHERE c.id = conversation_participants.conversation_id
            AND c.organization_id = s.organization_id
        )
      )
    )
  );

-- 3. Mettre à jour la politique SELECT pour messages
-- Permettre aux étudiants de voir les messages de leurs conversations
-- IMPORTANT: Utiliser la fonction SECURITY DEFINER créée précédemment pour éviter la récursion
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  FOR SELECT
  USING (
    -- L'utilisateur authentifié peut voir les messages de ses conversations
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = messages.conversation_id
          AND user_id = auth.uid()
      )
    )
    -- OU l'étudiant (via header) est participant de la conversation
    -- Utiliser la fonction SECURITY DEFINER pour éviter la récursion
    OR (
      public.learner_student_id() IS NOT NULL
      AND public.is_student_conversation_participant(
        messages.conversation_id,
        public.learner_student_id()
      )
    )
  );

-- 4. S'assurer que la politique RLS pour students existe et fonctionne
-- Note: La politique "Learners can view their student profile via header" existe déjà
-- dans la migration 20251217000010. On s'assure qu'elle utilise bien learner_student_id()
-- pour être cohérent avec les autres politiques.
-- On ne la recrée pas si elle existe déjà pour éviter les conflits.

-- Donner les permissions d'exécution sur la fonction helper
GRANT EXECUTE ON FUNCTION public.is_student_conversation_participant(UUID, UUID) TO anon, authenticated;

-- Commentaires
COMMENT ON FUNCTION public.is_student_conversation_participant(UUID, UUID) IS 
  'Vérifie si un étudiant est participant d''une conversation. Utilise SECURITY DEFINER pour éviter la récursion dans les politiques RLS.';

COMMENT ON POLICY "Users can view conversations in their organization" ON public.conversations IS 
  'Permet aux utilisateurs authentifiés et aux étudiants (via header) de voir leurs conversations.';

COMMENT ON POLICY "Users can view participants in their conversations" ON public.conversation_participants IS 
  'Permet aux utilisateurs authentifiés et aux étudiants (via header) de voir les participants de leurs conversations.';

COMMENT ON POLICY "Users can view messages in their conversations" ON public.messages IS 
  'Permet aux utilisateurs authentifiés et aux étudiants (via header) de voir les messages de leurs conversations.';

