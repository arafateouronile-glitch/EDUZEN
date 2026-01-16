-- Migration pour créer la table des charges de session
-- Date: 2024-12-22
-- Description: Permet de gérer les charges (dépenses) associées à une session de formation

-- 1. Table pour les catégories de charges (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS public.charge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- 2. Table pour les charges de session
CREATE TABLE IF NOT EXISTS public.session_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.charge_categories(id) ON DELETE SET NULL,
  -- Informations de la charge
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Informations de paiement
  payment_method TEXT, -- 'cash', 'bank_transfer', 'card', 'mobile_money', 'check', etc.
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  paid_at TIMESTAMPTZ,
  -- Informations fournisseur
  vendor TEXT, -- Fournisseur/prestataire
  vendor_invoice_number TEXT, -- Numéro de facture du fournisseur
  vendor_invoice_date DATE,
  -- Métadonnées
  notes TEXT,
  receipt_url TEXT, -- URL du justificatif (reçu, facture)
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_session_charges_session ON public.session_charges(session_id);
CREATE INDEX IF NOT EXISTS idx_session_charges_org ON public.session_charges(organization_id);
CREATE INDEX IF NOT EXISTS idx_session_charges_category ON public.session_charges(category_id);
CREATE INDEX IF NOT EXISTS idx_session_charges_date ON public.session_charges(charge_date);
CREATE INDEX IF NOT EXISTS idx_charge_categories_org ON public.charge_categories(organization_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_session_charge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_session_charges_updated_at ON public.session_charges;
CREATE TRIGGER update_session_charges_updated_at
  BEFORE UPDATE ON public.session_charges
  FOR EACH ROW EXECUTE FUNCTION update_session_charge_updated_at();

DROP TRIGGER IF EXISTS update_charge_categories_updated_at ON public.charge_categories;
CREATE TRIGGER update_charge_categories_updated_at
  BEFORE UPDATE ON public.charge_categories
  FOR EACH ROW EXECUTE FUNCTION update_session_charge_updated_at();

-- RLS Policies
ALTER TABLE public.charge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_charges ENABLE ROW LEVEL SECURITY;

-- Policies pour charge_categories
DROP POLICY IF EXISTS "Catégories lisibles par l'organisation" ON public.charge_categories;
CREATE POLICY "Catégories lisibles par l'organisation" ON public.charge_categories
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Catégories modifiables par admin/teacher" ON public.charge_categories;
CREATE POLICY "Catégories modifiables par admin/teacher" ON public.charge_categories
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Policies pour session_charges
DROP POLICY IF EXISTS "Charges lisibles par l'organisation" ON public.session_charges;
CREATE POLICY "Charges lisibles par l'organisation" ON public.session_charges
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Charges créables par l'organisation" ON public.session_charges;
CREATE POLICY "Charges créables par l'organisation" ON public.session_charges
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "Charges modifiables par l'organisation" ON public.session_charges;
CREATE POLICY "Charges modifiables par l'organisation" ON public.session_charges
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

DROP POLICY IF EXISTS "Charges supprimables par l'organisation" ON public.session_charges;
CREATE POLICY "Charges supprimables par l'organisation" ON public.session_charges
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Accorder les permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.charge_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_charges TO authenticated;

-- Insérer des catégories de charges par défaut (via fonction pour éviter les doublons)
CREATE OR REPLACE FUNCTION public.init_default_charge_categories(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Catégories par défaut
  INSERT INTO public.charge_categories (organization_id, name, code, description)
  VALUES
    (p_organization_id, 'Location de salle', 'LOCATION_SALLE', 'Frais de location de salle de formation'),
    (p_organization_id, 'Matériel pédagogique', 'MATERIEL_PEDAGOGIQUE', 'Achat de matériel pédagogique'),
    (p_organization_id, 'Formateur externe', 'FORMATEUR_EXTERNE', 'Rémunération de formateurs externes'),
    (p_organization_id, 'Transport', 'TRANSPORT', 'Frais de transport pour la formation'),
    (p_organization_id, 'Hébergement', 'HEBERGEMENT', 'Frais d''hébergement'),
    (p_organization_id, 'Restauration', 'RESTAURATION', 'Frais de restauration'),
    (p_organization_id, 'Fournitures', 'FOURNITURES', 'Fournitures diverses'),
    (p_organization_id, 'Communication', 'COMMUNICATION', 'Frais de communication et marketing'),
    (p_organization_id, 'Assurance', 'ASSURANCE', 'Frais d''assurance'),
    (p_organization_id, 'Autre', 'AUTRE', 'Autres charges')
  ON CONFLICT (organization_id, code) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.init_default_charge_categories TO authenticated;

-- Fonction pour calculer le total des charges d'une session
CREATE OR REPLACE FUNCTION public.calculate_session_charges_total(
  p_session_id UUID
)
RETURNS TABLE (
  total_amount NUMERIC,
  paid_amount NUMERIC,
  pending_amount NUMERIC,
  charge_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(amount), 0) as total_amount,
    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
    COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
    COUNT(*)::INTEGER as charge_count
  FROM public.session_charges
  WHERE session_id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_session_charges_total TO authenticated;



