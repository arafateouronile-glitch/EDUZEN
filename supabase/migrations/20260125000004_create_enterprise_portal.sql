-- =====================================================
-- ENTERPRISE PORTAL MODULE - Complete Database Schema
-- =====================================================
-- This migration creates all tables for the Enterprise Portal:
-- 1. Companies & Company Managers
-- 2. Company Employees (link to students)
-- 3. Training Requests
-- 4. OPCO Share Links
-- 5. Skills & Competency Tracking
-- =====================================================

-- =====================================================
-- 1. COMPANIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    siren VARCHAR(9),
    siret VARCHAR(14),
    legal_form VARCHAR(100), -- SA, SAS, SARL, etc.
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    country VARCHAR(100) DEFAULT 'France',
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url TEXT,
    opco_id UUID, -- Link to OPCO if known
    opco_name VARCHAR(255),
    opco_contact_email VARCHAR(255),
    billing_email VARCHAR(255),
    billing_address TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK to organizations if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'companies_organization_id_fkey' AND table_name = 'companies') THEN
            ALTER TABLE companies ADD CONSTRAINT companies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 2. COMPANY MANAGERS (HR Directors, Managers)
-- =====================================================

CREATE TABLE IF NOT EXISTS company_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'manager' CHECK (role IN ('director', 'hr_manager', 'manager', 'viewer')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    job_title VARCHAR(100),
    department VARCHAR(100),
    can_view_invoices BOOLEAN NOT NULL DEFAULT true,
    can_download_documents BOOLEAN NOT NULL DEFAULT true,
    can_request_training BOOLEAN NOT NULL DEFAULT true,
    can_manage_employees BOOLEAN NOT NULL DEFAULT false,
    is_primary_contact BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, email)
);

-- Add FK to users if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'company_managers_user_id_fkey' AND table_name = 'company_managers') THEN
            ALTER TABLE company_managers ADD CONSTRAINT company_managers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 3. COMPANY EMPLOYEES (Link to Students in Training)
-- =====================================================

CREATE TABLE IF NOT EXISTS company_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    employee_number VARCHAR(50),
    department VARCHAR(100),
    job_title VARCHAR(100),
    hire_date DATE,
    manager_name VARCHAR(200),
    manager_email VARCHAR(255),
    contract_type VARCHAR(50), -- CDI, CDD, Alternance, etc.
    funding_source VARCHAR(50) DEFAULT 'company' CHECK (funding_source IN ('company', 'opco', 'cpf', 'mixed', 'other')),
    opco_dossier_number VARCHAR(100),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, student_id)
);

-- Add FK to students if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'company_employees_student_id_fkey' AND table_name = 'company_employees') THEN
            ALTER TABLE company_employees ADD CONSTRAINT company_employees_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 4. TRAINING REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS training_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES company_managers(id),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('new_enrollment', 'custom_training', 'group_training', 'certification', 'other')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    formation_id UUID, -- Link to existing formation if applicable
    employee_ids UUID[] DEFAULT '{}', -- Employees concerned
    number_of_participants INTEGER DEFAULT 1,
    preferred_start_date DATE,
    preferred_end_date DATE,
    preferred_format VARCHAR(50) CHECK (preferred_format IN ('presential', 'remote', 'hybrid', 'elearning', 'flexible')),
    budget_range VARCHAR(50),
    funding_type VARCHAR(50) CHECK (funding_type IN ('company', 'opco', 'cpf', 'mixed')),
    opco_pre_approved BOOLEAN DEFAULT false,
    urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'reviewing', 'approved', 'rejected', 'scheduled', 'completed', 'cancelled')),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    scheduled_session_id UUID,
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK to formations if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'formations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'training_requests_formation_id_fkey' AND table_name = 'training_requests') THEN
            ALTER TABLE training_requests ADD CONSTRAINT training_requests_formation_id_fkey FOREIGN KEY (formation_id) REFERENCES formations(id) ON DELETE SET NULL;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'training_requests_scheduled_session_id_fkey' AND table_name = 'training_requests') THEN
            ALTER TABLE training_requests ADD CONSTRAINT training_requests_scheduled_session_id_fkey FOREIGN KEY (scheduled_session_id) REFERENCES sessions(id) ON DELETE SET NULL;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'training_requests_reviewed_by_fkey' AND table_name = 'training_requests') THEN
            ALTER TABLE training_requests ADD CONSTRAINT training_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 5. OPCO SHARE LINKS (Temporary Access for OPCOs)
-- =====================================================

CREATE TABLE IF NOT EXISTS opco_share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES company_managers(id),
    token VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL DEFAULT 'Documents de formation',
    description TEXT,
    opco_email VARCHAR(255),
    opco_name VARCHAR(255),
    document_types TEXT[] DEFAULT '{}', -- Types of documents accessible
    enrollment_ids UUID[] DEFAULT '{}', -- Specific enrollments if limited
    invoice_ids UUID[] DEFAULT '{}', -- Specific invoices if limited
    access_count INTEGER NOT NULL DEFAULT 0,
    max_access_count INTEGER, -- NULL = unlimited
    expires_at TIMESTAMPTZ NOT NULL,
    password_hash VARCHAR(255), -- Optional password protection
    last_accessed_at TIMESTAMPTZ,
    last_accessed_ip INET,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 6. EMPLOYEE SKILLS TRACKING
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_employee_id UUID NOT NULL REFERENCES company_employees(id) ON DELETE CASCADE,
    skill_name VARCHAR(200) NOT NULL,
    skill_category VARCHAR(100),
    initial_level INTEGER CHECK (initial_level >= 0 AND initial_level <= 100),
    current_level INTEGER CHECK (current_level >= 0 AND current_level <= 100),
    target_level INTEGER CHECK (target_level >= 0 AND target_level <= 100),
    acquired_from_session_id UUID,
    validated_at TIMESTAMPTZ,
    validated_by UUID,
    certification_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK to sessions if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'employee_skills_acquired_from_session_id_fkey' AND table_name = 'employee_skills') THEN
            ALTER TABLE employee_skills ADD CONSTRAINT employee_skills_acquired_from_session_id_fkey FOREIGN KEY (acquired_from_session_id) REFERENCES sessions(id) ON DELETE SET NULL;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'employee_skills_validated_by_fkey' AND table_name = 'employee_skills') THEN
            ALTER TABLE employee_skills ADD CONSTRAINT employee_skills_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- 7. COMPANY INVOICES VIEW (aggregated view for billing)
-- =====================================================

-- Create a view for company billing summary
CREATE OR REPLACE VIEW company_billing_summary AS
SELECT
    ce.company_id,
    c.name AS company_name,
    i.id AS invoice_id,
    i.invoice_number,
    i.document_type,
    i.amount,
    i.tax_amount,
    i.total_amount,
    i.currency,
    i.status,
    i.issue_date,
    i.due_date,
    (SELECT MAX(p.paid_at) FROM payments p WHERE p.invoice_id = i.id AND p.status = 'completed') AS paid_at,
    i.pdf_url,
    s.first_name || ' ' || s.last_name AS employee_name,
    ce.employee_number,
    ce.department
FROM company_employees ce
JOIN companies c ON c.id = ce.company_id
JOIN students s ON s.id = ce.student_id
LEFT JOIN invoices i ON i.student_id = ce.student_id
WHERE ce.is_active = true;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_companies_organization ON companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_companies_siren ON companies(siren) WHERE siren IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_siret ON companies(siret) WHERE siret IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_active ON companies(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_company_managers_company ON company_managers(company_id);
CREATE INDEX IF NOT EXISTS idx_company_managers_user ON company_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_company_managers_email ON company_managers(email);
CREATE INDEX IF NOT EXISTS idx_company_managers_active ON company_managers(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_company_employees_company ON company_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_company_employees_student ON company_employees(student_id);
CREATE INDEX IF NOT EXISTS idx_company_employees_active ON company_employees(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_training_requests_company ON training_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_training_requests_status ON training_requests(status);
CREATE INDEX IF NOT EXISTS idx_training_requests_requested_by ON training_requests(requested_by);

CREATE INDEX IF NOT EXISTS idx_opco_share_links_company ON opco_share_links(company_id);
CREATE INDEX IF NOT EXISTS idx_opco_share_links_token ON opco_share_links(token);
CREATE INDEX IF NOT EXISTS idx_opco_share_links_expires ON opco_share_links(expires_at);

CREATE INDEX IF NOT EXISTS idx_employee_skills_employee ON employee_skills(company_employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_category ON employee_skills(skill_category);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE opco_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user is a company manager for a specific company
CREATE OR REPLACE FUNCTION is_company_manager(check_user_id UUID, check_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    IF check_company_id IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1 FROM company_managers
            WHERE user_id = check_user_id
            AND company_id = check_company_id
            AND is_active = true
        );
    ELSE
        RETURN EXISTS (
            SELECT 1 FROM company_managers
            WHERE user_id = check_user_id
            AND is_active = true
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get company IDs for a user (as manager)
CREATE OR REPLACE FUNCTION get_user_company_ids(check_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
    RETURN ARRAY(
        SELECT company_id FROM company_managers
        WHERE user_id = check_user_id
        AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access company data (org admin OR company manager)
CREATE OR REPLACE FUNCTION can_access_company(check_user_id UUID, check_company_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    company_org_id UUID;
BEGIN
    -- Get the organization_id of the company
    SELECT organization_id INTO company_org_id FROM companies WHERE id = check_company_id;

    -- Check if user is org admin
    IF EXISTS (
        SELECT 1 FROM users
        WHERE id = check_user_id
        AND organization_id = company_org_id
        AND role IN ('admin', 'super_admin')
    ) THEN
        RETURN true;
    END IF;

    -- Check if user is company manager
    RETURN is_company_manager(check_user_id, check_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Companies: Org admins see all, company managers see their company
DROP POLICY IF EXISTS "Org admins can manage companies" ON companies;
CREATE POLICY "Org admins can manage companies" ON companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.organization_id = companies.organization_id
            AND users.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Company managers can view their company" ON companies;
CREATE POLICY "Company managers can view their company" ON companies
    FOR SELECT USING (is_company_manager(auth.uid(), id));

-- Company Managers: Access based on company access
DROP POLICY IF EXISTS "Users can view managers of their company" ON company_managers;
CREATE POLICY "Users can view managers of their company" ON company_managers
    FOR SELECT USING (can_access_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Org admins can manage company managers" ON company_managers;
CREATE POLICY "Org admins can manage company managers" ON company_managers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM companies c
            JOIN users u ON u.organization_id = c.organization_id
            WHERE c.id = company_managers.company_id
            AND u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
        )
    );

-- Company Employees: Access based on company access
DROP POLICY IF EXISTS "Users can view employees of their company" ON company_employees;
CREATE POLICY "Users can view employees of their company" ON company_employees
    FOR SELECT USING (can_access_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Company managers with permission can manage employees" ON company_employees;
CREATE POLICY "Company managers with permission can manage employees" ON company_employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM company_managers cm
            WHERE cm.user_id = auth.uid()
            AND cm.company_id = company_employees.company_id
            AND cm.is_active = true
            AND cm.can_manage_employees = true
        )
    );

DROP POLICY IF EXISTS "Org admins can manage company employees" ON company_employees;
CREATE POLICY "Org admins can manage company employees" ON company_employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM companies c
            JOIN users u ON u.organization_id = c.organization_id
            WHERE c.id = company_employees.company_id
            AND u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
        )
    );

-- Training Requests: Access based on company access
DROP POLICY IF EXISTS "Users can view training requests for their company" ON training_requests;
CREATE POLICY "Users can view training requests for their company" ON training_requests
    FOR SELECT USING (can_access_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Company managers with permission can create training requests" ON training_requests;
CREATE POLICY "Company managers with permission can create training requests" ON training_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM company_managers cm
            WHERE cm.user_id = auth.uid()
            AND cm.company_id = training_requests.company_id
            AND cm.is_active = true
            AND cm.can_request_training = true
        )
    );

DROP POLICY IF EXISTS "Org admins can manage training requests" ON training_requests;
CREATE POLICY "Org admins can manage training requests" ON training_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM companies c
            JOIN users u ON u.organization_id = c.organization_id
            WHERE c.id = training_requests.company_id
            AND u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
        )
    );

-- OPCO Share Links: Only company managers and org admins
DROP POLICY IF EXISTS "Company managers can manage their OPCO links" ON opco_share_links;
CREATE POLICY "Company managers can manage their OPCO links" ON opco_share_links
    FOR ALL USING (can_access_company(auth.uid(), company_id));

-- Employee Skills: Access based on company access
DROP POLICY IF EXISTS "Users can view skills of their company employees" ON employee_skills;
CREATE POLICY "Users can view skills of their company employees" ON employee_skills
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM company_employees ce
            WHERE ce.id = employee_skills.company_employee_id
            AND can_access_company(auth.uid(), ce.company_id)
        )
    );

DROP POLICY IF EXISTS "Org admins can manage employee skills" ON employee_skills;
CREATE POLICY "Org admins can manage employee skills" ON employee_skills
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM company_employees ce
            JOIN companies c ON c.id = ce.company_id
            JOIN users u ON u.organization_id = c.organization_id
            WHERE ce.id = employee_skills.company_employee_id
            AND u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger for all tables
DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['companies', 'company_managers', 'company_employees', 'training_requests', 'employee_skills']) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I; CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t, t, t, t);
    END LOOP;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant access to the view
GRANT SELECT ON company_billing_summary TO authenticated;
GRANT SELECT ON company_billing_summary TO service_role;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE companies IS 'Client companies that send employees for training';
COMMENT ON TABLE company_managers IS 'HR managers and directors with portal access';
COMMENT ON TABLE company_employees IS 'Link between companies and students (employees in training)';
COMMENT ON TABLE training_requests IS 'Training requests from companies';
COMMENT ON TABLE opco_share_links IS 'Temporary share links for OPCO document access';
COMMENT ON TABLE employee_skills IS 'Skills acquired by employees through training';
COMMENT ON VIEW company_billing_summary IS 'Aggregated billing view for company managers';
