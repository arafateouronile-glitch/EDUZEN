-- Permettre au super_admin (platform_admins) de voir et mettre à jour tous les tickets (toutes organisations)

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
      AND is_active = true
  );
$$;

DROP POLICY IF EXISTS "Super admin can view all tickets" ON public.support_tickets;
CREATE POLICY "Super admin can view all tickets"
  ON public.support_tickets
  FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can update all tickets" ON public.support_tickets;
CREATE POLICY "Super admin can update all tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can view all ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Super admin can view all ticket messages"
  ON public.support_ticket_messages
  FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can create ticket messages" ON public.support_ticket_messages;
CREATE POLICY "Super admin can create ticket messages"
  ON public.support_ticket_messages
  FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can view all ticket notes" ON public.support_ticket_notes;
CREATE POLICY "Super admin can view all ticket notes"
  ON public.support_ticket_notes
  FOR SELECT
  USING (public.is_super_admin());

DROP POLICY IF EXISTS "Super admin can create ticket notes" ON public.support_ticket_notes;
CREATE POLICY "Super admin can create ticket notes"
  ON public.support_ticket_notes
  FOR INSERT
  WITH CHECK (public.is_super_admin());
