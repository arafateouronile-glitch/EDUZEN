-- Permettre aux apprenants (accès par lien, sans auth) de créer un ticket et d'envoyer le premier message
-- depuis leur espace personnel. Ajout de student_id sur support_tickets et support_ticket_messages,
-- user_id rendu nullable, et RLS pour l'accès via le header x-learner-student-id.

-- Helper : récupère le student_id depuis le header (pour RLS)
CREATE OR REPLACE FUNCTION public.current_learner_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    (current_setting('request.headers', true)::json->>'x-learner-student-id'),
    ''
  )::uuid;
$$;

-- 1. support_tickets : ajouter student_id, user_id nullable
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.support_tickets
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_user_or_student_check;

ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_user_or_student_check
  CHECK (user_id IS NOT NULL OR student_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_support_tickets_student ON public.support_tickets(student_id) WHERE student_id IS NOT NULL;

-- 2. support_ticket_messages : ajouter student_id, user_id nullable
ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.support_ticket_messages
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.support_ticket_messages
  DROP CONSTRAINT IF EXISTS support_ticket_messages_user_or_student_check;

ALTER TABLE public.support_ticket_messages
  ADD CONSTRAINT support_ticket_messages_user_or_student_check
  CHECK (user_id IS NOT NULL OR student_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_student ON public.support_ticket_messages(student_id) WHERE student_id IS NOT NULL;

-- 3. RLS support_categories : apprenants peuvent lire les catégories de leur organisation
DROP POLICY IF EXISTS "Learners can view categories in their organization" ON public.support_categories;
CREATE POLICY "Learners can view categories in their organization"
  ON public.support_categories
  FOR SELECT
  USING (
    public.current_learner_student_id() IS NOT NULL
    AND organization_id IN (
      SELECT organization_id FROM public.students WHERE id = public.current_learner_student_id()
    )
  );

-- 4. RLS support_tickets : apprenants peuvent créer et voir leurs tickets
DROP POLICY IF EXISTS "Learners can view their own tickets" ON public.support_tickets;
CREATE POLICY "Learners can view their own tickets"
  ON public.support_tickets
  FOR SELECT
  USING (student_id = public.current_learner_student_id());

DROP POLICY IF EXISTS "Learners can create tickets" ON public.support_tickets;
CREATE POLICY "Learners can create tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    student_id = public.current_learner_student_id()
    AND organization_id IN (
      SELECT organization_id FROM public.students WHERE id = public.current_learner_student_id()
    )
  );

DROP POLICY IF EXISTS "Learners can update their own tickets" ON public.support_tickets;
CREATE POLICY "Learners can update their own tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (student_id = public.current_learner_student_id());

-- 5. RLS support_ticket_messages : apprenants peuvent voir et créer des messages sur leurs tickets
DROP POLICY IF EXISTS "Learners can view messages of their tickets" ON public.support_ticket_messages;
CREATE POLICY "Learners can view messages of their tickets"
  ON public.support_ticket_messages
  FOR SELECT
  USING (
    is_internal = false
    AND ticket_id IN (
      SELECT id FROM public.support_tickets WHERE student_id = public.current_learner_student_id()
    )
  );

DROP POLICY IF EXISTS "Learners can create messages on their tickets" ON public.support_ticket_messages;
CREATE POLICY "Learners can create messages on their tickets"
  ON public.support_ticket_messages
  FOR INSERT
  WITH CHECK (
    student_id = public.current_learner_student_id()
    AND is_internal = false
    AND ticket_id IN (
      SELECT id FROM public.support_tickets WHERE student_id = public.current_learner_student_id()
    )
  );
