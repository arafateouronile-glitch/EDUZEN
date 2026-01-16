-- Migration pour le système de workflow de validation multi-niveaux
-- Crée les tables nécessaires pour gérer les workflows d'approbation configurables

-- Table des workflows de validation
CREATE TABLE IF NOT EXISTS template_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des étapes de workflow
CREATE TABLE IF NOT EXISTS template_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES template_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  approver_role VARCHAR(100), -- Ex: 'admin', 'manager', 'director'
  approver_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Approbateur spécifique
  is_required BOOLEAN DEFAULT true,
  can_reject BOOLEAN DEFAULT true,
  can_comment BOOLEAN DEFAULT true,
  timeout_days INTEGER, -- Nombre de jours avant expiration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, step_order)
);

-- Table des instances de workflow (une par template en cours de validation)
CREATE TABLE IF NOT EXISTS template_workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES template_workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, approved, rejected, cancelled
  started_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_step_id UUID REFERENCES template_workflow_steps(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des approbations individuelles (une par étape)
CREATE TABLE IF NOT EXISTS template_workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES template_workflow_instances(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES template_workflow_steps(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, skipped
  comment TEXT,
  approved_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, step_id, approver_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_template_workflows_org ON template_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_workflows_active ON template_workflows(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_template_workflow_steps_workflow ON template_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_template_workflow_steps_order ON template_workflow_steps(workflow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_template_workflow_instances_template ON template_workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_template_workflow_instances_status ON template_workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_template_workflow_approvals_instance ON template_workflow_approvals(instance_id);
CREATE INDEX IF NOT EXISTS idx_template_workflow_approvals_approver ON template_workflow_approvals(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_template_workflow_approvals_step ON template_workflow_approvals(step_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_template_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_workflows_timestamp
  BEFORE UPDATE ON template_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

CREATE TRIGGER update_template_workflow_steps_timestamp
  BEFORE UPDATE ON template_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

CREATE TRIGGER update_template_workflow_instances_timestamp
  BEFORE UPDATE ON template_workflow_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

CREATE TRIGGER update_template_workflow_approvals_timestamp
  BEFORE UPDATE ON template_workflow_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

-- RLS Policies
ALTER TABLE template_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_workflow_approvals ENABLE ROW LEVEL SECURITY;

-- Policies pour template_workflows
DROP POLICY IF EXISTS template_workflows_select ON template_workflows;
CREATE POLICY template_workflows_select ON template_workflows
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS template_workflows_insert ON template_workflows;
CREATE POLICY template_workflows_insert ON template_workflows
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS template_workflows_update ON template_workflows;
CREATE POLICY template_workflows_update ON template_workflows
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS template_workflows_delete ON template_workflows;
CREATE POLICY template_workflows_delete ON template_workflows
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policies pour template_workflow_steps
DROP POLICY IF EXISTS template_workflow_steps_select ON template_workflow_steps;
CREATE POLICY template_workflow_steps_select ON template_workflow_steps
  FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_steps_insert ON template_workflow_steps;
CREATE POLICY template_workflow_steps_insert ON template_workflow_steps
  FOR INSERT
  WITH CHECK (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_steps_update ON template_workflow_steps;
CREATE POLICY template_workflow_steps_update ON template_workflow_steps
  FOR UPDATE
  USING (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_steps_delete ON template_workflow_steps;
CREATE POLICY template_workflow_steps_delete ON template_workflow_steps
  FOR DELETE
  USING (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policies pour template_workflow_instances
DROP POLICY IF EXISTS template_workflow_instances_select ON template_workflow_instances;
CREATE POLICY template_workflow_instances_select ON template_workflow_instances
  FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM document_templates
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_instances_insert ON template_workflow_instances;
CREATE POLICY template_workflow_instances_insert ON template_workflow_instances
  FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM document_templates
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
    AND started_by = auth.uid()
  );

DROP POLICY IF EXISTS template_workflow_instances_update ON template_workflow_instances;
CREATE POLICY template_workflow_instances_update ON template_workflow_instances
  FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM document_templates
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policies pour template_workflow_approvals
DROP POLICY IF EXISTS template_workflow_approvals_select ON template_workflow_approvals;
CREATE POLICY template_workflow_approvals_select ON template_workflow_approvals
  FOR SELECT
  USING (
    instance_id IN (
      SELECT id FROM template_workflow_instances
      WHERE template_id IN (
        SELECT id FROM document_templates
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_approvals_insert ON template_workflow_approvals;
CREATE POLICY template_workflow_approvals_insert ON template_workflow_approvals
  FOR INSERT
  WITH CHECK (
    instance_id IN (
      SELECT id FROM template_workflow_instances
      WHERE template_id IN (
        SELECT id FROM document_templates
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_approvals_update ON template_workflow_approvals;
CREATE POLICY template_workflow_approvals_update ON template_workflow_approvals
  FOR UPDATE
  USING (
    instance_id IN (
      SELECT id FROM template_workflow_instances
      WHERE template_id IN (
        SELECT id FROM document_templates
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    )
    AND (
      approver_id = auth.uid() -- L'approbateur peut mettre à jour sa propre approbation
      OR instance_id IN (
        SELECT id FROM template_workflow_instances
        WHERE started_by = auth.uid() -- Le créateur peut voir les mises à jour
      )
    )
  );

-- Fonction pour passer à l'étape suivante
CREATE OR REPLACE FUNCTION move_to_next_workflow_step(instance_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_step_id UUID;
  current_step_order INTEGER;
  next_step_id UUID;
  workflow_id UUID;
BEGIN
  -- Récupérer l'étape actuelle et le workflow
  SELECT twi.current_step_id, twi.workflow_id INTO current_step_id, workflow_id
  FROM template_workflow_instances twi
  WHERE twi.id = instance_id;

  IF current_step_id IS NULL THEN
    -- Première étape
    SELECT id INTO next_step_id
    FROM template_workflow_steps
    WHERE workflow_id = workflow_id
    ORDER BY step_order ASC
    LIMIT 1;
  ELSE
    -- Récupérer l'ordre de l'étape actuelle
    SELECT step_order INTO current_step_order
    FROM template_workflow_steps
    WHERE id = current_step_id;

    -- Étape suivante
    SELECT tws.id INTO next_step_id
    FROM template_workflow_steps tws
    WHERE tws.workflow_id = workflow_id
      AND tws.step_order > current_step_order
    ORDER BY tws.step_order ASC
    LIMIT 1;
  END IF;

  IF next_step_id IS NULL THEN
    -- Dernière étape terminée, approuver le workflow
    UPDATE template_workflow_instances
    SET status = 'approved',
        completed_at = NOW(),
        current_step_id = NULL
    WHERE id = instance_id;
    RETURN true;
  ELSE
    -- Passer à l'étape suivante
    UPDATE template_workflow_instances
    SET current_step_id = next_step_id,
        status = 'in_progress'
    WHERE id = instance_id;
    
    -- Créer les approbations pour la nouvelle étape
    -- Note: Cette partie devrait être gérée par le service TypeScript
    -- car elle nécessite de créer des approbations pour les utilisateurs
    
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Table des workflows de validation
CREATE TABLE IF NOT EXISTS template_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des étapes de workflow
CREATE TABLE IF NOT EXISTS template_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES template_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  approver_role VARCHAR(100), -- Ex: 'admin', 'manager', 'director'
  approver_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Approbateur spécifique
  is_required BOOLEAN DEFAULT true,
  can_reject BOOLEAN DEFAULT true,
  can_comment BOOLEAN DEFAULT true,
  timeout_days INTEGER, -- Nombre de jours avant expiration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, step_order)
);

-- Table des instances de workflow (une par template en cours de validation)
CREATE TABLE IF NOT EXISTS template_workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES template_workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, approved, rejected, cancelled
  started_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_step_id UUID REFERENCES template_workflow_steps(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des approbations individuelles (une par étape)
CREATE TABLE IF NOT EXISTS template_workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES template_workflow_instances(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES template_workflow_steps(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, skipped
  comment TEXT,
  approved_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, step_id, approver_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_template_workflows_org ON template_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_workflows_active ON template_workflows(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_template_workflow_steps_workflow ON template_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_template_workflow_steps_order ON template_workflow_steps(workflow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_template_workflow_instances_template ON template_workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_template_workflow_instances_status ON template_workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_template_workflow_approvals_instance ON template_workflow_approvals(instance_id);
CREATE INDEX IF NOT EXISTS idx_template_workflow_approvals_approver ON template_workflow_approvals(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_template_workflow_approvals_step ON template_workflow_approvals(step_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_template_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_workflows_timestamp
  BEFORE UPDATE ON template_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

CREATE TRIGGER update_template_workflow_steps_timestamp
  BEFORE UPDATE ON template_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

CREATE TRIGGER update_template_workflow_instances_timestamp
  BEFORE UPDATE ON template_workflow_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

CREATE TRIGGER update_template_workflow_approvals_timestamp
  BEFORE UPDATE ON template_workflow_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

-- RLS Policies
ALTER TABLE template_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_workflow_approvals ENABLE ROW LEVEL SECURITY;

-- Policies pour template_workflows
DROP POLICY IF EXISTS template_workflows_select ON template_workflows;
CREATE POLICY template_workflows_select ON template_workflows
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS template_workflows_insert ON template_workflows;
CREATE POLICY template_workflows_insert ON template_workflows
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS template_workflows_update ON template_workflows;
CREATE POLICY template_workflows_update ON template_workflows
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS template_workflows_delete ON template_workflows;
CREATE POLICY template_workflows_delete ON template_workflows
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policies pour template_workflow_steps
DROP POLICY IF EXISTS template_workflow_steps_select ON template_workflow_steps;
CREATE POLICY template_workflow_steps_select ON template_workflow_steps
  FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_steps_insert ON template_workflow_steps;
CREATE POLICY template_workflow_steps_insert ON template_workflow_steps
  FOR INSERT
  WITH CHECK (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_steps_update ON template_workflow_steps;
CREATE POLICY template_workflow_steps_update ON template_workflow_steps
  FOR UPDATE
  USING (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_steps_delete ON template_workflow_steps;
CREATE POLICY template_workflow_steps_delete ON template_workflow_steps
  FOR DELETE
  USING (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policies pour template_workflow_instances
DROP POLICY IF EXISTS template_workflow_instances_select ON template_workflow_instances;
CREATE POLICY template_workflow_instances_select ON template_workflow_instances
  FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM document_templates
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_instances_insert ON template_workflow_instances;
CREATE POLICY template_workflow_instances_insert ON template_workflow_instances
  FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM document_templates
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
    AND started_by = auth.uid()
  );

DROP POLICY IF EXISTS template_workflow_instances_update ON template_workflow_instances;
CREATE POLICY template_workflow_instances_update ON template_workflow_instances
  FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM document_templates
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policies pour template_workflow_approvals
DROP POLICY IF EXISTS template_workflow_approvals_select ON template_workflow_approvals;
CREATE POLICY template_workflow_approvals_select ON template_workflow_approvals
  FOR SELECT
  USING (
    instance_id IN (
      SELECT id FROM template_workflow_instances
      WHERE template_id IN (
        SELECT id FROM document_templates
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_approvals_insert ON template_workflow_approvals;
CREATE POLICY template_workflow_approvals_insert ON template_workflow_approvals
  FOR INSERT
  WITH CHECK (
    instance_id IN (
      SELECT id FROM template_workflow_instances
      WHERE template_id IN (
        SELECT id FROM document_templates
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_approvals_update ON template_workflow_approvals;
CREATE POLICY template_workflow_approvals_update ON template_workflow_approvals
  FOR UPDATE
  USING (
    instance_id IN (
      SELECT id FROM template_workflow_instances
      WHERE template_id IN (
        SELECT id FROM document_templates
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    )
    AND (
      approver_id = auth.uid() -- L'approbateur peut mettre à jour sa propre approbation
      OR instance_id IN (
        SELECT id FROM template_workflow_instances
        WHERE started_by = auth.uid() -- Le créateur peut voir les mises à jour
      )
    )
  );

-- Fonction pour passer à l'étape suivante
CREATE OR REPLACE FUNCTION move_to_next_workflow_step(instance_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_step_id UUID;
  current_step_order INTEGER;
  next_step_id UUID;
  workflow_id UUID;
BEGIN
  -- Récupérer l'étape actuelle et le workflow
  SELECT twi.current_step_id, twi.workflow_id INTO current_step_id, workflow_id
  FROM template_workflow_instances twi
  WHERE twi.id = instance_id;

  IF current_step_id IS NULL THEN
    -- Première étape
    SELECT id INTO next_step_id
    FROM template_workflow_steps
    WHERE workflow_id = workflow_id
    ORDER BY step_order ASC
    LIMIT 1;
  ELSE
    -- Récupérer l'ordre de l'étape actuelle
    SELECT step_order INTO current_step_order
    FROM template_workflow_steps
    WHERE id = current_step_id;

    -- Étape suivante
    SELECT tws.id INTO next_step_id
    FROM template_workflow_steps tws
    WHERE tws.workflow_id = workflow_id
      AND tws.step_order > current_step_order
    ORDER BY tws.step_order ASC
    LIMIT 1;
  END IF;

  IF next_step_id IS NULL THEN
    -- Dernière étape terminée, approuver le workflow
    UPDATE template_workflow_instances
    SET status = 'approved',
        completed_at = NOW(),
        current_step_id = NULL
    WHERE id = instance_id;
    RETURN true;
  ELSE
    -- Passer à l'étape suivante
    UPDATE template_workflow_instances
    SET current_step_id = next_step_id,
        status = 'in_progress'
    WHERE id = instance_id;
    
    -- Créer les approbations pour la nouvelle étape
    -- Note: Cette partie devrait être gérée par le service TypeScript
    -- car elle nécessite de créer des approbations pour les utilisateurs
    
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Table des workflows de validation
CREATE TABLE IF NOT EXISTS template_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des étapes de workflow
CREATE TABLE IF NOT EXISTS template_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES template_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  approver_role VARCHAR(100), -- Ex: 'admin', 'manager', 'director'
  approver_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Approbateur spécifique
  is_required BOOLEAN DEFAULT true,
  can_reject BOOLEAN DEFAULT true,
  can_comment BOOLEAN DEFAULT true,
  timeout_days INTEGER, -- Nombre de jours avant expiration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, step_order)
);

-- Table des instances de workflow (une par template en cours de validation)
CREATE TABLE IF NOT EXISTS template_workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES template_workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, approved, rejected, cancelled
  started_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  current_step_id UUID REFERENCES template_workflow_steps(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des approbations individuelles (une par étape)
CREATE TABLE IF NOT EXISTS template_workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES template_workflow_instances(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES template_workflow_steps(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, skipped
  comment TEXT,
  approved_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, step_id, approver_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_template_workflows_org ON template_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_workflows_active ON template_workflows(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_template_workflow_steps_workflow ON template_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_template_workflow_steps_order ON template_workflow_steps(workflow_id, step_order);
CREATE INDEX IF NOT EXISTS idx_template_workflow_instances_template ON template_workflow_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_template_workflow_instances_status ON template_workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_template_workflow_approvals_instance ON template_workflow_approvals(instance_id);
CREATE INDEX IF NOT EXISTS idx_template_workflow_approvals_approver ON template_workflow_approvals(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_template_workflow_approvals_step ON template_workflow_approvals(step_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_template_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_workflows_timestamp
  BEFORE UPDATE ON template_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

CREATE TRIGGER update_template_workflow_steps_timestamp
  BEFORE UPDATE ON template_workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

CREATE TRIGGER update_template_workflow_instances_timestamp
  BEFORE UPDATE ON template_workflow_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

CREATE TRIGGER update_template_workflow_approvals_timestamp
  BEFORE UPDATE ON template_workflow_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_template_workflows_updated_at();

-- RLS Policies
ALTER TABLE template_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_workflow_approvals ENABLE ROW LEVEL SECURITY;

-- Policies pour template_workflows
DROP POLICY IF EXISTS template_workflows_select ON template_workflows;
CREATE POLICY template_workflows_select ON template_workflows
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS template_workflows_insert ON template_workflows;
CREATE POLICY template_workflows_insert ON template_workflows
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

DROP POLICY IF EXISTS template_workflows_update ON template_workflows;
CREATE POLICY template_workflows_update ON template_workflows
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS template_workflows_delete ON template_workflows;
CREATE POLICY template_workflows_delete ON template_workflows
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Policies pour template_workflow_steps
DROP POLICY IF EXISTS template_workflow_steps_select ON template_workflow_steps;
CREATE POLICY template_workflow_steps_select ON template_workflow_steps
  FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_steps_insert ON template_workflow_steps;
CREATE POLICY template_workflow_steps_insert ON template_workflow_steps
  FOR INSERT
  WITH CHECK (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_steps_update ON template_workflow_steps;
CREATE POLICY template_workflow_steps_update ON template_workflow_steps
  FOR UPDATE
  USING (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_steps_delete ON template_workflow_steps;
CREATE POLICY template_workflow_steps_delete ON template_workflow_steps
  FOR DELETE
  USING (
    workflow_id IN (
      SELECT id FROM template_workflows
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policies pour template_workflow_instances
DROP POLICY IF EXISTS template_workflow_instances_select ON template_workflow_instances;
CREATE POLICY template_workflow_instances_select ON template_workflow_instances
  FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM document_templates
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_instances_insert ON template_workflow_instances;
CREATE POLICY template_workflow_instances_insert ON template_workflow_instances
  FOR INSERT
  WITH CHECK (
    template_id IN (
      SELECT id FROM document_templates
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
    AND started_by = auth.uid()
  );

DROP POLICY IF EXISTS template_workflow_instances_update ON template_workflow_instances;
CREATE POLICY template_workflow_instances_update ON template_workflow_instances
  FOR UPDATE
  USING (
    template_id IN (
      SELECT id FROM document_templates
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Policies pour template_workflow_approvals
DROP POLICY IF EXISTS template_workflow_approvals_select ON template_workflow_approvals;
CREATE POLICY template_workflow_approvals_select ON template_workflow_approvals
  FOR SELECT
  USING (
    instance_id IN (
      SELECT id FROM template_workflow_instances
      WHERE template_id IN (
        SELECT id FROM document_templates
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_approvals_insert ON template_workflow_approvals;
CREATE POLICY template_workflow_approvals_insert ON template_workflow_approvals
  FOR INSERT
  WITH CHECK (
    instance_id IN (
      SELECT id FROM template_workflow_instances
      WHERE template_id IN (
        SELECT id FROM document_templates
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS template_workflow_approvals_update ON template_workflow_approvals;
CREATE POLICY template_workflow_approvals_update ON template_workflow_approvals
  FOR UPDATE
  USING (
    instance_id IN (
      SELECT id FROM template_workflow_instances
      WHERE template_id IN (
        SELECT id FROM document_templates
        WHERE organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      )
    )
    AND (
      approver_id = auth.uid() -- L'approbateur peut mettre à jour sa propre approbation
      OR instance_id IN (
        SELECT id FROM template_workflow_instances
        WHERE started_by = auth.uid() -- Le créateur peut voir les mises à jour
      )
    )
  );

-- Fonction pour passer à l'étape suivante
CREATE OR REPLACE FUNCTION move_to_next_workflow_step(instance_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_step_id UUID;
  current_step_order INTEGER;
  next_step_id UUID;
  workflow_id UUID;
BEGIN
  -- Récupérer l'étape actuelle et le workflow
  SELECT twi.current_step_id, twi.workflow_id INTO current_step_id, workflow_id
  FROM template_workflow_instances twi
  WHERE twi.id = instance_id;

  IF current_step_id IS NULL THEN
    -- Première étape
    SELECT id INTO next_step_id
    FROM template_workflow_steps
    WHERE workflow_id = workflow_id
    ORDER BY step_order ASC
    LIMIT 1;
  ELSE
    -- Récupérer l'ordre de l'étape actuelle
    SELECT step_order INTO current_step_order
    FROM template_workflow_steps
    WHERE id = current_step_id;

    -- Étape suivante
    SELECT tws.id INTO next_step_id
    FROM template_workflow_steps tws
    WHERE tws.workflow_id = workflow_id
      AND tws.step_order > current_step_order
    ORDER BY tws.step_order ASC
    LIMIT 1;
  END IF;

  IF next_step_id IS NULL THEN
    -- Dernière étape terminée, approuver le workflow
    UPDATE template_workflow_instances
    SET status = 'approved',
        completed_at = NOW(),
        current_step_id = NULL
    WHERE id = instance_id;
    RETURN true;
  ELSE
    -- Passer à l'étape suivante
    UPDATE template_workflow_instances
    SET current_step_id = next_step_id,
        status = 'in_progress'
    WHERE id = instance_id;
    
    -- Créer les approbations pour la nouvelle étape
    -- Note: Cette partie devrait être gérée par le service TypeScript
    -- car elle nécessite de créer des approbations pour les utilisateurs
    
    RETURN true;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;





