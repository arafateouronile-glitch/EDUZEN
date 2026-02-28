-- Remplacer les références auth.users par public.users pour support_tickets
-- afin que PostgREST puisse joindre user et assigned_user (table public.users).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
    ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_id_fkey;
    ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_assigned_to_fkey;
    ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;
