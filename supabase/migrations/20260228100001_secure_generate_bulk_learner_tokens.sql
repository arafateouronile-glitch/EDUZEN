-- Sécuriser generate_bulk_learner_access_tokens : vérifier que l'appelant
-- appartient à l'organisation de la session (évite génération de tokens inter-tenant).
-- Réf: audit mars 2026.

CREATE OR REPLACE FUNCTION generate_bulk_learner_access_tokens(
    p_session_id UUID,
    p_expires_in_days INTEGER DEFAULT 30,
    p_max_uses INTEGER DEFAULT NULL
)
RETURNS TABLE (
    student_id UUID,
    student_name TEXT,
    token TEXT,
    access_url TEXT
) AS $$
DECLARE
    v_student RECORD;
    v_token TEXT;
    v_org_id UUID;
    v_user_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;

    -- Récupérer l'org_id de la session
    SELECT s.organization_id INTO v_org_id
    FROM sessions s
    WHERE s.id = p_session_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    -- Vérifier que l'utilisateur appelant appartient à l'organisation de la session
    IF NOT EXISTS (
        SELECT 1 FROM users
        WHERE id = v_user_id
          AND organization_id = v_org_id
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Access denied: user does not belong to session organization';
    END IF;

    -- Pour chaque étudiant inscrit à la session
    FOR v_student IN
        SELECT
            st.id,
            st.first_name || ' ' || st.last_name AS full_name
        FROM enrollments e
        JOIN students st ON st.id = e.student_id
        WHERE e.session_id = p_session_id
        AND e.status IN ('enrolled', 'active', 'confirmed')
    LOOP
        v_token := encode(gen_random_bytes(32), 'hex');

        UPDATE learner_access_tokens
        SET is_active = false
        WHERE learner_access_tokens.student_id = v_student.id
        AND learner_access_tokens.session_id = p_session_id
        AND is_active = true;

        INSERT INTO learner_access_tokens (
            student_id,
            session_id,
            token,
            created_by,
            organization_id,
            expires_at,
            max_uses
        ) VALUES (
            v_student.id,
            p_session_id,
            v_token,
            v_user_id,
            v_org_id,
            v_expires_at,
            p_max_uses
        );

        RETURN QUERY SELECT
            v_student.id,
            v_student.full_name,
            v_token,
            '/learner/access/' || v_token;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_bulk_learner_access_tokens IS 'Génère des tokens pour tous les apprenants d''une session. L''appelant doit appartenir à l''organisation de la session.';
