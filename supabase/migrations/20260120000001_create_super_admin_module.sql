-- =====================================================
-- SUPER ADMIN MODULE - Complete Database Schema
-- =====================================================
-- This migration creates all tables for the Super Admin dashboard:
-- 1. Subscription management
-- 2. Promo codes & referrals (marketing)
-- 3. Blog CMS
-- 4. Admin team management
-- 5. Platform metrics & analytics
-- =====================================================

-- =====================================================
-- 1. SUBSCRIPTION MANAGEMENT
-- =====================================================

-- Subscription plans (Free, Pro, Premium, Enterprise)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    price_monthly DECIMAL(10, 2) DEFAULT 0, -- NULL allowed for Enterprise (custom pricing)
    price_yearly DECIMAL(10, 2) DEFAULT 0, -- NULL allowed for Enterprise (custom pricing)
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    features JSONB NOT NULL DEFAULT '[]',
    max_users INTEGER,
    max_students INTEGER,
    max_storage_gb INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization subscriptions history (FK added later conditionally)
CREATE TABLE IF NOT EXISTS organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'expired')),
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_ends_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    payment_method JSONB,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Billing history / Invoices for subscriptions
CREATE TABLE IF NOT EXISTS subscription_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    subscription_id UUID REFERENCES organization_subscriptions(id) ON DELETE SET NULL,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'refunded', 'void')),
    billing_period_start TIMESTAMPTZ,
    billing_period_end TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    stripe_invoice_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    pdf_url TEXT,
    line_items JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. PROMO CODES & REFERRALS (Marketing)
-- =====================================================

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'trial_extension')),
    discount_value DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    max_uses INTEGER,
    max_uses_per_user INTEGER DEFAULT 1,
    current_uses INTEGER NOT NULL DEFAULT 0,
    min_subscription_amount DECIMAL(10, 2),
    applicable_plans UUID[] DEFAULT '{}',
    first_subscription_only BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Promo code usage tracking
CREATE TABLE IF NOT EXISTS promo_code_usages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    subscription_id UUID REFERENCES organization_subscriptions(id),
    discount_applied DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referral program
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_organization_id UUID NOT NULL,
    referrer_user_id UUID NOT NULL,
    referred_organization_id UUID,
    referred_email VARCHAR(255) NOT NULL,
    referral_code VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'subscribed', 'rewarded', 'expired')),
    referrer_reward_type VARCHAR(20) CHECK (referrer_reward_type IN ('credit', 'discount', 'free_months')),
    referrer_reward_value DECIMAL(10, 2),
    referred_reward_type VARCHAR(20) CHECK (referred_reward_type IN ('credit', 'discount', 'free_months')),
    referred_reward_value DECIMAL(10, 2),
    rewards_applied_at TIMESTAMPTZ,
    signed_up_at TIMESTAMPTZ,
    subscribed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. BLOG CMS
-- =====================================================

-- Blog categories
CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blog tags
CREATE TABLE IF NOT EXISTS blog_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blog posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image_url TEXT,
    meta_title VARCHAR(70),
    meta_description VARCHAR(160),
    canonical_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'scheduled', 'published', 'archived')),
    published_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ,
    author_id UUID NOT NULL,
    category_id UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
    views_count INTEGER NOT NULL DEFAULT 0,
    likes_count INTEGER NOT NULL DEFAULT 0,
    shares_count INTEGER NOT NULL DEFAULT 0,
    allow_comments BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    reading_time_minutes INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blog post tags (many-to-many)
CREATE TABLE IF NOT EXISTS blog_post_tags (
    post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
);

-- Blog comments
CREATE TABLE IF NOT EXISTS blog_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES blog_comments(id) ON DELETE CASCADE,
    user_id UUID,
    guest_name VARCHAR(100),
    guest_email VARCHAR(255),
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam', 'deleted')),
    ip_address INET,
    user_agent TEXT,
    likes_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 4. ADMIN TEAM MANAGEMENT
-- =====================================================

-- Platform admin users (separate from organization users)
CREATE TABLE IF NOT EXISTS platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'content_admin', 'support_admin', 'finance_admin')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_active_at TIMESTAMPTZ,
    invited_by UUID REFERENCES platform_admins(id),
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES platform_admins(id),
    revoke_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin activity log
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES platform_admins(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 5. PLATFORM METRICS & ANALYTICS
-- =====================================================

-- Daily platform metrics
CREATE TABLE IF NOT EXISTS platform_metrics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    mrr DECIMAL(12, 2) NOT NULL DEFAULT 0,
    arr DECIMAL(12, 2) NOT NULL DEFAULT 0,
    new_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    churned_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_organizations INTEGER NOT NULL DEFAULT 0,
    active_organizations INTEGER NOT NULL DEFAULT 0,
    new_organizations INTEGER NOT NULL DEFAULT 0,
    churned_organizations INTEGER NOT NULL DEFAULT 0,
    trial_organizations INTEGER NOT NULL DEFAULT 0,
    free_organizations INTEGER NOT NULL DEFAULT 0,
    paid_organizations INTEGER NOT NULL DEFAULT 0,
    organizations_by_plan JSONB DEFAULT '{}',
    total_users INTEGER NOT NULL DEFAULT 0,
    active_users_day INTEGER NOT NULL DEFAULT 0,
    active_users_week INTEGER NOT NULL DEFAULT 0,
    active_users_month INTEGER NOT NULL DEFAULT 0,
    new_users INTEGER NOT NULL DEFAULT 0,
    total_sessions_created INTEGER NOT NULL DEFAULT 0,
    total_students_enrolled INTEGER NOT NULL DEFAULT 0,
    total_documents_generated INTEGER NOT NULL DEFAULT 0,
    churn_rate DECIMAL(5, 4) DEFAULT 0,
    retention_rate DECIMAL(5, 4) DEFAULT 0,
    conversion_rate DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Monthly revenue breakdown
CREATE TABLE IF NOT EXISTS platform_revenue_monthly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    gross_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    refunds DECIMAL(12, 2) NOT NULL DEFAULT 0,
    net_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    new_business_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    expansion_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    recurring_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    successful_transactions INTEGER NOT NULL DEFAULT 0,
    failed_transactions INTEGER NOT NULL DEFAULT 0,
    revenue_by_plan JSONB DEFAULT '{}',
    revenue_by_country JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(year, month)
);

-- =====================================================
-- FIX COLUMN CONSTRAINTS (if table already exists)
-- =====================================================

-- Allow NULL for price_monthly and price_yearly (for Enterprise plan)
DO $$
BEGIN
    -- Check if table exists and column has NOT NULL constraint
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_plans') THEN
        -- Modify price_monthly to allow NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'subscription_plans' 
            AND column_name = 'price_monthly'
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE subscription_plans ALTER COLUMN price_monthly DROP NOT NULL;
        END IF;
        
        -- Modify price_yearly to allow NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'subscription_plans' 
            AND column_name = 'price_yearly'
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE subscription_plans ALTER COLUMN price_yearly DROP NOT NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- FIX COLUMN CONSTRAINTS (if table already exists)
-- =====================================================

-- Allow NULL for price_monthly and price_yearly (for Enterprise plan)
DO $$
BEGIN
    -- Check if table exists and column has NOT NULL constraint
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_plans') THEN
        -- Modify price_monthly to allow NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'subscription_plans' 
            AND column_name = 'price_monthly'
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE subscription_plans ALTER COLUMN price_monthly DROP NOT NULL;
        END IF;
        
        -- Modify price_yearly to allow NULL
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'subscription_plans' 
            AND column_name = 'price_yearly'
            AND is_nullable = 'NO'
        ) THEN
            ALTER TABLE subscription_plans ALTER COLUMN price_yearly DROP NOT NULL;
        END IF;
    END IF;
END $$;

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS (conditional)
-- =====================================================

DO $$
BEGIN
    -- FK to organizations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organization_subscriptions_organization_id_fkey' AND table_name = 'organization_subscriptions') THEN
            ALTER TABLE organization_subscriptions ADD CONSTRAINT organization_subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subscription_invoices_organization_id_fkey' AND table_name = 'subscription_invoices') THEN
            ALTER TABLE subscription_invoices ADD CONSTRAINT subscription_invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'promo_code_usages_organization_id_fkey' AND table_name = 'promo_code_usages') THEN
            ALTER TABLE promo_code_usages ADD CONSTRAINT promo_code_usages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referrals_referrer_organization_id_fkey' AND table_name = 'referrals') THEN
            ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_organization_id_fkey FOREIGN KEY (referrer_organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referrals_referred_organization_id_fkey' AND table_name = 'referrals') THEN
            ALTER TABLE referrals ADD CONSTRAINT referrals_referred_organization_id_fkey FOREIGN KEY (referred_organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
        END IF;
    END IF;

    -- FK to users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'promo_codes_created_by_fkey' AND table_name = 'promo_codes') THEN
            ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'promo_code_usages_user_id_fkey' AND table_name = 'promo_code_usages') THEN
            ALTER TABLE promo_code_usages ADD CONSTRAINT promo_code_usages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'referrals_referrer_user_id_fkey' AND table_name = 'referrals') THEN
            ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_user_id_fkey FOREIGN KEY (referrer_user_id) REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'blog_posts_author_id_fkey' AND table_name = 'blog_posts') THEN
            ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'blog_comments_user_id_fkey' AND table_name = 'blog_comments') THEN
            ALTER TABLE blog_comments ADD CONSTRAINT blog_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'platform_admins_user_id_fkey' AND table_name = 'platform_admins') THEN
            ALTER TABLE platform_admins ADD CONSTRAINT platform_admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
    END IF;
END
$$;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_period_end ON organization_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_org ON subscription_invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status ON subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promo_code_usages_code ON promo_code_usages(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_organization_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON blog_tags(slug);
CREATE INDEX IF NOT EXISTS idx_platform_admins_user ON platform_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_admins_role ON platform_admins(role);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_created ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON platform_metrics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_year_month ON platform_revenue_monthly(year DESC, month DESC);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue_monthly ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION is_platform_admin(check_user_id UUID, required_role VARCHAR DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    IF required_role IS NOT NULL THEN
        RETURN EXISTS (SELECT 1 FROM platform_admins WHERE user_id = check_user_id AND is_active = true AND role = required_role);
    ELSE
        RETURN EXISTS (SELECT 1 FROM platform_admins WHERE user_id = check_user_id AND is_active = true);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_platform_admin(check_user_id, 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_blog(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM platform_admins WHERE user_id = check_user_id AND is_active = true AND role IN ('super_admin', 'content_admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Subscription Plans
DROP POLICY IF EXISTS "Anyone can read active subscription plans" ON subscription_plans;
CREATE POLICY "Anyone can read active subscription plans" ON subscription_plans FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Super admins can manage subscription plans" ON subscription_plans;
CREATE POLICY "Super admins can manage subscription plans" ON subscription_plans FOR ALL USING (is_super_admin(auth.uid()));

-- Organization Subscriptions
DROP POLICY IF EXISTS "Super admins can manage all subscriptions" ON organization_subscriptions;
CREATE POLICY "Super admins can manage all subscriptions" ON organization_subscriptions FOR ALL USING (is_super_admin(auth.uid()));

-- Subscription Invoices
DROP POLICY IF EXISTS "Super admins can manage all invoices" ON subscription_invoices;
CREATE POLICY "Super admins can manage all invoices" ON subscription_invoices FOR ALL USING (is_super_admin(auth.uid()));

-- Promo Codes
DROP POLICY IF EXISTS "Super admins can manage promo codes" ON promo_codes;
CREATE POLICY "Super admins can manage promo codes" ON promo_codes FOR ALL USING (is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Active promo codes readable for validation" ON promo_codes;
CREATE POLICY "Active promo codes readable for validation" ON promo_codes FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > NOW()));

-- Promo Code Usages
DROP POLICY IF EXISTS "Users can view their own promo code usages" ON promo_code_usages;
CREATE POLICY "Users can view their own promo code usages" ON promo_code_usages FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Super admins can manage promo code usages" ON promo_code_usages;
CREATE POLICY "Super admins can manage promo code usages" ON promo_code_usages FOR ALL USING (is_super_admin(auth.uid()));

-- Referrals
DROP POLICY IF EXISTS "Users can view their own referrals" ON referrals;
CREATE POLICY "Users can view their own referrals" ON referrals FOR SELECT USING (referrer_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can create referrals" ON referrals;
CREATE POLICY "Users can create referrals" ON referrals FOR INSERT WITH CHECK (referrer_user_id = auth.uid());
DROP POLICY IF EXISTS "Super admins can manage all referrals" ON referrals;
CREATE POLICY "Super admins can manage all referrals" ON referrals FOR ALL USING (is_super_admin(auth.uid()));

-- Blog Categories
DROP POLICY IF EXISTS "Anyone can read active blog categories" ON blog_categories;
CREATE POLICY "Anyone can read active blog categories" ON blog_categories FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Content admins can manage blog categories" ON blog_categories;
CREATE POLICY "Content admins can manage blog categories" ON blog_categories FOR ALL USING (can_manage_blog(auth.uid()));

-- Blog Tags
DROP POLICY IF EXISTS "Anyone can read blog tags" ON blog_tags;
CREATE POLICY "Anyone can read blog tags" ON blog_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Content admins can manage blog tags" ON blog_tags;
CREATE POLICY "Content admins can manage blog tags" ON blog_tags FOR ALL USING (can_manage_blog(auth.uid()));

-- Blog Posts
DROP POLICY IF EXISTS "Anyone can read published blog posts" ON blog_posts;
CREATE POLICY "Anyone can read published blog posts" ON blog_posts FOR SELECT USING (status = 'published' AND (published_at IS NULL OR published_at <= NOW()));
DROP POLICY IF EXISTS "Content admins can manage blog posts" ON blog_posts;
CREATE POLICY "Content admins can manage blog posts" ON blog_posts FOR ALL USING (can_manage_blog(auth.uid()));

-- Blog Post Tags
DROP POLICY IF EXISTS "Anyone can read blog post tags" ON blog_post_tags;
CREATE POLICY "Anyone can read blog post tags" ON blog_post_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Content admins can manage blog post tags" ON blog_post_tags;
CREATE POLICY "Content admins can manage blog post tags" ON blog_post_tags FOR ALL USING (can_manage_blog(auth.uid()));

-- Blog Comments
DROP POLICY IF EXISTS "Anyone can read approved comments" ON blog_comments;
CREATE POLICY "Anyone can read approved comments" ON blog_comments FOR SELECT USING (status = 'approved');
DROP POLICY IF EXISTS "Users can create comments" ON blog_comments;
CREATE POLICY "Users can create comments" ON blog_comments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Content admins can manage all comments" ON blog_comments;
CREATE POLICY "Content admins can manage all comments" ON blog_comments FOR ALL USING (can_manage_blog(auth.uid()));

-- Platform Admins
DROP POLICY IF EXISTS "Platform admins can view admin list" ON platform_admins;
CREATE POLICY "Platform admins can view admin list" ON platform_admins FOR SELECT USING (is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "Super admins can manage platform admins" ON platform_admins;
CREATE POLICY "Super admins can manage platform admins" ON platform_admins FOR ALL USING (is_super_admin(auth.uid()));

-- Admin Activity Logs
DROP POLICY IF EXISTS "Platform admins can view activity logs" ON admin_activity_logs;
CREATE POLICY "Platform admins can view activity logs" ON admin_activity_logs FOR SELECT USING (is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "Platform admins can create activity logs" ON admin_activity_logs;
CREATE POLICY "Platform admins can create activity logs" ON admin_activity_logs FOR INSERT WITH CHECK (is_platform_admin(auth.uid()));

-- Platform Metrics
DROP POLICY IF EXISTS "Super admins can view platform metrics" ON platform_metrics_daily;
CREATE POLICY "Super admins can view platform metrics" ON platform_metrics_daily FOR SELECT USING (is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Super admins can manage platform metrics" ON platform_metrics_daily;
CREATE POLICY "Super admins can manage platform metrics" ON platform_metrics_daily FOR ALL USING (is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Super admins can view revenue metrics" ON platform_revenue_monthly;
CREATE POLICY "Super admins can view revenue metrics" ON platform_revenue_monthly FOR SELECT USING (is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Super admins can manage revenue metrics" ON platform_revenue_monthly;
CREATE POLICY "Super admins can manage revenue metrics" ON platform_revenue_monthly FOR ALL USING (is_super_admin(auth.uid()));

-- =====================================================
-- SEED DATA: Default Subscription Plans
-- =====================================================

INSERT INTO subscription_plans (name, code, description, price_monthly, price_yearly, features, max_users, max_students, max_storage_gb, display_order) VALUES
('Essai Gratuit', 'trial', 'Essayez EDUZEN gratuitement pendant 14 jours', 0, 0, '["Accès complet pendant 14 jours", "Support par email", "Jusqu''à 10 stagiaires", "1 utilisateur"]', 1, 10, 1, 0),
('Free', 'free', 'Pour les petits organismes de formation', 0, 0, '["Gestion basique", "Jusqu''à 25 stagiaires", "2 utilisateurs", "Support communautaire"]', 2, 25, 2, 1),
('Pro', 'pro', 'Pour les organismes de formation en croissance', 49, 470, '["Toutes les fonctionnalités Free", "Jusqu''à 100 stagiaires", "5 utilisateurs", "E-learning", "Documents personnalisés", "Support prioritaire", "Exports avancés"]', 5, 100, 10, 2),
('Premium', 'premium', 'Pour les organismes de formation établis', 99, 950, '["Toutes les fonctionnalités Pro", "Stagiaires illimités", "10 utilisateurs", "API access", "Intégrations avancées", "Support dédié", "Formations personnalisées"]', 10, NULL, 50, 3),
('Enterprise', 'enterprise', 'Solution sur mesure pour les grands organismes', NULL, NULL, '["Tout illimité", "Utilisateurs illimités", "Support 24/7", "SLA personnalisé", "Déploiement dédié", "Formation équipe"]', NULL, NULL, NULL, 4)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = COALESCE(EXCLUDED.price_monthly, subscription_plans.price_monthly),
    price_yearly = COALESCE(EXCLUDED.price_yearly, subscription_plans.price_yearly),
    features = EXCLUDED.features,
    max_users = EXCLUDED.max_users,
    max_students = EXCLUDED.max_students,
    max_storage_gb = EXCLUDED.max_storage_gb,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['subscription_plans','organization_subscriptions','subscription_invoices','promo_codes','referrals','blog_categories','blog_posts','blog_comments','platform_admins']) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %I; CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t, t, t, t);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION increment_promo_code_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = NEW.promo_code_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_promo_code_used ON promo_code_usages;
CREATE TRIGGER on_promo_code_used AFTER INSERT ON promo_code_usages FOR EACH ROW EXECUTE FUNCTION increment_promo_code_usage();

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE year_prefix TEXT; next_num INTEGER;
BEGIN
    year_prefix := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 6) AS INTEGER)), 0) + 1 INTO next_num FROM subscription_invoices WHERE invoice_number LIKE year_prefix || '-%';
    NEW.invoice_number := year_prefix || '-' || LPAD(next_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS generate_invoice_number_trigger ON subscription_invoices;
CREATE TRIGGER generate_invoice_number_trigger BEFORE INSERT ON subscription_invoices FOR EACH ROW WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '') EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMENT ON TABLE subscription_plans IS 'Available subscription plans for the SaaS platform';
COMMENT ON TABLE organization_subscriptions IS 'Active and historical subscriptions for organizations';
COMMENT ON TABLE subscription_invoices IS 'Invoices generated for subscription payments';
COMMENT ON TABLE promo_codes IS 'Promotional codes for discounts and trials';
COMMENT ON TABLE referrals IS 'Referral program tracking';
COMMENT ON TABLE blog_posts IS 'Blog articles for the public website';
COMMENT ON TABLE platform_admins IS 'Platform-level admin users with elevated privileges';
COMMENT ON TABLE platform_metrics_daily IS 'Daily aggregated platform metrics for analytics';
