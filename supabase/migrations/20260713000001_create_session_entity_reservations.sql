-- Effectif prévisionnel non-nominatif d'une entreprise/organisme sur une session
-- Permet de saisir "N apprenants de cette entité suivront la formation" quand
-- l'entreprise n'a pas encore communiqué les noms des apprenants concernés,
-- sans créer de faux étudiants ni d'inscriptions (enrollments) nominatives.

CREATE TABLE IF NOT EXISTS public.session_entity_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES public.external_entities(id) ON DELETE CASCADE,

  expected_count INTEGER NOT NULL CHECK (expected_count > 0),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  CONSTRAINT session_entity_reservations_unique UNIQUE (session_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_session_entity_reservations_session ON public.session_entity_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_session_entity_reservations_entity ON public.session_entity_reservations(entity_id);
CREATE INDEX IF NOT EXISTS idx_session_entity_reservations_organization ON public.session_entity_reservations(organization_id);

CREATE OR REPLACE FUNCTION update_session_entity_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_entity_reservations_timestamp
  BEFORE UPDATE ON public.session_entity_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_session_entity_reservations_updated_at();

ALTER TABLE public.session_entity_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view entity reservations in their organization" ON public.session_entity_reservations;
CREATE POLICY "Users can view entity reservations in their organization"
  ON public.session_entity_reservations
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage entity reservations in their organization" ON public.session_entity_reservations;
CREATE POLICY "Users can manage entity reservations in their organization"
  ON public.session_entity_reservations
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE public.session_entity_reservations IS 'Effectif prévisionnel non-nominatif d''apprenants d''une entité externe sur une session (utilisé quand l''entreprise n''a pas encore communiqué les noms)';
COMMENT ON COLUMN public.session_entity_reservations.expected_count IS 'Nombre d''apprenants prévus de cette entité, sans identité nominative';
