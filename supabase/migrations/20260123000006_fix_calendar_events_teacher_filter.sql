-- Migration pour filtrer les sessions du calendrier pour les enseignants
-- Les enseignants ne doivent voir que les sessions sur lesquelles ils sont assignés

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
DECLARE
    v_user_role TEXT;
    v_teacher_session_ids UUID[];
BEGIN
    -- Vérifier le rôle de l'utilisateur si p_user_id est fourni
    IF p_user_id IS NOT NULL THEN
        SELECT role INTO v_user_role
        FROM public.users
        WHERE id = p_user_id;
        
        -- Si l'utilisateur est un enseignant, récupérer ses sessions assignées
        IF v_user_role = 'teacher' THEN
            SELECT ARRAY_AGG(session_id) INTO v_teacher_session_ids
            FROM public.session_teachers
            WHERE teacher_id = p_user_id;
        END IF;
    END IF;
    
    -- TODOs
    -- Pour les enseignants, filtrer les TODOs liés à leurs sessions ou sans session liée
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
        COALESCE(t.linked_session_id, t.linked_formation_id) as linked_id
    FROM public.calendar_todos t
    WHERE t.organization_id = p_organization_id
    AND (t.due_date BETWEEN p_start_date AND p_end_date
         OR t.start_date BETWEEN p_start_date AND p_end_date)
    AND (
        -- Si pas d'utilisateur, retourner tous les TODOs
        p_user_id IS NULL
        -- Si utilisateur mais pas enseignant, retourner les TODOs qui lui sont assignés ou créés par lui
        OR (v_user_role != 'teacher' AND (t.assigned_to = p_user_id OR t.created_by = p_user_id))
        -- Si enseignant, retourner les TODOs sans session liée OU ceux liés à ses sessions assignées
        OR (v_user_role = 'teacher' AND (
            t.linked_session_id IS NULL 
            OR (v_teacher_session_ids IS NOT NULL AND t.linked_session_id = ANY(v_teacher_session_ids))
        ))
    );
    
    -- Sessions
    -- Pour les enseignants, filtrer uniquement les sessions assignées
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
    INNER JOIN public.formations f ON s.formation_id = f.id
    WHERE f.organization_id = p_organization_id
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
    )
    AND (
        -- Si pas d'utilisateur ou utilisateur non-enseignant, retourner toutes les sessions
        p_user_id IS NULL OR v_user_role != 'teacher'
        -- Si enseignant, retourner uniquement les sessions assignées
        OR (v_user_role = 'teacher' AND v_teacher_session_ids IS NOT NULL AND s.id = ANY(v_teacher_session_ids))
    );
    
    -- Formations
    -- Pour les enseignants, filtrer uniquement les formations des sessions assignées
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
    )
    AND (
        -- Si pas d'utilisateur ou utilisateur non-enseignant, retourner toutes les formations
        p_user_id IS NULL OR v_user_role != 'teacher'
        -- Si enseignant, retourner uniquement les formations des sessions assignées
        OR (v_user_role = 'teacher' AND v_teacher_session_ids IS NOT NULL AND EXISTS (
            SELECT 1 
            FROM public.sessions s 
            WHERE s.formation_id = f.id 
            AND s.id = ANY(v_teacher_session_ids)
        ))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire pour documenter la modification
COMMENT ON FUNCTION get_calendar_events IS 'Récupère les événements du calendrier (TODOs, Sessions, Formations). Pour les enseignants, filtre uniquement les sessions assignées via session_teachers.';
