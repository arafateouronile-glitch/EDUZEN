-- Migration pour corriger les politiques RLS de conversations
-- Évite la récursion infinie en simplifiant les politiques

-- 1. Supprimer toutes les politiques existantes sur conversations
-- (Supprime toutes les politiques pour éviter les conflits)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'conversations' 
      AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', r.policyname);
  END LOOP;
END $$;

-- 2. Politique SELECT : voir les conversations de son organisation
-- Simplifiée pour éviter la récursion (ne fait plus référence à conversation_participants)
CREATE POLICY "Users can view conversations in their organization"
  ON public.conversations
  FOR SELECT
  USING (
    -- L'utilisateur peut voir les conversations si :
    -- 1. La conversation appartient à la même organisation
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND organization_id = conversations.organization_id
    )
    -- 2. OU l'utilisateur a créé la conversation
    OR created_by = auth.uid()
  );

-- 3. Politique INSERT : créer des conversations dans son organisation
CREATE POLICY "Users can create conversations in their organization"
  ON public.conversations
  FOR INSERT
  WITH CHECK (
    -- L'utilisateur peut créer une conversation si :
    -- 1. L'organisation correspond à celle de l'utilisateur
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND organization_id = conversations.organization_id
    )
    -- 2. ET l'utilisateur est le créateur
    AND created_by = auth.uid()
  );

-- 4. Politique UPDATE : modifier les conversations qu'on a créées
CREATE POLICY "Users can update conversations they created"
  ON public.conversations
  FOR UPDATE
  USING (
    -- L'utilisateur peut modifier si :
    -- 1. Il a créé la conversation
    created_by = auth.uid()
    -- 2. OU la conversation appartient à son organisation (pour les admins)
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND organization_id = conversations.organization_id
        AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    -- Même conditions pour WITH CHECK
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND organization_id = conversations.organization_id
        AND role IN ('admin', 'super_admin')
    )
  );

-- 5. Politique DELETE : supprimer les conversations qu'on a créées
CREATE POLICY "Users can delete conversations they created"
  ON public.conversations
  FOR DELETE
  USING (
    -- L'utilisateur peut supprimer si :
    -- 1. Il a créé la conversation
    created_by = auth.uid()
    -- 2. OU il est admin de l'organisation
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND organization_id = conversations.organization_id
        AND role IN ('admin', 'super_admin')
    )
  );

-- Commentaire
COMMENT ON POLICY "Users can view conversations in their organization" ON public.conversations IS 
  'Permet aux utilisateurs de voir les conversations de leur organisation. Évite la récursion en ne référençant pas conversation_participants.';

