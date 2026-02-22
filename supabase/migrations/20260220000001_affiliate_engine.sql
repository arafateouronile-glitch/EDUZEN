-- =====================================================
-- AFFILIATE ENGINE - Module Super Admin
-- =====================================================
-- Tables: affiliates, affiliate_campaigns, affiliate_referrals, affiliate_payouts
-- Lien avec promo_codes via affiliate_id (optionnel)
-- =====================================================

-- Affiliés : profils partenaires, statut, commission personnalisée, paiement
CREATE TABLE IF NOT EXISTS affiliates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    company_name VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'banned')),
    commission_rate_override DECIMAL(5, 2), -- % override campagne (NULL = use campaign)
    payment_iban VARCHAR(34),
    payment_bic VARCHAR(11),
    payment_holder_name VARCHAR(255),
    payment_notes TEXT,
    campaign_id UUID, -- campagne par défaut assignée
    cookie_days INTEGER DEFAULT 60, -- override durée cookie si besoin
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(email)
);

-- Campagnes d'affiliation : nom, taux, récurrence, durée cookie
CREATE TABLE IF NOT EXISTS affiliate_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    commission_type VARCHAR(20) NOT NULL DEFAULT 'recurring' CHECK (commission_type IN ('recurring', 'one_time')),
    commission_percent DECIMAL(5, 2) NOT NULL,
    cookie_days INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK campaign sur affiliates
ALTER TABLE affiliates
    ADD CONSTRAINT fk_affiliates_campaign
    FOREIGN KEY (campaign_id) REFERENCES affiliate_campaigns(id) ON DELETE SET NULL;

-- Références / tracking : clics, conversions, MRR par affilié
CREATE TABLE IF NOT EXISTS affiliate_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES affiliate_campaigns(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('click', 'signup', 'conversion')),
    visitor_id VARCHAR(255), -- cookie/session pour déduplication
    organization_id UUID, -- rempli à la conversion
    subscription_id UUID, -- rempli quand abonnement actif (organization_subscriptions)
    promo_code_used VARCHAR(50), -- code promo utilisé si attribution par code
    mrr_contribution DECIMAL(10, 2) DEFAULT 0, -- MRR généré (part récurrente)
    commission_amount DECIMAL(10, 2) DEFAULT 0, -- commission calculée
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    converted_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id ON affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_converted_at ON affiliate_referrals(converted_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_organization_id ON affiliate_referrals(organization_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_type ON affiliate_referrals(type);

-- Paiements : historique, demandes de retrait, factures
CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'failed', 'cancelled')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    paid_at TIMESTAMPTZ,
    reference VARCHAR(100), -- référence virement SEPA
    invoice_url TEXT,
    referral_ids UUID[], -- IDs des affiliate_referrals inclus dans ce payout
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate_id ON affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_status ON affiliate_payouts(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_period ON affiliate_payouts(period_start, period_end);

-- Lier promo_codes à un affilié (optionnel) pour attribution
ALTER TABLE promo_codes
    ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES affiliates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_promo_codes_affiliate_id ON promo_codes(affiliate_id);

-- RLS : accès réservé aux super admins (via service role ou policy is_super_admin)
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Policy : lecture/écriture pour les super admins uniquement
CREATE POLICY "Super admin full access affiliates"
    ON affiliates FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin full access affiliate_campaigns"
    ON affiliate_campaigns FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin full access affiliate_referrals"
    ON affiliate_referrals FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin full access affiliate_payouts"
    ON affiliate_payouts FOR ALL
    USING (public.is_super_admin(auth.uid()))
    WITH CHECK (public.is_super_admin(auth.uid()));

-- Triggers updated_at (réutilise la fonction existante si présente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $fn$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $fn$ LANGUAGE plpgsql;
    END IF;
END $$;

CREATE TRIGGER affiliates_updated_at
    BEFORE UPDATE ON affiliates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER affiliate_campaigns_updated_at
    BEFORE UPDATE ON affiliate_campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER affiliate_referrals_updated_at
    BEFORE UPDATE ON affiliate_referrals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER affiliate_payouts_updated_at
    BEFORE UPDATE ON affiliate_payouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
