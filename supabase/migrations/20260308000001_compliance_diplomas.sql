-- Migration: Module de monitoring de conformité des habilitations/diplômes
-- Permet aux entreprises de suivre la validité des certifications de leurs salariés

-- =========================================================
-- 1. Table diploma_types (référentiel des types d'habilitations)
-- =========================================================
CREATE TABLE IF NOT EXISTS diploma_types (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  description             TEXT,
  default_validity_months INTEGER NOT NULL DEFAULT 24,
  color                   TEXT NOT NULL DEFAULT '#274472',
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE diploma_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diploma_types_org_access" ON diploma_types
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_diploma_types_org ON diploma_types(organization_id);

-- =========================================================
-- 2. Table employee_diplomas (habilitations par salarié)
-- =========================================================
CREATE TABLE IF NOT EXISTS employee_diplomas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  company_employee_id  UUID NOT NULL REFERENCES company_employees(id) ON DELETE CASCADE,
  diploma_type_id      UUID NOT NULL REFERENCES diploma_types(id) ON DELETE CASCADE,
  document_url         TEXT,
  issued_at            DATE,
  expiry_date          DATE NOT NULL,
  notes                TEXT,
  created_by           UUID REFERENCES users(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE employee_diplomas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_diplomas_org_access" ON employee_diplomas
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_employee_diplomas_org     ON employee_diplomas(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_diplomas_company ON employee_diplomas(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_diplomas_employee ON employee_diplomas(company_employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_diplomas_expiry  ON employee_diplomas(expiry_date);

-- =========================================================
-- 3. Vue de conformité avec statut calculé à la volée
--    Rouge  (expired) : expiry_date < aujourd'hui
--    Orange (warning) : aujourd'hui ≤ expiry_date ≤ aujourd'hui + 180j
--    Vert   (valid)   : expiry_date > aujourd'hui + 180j
-- =========================================================
CREATE OR REPLACE VIEW v_employee_diploma_compliance AS
SELECT
  ed.id,
  ed.organization_id,
  ed.company_id,
  ed.company_employee_id,
  ed.diploma_type_id,
  ed.document_url,
  ed.issued_at,
  ed.expiry_date,
  ed.notes,
  ed.created_at,
  CASE
    WHEN ed.expiry_date < CURRENT_DATE                             THEN 'expired'
    WHEN ed.expiry_date <= CURRENT_DATE + INTERVAL '180 days'     THEN 'warning'
    ELSE                                                                'valid'
  END AS status,
  (ed.expiry_date - CURRENT_DATE) AS days_until_expiry,
  dt.name  AS diploma_name,
  dt.color AS diploma_color,
  ce.department,
  ce.job_title,
  ce.employee_number,
  s.first_name,
  s.last_name,
  s.email
FROM employee_diplomas ed
JOIN diploma_types      dt ON dt.id = ed.diploma_type_id
JOIN company_employees  ce ON ce.id = ed.company_employee_id
JOIN students           s  ON s.id  = ce.student_id;

-- =========================================================
-- 4. Seed des types d'habilitations communs en France
--    (insérés pour chaque organisation à la demande via la fonction ci-dessous)
-- =========================================================
CREATE OR REPLACE FUNCTION seed_default_diploma_types(org_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO diploma_types (organization_id, name, description, default_validity_months, color)
  VALUES
    (org_id, 'Habilitation électrique B0/H0',   'Travaux non électriques en zone électrique',                    36, '#EF4444'),
    (org_id, 'Habilitation électrique BR',       'Chargé d''intervention BT',                                    36, '#EF4444'),
    (org_id, 'CACES R489 - Chariot élévateur',   'Conduite de chariots de manutention',                          60, '#F59E0B'),
    (org_id, 'CACES R482 - Engins de chantier',  'Conduite d''engins de chantier',                               60, '#F59E0B'),
    (org_id, 'SST - Sauveteur Secouriste',        'Sauveteur secouriste du travail',                              24, '#10B981'),
    (org_id, 'AIPR - Travaux à proximité réseaux','Autorisation d''intervention à proximité des réseaux',         36, '#6366F1'),
    (org_id, 'Formation incendie EPI/EPC',        'Équipier de première et seconde intervention incendie',        12, '#F97316'),
    (org_id, 'Travail en hauteur / Port du harnais','Prévention des risques de chute de hauteur',                 36, '#8B5CF6')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE diploma_types      IS 'Référentiel des types d''habilitations/certifications par organisation';
COMMENT ON TABLE employee_diplomas  IS 'Habilitations et certifications des salariés avec date d''expiration';
COMMENT ON VIEW  v_employee_diploma_compliance IS 'Vue de conformité avec statut calculé dynamiquement (expired/warning/valid)';
