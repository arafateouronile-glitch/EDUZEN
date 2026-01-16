-- ============================================
-- Migration: Création du système de calendrier interne avec TODOs
-- Date: 2024-12-04
-- Description: Tables pour les tâches (TODOs) avec notifications
-- ============================================

-- Table des TODOs/Tâches
CREATE TABLE IF NOT EXISTS public.calendar_todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Informations de base
    title TEXT NOT NULL,
    description TEXT,
    
    -- Dates et heures
    due_date DATE NOT NULL,
    due_time TIME,
    start_date DATE,
    start_time TIME,
    all_day BOOLEAN DEFAULT false,
    
    -- Catégorisation
    category TEXT DEFAULT 'task', -- 'task', 'meeting', 'deadline', 'reminder', 'event'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    color TEXT DEFAULT '#3B82F6', -- Couleur personnalisée
    
    -- Statut
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    completed_at TIMESTAMPTZ,
    
    -- Assignation
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Récurrence (optionnel)
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT, -- Format iCal RRULE (ex: 'FREQ=WEEKLY;BYDAY=MO,WE,FR')
    recurrence_end_date DATE,
    parent_todo_id UUID REFERENCES public.calendar_todos(id) ON DELETE CASCADE,
    
    -- Notifications/Rappels
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_minutes_before INTEGER DEFAULT 30, -- Minutes avant l'échéance
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,
    
    -- Liens vers d'autres entités (optionnel)
    linked_session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    linked_formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
    linked_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    
    -- Métadonnées
    tags TEXT[], -- Tags personnalisés
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des rappels/notifications envoyés
CREATE TABLE IF NOT EXISTS public.calendar_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Type de notification
    notification_type TEXT NOT NULL, -- 'todo_reminder', 'session_reminder', 'formation_start', 'deadline'
    
    -- Référence
    todo_id UUID REFERENCES public.calendar_todos(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    formation_id UUID REFERENCES public.formations(id) ON DELETE CASCADE,
    
    -- Contenu
    title TEXT NOT NULL,
    message TEXT,
    
    -- Statut
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'read', 'dismissed'
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    -- Canal de notification
    channel TEXT DEFAULT 'in_app', -- 'in_app', 'email', 'push', 'sms'
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des préférences de calendrier par utilisateur
CREATE TABLE IF NOT EXISTS public.calendar_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Préférences d'affichage
    default_view TEXT DEFAULT 'month', -- 'day', 'week', 'month', 'agenda'
    week_starts_on INTEGER DEFAULT 1, -- 0 = Dimanche, 1 = Lundi
    show_weekends BOOLEAN DEFAULT true,
    working_hours_start TIME DEFAULT '08:00',
    working_hours_end TIME DEFAULT '18:00',
    
    -- Préférences de notification
    default_reminder_minutes INTEGER DEFAULT 30,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    
    -- Filtres par défaut
    show_sessions BOOLEAN DEFAULT true,
    show_formations BOOLEAN DEFAULT true,
    show_todos BOOLEAN DEFAULT true,
    show_completed BOOLEAN DEFAULT false,
    
    -- Couleurs personnalisées
    session_color TEXT DEFAULT '#10B981', -- Vert
    formation_color TEXT DEFAULT '#8B5CF6', -- Violet
    todo_color TEXT DEFAULT '#3B82F6', -- Bleu
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, organization_id)
);

-- ============================================
-- INDEX pour les performances
-- ============================================

-- Index sur calendar_todos
CREATE INDEX IF NOT EXISTS idx_calendar_todos_organization ON public.calendar_todos(organization_id);
CREATE INDEX IF NOT EXISTS idx_calendar_todos_due_date ON public.calendar_todos(due_date);
CREATE INDEX IF NOT EXISTS idx_calendar_todos_status ON public.calendar_todos(status);
CREATE INDEX IF NOT EXISTS idx_calendar_todos_assigned_to ON public.calendar_todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_calendar_todos_created_by ON public.calendar_todos(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_todos_category ON public.calendar_todos(category);
CREATE INDEX IF NOT EXISTS idx_calendar_todos_reminder ON public.calendar_todos(reminder_enabled, reminder_sent, due_date);

-- Index sur calendar_notifications
CREATE INDEX IF NOT EXISTS idx_calendar_notifications_user ON public.calendar_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_notifications_status ON public.calendar_notifications(status);
CREATE INDEX IF NOT EXISTS idx_calendar_notifications_scheduled ON public.calendar_notifications(scheduled_at);

-- Index sur calendar_user_preferences
CREATE INDEX IF NOT EXISTS idx_calendar_user_preferences_user ON public.calendar_user_preferences(user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger pour updated_at sur calendar_todos
CREATE OR REPLACE FUNCTION update_calendar_todos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calendar_todos_updated_at ON public.calendar_todos;
CREATE TRIGGER trigger_calendar_todos_updated_at
    BEFORE UPDATE ON public.calendar_todos
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_todos_updated_at();

-- Trigger pour updated_at sur calendar_user_preferences
DROP TRIGGER IF EXISTS trigger_calendar_user_preferences_updated_at ON public.calendar_user_preferences;
CREATE TRIGGER trigger_calendar_user_preferences_updated_at
    BEFORE UPDATE ON public.calendar_user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_calendar_todos_updated_at();

-- Trigger pour marquer completed_at quand status devient 'completed'
CREATE OR REPLACE FUNCTION set_todo_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_todo_completed_at ON public.calendar_todos;
CREATE TRIGGER trigger_todo_completed_at
    BEFORE UPDATE ON public.calendar_todos
    FOR EACH ROW
    EXECUTE FUNCTION set_todo_completed_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.calendar_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies pour calendar_todos
DROP POLICY IF EXISTS "Users can view todos in their organization" ON public.calendar_todos;
CREATE POLICY "Users can view todos in their organization"
    ON public.calendar_todos FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create todos in their organization" ON public.calendar_todos;
CREATE POLICY "Users can create todos in their organization"
    ON public.calendar_todos FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own todos or assigned todos" ON public.calendar_todos;
CREATE POLICY "Users can update their own todos or assigned todos"
    ON public.calendar_todos FOR UPDATE
    USING (
        created_by = auth.uid() OR 
        assigned_to = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND organization_id = calendar_todos.organization_id
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Users can delete their own todos or admins can delete any" ON public.calendar_todos;
CREATE POLICY "Users can delete their own todos or admins can delete any"
    ON public.calendar_todos FOR DELETE
    USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND organization_id = calendar_todos.organization_id
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policies pour calendar_notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.calendar_notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.calendar_notifications FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can create notifications" ON public.calendar_notifications;
CREATE POLICY "System can create notifications"
    ON public.calendar_notifications FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.calendar_notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.calendar_notifications FOR UPDATE
    USING (user_id = auth.uid());

-- Policies pour calendar_user_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.calendar_user_preferences;
CREATE POLICY "Users can view their own preferences"
    ON public.calendar_user_preferences FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own preferences" ON public.calendar_user_preferences;
CREATE POLICY "Users can create their own preferences"
    ON public.calendar_user_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.calendar_user_preferences;
CREATE POLICY "Users can update their own preferences"
    ON public.calendar_user_preferences FOR UPDATE
    USING (user_id = auth.uid());

-- ============================================
-- FONCTION pour créer des notifications de rappel
-- ============================================

CREATE OR REPLACE FUNCTION create_todo_reminder_notification(todo_id UUID)
RETURNS UUID AS $$
DECLARE
    v_todo RECORD;
    v_notification_id UUID;
    v_scheduled_at TIMESTAMPTZ;
BEGIN
    -- Récupérer le TODO
    SELECT * INTO v_todo FROM public.calendar_todos WHERE id = todo_id;
    
    IF v_todo IS NULL OR NOT v_todo.reminder_enabled THEN
        RETURN NULL;
    END IF;
    
    -- Calculer l'heure de la notification
    IF v_todo.due_time IS NOT NULL THEN
        v_scheduled_at := (v_todo.due_date + v_todo.due_time)::TIMESTAMPTZ - (v_todo.reminder_minutes_before || ' minutes')::INTERVAL;
    ELSE
        v_scheduled_at := (v_todo.due_date + '09:00:00'::TIME)::TIMESTAMPTZ - (v_todo.reminder_minutes_before || ' minutes')::INTERVAL;
    END IF;
    
    -- Ne pas créer de notification dans le passé
    IF v_scheduled_at < NOW() THEN
        RETURN NULL;
    END IF;
    
    -- Créer la notification
    INSERT INTO public.calendar_notifications (
        organization_id,
        user_id,
        notification_type,
        todo_id,
        title,
        message,
        scheduled_at
    ) VALUES (
        v_todo.organization_id,
        COALESCE(v_todo.assigned_to, v_todo.created_by),
        'todo_reminder',
        v_todo.id,
        'Rappel: ' || v_todo.title,
        COALESCE(v_todo.description, 'Échéance: ' || v_todo.due_date::TEXT),
        v_scheduled_at
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FONCTION pour récupérer les événements du calendrier
-- ============================================

CREATE OR REPLACE FUNCTION get_calendar_events(
    p_organization_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    event_id UUID,
    event_type TEXT,
    title TEXT,
    description TEXT,
    start_date DATE,
    start_time TIME,
    end_date DATE,
    end_time TIME,
    all_day BOOLEAN,
    status TEXT,
    color TEXT,
    category TEXT,
    priority TEXT,
    linked_id UUID
) AS $$
BEGIN
    -- TODOs
    RETURN QUERY
    SELECT 
        t.id as event_id,
        'todo'::TEXT as event_type,
        t.title,
        t.description,
        COALESCE(t.start_date, t.due_date) as start_date,
        t.start_time,
        t.due_date as end_date,
        t.due_time as end_time,
        t.all_day,
        t.status,
        t.color,
        t.category,
        t.priority,
        NULL::UUID as linked_id
    FROM public.calendar_todos t
    WHERE t.organization_id = p_organization_id
    AND (t.due_date BETWEEN p_start_date AND p_end_date
         OR t.start_date BETWEEN p_start_date AND p_end_date)
    AND (p_user_id IS NULL OR t.assigned_to = p_user_id OR t.created_by = p_user_id);
    
    -- Sessions
    -- Inclure les sessions qui chevauchent la période demandée
    -- (commencées avant mais pas encore terminées, ou qui commencent/terminent dans la période)
    RETURN QUERY
    SELECT 
        s.id as event_id,
        'session'::TEXT as event_type,
        s.name as title,
        NULL::TEXT as description,
        s.start_date,
        s.start_time,
        s.end_date,
        s.end_time,
        false as all_day,
        s.status,
        '#10B981'::TEXT as color, -- Vert
        'session'::TEXT as category,
        'medium'::TEXT as priority,
        s.formation_id as linked_id
    FROM public.sessions s
    WHERE s.organization_id = p_organization_id
    AND s.start_date IS NOT NULL
    AND (
        -- Session commence dans la période
        (s.start_date >= p_start_date AND s.start_date <= p_end_date)
        -- Session se termine dans la période
        OR (s.end_date IS NOT NULL AND s.end_date >= p_start_date AND s.end_date <= p_end_date)
        -- Session en cours (commencée avant et pas encore terminée)
        OR (s.start_date <= p_start_date AND (s.end_date IS NULL OR s.end_date >= p_start_date))
        -- Session qui englobe toute la période
        OR (s.start_date <= p_start_date AND s.end_date IS NOT NULL AND s.end_date >= p_end_date)
    );
    
    -- Formations (dates de début et fin)
    -- Inclure les formations qui chevauchent la période demandée
    RETURN QUERY
    SELECT 
        f.id as event_id,
        'formation'::TEXT as event_type,
        f.name as title,
        f.description,
        f.start_date,
        NULL::TIME as start_time,
        f.end_date,
        NULL::TIME as end_time,
        true as all_day,
        CASE WHEN f.is_active THEN 'active' ELSE 'inactive' END as status,
        '#8B5CF6'::TEXT as color, -- Violet
        'formation'::TEXT as category,
        'medium'::TEXT as priority,
        f.program_id as linked_id
    FROM public.formations f
    WHERE f.organization_id = p_organization_id
    AND f.start_date IS NOT NULL
    AND (
        -- Formation commence dans la période
        (f.start_date >= p_start_date AND f.start_date <= p_end_date)
        -- Formation se termine dans la période
        OR (f.end_date IS NOT NULL AND f.end_date >= p_start_date AND f.end_date <= p_end_date)
        -- Formation en cours (commencée avant et pas encore terminée)
        OR (f.start_date <= p_start_date AND (f.end_date IS NULL OR f.end_date >= p_start_date))
        -- Formation qui englobe toute la période
        OR (f.start_date <= p_start_date AND f.end_date IS NOT NULL AND f.end_date >= p_end_date)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Vérification
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Tables calendar_todos, calendar_notifications, calendar_user_preferences créées';
    RAISE NOTICE '✅ Index créés pour les performances';
    RAISE NOTICE '✅ Triggers configurés pour updated_at et completed_at';
    RAISE NOTICE '✅ Politiques RLS configurées';
    RAISE NOTICE '✅ Fonctions create_todo_reminder_notification et get_calendar_events créées';
END $$;

