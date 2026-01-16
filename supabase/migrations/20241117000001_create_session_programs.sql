-- Création de la table de liaison many-to-many entre sessions et programmes
-- Cela permet à une session d'être associée à plusieurs programmes

CREATE TABLE IF NOT EXISTS session_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, program_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_session_programs_session_id ON session_programs(session_id);
CREATE INDEX IF NOT EXISTS idx_session_programs_program_id ON session_programs(program_id);
CREATE INDEX IF NOT EXISTS idx_session_programs_organization_id ON session_programs(organization_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_session_programs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_programs_updated_at
  BEFORE UPDATE ON session_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_session_programs_updated_at();

-- RLS (Row Level Security)
ALTER TABLE session_programs ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Les utilisateurs peuvent voir les associations session-programme de leur organisation
CREATE POLICY "Users can view session_programs of their organization"
  ON session_programs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Politique RLS : Les utilisateurs peuvent créer des associations session-programme pour leur organisation
CREATE POLICY "Users can create session_programs for their organization"
  ON session_programs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND session_id IN (
      SELECT s.id FROM sessions s
      INNER JOIN formations f ON s.formation_id = f.id
      WHERE f.organization_id = organization_id
    )
    AND program_id IN (
      SELECT id FROM programs WHERE organization_id = session_programs.organization_id
    )
  );

-- Politique RLS : Les utilisateurs peuvent mettre à jour les associations session-programme de leur organisation
CREATE POLICY "Users can update session_programs of their organization"
  ON session_programs
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Politique RLS : Les utilisateurs peuvent supprimer les associations session-programme de leur organisation
CREATE POLICY "Users can delete session_programs of their organization"
  ON session_programs
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Migration des données existantes : créer des associations basées sur la relation session -> formation -> program
-- Note: Cette migration est idempotente et peut être exécutée plusieurs fois sans problème
INSERT INTO session_programs (session_id, program_id, organization_id)
SELECT DISTINCT
  s.id AS session_id,
  p.id AS program_id,
  f.organization_id  -- Utiliser f.organization_id car sessions n'a pas organization_id directement
FROM sessions s
INNER JOIN formations f ON s.formation_id = f.id
INNER JOIN programs p ON f.program_id = p.id
WHERE NOT EXISTS (
  SELECT 1 FROM session_programs sp
  WHERE sp.session_id = s.id AND sp.program_id = p.id
);

COMMENT ON TABLE session_programs IS 'Table de liaison many-to-many entre sessions et programmes. Une session peut être associée à plusieurs programmes.';
COMMENT ON COLUMN session_programs.session_id IS 'ID de la session';
COMMENT ON COLUMN session_programs.program_id IS 'ID du programme';
COMMENT ON COLUMN session_programs.organization_id IS 'ID de l''organisation (pour RLS)';

