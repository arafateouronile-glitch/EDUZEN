-- Migration pour les notifications planifiées et rappels automatiques
-- Fonctionnalité Premium : WhatsApp / Email / SMS

-- Table des notifications planifiées
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email', 'sms')),
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('teacher', 'student', 'parent', 'all')),
    recipient_id UUID,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
    subject TEXT,
    message TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Contrainte unique pour éviter les doublons
    CONSTRAINT unique_notification_per_session UNIQUE (organization_id, session_id, recipient_id, type)
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON public.scheduled_notifications(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_at ON public.scheduled_notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_org ON public.scheduled_notifications(organization_id);

-- Table pour l'envoi planifié de documents
CREATE TABLE IF NOT EXISTS public.scheduled_document_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('teacher', 'student', 'parent', 'all')),
    recipient_ids UUID[] DEFAULT '{}',
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    subject TEXT,
    message TEXT,
    send_via TEXT[] DEFAULT '{"email"}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour la performance
CREATE INDEX IF NOT EXISTS idx_scheduled_document_sends_status ON public.scheduled_document_sends(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_document_sends_scheduled_at ON public.scheduled_document_sends(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_document_sends_org ON public.scheduled_document_sends(organization_id);

-- RLS Policies pour scheduled_notifications
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notifications of their organization"
    ON public.scheduled_notifications FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage notifications"
    ON public.scheduled_notifications FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

-- RLS Policies pour scheduled_document_sends
ALTER TABLE public.scheduled_document_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document sends of their organization"
    ON public.scheduled_document_sends FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage document sends"
    ON public.scheduled_document_sends FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'admin')
        )
    );

-- Fonction trigger pour updated_at
CREATE OR REPLACE FUNCTION update_scheduled_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheduled_notifications_updated_at
    BEFORE UPDATE ON public.scheduled_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_notifications_updated_at();

CREATE TRIGGER update_scheduled_document_sends_updated_at
    BEFORE UPDATE ON public.scheduled_document_sends
    FOR EACH ROW
    EXECUTE FUNCTION update_scheduled_notifications_updated_at();

-- Vérifier les tables créées
SELECT 
    tablename,
    CASE 
        WHEN tablename = 'scheduled_notifications' THEN '✅ Notifications planifiées'
        WHEN tablename = 'scheduled_document_sends' THEN '✅ Envoi documents planifié'
    END as description
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('scheduled_notifications', 'scheduled_document_sends');

