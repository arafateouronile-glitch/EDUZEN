-- Gestion des salles/espaces de formation (ou véhicules pour les auto-écoles)
-- Le label affiché ("Salle" vs "Véhicule") est configurable via organizations.settings.room_label

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  capacity INTEGER,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_code_org
  ON public.rooms (organization_id, code)
  WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_org_id
  ON public.rooms (organization_id);

CREATE INDEX IF NOT EXISTS idx_rooms_active
  ON public.rooms (organization_id, is_active);

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "rooms_insert" ON public.rooms
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "rooms_update" ON public.rooms
  FOR UPDATE USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "rooms_delete" ON public.rooms
  FOR DELETE USING (
    organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

COMMENT ON TABLE public.rooms IS 'Salles de formation ou véhicules (auto-écoles). Label configurable via organizations.settings.room_label';
COMMENT ON COLUMN public.rooms.capacity IS 'Capacité maximale (personnes ou chevaux pour véhicules)';
COMMENT ON COLUMN public.rooms.location IS 'Localisation précise (ex: Bâtiment A, 1er étage)';
