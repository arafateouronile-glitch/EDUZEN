-- Migration: Livret d'apprentissage (Learning Portfolio)
-- Date: 2024-12-06
-- Description: Système de livrets d'apprentissage personnalisables

-- =====================================================
-- Table: learning_portfolio_templates (Modèles de livrets)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.learning_portfolio_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- Structure du livret (sections, champs, etc.)
    template_structure JSONB NOT NULL DEFAULT '[]',
    -- Métadonnées du modèle
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    -- Personnalisation visuelle
    header_logo_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#335ACF',
    secondary_color VARCHAR(20) DEFAULT '#34B9EE',
    -- Association à une formation spécifique (optionnel)
    formation_id UUID REFERENCES public.formations(id) ON DELETE SET NULL,
    -- Audit
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_portfolio_templates_org ON public.learning_portfolio_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_templates_formation ON public.learning_portfolio_templates(formation_id);

-- =====================================================
-- Table: learning_portfolios (Livrets d'apprentissage)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.learning_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES public.learning_portfolio_templates(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
    -- Contenu du livret (données remplies)
    content JSONB NOT NULL DEFAULT '{}',
    -- Statut
    status VARCHAR(20) DEFAULT 'draft', -- draft, in_progress, completed, validated
    -- Progression
    progress_percentage DECIMAL(5, 2) DEFAULT 0,
    -- Dates importantes
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    validated_at TIMESTAMP WITH TIME ZONE,
    validated_by UUID REFERENCES public.users(id),
    -- Visibilité pour l'apprenant
    is_visible_to_student BOOLEAN DEFAULT false,
    -- PDF généré
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,
    -- Notes et commentaires
    teacher_notes TEXT,
    student_comments TEXT,
    -- Audit
    last_modified_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Un seul livret actif par apprenant/session/template
    UNIQUE(student_id, session_id, template_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_portfolios_org ON public.learning_portfolios(organization_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_student ON public.learning_portfolios(student_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_session ON public.learning_portfolios(session_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_template ON public.learning_portfolios(template_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_status ON public.learning_portfolios(status);

-- =====================================================
-- Table: learning_portfolio_entries (Entrées/évaluations du livret)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.learning_portfolio_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES public.learning_portfolios(id) ON DELETE CASCADE,
    -- Référence à la section du template
    section_id VARCHAR(100) NOT NULL,
    field_id VARCHAR(100) NOT NULL,
    -- Contenu de l'entrée
    value JSONB, -- Peut être texte, note, fichier, etc.
    -- Évaluation (si applicable)
    score DECIMAL(5, 2),
    max_score DECIMAL(5, 2),
    grade VARCHAR(10), -- A, B, C, etc. ou acquis/non-acquis
    -- Commentaires
    teacher_comment TEXT,
    -- Pièces jointes
    attachments JSONB DEFAULT '[]', -- [{url, name, type, size}]
    -- Audit
    evaluated_by UUID REFERENCES public.users(id),
    evaluated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(portfolio_id, section_id, field_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_portfolio ON public.learning_portfolio_entries(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_entries_section ON public.learning_portfolio_entries(section_id);

-- =====================================================
-- Table: learning_portfolio_signatures (Signatures)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.learning_portfolio_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES public.learning_portfolios(id) ON DELETE CASCADE,
    signer_type VARCHAR(20) NOT NULL, -- student, teacher, tutor, company_tutor, admin
    signer_id UUID REFERENCES public.users(id),
    signer_name VARCHAR(255),
    signer_role VARCHAR(100),
    signature_data TEXT, -- Base64 de la signature
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    UNIQUE(portfolio_id, signer_type, signer_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_portfolio_signatures_portfolio ON public.learning_portfolio_signatures(portfolio_id);

-- =====================================================
-- RLS Policies
-- =====================================================

-- Templates
ALTER TABLE public.learning_portfolio_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir les templates de son organisation" ON public.learning_portfolio_templates
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Admins peuvent gérer les templates" ON public.learning_portfolio_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'admin')
            AND u.organization_id = learning_portfolio_templates.organization_id
        )
    );

-- Portfolios
ALTER TABLE public.learning_portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enseignants voient les livrets de leurs sessions" ON public.learning_portfolios
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.session_teachers st
            WHERE st.session_id = learning_portfolios.session_id
            AND st.teacher_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'admin', 'secretary')
            AND u.organization_id = learning_portfolios.organization_id
        )
    );

CREATE POLICY "Apprenants voient leurs livrets visibles" ON public.learning_portfolios
    FOR SELECT USING (
        is_visible_to_student = true
        AND EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = learning_portfolios.student_id
            AND s.email = auth.jwt() ->> 'email'
        )
    );

CREATE POLICY "Enseignants peuvent modifier les livrets" ON public.learning_portfolios
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.session_teachers st
            WHERE st.session_id = learning_portfolios.session_id
            AND st.teacher_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.role IN ('super_admin', 'admin')
            AND u.organization_id = learning_portfolios.organization_id
        )
    );

CREATE POLICY "Création de livrets" ON public.learning_portfolios
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

-- Entries
ALTER TABLE public.learning_portfolio_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir les entrées via le livret" ON public.learning_portfolio_entries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.learning_portfolios lp
            WHERE lp.id = learning_portfolio_entries.portfolio_id
            AND (
                -- Enseignant de la session
                EXISTS (
                    SELECT 1 FROM public.session_teachers st
                    WHERE st.session_id = lp.session_id
                    AND st.teacher_id = auth.uid()
                )
                OR
                -- Admin
                EXISTS (
                    SELECT 1 FROM public.users u
                    WHERE u.id = auth.uid()
                    AND u.role IN ('super_admin', 'admin', 'secretary')
                    AND u.organization_id = lp.organization_id
                )
                OR
                -- Apprenant (si visible)
                (
                    lp.is_visible_to_student = true
                    AND EXISTS (
                        SELECT 1 FROM public.students s
                        WHERE s.id = lp.student_id
                        AND s.email = auth.jwt() ->> 'email'
                    )
                )
            )
        )
    );

CREATE POLICY "Modifier les entrées" ON public.learning_portfolio_entries
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.learning_portfolios lp
            WHERE lp.id = learning_portfolio_entries.portfolio_id
            AND (
                EXISTS (
                    SELECT 1 FROM public.session_teachers st
                    WHERE st.session_id = lp.session_id
                    AND st.teacher_id = auth.uid()
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.users u
                    WHERE u.id = auth.uid()
                    AND u.role IN ('super_admin', 'admin')
                    AND u.organization_id = lp.organization_id
                )
            )
        )
    );

-- Signatures
ALTER TABLE public.learning_portfolio_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir les signatures" ON public.learning_portfolio_signatures
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.learning_portfolios lp
            WHERE lp.id = learning_portfolio_signatures.portfolio_id
            AND (
                EXISTS (
                    SELECT 1 FROM public.session_teachers st
                    WHERE st.session_id = lp.session_id
                    AND st.teacher_id = auth.uid()
                )
                OR
                EXISTS (
                    SELECT 1 FROM public.users u
                    WHERE u.id = auth.uid()
                    AND u.role IN ('super_admin', 'admin', 'secretary')
                )
                OR
                (
                    lp.is_visible_to_student = true
                    AND EXISTS (
                        SELECT 1 FROM public.students s
                        WHERE s.id = lp.student_id
                        AND s.email = auth.jwt() ->> 'email'
                    )
                )
            )
        )
    );

CREATE POLICY "Ajouter sa signature" ON public.learning_portfolio_signatures
    FOR INSERT WITH CHECK (signer_id = auth.uid());

-- =====================================================
-- Triggers
-- =====================================================
CREATE TRIGGER update_portfolio_templates_updated_at
    BEFORE UPDATE ON public.learning_portfolio_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at
    BEFORE UPDATE ON public.learning_portfolios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_entries_updated_at
    BEFORE UPDATE ON public.learning_portfolio_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Fonction pour calculer la progression du livret
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_portfolio_progress(portfolio_uuid UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_fields INTEGER;
    filled_fields INTEGER;
    progress DECIMAL;
BEGIN
    -- Compter le nombre total de champs dans le template
    SELECT COUNT(*)
    INTO total_fields
    FROM public.learning_portfolios lp
    JOIN public.learning_portfolio_templates t ON lp.template_id = t.id,
    jsonb_array_elements(t.template_structure) AS section,
    jsonb_array_elements(section->'fields') AS field
    WHERE lp.id = portfolio_uuid;
    
    -- Compter les champs remplis
    SELECT COUNT(*)
    INTO filled_fields
    FROM public.learning_portfolio_entries
    WHERE portfolio_id = portfolio_uuid
    AND value IS NOT NULL
    AND value != 'null'::jsonb
    AND value != '""'::jsonb;
    
    -- Calculer la progression
    IF total_fields > 0 THEN
        progress := (filled_fields::DECIMAL / total_fields::DECIMAL) * 100;
    ELSE
        progress := 0;
    END IF;
    
    -- Mettre à jour le livret
    UPDATE public.learning_portfolios
    SET progress_percentage = progress
    WHERE id = portfolio_uuid;
    
    RETURN progress;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Commentaires
-- =====================================================
COMMENT ON TABLE public.learning_portfolio_templates IS 'Modèles de livrets d''apprentissage personnalisables';
COMMENT ON TABLE public.learning_portfolios IS 'Livrets d''apprentissage des apprenants';
COMMENT ON TABLE public.learning_portfolio_entries IS 'Entrées/évaluations dans les livrets';
COMMENT ON TABLE public.learning_portfolio_signatures IS 'Signatures électroniques des livrets';

COMMENT ON COLUMN public.learning_portfolio_templates.template_structure IS 'Structure JSON: [{id, title, description, fields: [{id, label, type, required, options}]}]';
COMMENT ON COLUMN public.learning_portfolios.content IS 'Contenu JSON du livret rempli';
COMMENT ON COLUMN public.learning_portfolio_entries.value IS 'Valeur JSON pouvant être texte, nombre, fichier, etc.';

