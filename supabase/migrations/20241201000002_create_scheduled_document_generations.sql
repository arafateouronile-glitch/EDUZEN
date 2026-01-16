-- Migration pour créer la table des générations programmées de documents

CREATE TABLE IF NOT EXISTS scheduled_document_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Configuration de la planification
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom')),
  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Exemples de schedule_config:
  -- daily: {"time": "09:00"}
  -- weekly: {"dayOfWeek": 1, "time": "09:00"} (1 = lundi)
  -- monthly: {"dayOfMonth": 1, "time": "09:00"}
  -- custom: {"cron": "0 9 * * 1"} (cron expression)
  
  -- Filtres pour la génération
  filter_config JSONB DEFAULT '{}'::jsonb,
  -- Exemples de filter_config:
  -- {"studentIds": ["uuid1", "uuid2"]}
  -- {"sessionId": "uuid"}
  -- {"status": "active"}
  
  -- Options de génération
  format TEXT NOT NULL DEFAULT 'PDF' CHECK (format IN ('PDF', 'DOCX', 'HTML')),
  send_email BOOLEAN DEFAULT false,
  email_recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Statut
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  
  -- Métadonnées
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_scheduled_generations_org ON scheduled_document_generations(organization_id);
CREATE INDEX idx_scheduled_generations_template ON scheduled_document_generations(template_id);
CREATE INDEX idx_scheduled_generations_next_run ON scheduled_document_generations(next_run_at) WHERE is_active = true;
CREATE INDEX idx_scheduled_generations_active ON scheduled_document_generations(is_active, next_run_at);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_scheduled_generation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_scheduled_generation_updated_at
  BEFORE UPDATE ON scheduled_document_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_generation_updated_at();

-- Fonction pour calculer next_run_at
CREATE OR REPLACE FUNCTION calculate_next_run_at(
  schedule_type TEXT,
  schedule_config JSONB,
  current_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_run TIMESTAMPTZ;
  schedule_time TIME;
  day_of_week INTEGER;
  day_of_month INTEGER;
BEGIN
  CASE schedule_type
    WHEN 'daily' THEN
      schedule_time := (schedule_config->>'time')::TIME;
      next_run := (current_time::DATE + schedule_time)::TIMESTAMPTZ;
      IF next_run <= current_time THEN
        next_run := next_run + INTERVAL '1 day';
      END IF;
      
    WHEN 'weekly' THEN
      day_of_week := (schedule_config->>'dayOfWeek')::INTEGER;
      schedule_time := (schedule_config->>'time')::TIME;
      next_run := (current_time::DATE + schedule_time)::TIMESTAMPTZ;
      -- Ajuster au bon jour de la semaine (0 = dimanche, 1 = lundi, etc.)
      WHILE EXTRACT(DOW FROM next_run)::INTEGER != day_of_week LOOP
        next_run := next_run + INTERVAL '1 day';
      END LOOP;
      IF next_run <= current_time THEN
        next_run := next_run + INTERVAL '7 days';
      END IF;
      
    WHEN 'monthly' THEN
      day_of_month := (schedule_config->>'dayOfMonth')::INTEGER;
      schedule_time := (schedule_config->>'time')::TIME;
      next_run := DATE_TRUNC('month', current_time) + (day_of_month - 1) * INTERVAL '1 day' + schedule_time;
      IF next_run <= current_time THEN
        next_run := DATE_TRUNC('month', current_time) + INTERVAL '1 month' + (day_of_month - 1) * INTERVAL '1 day' + schedule_time;
      END IF;
      
    ELSE
      -- Pour 'custom', on suppose que c'est géré côté application
      next_run := current_time + INTERVAL '1 day';
  END CASE;
  
  RETURN next_run;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE scheduled_document_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view scheduled generations for their organization"
  ON scheduled_document_generations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create scheduled generations for their organization"
  ON scheduled_document_generations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update scheduled generations for their organization"
  ON scheduled_document_generations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete scheduled generations for their organization"
  ON scheduled_document_generations
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

