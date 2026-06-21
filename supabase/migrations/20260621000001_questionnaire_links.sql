-- Liens tokenisés pour envoyer des questionnaires de satisfaction aux apprenants
-- sans authentification (accès public par token)

CREATE TABLE questionnaire_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token           TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  template_id     UUID NOT NULL REFERENCES evaluation_templates(id) ON DELETE CASCADE,
  grade_id        UUID REFERENCES grades(id) ON DELETE SET NULL,
  instance_id     UUID REFERENCES evaluation_template_instances(id) ON DELETE SET NULL,
  student_email   TEXT,
  student_name    TEXT NOT NULL,
  session_name    TEXT NOT NULL,
  assessment_type TEXT NOT NULL DEFAULT 'hot',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '30 days',
  submitted_at    TIMESTAMPTZ,
  viewed_at       TIMESTAMPTZ
);

ALTER TABLE questionnaire_links ENABLE ROW LEVEL SECURITY;

-- Membres de l'organisation peuvent lire et gérer leurs liens
CREATE POLICY "org_members_manage_links"
  ON questionnaire_links FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE INDEX idx_questionnaire_links_token       ON questionnaire_links(token);
CREATE INDEX idx_questionnaire_links_session_id  ON questionnaire_links(session_id);
CREATE INDEX idx_questionnaire_links_student_id  ON questionnaire_links(student_id);
