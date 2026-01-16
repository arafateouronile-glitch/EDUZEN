-- Migration pour le système de support client (tickets et chat)

-- 1. Table pour les catégories de tickets
CREATE TABLE IF NOT EXISTS public.support_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- 2. Table pour les tickets de support
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  -- Informations du ticket
  ticket_number TEXT NOT NULL UNIQUE, -- Numéro unique du ticket (ex: TKT-2024-001)
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
  -- Assignation
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  -- Métadonnées
  tags TEXT[],
  metadata JSONB,
  -- Dates
  first_response_at TIMESTAMPTZ, -- Première réponse du support
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les messages des tickets (chat)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Contenu du message
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'system', 'attachment'
  -- Pièces jointes
  attachments JSONB, -- Array d'objets {url, filename, size, type}
  -- Métadonnées
  is_internal BOOLEAN DEFAULT false, -- Message interne (non visible par le client)
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les notes internes sur les tickets
CREATE TABLE IF NOT EXISTS public.support_ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true, -- Note privée ou partagée avec l'équipe
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les évaluations de tickets (satisfaction client)
CREATE TABLE IF NOT EXISTS public.support_ticket_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Note de 1 à 5
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, user_id)
);

-- 6. Table pour les modèles de réponse (templates)
CREATE TABLE IF NOT EXISTS public.support_response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les règles d'assignation automatique
CREATE TABLE IF NOT EXISTS public.support_auto_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Conditions
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  priority TEXT,
  tags TEXT[],
  -- Action
  assign_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assign_to_role TEXT, -- Assigner à un rôle spécifique
  -- Ordre d'exécution
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_support_tickets_org ON public.support_tickets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_user ON public.support_ticket_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_notes_ticket ON public.support_ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_categories_org ON public.support_categories(organization_id, is_active);

-- 9. Fonction pour générer le numéro de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  ticket_num TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Trouver le dernier numéro de séquence pour cette année
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.support_tickets
  WHERE ticket_number LIKE 'TKT-' || year_part || '-%';
  
  ticket_num := 'TKT-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN ticket_num;
END;
$$;

-- 10. Trigger pour générer automatiquement le numéro de ticket
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_ticket_number ON public.support_tickets;
CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- 11. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_support_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_support_tickets_timestamp ON public.support_tickets;
CREATE TRIGGER update_support_tickets_timestamp
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_categories_timestamp ON public.support_categories;
CREATE TRIGGER update_support_categories_timestamp
  BEFORE UPDATE ON public.support_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_ticket_messages_timestamp ON public.support_ticket_messages;
CREATE TRIGGER update_support_ticket_messages_timestamp
  BEFORE UPDATE ON public.support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_ticket_notes_timestamp ON public.support_ticket_notes;
CREATE TRIGGER update_support_ticket_notes_timestamp
  BEFORE UPDATE ON public.support_ticket_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_response_templates_timestamp ON public.support_response_templates;
CREATE TRIGGER update_support_response_templates_timestamp
  BEFORE UPDATE ON public.support_response_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_auto_assignment_rules_timestamp ON public.support_auto_assignment_rules;
CREATE TRIGGER update_support_auto_assignment_rules_timestamp
  BEFORE UPDATE ON public.support_auto_assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

-- 13. Fonction pour mettre à jour le statut du ticket lors de l'ajout d'un message
CREATE OR REPLACE FUNCTION update_ticket_status_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_record RECORD;
  is_support_user BOOLEAN;
BEGIN
  -- Récupérer les informations du ticket
  SELECT * INTO ticket_record
  FROM public.support_tickets
  WHERE id = NEW.ticket_id;
  
  -- Vérifier si l'utilisateur est un membre du support (admin ou rôle support)
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = NEW.user_id
    AND role IN ('admin', 'super_admin', 'support')
  ) INTO is_support_user;
  
  -- Si c'est le premier message du support, mettre à jour first_response_at
  IF is_support_user AND ticket_record.first_response_at IS NULL THEN
    UPDATE public.support_tickets
    SET first_response_at = NOW(),
        status = CASE 
          WHEN status = 'open' THEN 'in_progress'
          ELSE status
        END
    WHERE id = NEW.ticket_id;
  END IF;
  
  -- Si le ticket était résolu/fermé et qu'un nouveau message arrive, le rouvrir
  IF ticket_record.status IN ('resolved', 'closed') THEN
    UPDATE public.support_tickets
    SET status = CASE 
      WHEN is_support_user THEN 'in_progress'
      ELSE 'waiting_customer'
    END,
    resolved_at = NULL,
    closed_at = NULL
    WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_ticket_status_on_message ON public.support_ticket_messages;
CREATE TRIGGER trigger_update_ticket_status_on_message
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_status_on_message();

-- 14. RLS Policies pour support_categories
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories in their organization" ON public.support_categories;
CREATE POLICY "Users can view categories in their organization"
  ON public.support_categories
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON public.support_categories;
CREATE POLICY "Admins can manage categories in their organization"
  ON public.support_categories
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 15. RLS Policies pour support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Support staff can view all tickets in their organization" ON public.support_tickets;
CREATE POLICY "Support staff can view all tickets in their organization"
  ON public.support_tickets
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
CREATE POLICY "Users can update their own tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Support staff can update tickets in their organization" ON public.support_tickets;
CREATE POLICY "Support staff can update tickets in their organization"
  ON public.support_tickets
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 16. RLS Policies pour support_ticket_messages
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages of their tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can view messages of their tickets"
  ON public.support_ticket_messages
  FOR SELECT
  USING (
    ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
    AND is_internal = false
  );

DROP POLICY IF EXISTS "Support staff can view all messages" ON public.support_ticket_messages;
CREATE POLICY "Support staff can view all messages"
  ON public.support_ticket_messages
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

DROP POLICY IF EXISTS "Users can create messages on their tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can create messages on their tickets"
  ON public.support_ticket_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
    AND is_internal = false
  );

DROP POLICY IF EXISTS "Support staff can create messages" ON public.support_ticket_messages;
CREATE POLICY "Support staff can create messages"
  ON public.support_ticket_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 17. RLS Policies pour support_ticket_notes
ALTER TABLE public.support_ticket_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support staff can manage notes" ON public.support_ticket_notes;
CREATE POLICY "Support staff can manage notes"
  ON public.support_ticket_notes
  FOR ALL
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 18. RLS Policies pour support_ticket_ratings
ALTER TABLE public.support_ticket_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create ratings for their tickets" ON public.support_ticket_ratings;
CREATE POLICY "Users can create ratings for their tickets"
  ON public.support_ticket_ratings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Support staff can view ratings" ON public.support_ticket_ratings;
CREATE POLICY "Support staff can view ratings"
  ON public.support_ticket_ratings
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 19. RLS Policies pour support_response_templates
ALTER TABLE public.support_response_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support staff can manage templates" ON public.support_response_templates;
CREATE POLICY "Support staff can manage templates"
  ON public.support_response_templates
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 20. RLS Policies pour support_auto_assignment_rules
ALTER TABLE public.support_auto_assignment_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage auto assignment rules" ON public.support_auto_assignment_rules;
CREATE POLICY "Admins can manage auto assignment rules"
  ON public.support_auto_assignment_rules
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 21. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_notes TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_response_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_auto_assignment_rules TO authenticated;



-- 1. Table pour les catégories de tickets
CREATE TABLE IF NOT EXISTS public.support_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- 2. Table pour les tickets de support
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  -- Informations du ticket
  ticket_number TEXT NOT NULL UNIQUE, -- Numéro unique du ticket (ex: TKT-2024-001)
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
  -- Assignation
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  -- Métadonnées
  tags TEXT[],
  metadata JSONB,
  -- Dates
  first_response_at TIMESTAMPTZ, -- Première réponse du support
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les messages des tickets (chat)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Contenu du message
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'system', 'attachment'
  -- Pièces jointes
  attachments JSONB, -- Array d'objets {url, filename, size, type}
  -- Métadonnées
  is_internal BOOLEAN DEFAULT false, -- Message interne (non visible par le client)
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les notes internes sur les tickets
CREATE TABLE IF NOT EXISTS public.support_ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true, -- Note privée ou partagée avec l'équipe
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les évaluations de tickets (satisfaction client)
CREATE TABLE IF NOT EXISTS public.support_ticket_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Note de 1 à 5
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, user_id)
);

-- 6. Table pour les modèles de réponse (templates)
CREATE TABLE IF NOT EXISTS public.support_response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les règles d'assignation automatique
CREATE TABLE IF NOT EXISTS public.support_auto_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Conditions
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  priority TEXT,
  tags TEXT[],
  -- Action
  assign_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assign_to_role TEXT, -- Assigner à un rôle spécifique
  -- Ordre d'exécution
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_support_tickets_org ON public.support_tickets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_user ON public.support_ticket_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_notes_ticket ON public.support_ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_categories_org ON public.support_categories(organization_id, is_active);

-- 9. Fonction pour générer le numéro de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  ticket_num TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Trouver le dernier numéro de séquence pour cette année
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.support_tickets
  WHERE ticket_number LIKE 'TKT-' || year_part || '-%';
  
  ticket_num := 'TKT-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN ticket_num;
END;
$$;

-- 10. Trigger pour générer automatiquement le numéro de ticket
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_ticket_number ON public.support_tickets;
CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- 11. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_support_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_support_tickets_timestamp ON public.support_tickets;
CREATE TRIGGER update_support_tickets_timestamp
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_categories_timestamp ON public.support_categories;
CREATE TRIGGER update_support_categories_timestamp
  BEFORE UPDATE ON public.support_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_ticket_messages_timestamp ON public.support_ticket_messages;
CREATE TRIGGER update_support_ticket_messages_timestamp
  BEFORE UPDATE ON public.support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_ticket_notes_timestamp ON public.support_ticket_notes;
CREATE TRIGGER update_support_ticket_notes_timestamp
  BEFORE UPDATE ON public.support_ticket_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_response_templates_timestamp ON public.support_response_templates;
CREATE TRIGGER update_support_response_templates_timestamp
  BEFORE UPDATE ON public.support_response_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_auto_assignment_rules_timestamp ON public.support_auto_assignment_rules;
CREATE TRIGGER update_support_auto_assignment_rules_timestamp
  BEFORE UPDATE ON public.support_auto_assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

-- 13. Fonction pour mettre à jour le statut du ticket lors de l'ajout d'un message
CREATE OR REPLACE FUNCTION update_ticket_status_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_record RECORD;
  is_support_user BOOLEAN;
BEGIN
  -- Récupérer les informations du ticket
  SELECT * INTO ticket_record
  FROM public.support_tickets
  WHERE id = NEW.ticket_id;
  
  -- Vérifier si l'utilisateur est un membre du support (admin ou rôle support)
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = NEW.user_id
    AND role IN ('admin', 'super_admin', 'support')
  ) INTO is_support_user;
  
  -- Si c'est le premier message du support, mettre à jour first_response_at
  IF is_support_user AND ticket_record.first_response_at IS NULL THEN
    UPDATE public.support_tickets
    SET first_response_at = NOW(),
        status = CASE 
          WHEN status = 'open' THEN 'in_progress'
          ELSE status
        END
    WHERE id = NEW.ticket_id;
  END IF;
  
  -- Si le ticket était résolu/fermé et qu'un nouveau message arrive, le rouvrir
  IF ticket_record.status IN ('resolved', 'closed') THEN
    UPDATE public.support_tickets
    SET status = CASE 
      WHEN is_support_user THEN 'in_progress'
      ELSE 'waiting_customer'
    END,
    resolved_at = NULL,
    closed_at = NULL
    WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_ticket_status_on_message ON public.support_ticket_messages;
CREATE TRIGGER trigger_update_ticket_status_on_message
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_status_on_message();

-- 14. RLS Policies pour support_categories
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories in their organization" ON public.support_categories;
CREATE POLICY "Users can view categories in their organization"
  ON public.support_categories
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON public.support_categories;
CREATE POLICY "Admins can manage categories in their organization"
  ON public.support_categories
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 15. RLS Policies pour support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Support staff can view all tickets in their organization" ON public.support_tickets;
CREATE POLICY "Support staff can view all tickets in their organization"
  ON public.support_tickets
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
CREATE POLICY "Users can update their own tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Support staff can update tickets in their organization" ON public.support_tickets;
CREATE POLICY "Support staff can update tickets in their organization"
  ON public.support_tickets
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 16. RLS Policies pour support_ticket_messages
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages of their tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can view messages of their tickets"
  ON public.support_ticket_messages
  FOR SELECT
  USING (
    ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
    AND is_internal = false
  );

DROP POLICY IF EXISTS "Support staff can view all messages" ON public.support_ticket_messages;
CREATE POLICY "Support staff can view all messages"
  ON public.support_ticket_messages
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

DROP POLICY IF EXISTS "Users can create messages on their tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can create messages on their tickets"
  ON public.support_ticket_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
    AND is_internal = false
  );

DROP POLICY IF EXISTS "Support staff can create messages" ON public.support_ticket_messages;
CREATE POLICY "Support staff can create messages"
  ON public.support_ticket_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 17. RLS Policies pour support_ticket_notes
ALTER TABLE public.support_ticket_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support staff can manage notes" ON public.support_ticket_notes;
CREATE POLICY "Support staff can manage notes"
  ON public.support_ticket_notes
  FOR ALL
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 18. RLS Policies pour support_ticket_ratings
ALTER TABLE public.support_ticket_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create ratings for their tickets" ON public.support_ticket_ratings;
CREATE POLICY "Users can create ratings for their tickets"
  ON public.support_ticket_ratings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Support staff can view ratings" ON public.support_ticket_ratings;
CREATE POLICY "Support staff can view ratings"
  ON public.support_ticket_ratings
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 19. RLS Policies pour support_response_templates
ALTER TABLE public.support_response_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support staff can manage templates" ON public.support_response_templates;
CREATE POLICY "Support staff can manage templates"
  ON public.support_response_templates
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 20. RLS Policies pour support_auto_assignment_rules
ALTER TABLE public.support_auto_assignment_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage auto assignment rules" ON public.support_auto_assignment_rules;
CREATE POLICY "Admins can manage auto assignment rules"
  ON public.support_auto_assignment_rules
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 21. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_notes TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_response_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_auto_assignment_rules TO authenticated;



-- 1. Table pour les catégories de tickets
CREATE TABLE IF NOT EXISTS public.support_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Nom de l'icône (lucide-react)
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- 2. Table pour les tickets de support
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  -- Informations du ticket
  ticket_number TEXT NOT NULL UNIQUE, -- Numéro unique du ticket (ex: TKT-2024-001)
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'waiting_customer', 'resolved', 'closed'
  -- Assignation
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  -- Métadonnées
  tags TEXT[],
  metadata JSONB,
  -- Dates
  first_response_at TIMESTAMPTZ, -- Première réponse du support
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table pour les messages des tickets (chat)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Contenu du message
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'system', 'attachment'
  -- Pièces jointes
  attachments JSONB, -- Array d'objets {url, filename, size, type}
  -- Métadonnées
  is_internal BOOLEAN DEFAULT false, -- Message interne (non visible par le client)
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table pour les notes internes sur les tickets
CREATE TABLE IF NOT EXISTS public.support_ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN DEFAULT true, -- Note privée ou partagée avec l'équipe
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Table pour les évaluations de tickets (satisfaction client)
CREATE TABLE IF NOT EXISTS public.support_ticket_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Note de 1 à 5
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id, user_id)
);

-- 6. Table pour les modèles de réponse (templates)
CREATE TABLE IF NOT EXISTS public.support_response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Table pour les règles d'assignation automatique
CREATE TABLE IF NOT EXISTS public.support_auto_assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Conditions
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  priority TEXT,
  tags TEXT[],
  -- Action
  assign_to_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assign_to_role TEXT, -- Assigner à un rôle spécifique
  -- Ordre d'exécution
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_support_tickets_org ON public.support_tickets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_user ON public.support_ticket_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_notes_ticket ON public.support_ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_categories_org ON public.support_categories(organization_id, is_active);

-- 9. Fonction pour générer le numéro de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  ticket_num TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Trouver le dernier numéro de séquence pour cette année
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.support_tickets
  WHERE ticket_number LIKE 'TKT-' || year_part || '-%';
  
  ticket_num := 'TKT-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN ticket_num;
END;
$$;

-- 10. Trigger pour générer automatiquement le numéro de ticket
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_ticket_number ON public.support_tickets;
CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- 11. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_support_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 12. Triggers pour updated_at
DROP TRIGGER IF EXISTS update_support_tickets_timestamp ON public.support_tickets;
CREATE TRIGGER update_support_tickets_timestamp
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_categories_timestamp ON public.support_categories;
CREATE TRIGGER update_support_categories_timestamp
  BEFORE UPDATE ON public.support_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_ticket_messages_timestamp ON public.support_ticket_messages;
CREATE TRIGGER update_support_ticket_messages_timestamp
  BEFORE UPDATE ON public.support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_ticket_notes_timestamp ON public.support_ticket_notes;
CREATE TRIGGER update_support_ticket_notes_timestamp
  BEFORE UPDATE ON public.support_ticket_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_response_templates_timestamp ON public.support_response_templates;
CREATE TRIGGER update_support_response_templates_timestamp
  BEFORE UPDATE ON public.support_response_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

DROP TRIGGER IF EXISTS update_support_auto_assignment_rules_timestamp ON public.support_auto_assignment_rules;
CREATE TRIGGER update_support_auto_assignment_rules_timestamp
  BEFORE UPDATE ON public.support_auto_assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_support_updated_at();

-- 13. Fonction pour mettre à jour le statut du ticket lors de l'ajout d'un message
CREATE OR REPLACE FUNCTION update_ticket_status_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_record RECORD;
  is_support_user BOOLEAN;
BEGIN
  -- Récupérer les informations du ticket
  SELECT * INTO ticket_record
  FROM public.support_tickets
  WHERE id = NEW.ticket_id;
  
  -- Vérifier si l'utilisateur est un membre du support (admin ou rôle support)
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = NEW.user_id
    AND role IN ('admin', 'super_admin', 'support')
  ) INTO is_support_user;
  
  -- Si c'est le premier message du support, mettre à jour first_response_at
  IF is_support_user AND ticket_record.first_response_at IS NULL THEN
    UPDATE public.support_tickets
    SET first_response_at = NOW(),
        status = CASE 
          WHEN status = 'open' THEN 'in_progress'
          ELSE status
        END
    WHERE id = NEW.ticket_id;
  END IF;
  
  -- Si le ticket était résolu/fermé et qu'un nouveau message arrive, le rouvrir
  IF ticket_record.status IN ('resolved', 'closed') THEN
    UPDATE public.support_tickets
    SET status = CASE 
      WHEN is_support_user THEN 'in_progress'
      ELSE 'waiting_customer'
    END,
    resolved_at = NULL,
    closed_at = NULL
    WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_ticket_status_on_message ON public.support_ticket_messages;
CREATE TRIGGER trigger_update_ticket_status_on_message
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_status_on_message();

-- 14. RLS Policies pour support_categories
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view categories in their organization" ON public.support_categories;
CREATE POLICY "Users can view categories in their organization"
  ON public.support_categories
  FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON public.support_categories;
CREATE POLICY "Admins can manage categories in their organization"
  ON public.support_categories
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 15. RLS Policies pour support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Support staff can view all tickets in their organization" ON public.support_tickets;
CREATE POLICY "Support staff can view all tickets in their organization"
  ON public.support_tickets
  FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
CREATE POLICY "Users can create tickets"
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;
CREATE POLICY "Users can update their own tickets"
  ON public.support_tickets
  FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Support staff can update tickets in their organization" ON public.support_tickets;
CREATE POLICY "Support staff can update tickets in their organization"
  ON public.support_tickets
  FOR UPDATE
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 16. RLS Policies pour support_ticket_messages
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages of their tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can view messages of their tickets"
  ON public.support_ticket_messages
  FOR SELECT
  USING (
    ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
    AND is_internal = false
  );

DROP POLICY IF EXISTS "Support staff can view all messages" ON public.support_ticket_messages;
CREATE POLICY "Support staff can view all messages"
  ON public.support_ticket_messages
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

DROP POLICY IF EXISTS "Users can create messages on their tickets" ON public.support_ticket_messages;
CREATE POLICY "Users can create messages on their tickets"
  ON public.support_ticket_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
    AND is_internal = false
  );

DROP POLICY IF EXISTS "Support staff can create messages" ON public.support_ticket_messages;
CREATE POLICY "Support staff can create messages"
  ON public.support_ticket_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 17. RLS Policies pour support_ticket_notes
ALTER TABLE public.support_ticket_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support staff can manage notes" ON public.support_ticket_notes;
CREATE POLICY "Support staff can manage notes"
  ON public.support_ticket_notes
  FOR ALL
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 18. RLS Policies pour support_ticket_ratings
ALTER TABLE public.support_ticket_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create ratings for their tickets" ON public.support_ticket_ratings;
CREATE POLICY "Users can create ratings for their tickets"
  ON public.support_ticket_ratings
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Support staff can view ratings" ON public.support_ticket_ratings;
CREATE POLICY "Support staff can view ratings"
  ON public.support_ticket_ratings
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    )
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 19. RLS Policies pour support_response_templates
ALTER TABLE public.support_response_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Support staff can manage templates" ON public.support_response_templates;
CREATE POLICY "Support staff can manage templates"
  ON public.support_response_templates
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'support')
  );

-- 20. RLS Policies pour support_auto_assignment_rules
ALTER TABLE public.support_auto_assignment_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage auto assignment rules" ON public.support_auto_assignment_rules;
CREATE POLICY "Admins can manage auto assignment rules"
  ON public.support_auto_assignment_rules
  FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- 21. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_notes TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_ratings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_response_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_auto_assignment_rules TO authenticated;


