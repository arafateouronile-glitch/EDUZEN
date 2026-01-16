-- Migration: Système RBAC (Role-Based Access Control) avec permissions granulaires
-- Crée les tables pour gérer les utilisateurs, rôles, permissions et accès

-- Table des rôles prédéfinis
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- 'admin', 'commercial', 'formateur', 'user', etc.
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- Rôles système non modifiables
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL pour rôles globaux
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des permissions disponibles
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- 'students.view', 'students.create', 'invoices.manage', etc.
  description TEXT,
  category TEXT NOT NULL, -- 'students', 'invoices', 'templates', 'settings', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table de liaison entre rôles et permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Table de liaison entre utilisateurs et rôles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optionnel : expiration du rôle
  UNIQUE(user_id, role_id, organization_id)
);

-- Table de permissions personnalisées par utilisateur (pour accès simples avec cases à cocher)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true, -- true = accordé, false = refusé explicitement
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_id, organization_id)
);

-- Table pour les enseignants/formateurs (relation spéciale)
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_number TEXT, -- Numéro d'employé
  hire_date DATE,
  specialization TEXT, -- Spécialité du formateur
  bio TEXT, -- Biographie
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_roles_organization_id ON public.roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON public.user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_organization_id ON public.user_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_organization_id ON public.teachers(organization_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_teachers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_roles_timestamp ON public.roles;
CREATE TRIGGER update_roles_timestamp
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_timestamp();

DROP TRIGGER IF EXISTS update_teachers_timestamp ON public.teachers;
CREATE TRIGGER update_teachers_timestamp
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION update_teachers_timestamp();

-- Fonction pour vérifier si un utilisateur a une permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_code TEXT,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_permission_id UUID;
BEGIN
  -- Récupérer l'ID de la permission
  SELECT id INTO v_permission_id
  FROM public.permissions
  WHERE code = p_permission_code;

  IF v_permission_id IS NULL THEN
    RETURN false;
  END IF;

  -- Vérifier les permissions personnalisées (priorité la plus haute)
  SELECT granted INTO v_has_permission
  FROM public.user_permissions
  WHERE user_id = p_user_id
    AND permission_id = v_permission_id
    AND organization_id = p_organization_id
  LIMIT 1;

  -- Si une permission personnalisée existe, l'utiliser
  IF v_has_permission IS NOT NULL THEN
    RETURN v_has_permission;
  END IF;

  -- Vérifier les permissions via les rôles
  SELECT EXISTS(
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    WHERE ur.user_id = p_user_id
      AND ur.organization_id = p_organization_id
      AND rp.permission_id = v_permission_id
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Fonction pour obtenir toutes les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  permission_code TEXT,
  permission_name TEXT,
  category TEXT,
  source TEXT -- 'role' ou 'custom'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Permissions via rôles
  SELECT DISTINCT
    p.code,
    p.name,
    p.category,
    'role'::TEXT as source
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
    AND ur.organization_id = p_organization_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  
  UNION
  
  -- Permissions personnalisées (accordées)
  SELECT
    p.code,
    p.name,
    p.category,
    'custom'::TEXT as source
  FROM public.user_permissions up
  JOIN public.permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id
    AND up.organization_id = p_organization_id
    AND up.granted = true;
END;
$$;

-- RLS Policies
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Policies pour roles
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.roles;
CREATE POLICY "Users can view roles in their organization"
  ON public.roles FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR organization_id IS NULL -- Rôles globaux
  );

DROP POLICY IF EXISTS "Admins can manage roles in their organization" ON public.roles;
CREATE POLICY "Admins can manage roles in their organization"
  ON public.roles FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Policies pour permissions (lecture seule pour tous)
DROP POLICY IF EXISTS "Users can view permissions" ON public.permissions;
CREATE POLICY "Users can view permissions"
  ON public.permissions FOR SELECT
  USING (true);

-- Policies pour role_permissions
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
    )
  );

-- Policies pour user_roles
DROP POLICY IF EXISTS "Users can view user roles in their organization" ON public.user_roles;
CREATE POLICY "Users can view user roles in their organization"
  ON public.user_roles FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Policies pour user_permissions
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  USING (
    user_id = auth.uid()
    OR organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage user permissions" ON public.user_permissions;
CREATE POLICY "Admins can manage user permissions"
  ON public.user_permissions FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Policies pour teachers
DROP POLICY IF EXISTS "Users can view teachers in their organization" ON public.teachers;
CREATE POLICY "Users can view teachers in their organization"
  ON public.teachers FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
CREATE POLICY "Admins can manage teachers"
  ON public.teachers FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Insérer les rôles système par défaut
INSERT INTO public.roles (name, code, description, is_system) VALUES
  ('Super Administrateur', 'super_admin', 'Accès complet à toutes les fonctionnalités', true),
  ('Administrateur', 'admin', 'Gestion complète de l''organisation', true),
  ('Commercial', 'commercial', 'Gestion des aspects commerciaux (devis, factures, paiements)', true),
  ('Formateur', 'formateur', 'Accès formateur pour gérer les cours et sessions', true),
  ('Utilisateur', 'user', 'Accès de base avec permissions personnalisées', true)
ON CONFLICT (code) DO NOTHING;

-- Insérer les permissions par défaut (catégories principales)
INSERT INTO public.permissions (name, code, description, category) VALUES
  -- Étudiants
  ('Voir les étudiants', 'students.view', 'Permet de voir la liste des étudiants', 'students'),
  ('Créer des étudiants', 'students.create', 'Permet de créer de nouveaux étudiants', 'students'),
  ('Modifier les étudiants', 'students.edit', 'Permet de modifier les informations des étudiants', 'students'),
  ('Supprimer des étudiants', 'students.delete', 'Permet de supprimer des étudiants', 'students'),
  
  -- Formations
  ('Voir les formations', 'formations.view', 'Permet de voir la liste des formations', 'formations'),
  ('Créer des formations', 'formations.create', 'Permet de créer de nouvelles formations', 'formations'),
  ('Modifier les formations', 'formations.edit', 'Permet de modifier les formations', 'formations'),
  ('Supprimer des formations', 'formations.delete', 'Permet de supprimer des formations', 'formations'),
  
  -- Sessions
  ('Voir les sessions', 'sessions.view', 'Permet de voir la liste des sessions', 'sessions'),
  ('Créer des sessions', 'sessions.create', 'Permet de créer de nouvelles sessions', 'sessions'),
  ('Modifier les sessions', 'sessions.edit', 'Permet de modifier les sessions', 'sessions'),
  ('Supprimer des sessions', 'sessions.delete', 'Permet de supprimer des sessions', 'sessions'),
  
  -- Inscriptions
  ('Voir les inscriptions', 'enrollments.view', 'Permet de voir les inscriptions', 'enrollments'),
  ('Créer des inscriptions', 'enrollments.create', 'Permet de créer de nouvelles inscriptions', 'enrollments'),
  ('Modifier les inscriptions', 'enrollments.edit', 'Permet de modifier les inscriptions', 'enrollments'),
  ('Supprimer des inscriptions', 'enrollments.delete', 'Permet de supprimer des inscriptions', 'enrollments'),
  
  -- Factures et Devis
  ('Voir les factures', 'invoices.view', 'Permet de voir les factures', 'invoices'),
  ('Créer des factures', 'invoices.create', 'Permet de créer de nouvelles factures', 'invoices'),
  ('Modifier les factures', 'invoices.edit', 'Permet de modifier les factures', 'invoices'),
  ('Supprimer les factures', 'invoices.delete', 'Permet de supprimer les factures', 'invoices'),
  ('Voir les devis', 'quotes.view', 'Permet de voir les devis', 'invoices'),
  ('Créer des devis', 'quotes.create', 'Permet de créer de nouveaux devis', 'invoices'),
  ('Modifier les devis', 'quotes.edit', 'Permet de modifier les devis', 'invoices'),
  ('Supprimer les devis', 'quotes.delete', 'Permet de supprimer les devis', 'invoices'),
  
  -- Paiements
  ('Voir les paiements', 'payments.view', 'Permet de voir les paiements', 'payments'),
  ('Créer des paiements', 'payments.create', 'Permet d''enregistrer de nouveaux paiements', 'payments'),
  ('Modifier les paiements', 'payments.edit', 'Permet de modifier les paiements', 'payments'),
  ('Supprimer les paiements', 'payments.delete', 'Permet de supprimer les paiements', 'payments'),
  
  -- Présence
  ('Voir les présences', 'attendance.view', 'Permet de voir les présences', 'attendance'),
  ('Gérer les présences', 'attendance.manage', 'Permet de gérer les présences', 'attendance'),
  
  -- Évaluations
  ('Voir les évaluations', 'evaluations.view', 'Permet de voir les évaluations', 'evaluations'),
  ('Créer des évaluations', 'evaluations.create', 'Permet de créer de nouvelles évaluations', 'evaluations'),
  ('Modifier les évaluations', 'evaluations.edit', 'Permet de modifier les évaluations', 'evaluations'),
  ('Supprimer les évaluations', 'evaluations.delete', 'Permet de supprimer les évaluations', 'evaluations'),
  
  -- Templates de documents
  ('Voir les templates', 'templates.view', 'Permet de voir les templates de documents', 'templates'),
  ('Créer des templates', 'templates.create', 'Permet de créer de nouveaux templates', 'templates'),
  ('Modifier les templates', 'templates.edit', 'Permet de modifier les templates', 'templates'),
  ('Supprimer les templates', 'templates.delete', 'Permet de supprimer les templates', 'templates'),
  ('Générer des documents', 'templates.generate', 'Permet de générer des documents depuis les templates', 'templates'),
  
  -- Paramètres
  ('Voir les paramètres', 'settings.view', 'Permet de voir les paramètres', 'settings'),
  ('Modifier les paramètres', 'settings.edit', 'Permet de modifier les paramètres', 'settings'),
  
  -- Utilisateurs et permissions
  ('Voir les utilisateurs', 'users.view', 'Permet de voir la liste des utilisateurs', 'users'),
  ('Créer des utilisateurs', 'users.create', 'Permet de créer de nouveaux utilisateurs', 'users'),
  ('Modifier les utilisateurs', 'users.edit', 'Permet de modifier les utilisateurs', 'users'),
  ('Supprimer des utilisateurs', 'users.delete', 'Permet de supprimer des utilisateurs', 'users'),
  ('Gérer les permissions', 'users.permissions', 'Permet de gérer les permissions des utilisateurs', 'users'),
  
  -- Rapports
  ('Voir les rapports', 'reports.view', 'Permet de voir les rapports', 'reports'),
  ('Générer des rapports', 'reports.generate', 'Permet de générer des rapports', 'reports')
ON CONFLICT (code) DO NOTHING;

-- Assigner toutes les permissions au rôle super_admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

-- Assigner les permissions au rôle admin (toutes sauf gestion des utilisateurs)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'admin'
  AND p.code NOT IN ('users.delete', 'users.permissions')
ON CONFLICT DO NOTHING;

-- Assigner les permissions au rôle commercial
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'commercial'
  AND p.category IN ('invoices', 'payments', 'students', 'enrollments')
  AND p.code IN (
    'students.view', 'students.create', 'students.edit',
    'enrollments.view', 'enrollments.create', 'enrollments.edit',
    'invoices.view', 'invoices.create', 'invoices.edit',
    'quotes.view', 'quotes.create', 'quotes.edit',
    'payments.view', 'payments.create', 'payments.edit'
  )
ON CONFLICT DO NOTHING;

-- Assigner les permissions au rôle formateur
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'formateur'
  AND p.code IN (
    'sessions.view', 'sessions.create', 'sessions.edit',
    'attendance.view', 'attendance.manage',
    'evaluations.view', 'evaluations.create', 'evaluations.edit',
    'students.view'
  )
ON CONFLICT DO NOTHING;

-- Commentaires
COMMENT ON TABLE public.roles IS 'Rôles disponibles dans le système (admin, commercial, formateur, etc.)';
COMMENT ON TABLE public.permissions IS 'Permissions granulaires disponibles';
COMMENT ON TABLE public.role_permissions IS 'Liaison entre rôles et permissions';
COMMENT ON TABLE public.user_roles IS 'Rôles assignés aux utilisateurs';
COMMENT ON TABLE public.user_permissions IS 'Permissions personnalisées par utilisateur (pour accès simples)';
COMMENT ON TABLE public.teachers IS 'Table spécifique pour les enseignants/formateurs';
COMMENT ON FUNCTION user_has_permission IS 'Vérifie si un utilisateur a une permission spécifique';
COMMENT ON FUNCTION get_user_permissions IS 'Récupère toutes les permissions d''un utilisateur';



-- Table des rôles prédéfinis
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- 'admin', 'commercial', 'formateur', 'user', etc.
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- Rôles système non modifiables
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL pour rôles globaux
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des permissions disponibles
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- 'students.view', 'students.create', 'invoices.manage', etc.
  description TEXT,
  category TEXT NOT NULL, -- 'students', 'invoices', 'templates', 'settings', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table de liaison entre rôles et permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Table de liaison entre utilisateurs et rôles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optionnel : expiration du rôle
  UNIQUE(user_id, role_id, organization_id)
);

-- Table de permissions personnalisées par utilisateur (pour accès simples avec cases à cocher)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true, -- true = accordé, false = refusé explicitement
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_id, organization_id)
);

-- Table pour les enseignants/formateurs (relation spéciale)
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_number TEXT, -- Numéro d'employé
  hire_date DATE,
  specialization TEXT, -- Spécialité du formateur
  bio TEXT, -- Biographie
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_roles_organization_id ON public.roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON public.user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_organization_id ON public.user_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_organization_id ON public.teachers(organization_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_teachers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_roles_timestamp ON public.roles;
CREATE TRIGGER update_roles_timestamp
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_timestamp();

DROP TRIGGER IF EXISTS update_teachers_timestamp ON public.teachers;
CREATE TRIGGER update_teachers_timestamp
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION update_teachers_timestamp();

-- Fonction pour vérifier si un utilisateur a une permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_code TEXT,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_permission_id UUID;
BEGIN
  -- Récupérer l'ID de la permission
  SELECT id INTO v_permission_id
  FROM public.permissions
  WHERE code = p_permission_code;

  IF v_permission_id IS NULL THEN
    RETURN false;
  END IF;

  -- Vérifier les permissions personnalisées (priorité la plus haute)
  SELECT granted INTO v_has_permission
  FROM public.user_permissions
  WHERE user_id = p_user_id
    AND permission_id = v_permission_id
    AND organization_id = p_organization_id
  LIMIT 1;

  -- Si une permission personnalisée existe, l'utiliser
  IF v_has_permission IS NOT NULL THEN
    RETURN v_has_permission;
  END IF;

  -- Vérifier les permissions via les rôles
  SELECT EXISTS(
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    WHERE ur.user_id = p_user_id
      AND ur.organization_id = p_organization_id
      AND rp.permission_id = v_permission_id
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Fonction pour obtenir toutes les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  permission_code TEXT,
  permission_name TEXT,
  category TEXT,
  source TEXT -- 'role' ou 'custom'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Permissions via rôles
  SELECT DISTINCT
    p.code,
    p.name,
    p.category,
    'role'::TEXT as source
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
    AND ur.organization_id = p_organization_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  
  UNION
  
  -- Permissions personnalisées (accordées)
  SELECT
    p.code,
    p.name,
    p.category,
    'custom'::TEXT as source
  FROM public.user_permissions up
  JOIN public.permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id
    AND up.organization_id = p_organization_id
    AND up.granted = true;
END;
$$;

-- RLS Policies
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Policies pour roles
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.roles;
CREATE POLICY "Users can view roles in their organization"
  ON public.roles FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR organization_id IS NULL -- Rôles globaux
  );

DROP POLICY IF EXISTS "Admins can manage roles in their organization" ON public.roles;
CREATE POLICY "Admins can manage roles in their organization"
  ON public.roles FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Policies pour permissions (lecture seule pour tous)
DROP POLICY IF EXISTS "Users can view permissions" ON public.permissions;
CREATE POLICY "Users can view permissions"
  ON public.permissions FOR SELECT
  USING (true);

-- Policies pour role_permissions
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
    )
  );

-- Policies pour user_roles
DROP POLICY IF EXISTS "Users can view user roles in their organization" ON public.user_roles;
CREATE POLICY "Users can view user roles in their organization"
  ON public.user_roles FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Policies pour user_permissions
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  USING (
    user_id = auth.uid()
    OR organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage user permissions" ON public.user_permissions;
CREATE POLICY "Admins can manage user permissions"
  ON public.user_permissions FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Policies pour teachers
DROP POLICY IF EXISTS "Users can view teachers in their organization" ON public.teachers;
CREATE POLICY "Users can view teachers in their organization"
  ON public.teachers FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
CREATE POLICY "Admins can manage teachers"
  ON public.teachers FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Insérer les rôles système par défaut
INSERT INTO public.roles (name, code, description, is_system) VALUES
  ('Super Administrateur', 'super_admin', 'Accès complet à toutes les fonctionnalités', true),
  ('Administrateur', 'admin', 'Gestion complète de l''organisation', true),
  ('Commercial', 'commercial', 'Gestion des aspects commerciaux (devis, factures, paiements)', true),
  ('Formateur', 'formateur', 'Accès formateur pour gérer les cours et sessions', true),
  ('Utilisateur', 'user', 'Accès de base avec permissions personnalisées', true)
ON CONFLICT (code) DO NOTHING;

-- Insérer les permissions par défaut (catégories principales)
INSERT INTO public.permissions (name, code, description, category) VALUES
  -- Étudiants
  ('Voir les étudiants', 'students.view', 'Permet de voir la liste des étudiants', 'students'),
  ('Créer des étudiants', 'students.create', 'Permet de créer de nouveaux étudiants', 'students'),
  ('Modifier les étudiants', 'students.edit', 'Permet de modifier les informations des étudiants', 'students'),
  ('Supprimer des étudiants', 'students.delete', 'Permet de supprimer des étudiants', 'students'),
  
  -- Formations
  ('Voir les formations', 'formations.view', 'Permet de voir la liste des formations', 'formations'),
  ('Créer des formations', 'formations.create', 'Permet de créer de nouvelles formations', 'formations'),
  ('Modifier les formations', 'formations.edit', 'Permet de modifier les formations', 'formations'),
  ('Supprimer des formations', 'formations.delete', 'Permet de supprimer des formations', 'formations'),
  
  -- Sessions
  ('Voir les sessions', 'sessions.view', 'Permet de voir la liste des sessions', 'sessions'),
  ('Créer des sessions', 'sessions.create', 'Permet de créer de nouvelles sessions', 'sessions'),
  ('Modifier les sessions', 'sessions.edit', 'Permet de modifier les sessions', 'sessions'),
  ('Supprimer des sessions', 'sessions.delete', 'Permet de supprimer des sessions', 'sessions'),
  
  -- Inscriptions
  ('Voir les inscriptions', 'enrollments.view', 'Permet de voir les inscriptions', 'enrollments'),
  ('Créer des inscriptions', 'enrollments.create', 'Permet de créer de nouvelles inscriptions', 'enrollments'),
  ('Modifier les inscriptions', 'enrollments.edit', 'Permet de modifier les inscriptions', 'enrollments'),
  ('Supprimer des inscriptions', 'enrollments.delete', 'Permet de supprimer des inscriptions', 'enrollments'),
  
  -- Factures et Devis
  ('Voir les factures', 'invoices.view', 'Permet de voir les factures', 'invoices'),
  ('Créer des factures', 'invoices.create', 'Permet de créer de nouvelles factures', 'invoices'),
  ('Modifier les factures', 'invoices.edit', 'Permet de modifier les factures', 'invoices'),
  ('Supprimer les factures', 'invoices.delete', 'Permet de supprimer les factures', 'invoices'),
  ('Voir les devis', 'quotes.view', 'Permet de voir les devis', 'invoices'),
  ('Créer des devis', 'quotes.create', 'Permet de créer de nouveaux devis', 'invoices'),
  ('Modifier les devis', 'quotes.edit', 'Permet de modifier les devis', 'invoices'),
  ('Supprimer les devis', 'quotes.delete', 'Permet de supprimer les devis', 'invoices'),
  
  -- Paiements
  ('Voir les paiements', 'payments.view', 'Permet de voir les paiements', 'payments'),
  ('Créer des paiements', 'payments.create', 'Permet d''enregistrer de nouveaux paiements', 'payments'),
  ('Modifier les paiements', 'payments.edit', 'Permet de modifier les paiements', 'payments'),
  ('Supprimer les paiements', 'payments.delete', 'Permet de supprimer les paiements', 'payments'),
  
  -- Présence
  ('Voir les présences', 'attendance.view', 'Permet de voir les présences', 'attendance'),
  ('Gérer les présences', 'attendance.manage', 'Permet de gérer les présences', 'attendance'),
  
  -- Évaluations
  ('Voir les évaluations', 'evaluations.view', 'Permet de voir les évaluations', 'evaluations'),
  ('Créer des évaluations', 'evaluations.create', 'Permet de créer de nouvelles évaluations', 'evaluations'),
  ('Modifier les évaluations', 'evaluations.edit', 'Permet de modifier les évaluations', 'evaluations'),
  ('Supprimer les évaluations', 'evaluations.delete', 'Permet de supprimer les évaluations', 'evaluations'),
  
  -- Templates de documents
  ('Voir les templates', 'templates.view', 'Permet de voir les templates de documents', 'templates'),
  ('Créer des templates', 'templates.create', 'Permet de créer de nouveaux templates', 'templates'),
  ('Modifier les templates', 'templates.edit', 'Permet de modifier les templates', 'templates'),
  ('Supprimer les templates', 'templates.delete', 'Permet de supprimer les templates', 'templates'),
  ('Générer des documents', 'templates.generate', 'Permet de générer des documents depuis les templates', 'templates'),
  
  -- Paramètres
  ('Voir les paramètres', 'settings.view', 'Permet de voir les paramètres', 'settings'),
  ('Modifier les paramètres', 'settings.edit', 'Permet de modifier les paramètres', 'settings'),
  
  -- Utilisateurs et permissions
  ('Voir les utilisateurs', 'users.view', 'Permet de voir la liste des utilisateurs', 'users'),
  ('Créer des utilisateurs', 'users.create', 'Permet de créer de nouveaux utilisateurs', 'users'),
  ('Modifier les utilisateurs', 'users.edit', 'Permet de modifier les utilisateurs', 'users'),
  ('Supprimer des utilisateurs', 'users.delete', 'Permet de supprimer des utilisateurs', 'users'),
  ('Gérer les permissions', 'users.permissions', 'Permet de gérer les permissions des utilisateurs', 'users'),
  
  -- Rapports
  ('Voir les rapports', 'reports.view', 'Permet de voir les rapports', 'reports'),
  ('Générer des rapports', 'reports.generate', 'Permet de générer des rapports', 'reports')
ON CONFLICT (code) DO NOTHING;

-- Assigner toutes les permissions au rôle super_admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

-- Assigner les permissions au rôle admin (toutes sauf gestion des utilisateurs)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'admin'
  AND p.code NOT IN ('users.delete', 'users.permissions')
ON CONFLICT DO NOTHING;

-- Assigner les permissions au rôle commercial
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'commercial'
  AND p.category IN ('invoices', 'payments', 'students', 'enrollments')
  AND p.code IN (
    'students.view', 'students.create', 'students.edit',
    'enrollments.view', 'enrollments.create', 'enrollments.edit',
    'invoices.view', 'invoices.create', 'invoices.edit',
    'quotes.view', 'quotes.create', 'quotes.edit',
    'payments.view', 'payments.create', 'payments.edit'
  )
ON CONFLICT DO NOTHING;

-- Assigner les permissions au rôle formateur
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'formateur'
  AND p.code IN (
    'sessions.view', 'sessions.create', 'sessions.edit',
    'attendance.view', 'attendance.manage',
    'evaluations.view', 'evaluations.create', 'evaluations.edit',
    'students.view'
  )
ON CONFLICT DO NOTHING;

-- Commentaires
COMMENT ON TABLE public.roles IS 'Rôles disponibles dans le système (admin, commercial, formateur, etc.)';
COMMENT ON TABLE public.permissions IS 'Permissions granulaires disponibles';
COMMENT ON TABLE public.role_permissions IS 'Liaison entre rôles et permissions';
COMMENT ON TABLE public.user_roles IS 'Rôles assignés aux utilisateurs';
COMMENT ON TABLE public.user_permissions IS 'Permissions personnalisées par utilisateur (pour accès simples)';
COMMENT ON TABLE public.teachers IS 'Table spécifique pour les enseignants/formateurs';
COMMENT ON FUNCTION user_has_permission IS 'Vérifie si un utilisateur a une permission spécifique';
COMMENT ON FUNCTION get_user_permissions IS 'Récupère toutes les permissions d''un utilisateur';



-- Table des rôles prédéfinis
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- 'admin', 'commercial', 'formateur', 'user', etc.
  description TEXT,
  is_system BOOLEAN DEFAULT false, -- Rôles système non modifiables
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE, -- NULL pour rôles globaux
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table des permissions disponibles
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE, -- 'students.view', 'students.create', 'invoices.manage', etc.
  description TEXT,
  category TEXT NOT NULL, -- 'students', 'invoices', 'templates', 'settings', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table de liaison entre rôles et permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- Table de liaison entre utilisateurs et rôles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optionnel : expiration du rôle
  UNIQUE(user_id, role_id, organization_id)
);

-- Table de permissions personnalisées par utilisateur (pour accès simples avec cases à cocher)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true, -- true = accordé, false = refusé explicitement
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_id, organization_id)
);

-- Table pour les enseignants/formateurs (relation spéciale)
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_number TEXT, -- Numéro d'employé
  hire_date DATE,
  specialization TEXT, -- Spécialité du formateur
  bio TEXT, -- Biographie
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_roles_organization_id ON public.roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON public.roles(code);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON public.permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON public.permissions(category);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id ON public.user_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON public.user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_organization_id ON public.user_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON public.teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_organization_id ON public.teachers(organization_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_roles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_teachers_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_roles_timestamp ON public.roles;
CREATE TRIGGER update_roles_timestamp
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION update_roles_timestamp();

DROP TRIGGER IF EXISTS update_teachers_timestamp ON public.teachers;
CREATE TRIGGER update_teachers_timestamp
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW
  EXECUTE FUNCTION update_teachers_timestamp();

-- Fonction pour vérifier si un utilisateur a une permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_code TEXT,
  p_organization_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_permission_id UUID;
BEGIN
  -- Récupérer l'ID de la permission
  SELECT id INTO v_permission_id
  FROM public.permissions
  WHERE code = p_permission_code;

  IF v_permission_id IS NULL THEN
    RETURN false;
  END IF;

  -- Vérifier les permissions personnalisées (priorité la plus haute)
  SELECT granted INTO v_has_permission
  FROM public.user_permissions
  WHERE user_id = p_user_id
    AND permission_id = v_permission_id
    AND organization_id = p_organization_id
  LIMIT 1;

  -- Si une permission personnalisée existe, l'utiliser
  IF v_has_permission IS NOT NULL THEN
    RETURN v_has_permission;
  END IF;

  -- Vérifier les permissions via les rôles
  SELECT EXISTS(
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    WHERE ur.user_id = p_user_id
      AND ur.organization_id = p_organization_id
      AND rp.permission_id = v_permission_id
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, false);
END;
$$;

-- Fonction pour obtenir toutes les permissions d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_permissions(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS TABLE (
  permission_code TEXT,
  permission_name TEXT,
  category TEXT,
  source TEXT -- 'role' ou 'custom'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Permissions via rôles
  SELECT DISTINCT
    p.code,
    p.name,
    p.category,
    'role'::TEXT as source
  FROM public.user_roles ur
  JOIN public.role_permissions rp ON ur.role_id = rp.role_id
  JOIN public.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
    AND ur.organization_id = p_organization_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  
  UNION
  
  -- Permissions personnalisées (accordées)
  SELECT
    p.code,
    p.name,
    p.category,
    'custom'::TEXT as source
  FROM public.user_permissions up
  JOIN public.permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id
    AND up.organization_id = p_organization_id
    AND up.granted = true;
END;
$$;

-- RLS Policies
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Policies pour roles
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.roles;
CREATE POLICY "Users can view roles in their organization"
  ON public.roles FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    OR organization_id IS NULL -- Rôles globaux
  );

DROP POLICY IF EXISTS "Admins can manage roles in their organization" ON public.roles;
CREATE POLICY "Admins can manage roles in their organization"
  ON public.roles FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Policies pour permissions (lecture seule pour tous)
DROP POLICY IF EXISTS "Users can view permissions" ON public.permissions;
CREATE POLICY "Users can view permissions"
  ON public.permissions FOR SELECT
  USING (true);

-- Policies pour role_permissions
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage role permissions"
  ON public.role_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.roles r
      WHERE r.id = role_permissions.role_id
        AND r.organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
        AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
    )
  );

-- Policies pour user_roles
DROP POLICY IF EXISTS "Users can view user roles in their organization" ON public.user_roles;
CREATE POLICY "Users can view user roles in their organization"
  ON public.user_roles FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
  ON public.user_roles FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Policies pour user_permissions
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
CREATE POLICY "Users can view their own permissions"
  ON public.user_permissions FOR SELECT
  USING (
    user_id = auth.uid()
    OR organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage user permissions" ON public.user_permissions;
CREATE POLICY "Admins can manage user permissions"
  ON public.user_permissions FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Policies pour teachers
DROP POLICY IF EXISTS "Users can view teachers in their organization" ON public.teachers;
CREATE POLICY "Users can view teachers in their organization"
  ON public.teachers FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage teachers" ON public.teachers;
CREATE POLICY "Admins can manage teachers"
  ON public.teachers FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  )
  WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
  );

-- Insérer les rôles système par défaut
INSERT INTO public.roles (name, code, description, is_system) VALUES
  ('Super Administrateur', 'super_admin', 'Accès complet à toutes les fonctionnalités', true),
  ('Administrateur', 'admin', 'Gestion complète de l''organisation', true),
  ('Commercial', 'commercial', 'Gestion des aspects commerciaux (devis, factures, paiements)', true),
  ('Formateur', 'formateur', 'Accès formateur pour gérer les cours et sessions', true),
  ('Utilisateur', 'user', 'Accès de base avec permissions personnalisées', true)
ON CONFLICT (code) DO NOTHING;

-- Insérer les permissions par défaut (catégories principales)
INSERT INTO public.permissions (name, code, description, category) VALUES
  -- Étudiants
  ('Voir les étudiants', 'students.view', 'Permet de voir la liste des étudiants', 'students'),
  ('Créer des étudiants', 'students.create', 'Permet de créer de nouveaux étudiants', 'students'),
  ('Modifier les étudiants', 'students.edit', 'Permet de modifier les informations des étudiants', 'students'),
  ('Supprimer des étudiants', 'students.delete', 'Permet de supprimer des étudiants', 'students'),
  
  -- Formations
  ('Voir les formations', 'formations.view', 'Permet de voir la liste des formations', 'formations'),
  ('Créer des formations', 'formations.create', 'Permet de créer de nouvelles formations', 'formations'),
  ('Modifier les formations', 'formations.edit', 'Permet de modifier les formations', 'formations'),
  ('Supprimer des formations', 'formations.delete', 'Permet de supprimer des formations', 'formations'),
  
  -- Sessions
  ('Voir les sessions', 'sessions.view', 'Permet de voir la liste des sessions', 'sessions'),
  ('Créer des sessions', 'sessions.create', 'Permet de créer de nouvelles sessions', 'sessions'),
  ('Modifier les sessions', 'sessions.edit', 'Permet de modifier les sessions', 'sessions'),
  ('Supprimer des sessions', 'sessions.delete', 'Permet de supprimer des sessions', 'sessions'),
  
  -- Inscriptions
  ('Voir les inscriptions', 'enrollments.view', 'Permet de voir les inscriptions', 'enrollments'),
  ('Créer des inscriptions', 'enrollments.create', 'Permet de créer de nouvelles inscriptions', 'enrollments'),
  ('Modifier les inscriptions', 'enrollments.edit', 'Permet de modifier les inscriptions', 'enrollments'),
  ('Supprimer des inscriptions', 'enrollments.delete', 'Permet de supprimer des inscriptions', 'enrollments'),
  
  -- Factures et Devis
  ('Voir les factures', 'invoices.view', 'Permet de voir les factures', 'invoices'),
  ('Créer des factures', 'invoices.create', 'Permet de créer de nouvelles factures', 'invoices'),
  ('Modifier les factures', 'invoices.edit', 'Permet de modifier les factures', 'invoices'),
  ('Supprimer les factures', 'invoices.delete', 'Permet de supprimer les factures', 'invoices'),
  ('Voir les devis', 'quotes.view', 'Permet de voir les devis', 'invoices'),
  ('Créer des devis', 'quotes.create', 'Permet de créer de nouveaux devis', 'invoices'),
  ('Modifier les devis', 'quotes.edit', 'Permet de modifier les devis', 'invoices'),
  ('Supprimer les devis', 'quotes.delete', 'Permet de supprimer les devis', 'invoices'),
  
  -- Paiements
  ('Voir les paiements', 'payments.view', 'Permet de voir les paiements', 'payments'),
  ('Créer des paiements', 'payments.create', 'Permet d''enregistrer de nouveaux paiements', 'payments'),
  ('Modifier les paiements', 'payments.edit', 'Permet de modifier les paiements', 'payments'),
  ('Supprimer les paiements', 'payments.delete', 'Permet de supprimer les paiements', 'payments'),
  
  -- Présence
  ('Voir les présences', 'attendance.view', 'Permet de voir les présences', 'attendance'),
  ('Gérer les présences', 'attendance.manage', 'Permet de gérer les présences', 'attendance'),
  
  -- Évaluations
  ('Voir les évaluations', 'evaluations.view', 'Permet de voir les évaluations', 'evaluations'),
  ('Créer des évaluations', 'evaluations.create', 'Permet de créer de nouvelles évaluations', 'evaluations'),
  ('Modifier les évaluations', 'evaluations.edit', 'Permet de modifier les évaluations', 'evaluations'),
  ('Supprimer les évaluations', 'evaluations.delete', 'Permet de supprimer les évaluations', 'evaluations'),
  
  -- Templates de documents
  ('Voir les templates', 'templates.view', 'Permet de voir les templates de documents', 'templates'),
  ('Créer des templates', 'templates.create', 'Permet de créer de nouveaux templates', 'templates'),
  ('Modifier les templates', 'templates.edit', 'Permet de modifier les templates', 'templates'),
  ('Supprimer les templates', 'templates.delete', 'Permet de supprimer les templates', 'templates'),
  ('Générer des documents', 'templates.generate', 'Permet de générer des documents depuis les templates', 'templates'),
  
  -- Paramètres
  ('Voir les paramètres', 'settings.view', 'Permet de voir les paramètres', 'settings'),
  ('Modifier les paramètres', 'settings.edit', 'Permet de modifier les paramètres', 'settings'),
  
  -- Utilisateurs et permissions
  ('Voir les utilisateurs', 'users.view', 'Permet de voir la liste des utilisateurs', 'users'),
  ('Créer des utilisateurs', 'users.create', 'Permet de créer de nouveaux utilisateurs', 'users'),
  ('Modifier les utilisateurs', 'users.edit', 'Permet de modifier les utilisateurs', 'users'),
  ('Supprimer des utilisateurs', 'users.delete', 'Permet de supprimer des utilisateurs', 'users'),
  ('Gérer les permissions', 'users.permissions', 'Permet de gérer les permissions des utilisateurs', 'users'),
  
  -- Rapports
  ('Voir les rapports', 'reports.view', 'Permet de voir les rapports', 'reports'),
  ('Générer des rapports', 'reports.generate', 'Permet de générer des rapports', 'reports')
ON CONFLICT (code) DO NOTHING;

-- Assigner toutes les permissions au rôle super_admin
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

-- Assigner les permissions au rôle admin (toutes sauf gestion des utilisateurs)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'admin'
  AND p.code NOT IN ('users.delete', 'users.permissions')
ON CONFLICT DO NOTHING;

-- Assigner les permissions au rôle commercial
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'commercial'
  AND p.category IN ('invoices', 'payments', 'students', 'enrollments')
  AND p.code IN (
    'students.view', 'students.create', 'students.edit',
    'enrollments.view', 'enrollments.create', 'enrollments.edit',
    'invoices.view', 'invoices.create', 'invoices.edit',
    'quotes.view', 'quotes.create', 'quotes.edit',
    'payments.view', 'payments.create', 'payments.edit'
  )
ON CONFLICT DO NOTHING;

-- Assigner les permissions au rôle formateur
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'formateur'
  AND p.code IN (
    'sessions.view', 'sessions.create', 'sessions.edit',
    'attendance.view', 'attendance.manage',
    'evaluations.view', 'evaluations.create', 'evaluations.edit',
    'students.view'
  )
ON CONFLICT DO NOTHING;

-- Commentaires
COMMENT ON TABLE public.roles IS 'Rôles disponibles dans le système (admin, commercial, formateur, etc.)';
COMMENT ON TABLE public.permissions IS 'Permissions granulaires disponibles';
COMMENT ON TABLE public.role_permissions IS 'Liaison entre rôles et permissions';
COMMENT ON TABLE public.user_roles IS 'Rôles assignés aux utilisateurs';
COMMENT ON TABLE public.user_permissions IS 'Permissions personnalisées par utilisateur (pour accès simples)';
COMMENT ON TABLE public.teachers IS 'Table spécifique pour les enseignants/formateurs';
COMMENT ON FUNCTION user_has_permission IS 'Vérifie si un utilisateur a une permission spécifique';
COMMENT ON FUNCTION get_user_permissions IS 'Récupère toutes les permissions d''un utilisateur';





