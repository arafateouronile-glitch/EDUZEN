-- ============================================
-- Migration: Tokens d'accès direct pour apprenants
-- Description: Permet aux stagiaires d'accéder à leur espace personnel via un lien unique
-- ============================================

-- Table pour stocker les tokens d'accès direct
CREATE TABLE IF NOT EXISTS learner_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Référence au stagiaire
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    
    -- Référence à la session (optionnel, pour limiter l'accès à une session spécifique)
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    
    -- Token unique sécurisé (64 caractères hexadécimaux)
    token TEXT NOT NULL UNIQUE,
    
    -- Métadonnées
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Validité
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Tracking d'utilisation
    last_used_at TIMESTAMPTZ,
    use_count INTEGER DEFAULT 0,
    max_uses INTEGER, -- NULL = illimité
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_learner_access_tokens_token ON learner_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_learner_access_tokens_student ON learner_access_tokens(student_id);
CREATE INDEX IF NOT EXISTS idx_learner_access_tokens_session ON learner_access_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_learner_access_tokens_org ON learner_access_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_learner_access_tokens_expires ON learner_access_tokens(expires_at) WHERE is_active = true;

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_learner_access_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_learner_access_tokens_updated_at ON learner_access_tokens;
CREATE TRIGGER trigger_learner_access_tokens_updated_at
    BEFORE UPDATE ON learner_access_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_learner_access_tokens_updated_at();

-- RLS Policies
ALTER TABLE learner_access_tokens ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout faire sur les tokens de leur organisation
CREATE POLICY "Admins can manage access tokens"
    ON learner_access_tokens
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Fonction pour générer un token sécurisé
CREATE OR REPLACE FUNCTION generate_learner_access_token(
    p_student_id UUID,
    p_session_id UUID DEFAULT NULL,
    p_expires_in_days INTEGER DEFAULT 30,
    p_max_uses INTEGER DEFAULT NULL
)
RETURNS TABLE (
    token TEXT,
    expires_at TIMESTAMPTZ,
    access_url TEXT
) AS $$
DECLARE
    v_token TEXT;
    v_expires_at TIMESTAMPTZ;
    v_org_id UUID;
    v_user_id UUID;
BEGIN
    -- Récupérer l'utilisateur courant
    v_user_id := auth.uid();
    
    -- Récupérer l'organization_id du student
    SELECT s.organization_id INTO v_org_id
    FROM students s
    WHERE s.id = p_student_id;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Student not found';
    END IF;
    
    -- Générer un token sécurisé (64 caractères hex)
    v_token := encode(gen_random_bytes(32), 'hex');
    
    -- Calculer la date d'expiration
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
    
    -- Désactiver les anciens tokens pour ce student/session
    UPDATE learner_access_tokens
    SET is_active = false
    WHERE student_id = p_student_id
    AND (session_id = p_session_id OR (session_id IS NULL AND p_session_id IS NULL))
    AND is_active = true;
    
    -- Insérer le nouveau token
    INSERT INTO learner_access_tokens (
        student_id,
        session_id,
        token,
        created_by,
        organization_id,
        expires_at,
        max_uses
    ) VALUES (
        p_student_id,
        p_session_id,
        v_token,
        v_user_id,
        v_org_id,
        v_expires_at,
        p_max_uses
    );
    
    RETURN QUERY SELECT 
        v_token,
        v_expires_at,
        '/learner/access/' || v_token AS access_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour valider un token et récupérer les infos du student
CREATE OR REPLACE FUNCTION validate_learner_access_token(p_token TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    student_id UUID,
    session_id UUID,
    student_first_name TEXT,
    student_last_name TEXT,
    student_email TEXT,
    organization_id UUID,
    error_message TEXT
) AS $$
DECLARE
    v_token_record RECORD;
BEGIN
    -- Chercher le token
    SELECT 
        lat.*,
        s.first_name,
        s.last_name,
        s.email
    INTO v_token_record
    FROM learner_access_tokens lat
    JOIN students s ON s.id = lat.student_id
    WHERE lat.token = p_token;
    
    -- Token non trouvé
    IF v_token_record IS NULL THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::UUID,
            'Token invalide ou inexistant'::TEXT;
        RETURN;
    END IF;
    
    -- Token désactivé
    IF NOT v_token_record.is_active THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::UUID,
            'Ce lien d''accès a été désactivé'::TEXT;
        RETURN;
    END IF;
    
    -- Token expiré
    IF v_token_record.expires_at < NOW() THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::UUID,
            'Ce lien d''accès a expiré'::TEXT;
        RETURN;
    END IF;
    
    -- Vérifier le nombre d'utilisations max
    IF v_token_record.max_uses IS NOT NULL AND v_token_record.use_count >= v_token_record.max_uses THEN
        RETURN QUERY SELECT 
            false,
            NULL::UUID,
            NULL::UUID,
            NULL::TEXT,
            NULL::TEXT,
            NULL::TEXT,
            NULL::UUID,
            'Ce lien d''accès a atteint son nombre maximum d''utilisations'::TEXT;
        RETURN;
    END IF;
    
    -- Mettre à jour les stats d'utilisation
    UPDATE learner_access_tokens
    SET 
        last_used_at = NOW(),
        use_count = use_count + 1
    WHERE token = p_token;
    
    -- Retourner les infos
    RETURN QUERY SELECT 
        true,
        v_token_record.student_id,
        v_token_record.session_id,
        v_token_record.first_name,
        v_token_record.last_name,
        v_token_record.email,
        v_token_record.organization_id,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour révoquer un token
CREATE OR REPLACE FUNCTION revoke_learner_access_token(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE learner_access_tokens
    SET is_active = false
    WHERE token = p_token;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour générer des tokens en masse pour une session
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
        -- Générer un token unique
        v_token := encode(gen_random_bytes(32), 'hex');
        
        -- Désactiver les anciens tokens
        UPDATE learner_access_tokens
        SET is_active = false
        WHERE learner_access_tokens.student_id = v_student.id
        AND learner_access_tokens.session_id = p_session_id
        AND is_active = true;
        
        -- Insérer le nouveau token
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
        
        -- Retourner le résultat
        RETURN QUERY SELECT 
            v_student.id,
            v_student.full_name,
            v_token,
            '/learner/access/' || v_token;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires
COMMENT ON TABLE learner_access_tokens IS 'Tokens d''accès direct pour permettre aux apprenants d''accéder à leur espace sans mot de passe';
COMMENT ON FUNCTION generate_learner_access_token IS 'Génère un token d''accès sécurisé pour un apprenant';
COMMENT ON FUNCTION validate_learner_access_token IS 'Valide un token et retourne les informations de l''apprenant';
COMMENT ON FUNCTION generate_bulk_learner_access_tokens IS 'Génère des tokens pour tous les apprenants d''une session';




