-- ============================================================
-- Formulaires d'inscription apprenant personnalisables
-- ============================================================

-- Table des templates de formulaires
CREATE TABLE IF NOT EXISTS enrollment_form_templates (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name         TEXT NOT NULL DEFAULT 'Formulaire d''inscription',
  description  TEXT,
  fields       JSONB NOT NULL DEFAULT '[]',
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE enrollment_form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollment_form_templates_org_access"
  ON enrollment_form_templates
  USING (
    org_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Table des liens de partage
CREATE TABLE IF NOT EXISTS enrollment_form_links (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token        TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  template_id  UUID REFERENCES enrollment_form_templates(id) ON DELETE CASCADE NOT NULL,
  session_id   UUID REFERENCES sessions(id) ON DELETE SET NULL,
  expires_at   TIMESTAMPTZ,
  max_uses     INTEGER,
  current_uses INTEGER DEFAULT 0,
  is_active    BOOLEAN DEFAULT true,
  label        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE enrollment_form_links ENABLE ROW LEVEL SECURITY;

-- Lecture publique par token (sans auth requise)
CREATE POLICY "enrollment_form_links_public_read"
  ON enrollment_form_links FOR SELECT
  USING (is_active = true AND token IS NOT NULL);

-- Accès complet pour l'org propriétaire
CREATE POLICY "enrollment_form_links_org_full"
  ON enrollment_form_links
  USING (
    org_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Table des soumissions
CREATE TABLE IF NOT EXISTS enrollment_submissions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id       UUID REFERENCES enrollment_form_links(id),
  org_id        UUID REFERENCES organizations(id),
  session_id    UUID REFERENCES sessions(id) ON DELETE SET NULL,
  student_id    UUID REFERENCES students(id) ON DELETE SET NULL,
  form_data     JSONB NOT NULL DEFAULT '{}',
  documents     JSONB DEFAULT '[]',
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'student_created', 'error')),
  ip_address    TEXT,
  submitted_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE enrollment_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollment_submissions_org_access"
  ON enrollment_submissions
  USING (
    org_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
  );

-- Champs custom sur les étudiants
ALTER TABLE students ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE students ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS accessibility_needs TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS notes TEXT;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_enrollment_form_links_token ON enrollment_form_links(token);
CREATE INDEX IF NOT EXISTS idx_enrollment_form_links_org ON enrollment_form_links(org_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_submissions_org ON enrollment_submissions(org_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_submissions_session ON enrollment_submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_form_templates_org ON enrollment_form_templates(org_id);
