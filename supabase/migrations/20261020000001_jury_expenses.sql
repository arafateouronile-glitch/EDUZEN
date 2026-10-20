-- Défraiements des membres du jury (onglet « Examen & Jury » d'une session) :
-- montants (vacations + frais), attestation de défraiement signée
-- électroniquement, et report du coût dans les charges de la session
-- (onglet Finances, marge nette, BPF) via une catégorie « Jury ».

-- ── Fiche du membre du jury : champs attendus par l'attestation ─────────────

ALTER TABLE public.jury_members
  ADD COLUMN IF NOT EXISTS qualite     TEXT,
  ADD COLUMN IF NOT EXISTS address     TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS city        TEXT,
  ADD COLUMN IF NOT EXISTS iban        TEXT,
  ADD COLUMN IF NOT EXISTS bic         TEXT;

-- ── Défraiements ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.session_jury_expenses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_jury_id      UUID NOT NULL UNIQUE REFERENCES public.session_jury(id) ON DELETE CASCADE,
  session_id           UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  jury_member_id       UUID NOT NULL REFERENCES public.jury_members(id) ON DELETE CASCADE,
  reference            TEXT,

  -- Saisie : vacations (heures × taux) + transport (km × taux + autres) + repas + hébergement
  hours                NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (hours >= 0),
  hourly_rate          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
  distance_km          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  km_rate              NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (km_rate >= 0),
  other_transport      NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (other_transport >= 0),
  meals                NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (meals >= 0),
  lodging              NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (lodging >= 0),

  -- Montants calculés (source de vérité unique)
  fees                 NUMERIC(12,2) GENERATED ALWAYS AS (round(hours * hourly_rate, 2)) STORED,
  transport            NUMERIC(12,2) GENERATED ALWAYS AS (round(distance_km * km_rate, 2) + other_transport) STORED,
  total                NUMERIC(12,2) GENERATED ALWAYS AS (
                         round(hours * hourly_rate, 2) + round(distance_km * km_rate, 2)
                         + other_transport + meals + lodging
                       ) STORED,

  notes                TEXT,
  currency             TEXT NOT NULL DEFAULT 'EUR',

  -- Attestation et signature
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed')),
  document_id          UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  signature_request_id UUID,
  sent_at              TIMESTAMPTZ,
  signed_at            TIMESTAMPTZ,

  -- Report dans les charges de la session
  session_charge_id    UUID REFERENCES public.session_charges(id) ON DELETE SET NULL,

  created_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS session_jury_expenses_session_idx ON public.session_jury_expenses(session_id);
CREATE INDEX IF NOT EXISTS session_jury_expenses_org_idx ON public.session_jury_expenses(organization_id);
CREATE INDEX IF NOT EXISTS session_jury_expenses_document_idx ON public.session_jury_expenses(document_id);

DROP TRIGGER IF EXISTS update_session_jury_expenses_updated_at ON public.session_jury_expenses;
CREATE TRIGGER update_session_jury_expenses_updated_at
  BEFORE UPDATE ON public.session_jury_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Référence DEF-AAAA-NNNN, séquentielle par organisation et par année
CREATE OR REPLACE FUNCTION public.session_jury_expenses_set_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_prefix text := 'DEF-' || to_char(now(), 'YYYY') || '-';
  v_next integer;
BEGIN
  IF NEW.reference IS NOT NULL THEN
    RETURN NEW;
  END IF;
  -- Sérialise les insertions d'une même organisation (pas de doublon de numéro)
  PERFORM pg_advisory_xact_lock(hashtext('jury_expense_ref_' || NEW.organization_id::text));
  SELECT coalesce(max(substring(reference FROM length(v_prefix) + 1)::integer), 0) + 1
    INTO v_next
    FROM public.session_jury_expenses
   WHERE organization_id = NEW.organization_id
     AND reference LIKE v_prefix || '%'
     AND substring(reference FROM length(v_prefix) + 1) ~ '^[0-9]+$';
  NEW.reference := v_prefix || lpad(v_next::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_jury_expenses_reference ON public.session_jury_expenses;
CREATE TRIGGER session_jury_expenses_reference
  BEFORE INSERT ON public.session_jury_expenses
  FOR EACH ROW EXECUTE FUNCTION public.session_jury_expenses_set_reference();

-- La charge de session liée disparaît avec le défraiement (suppression directe
-- ou en cascade quand le membre est retiré du jury de la session).
CREATE OR REPLACE FUNCTION public.session_jury_expenses_delete_charge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.session_charge_id IS NOT NULL THEN
    DELETE FROM public.session_charges WHERE id = OLD.session_charge_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS session_jury_expenses_delete_charge ON public.session_jury_expenses;
CREATE TRIGGER session_jury_expenses_delete_charge
  AFTER DELETE ON public.session_jury_expenses
  FOR EACH ROW EXECUTE FUNCTION public.session_jury_expenses_delete_charge();

-- ── RLS : utilisateurs de l'organisation ────────────────────────────────────
-- Les membres du jury n'ont pas de compte : la signature passe par
-- /api/sign/submit (service role).

ALTER TABLE public.session_jury_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_jury_expenses_select" ON public.session_jury_expenses;
CREATE POLICY "session_jury_expenses_select" ON public.session_jury_expenses
  FOR SELECT
  USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "session_jury_expenses_insert" ON public.session_jury_expenses;
CREATE POLICY "session_jury_expenses_insert" ON public.session_jury_expenses
  FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "session_jury_expenses_update" ON public.session_jury_expenses;
CREATE POLICY "session_jury_expenses_update" ON public.session_jury_expenses
  FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "session_jury_expenses_delete" ON public.session_jury_expenses;
CREATE POLICY "session_jury_expenses_delete" ON public.session_jury_expenses
  FOR DELETE
  USING (organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()));

-- ── Catégorie de charge « Jury » ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.init_default_charge_categories(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.charge_categories (organization_id, name, code, description, bpf_category)
  VALUES
    (p_organization_id, 'Location de salle', 'LOCATION_SALLE', 'Frais de location de salle de formation', 'location'),
    (p_organization_id, 'Matériel pédagogique', 'MATERIEL_PEDAGOGIQUE', 'Achat de matériel pédagogique', 'equipment'),
    (p_organization_id, 'Formateur externe', 'FORMATEUR_EXTERNE', 'Rémunération de formateurs externes', 'subcontracting'),
    (p_organization_id, 'Jury', 'JURY', 'Vacations et frais des membres du jury d''examen', 'subcontracting'),
    (p_organization_id, 'Transport', 'TRANSPORT', 'Frais de transport pour la formation', 'other'),
    (p_organization_id, 'Hébergement', 'HEBERGEMENT', 'Frais d''hébergement', 'other'),
    (p_organization_id, 'Restauration', 'RESTAURATION', 'Frais de restauration', 'supplies'),
    (p_organization_id, 'Fournitures', 'FOURNITURES', 'Fournitures diverses', 'supplies'),
    (p_organization_id, 'Communication', 'COMMUNICATION', 'Frais de communication et marketing', 'other'),
    (p_organization_id, 'Assurance', 'ASSURANCE', 'Frais d''assurance', 'other'),
    (p_organization_id, 'Sous-traitance', 'SOUS_TRAITANCE', 'Sous-traitance et prestataires externes', 'subcontracting'),
    (p_organization_id, 'Autre', 'AUTRE', 'Autres charges', 'other')
  ON CONFLICT (organization_id, code) DO UPDATE SET
    bpf_category = EXCLUDED.bpf_category,
    updated_at = NOW();
END;
$$;

-- Organisations dont les catégories sont déjà initialisées : ajouter « Jury »
-- (les autres l'obtiendront à l'initialisation ; l'API la crée aussi au besoin).
INSERT INTO public.charge_categories (organization_id, name, code, description, bpf_category)
SELECT DISTINCT cc.organization_id, 'Jury', 'JURY', 'Vacations et frais des membres du jury d''examen', 'subcontracting'
FROM public.charge_categories cc
ON CONFLICT (organization_id, code) DO NOTHING;
