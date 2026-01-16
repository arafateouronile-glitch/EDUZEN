-- Migration pour créer la table des taux de change
-- Permet de stocker et mettre à jour les taux de change pour la conversion multi-devises

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate DECIMAL(18, 6) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  source TEXT, -- Source du taux (ex: 'ECB', 'manual', 'api')
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT exchange_rates_currencies_check CHECK (from_currency != to_currency),
  CONSTRAINT exchange_rates_rate_positive CHECK (rate > 0),
  CONSTRAINT exchange_rates_unique_pair UNIQUE (from_currency, to_currency, is_active)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_to_active 
ON public.exchange_rates(from_currency, to_currency, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_updated_at 
ON public.exchange_rates(updated_at DESC);

-- RLS Policies
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent lire les taux de change
CREATE POLICY "Users can view exchange rates"
ON public.exchange_rates FOR SELECT
TO authenticated
USING (true);

-- Seuls les admins peuvent modifier les taux de change
CREATE POLICY "Admins can manage exchange rates"
ON public.exchange_rates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'admin')
  )
);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION public.update_exchange_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exchange_rates_updated_at
BEFORE UPDATE ON public.exchange_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_exchange_rates_updated_at();

-- Insérer quelques taux de change par défaut
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, source, is_active)
VALUES
  ('EUR', 'XOF', 655.957, 'manual', true),
  ('XOF', 'EUR', 0.001525, 'manual', true),
  ('EUR', 'USD', 1.10, 'manual', true),
  ('USD', 'EUR', 0.909, 'manual', true),
  ('EUR', 'GBP', 0.85, 'manual', true),
  ('GBP', 'EUR', 1.176, 'manual', true),
  ('USD', 'XOF', 596.33, 'manual', true),
  ('XOF', 'USD', 0.001677, 'manual', true),
  ('GBP', 'XOF', 771.03, 'manual', true),
  ('XOF', 'GBP', 0.001297, 'manual', true),
  ('USD', 'GBP', 0.77, 'manual', true),
  ('GBP', 'USD', 1.30, 'manual', true)
ON CONFLICT (from_currency, to_currency, is_active) 
DO UPDATE SET 
  rate = EXCLUDED.rate,
  updated_at = NOW();

COMMENT ON TABLE public.exchange_rates IS 'Table des taux de change pour la conversion multi-devises';
COMMENT ON COLUMN public.exchange_rates.rate IS 'Taux de change de from_currency vers to_currency';
COMMENT ON COLUMN public.exchange_rates.source IS 'Source du taux de change (ECB, API, manual, etc.)';



