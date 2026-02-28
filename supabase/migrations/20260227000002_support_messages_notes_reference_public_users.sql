-- Remplacer auth.users par public.users pour support_ticket_messages et support_ticket_notes
-- afin que PostgREST puisse joindre user (table public.users).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_ticket_messages') THEN
    ALTER TABLE public.support_ticket_messages DROP CONSTRAINT IF EXISTS support_ticket_messages_user_id_fkey;
    ALTER TABLE public.support_ticket_messages ADD CONSTRAINT support_ticket_messages_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_ticket_notes') THEN
    ALTER TABLE public.support_ticket_notes DROP CONSTRAINT IF EXISTS support_ticket_notes_user_id_fkey;
    ALTER TABLE public.support_ticket_notes ADD CONSTRAINT support_ticket_notes_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;
