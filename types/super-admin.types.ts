// =====================================================
// SUPER ADMIN MODULE - TypeScript Type Definitions
// =====================================================

// =====================================================
// 1. PLATFORM ADMIN ROLES & PERMISSIONS
// =====================================================

export type PlatformAdminRole =
  | 'super_admin'
  | 'content_admin'
  | 'support_admin'
  | 'finance_admin'

export interface AdminPermissions {
  view_dashboard: boolean
  view_revenue: boolean
  manage_subscriptions: boolean
  manage_invoices: boolean
  manage_promo_codes: boolean
  manage_referrals: boolean
  manage_blog: boolean
  publish_posts: boolean
  moderate_comments: boolean
  manage_team: boolean
}

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<
  PlatformAdminRole,
  AdminPermissions
> = {
  super_admin: {
    view_dashboard: true,
    view_revenue: true,
    manage_subscriptions: true,
    manage_invoices: true,
    manage_promo_codes: true,
    manage_referrals: true,
    manage_blog: true,
    publish_posts: true,
    moderate_comments: true,
    manage_team: true,
  },
  content_admin: {
    view_dashboard: true,
    view_revenue: false,
    manage_subscriptions: false,
    manage_invoices: false,
    manage_promo_codes: false,
    manage_referrals: false,
    manage_blog: true,
    publish_posts: true,
    moderate_comments: true,
    manage_team: false,
  },
  support_admin: {
    view_dashboard: true,
    view_revenue: false,
    manage_subscriptions: false,
    manage_invoices: false,
    manage_promo_codes: false,
    manage_referrals: false,
    manage_blog: false,
    publish_posts: false,
    moderate_comments: true,
    manage_team: false,
  },
  finance_admin: {
    view_dashboard: true,
    view_revenue: true,
    manage_subscriptions: true,
    manage_invoices: true,
    manage_promo_codes: true,
    manage_referrals: true,
    manage_blog: false,
    publish_posts: false,
    moderate_comments: false,
    manage_team: false,
  },
}

// =====================================================
// 2. SUBSCRIPTION MANAGEMENT
// =====================================================

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'

export type BillingCycle = 'monthly' | 'yearly'

export interface SubscriptionPlan {
  id: string
  name: string
  code: string
  description: string | null
  price_monthly: number
  price_yearly: number
  currency: string
  features: string[]
  max_users: number | null
  max_students: number | null
  max_storage_gb: number | null
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface OrganizationSubscription {
  id: string
  organization_id: string
  plan_id: string
  status: SubscriptionStatus
  billing_cycle: BillingCycle
  current_period_start: string
  current_period_end: string
  trial_ends_at: string | null
  canceled_at: string | null
  cancel_reason: string | null
  payment_method: Record<string, unknown> | null
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations
  plan?: SubscriptionPlan
  organization?: {
    id: string
    name: string
    code?: string | null
    logo_url: string | null
    country?: string | null
    created_at?: string
  }
}

export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'void'

export interface SubscriptionInvoice {
  id: string
  organization_id: string
  subscription_id: string | null
  invoice_number: string
  amount: number
  tax_amount: number
  total_amount: number
  currency: string
  status: InvoiceStatus
  billing_period_start: string | null
  billing_period_end: string | null
  due_date: string | null
  paid_at: string | null
  stripe_invoice_id: string | null
  stripe_payment_intent_id: string | null
  pdf_url: string | null
  line_items: Array<Record<string, unknown>>
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// =====================================================
// 3. MARKETING (PROMO CODES & REFERRALS)
// =====================================================

export type DiscountType = 'percentage' | 'fixed_amount' | 'trial_extension'

export interface PromoCode {
  id: string
  code: string
  description: string | null
  discount_type: DiscountType
  discount_value: number
  currency: string | null
  valid_from: string
  valid_until: string | null
  max_uses: number | null
  max_uses_per_user: number
  current_uses: number
  min_subscription_amount: number | null
  applicable_plans: string[] | null
  first_subscription_only: boolean
  is_active: boolean
  created_by: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PromoCodeUsage {
  id: string
  promo_code_id: string
  organization_id: string
  user_id: string
  subscription_id: string | null
  discount_applied: number
  used_at: string
  // Relations
  promo_code?: PromoCode
}

export type ReferralStatus =
  | 'pending'
  | 'signed_up'
  | 'subscribed'
  | 'rewarded'
  | 'expired'

export type RewardType = 'credit' | 'discount' | 'free_months'

export interface Referral {
  id: string
  referrer_organization_id: string
  referrer_user_id: string
  referred_organization_id: string | null
  referred_email: string
  referral_code: string
  status: ReferralStatus
  referrer_reward_type: RewardType | null
  referrer_reward_value: number | null
  referred_reward_type: RewardType | null
  referred_reward_value: number | null
  rewards_applied_at: string | null
  signed_up_at: string | null
  subscribed_at: string | null
  expires_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// =====================================================
// 4. BLOG CMS
// =====================================================

export type BlogPostStatus =
  | 'draft'
  | 'pending_review'
  | 'scheduled'
  | 'published'
  | 'archived'

export interface BlogCategory {
  id: string
  name: string
  slug: string
  description: string | null
  parent_id: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Relations
  parent?: BlogCategory
  children?: BlogCategory[]
}

export interface BlogTag {
  id: string
  name: string
  slug: string
  color: string
  created_at: string
}

export interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  featured_image_url: string | null
  meta_title: string | null
  meta_description: string | null
  canonical_url: string | null
  status: BlogPostStatus
  published_at: string | null
  scheduled_for: string | null
  author_id: string
  category_id: string | null
  views_count: number
  likes_count: number
  shares_count: number
  comments_count?: number
  allow_comments: boolean
  is_featured: boolean
  reading_time_minutes: number | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Relations
  author?: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
  category?: BlogCategory
  tags?: BlogTag[]
}

export type CommentStatus = 'pending' | 'approved' | 'spam' | 'deleted'

export interface BlogComment {
  id: string
  post_id: string
  parent_id: string | null
  user_id: string | null
  guest_name: string | null
  guest_email: string | null
  content: string
  status: CommentStatus
  ip_address: string | null
  user_agent: string | null
  likes_count: number
  created_at: string
  updated_at: string
  // Relations
  user?: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
  post?: BlogPost
  parent?: BlogComment
  replies?: BlogComment[]
}

// =====================================================
// 5. PLATFORM ADMIN
// =====================================================

export interface PlatformAdmin {
  id: string
  user_id: string
  role: PlatformAdminRole
  permissions: AdminPermissions
  is_active: boolean
  last_active_at: string | null
  invited_by: string | null
  invited_at: string
  accepted_at: string | null
  revoked_at: string | null
  revoked_by: string | null
  revoke_reason: string | null
  created_at: string
  updated_at: string
  // Relations
  user?: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
  inviter?: PlatformAdmin
}

export interface AdminActivityLog {
  id: string
  admin_id: string
  action: string
  resource_type: string | null
  resource_id: string | null
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
  // Relations
  admin?: PlatformAdmin
}

// =====================================================
// 6. PLATFORM METRICS & ANALYTICS
// =====================================================

export interface PlatformMetricsDaily {
  id: string
  date: string
  mrr: number
  arr: number
  new_revenue: number
  churned_revenue: number
  total_organizations: number
  active_organizations: number
  new_organizations: number
  churned_organizations: number
  trial_organizations: number
  free_organizations: number
  paid_organizations: number
  organizations_by_plan: Record<string, number>
  total_users: number
  active_users_day: number
  active_users_week: number
  active_users_month: number
  new_users: number
  total_sessions_created: number
  total_students_enrolled: number
  total_documents_generated: number
  churn_rate: number
  retention_rate: number
  conversion_rate: number
  created_at: string
}

export interface PlatformRevenueMonthly {
  id: string
  year: number
  month: number
  gross_revenue: number
  refunds: number
  net_revenue: number
  new_business_revenue: number
  expansion_revenue: number
  recurring_revenue: number
  total_transactions: number
  successful_transactions: number
  failed_transactions: number
  revenue_by_plan: Record<string, number>
  revenue_by_country: Record<string, number>
  created_at: string
}

// =====================================================
// 7. DASHBOARD KPIs & DATA
// =====================================================

export interface DashboardKPIs {
  mrr: number
  mrrGrowth?: number
  arr: number
  activeOrganizations: number
  active_organizations?: number // Alias pour compatibilité
  newSubscribersThisMonth: number
  new_subscribers_this_month?: number // Alias pour compatibilité
  churnRate: number
  churn_rate?: number // Alias pour compatibilité
  retentionRate: number
  retention_rate?: number // Alias pour compatibilité
  conversionRate?: number
  conversion_rate?: number // Alias pour compatibilité
  totalRevenue?: number
  total_revenue?: number // Alias pour compatibilité
  growthRate?: number
  growth_rate?: number // Alias pour compatibilité
  averageRevenuePerUser?: number
  average_revenue_per_user?: number // Alias pour compatibilité
}

export interface RevenueDataPoint {
  date: string
  revenue: number
  mrr: number
  new_subscriptions: number
}

export interface SubscriptionDistribution {
  plan_name: string
  count: number
  percentage: number
  revenue: number
}

// =====================================================
// 8. PAGINATION & FILTERS
// =====================================================

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus[]
  plan_id?: string
  search?: string
  date_from?: string
  date_to?: string
}

export interface BlogPostFilters {
  status?: BlogPostStatus[]
  category_id?: string
  author_id?: string
  search?: string
  is_featured?: boolean
  date_from?: string
  date_to?: string
}

export interface PromoCodeFilters {
  is_active?: boolean
  discount_type?: DiscountType
  search?: string
  date_from?: string
  date_to?: string
}

// =====================================================
// 9. INPUT TYPES (For Forms)
// =====================================================

// Alias pour compatibilité
export type PromoDiscountType = DiscountType

export interface CreatePromoCodeInput {
  code: string
  description?: string | null
  discount_type: DiscountType
  discount_value: number
  currency?: string | null
  valid_from: Date | string
  valid_until?: Date | string | null
  max_uses?: number | null
  max_uses_per_user?: number
  min_subscription_amount?: number | null
  applicable_plans?: string[] | null
  first_subscription_only?: boolean
  is_active?: boolean
  metadata?: Record<string, unknown>
}

export interface CreateBlogPostInput {
  title: string
  slug?: string
  excerpt?: string | null
  content: string
  featured_image_url?: string | null
  meta_title?: string | null
  meta_description?: string | null
  canonical_url?: string | null
  status: BlogPostStatus
  published_at?: string | null
  scheduled_for?: Date | string | null
  category_id?: string | null
  tag_ids?: string[]
  allow_comments?: boolean
  is_featured?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateBlogPostInput extends Partial<CreateBlogPostInput> {
  id: string
}
