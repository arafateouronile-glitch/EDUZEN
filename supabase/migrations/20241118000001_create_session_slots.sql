-- Création de la table pour stocker les séances individuelles d'une session
-- Une séance peut être le matin, l'après-midi, ou les deux

CREATE TABLE IF NOT EXISTS session_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT NOT NULL CHECK (time_slot IN ('morning', 'afternoon', 'full_day')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  capacity_max INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, date, time_slot)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_session_slots_session_id ON session_slots(session_id);
CREATE INDEX IF NOT EXISTS idx_session_slots_date ON session_slots(date);
CREATE INDEX IF NOT EXISTS idx_session_slots_session_date ON session_slots(session_id, date);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_session_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_slots_updated_at
  BEFORE UPDATE ON session_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_session_slots_updated_at();

-- RLS (Row Level Security)
ALTER TABLE session_slots ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Les utilisateurs peuvent voir les séances des sessions de leur organisation
CREATE POLICY "Users can view session_slots of their organization"
  ON session_slots
  FOR SELECT
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      INNER JOIN formations f ON s.formation_id = f.id
      WHERE f.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Politique RLS : Les utilisateurs peuvent créer des séances pour les sessions de leur organisation
CREATE POLICY "Users can create session_slots for their organization"
  ON session_slots
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT s.id FROM sessions s
      INNER JOIN formations f ON s.formation_id = f.id
      WHERE f.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Politique RLS : Les utilisateurs peuvent mettre à jour les séances de leur organisation
CREATE POLICY "Users can update session_slots of their organization"
  ON session_slots
  FOR UPDATE
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      INNER JOIN formations f ON s.formation_id = f.id
      WHERE f.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT s.id FROM sessions s
      INNER JOIN formations f ON s.formation_id = f.id
      WHERE f.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Politique RLS : Les utilisateurs peuvent supprimer les séances de leur organisation
CREATE POLICY "Users can delete session_slots of their organization"
  ON session_slots
  FOR DELETE
  USING (
    session_id IN (
      SELECT s.id FROM sessions s
      INNER JOIN formations f ON s.formation_id = f.id
      WHERE f.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

COMMENT ON TABLE session_slots IS 'Table pour stocker les séances individuelles d''une session. Une séance peut être le matin, l''après-midi, ou une journée complète.';
COMMENT ON COLUMN session_slots.session_id IS 'ID de la session parente';
COMMENT ON COLUMN session_slots.date IS 'Date de la séance';
COMMENT ON COLUMN session_slots.time_slot IS 'Créneau horaire : morning, afternoon, ou full_day';
COMMENT ON COLUMN session_slots.start_time IS 'Heure de début de la séance';
COMMENT ON COLUMN session_slots.end_time IS 'Heure de fin de la séance';
























