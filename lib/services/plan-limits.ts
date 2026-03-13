import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export type PlanTier = 'free' | 'starter' | 'professional' | 'enterprise'

const PLAN_FEATURES: Record<PlanTier, {
  apiAccess: boolean
  webhooksAccess: boolean
  maxApiKeysCount: number
  maxWebhooksCount: number
  maxRequestsPerMonth: number
}> = {
  free: {
    apiAccess: false,
    webhooksAccess: false,
    maxApiKeysCount: 0,
    maxWebhooksCount: 0,
    maxRequestsPerMonth: 0,
  },
  starter: {
    apiAccess: false,
    webhooksAccess: false,
    maxApiKeysCount: 0,
    maxWebhooksCount: 0,
    maxRequestsPerMonth: 0,
  },
  professional: {
    apiAccess: false,
    webhooksAccess: false,
    maxApiKeysCount: 0,
    maxWebhooksCount: 0,
    maxRequestsPerMonth: 0,
  },
  enterprise: {
    apiAccess: true,
    webhooksAccess: true,
    maxApiKeysCount: 20,
    maxWebhooksCount: 50,
    maxRequestsPerMonth: -1, // illimité
  },
}

export async function getOrganizationPlan(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<PlanTier> {
  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier')
    .eq('id', organizationId)
    .single()

  return (org?.subscription_tier as PlanTier) || 'free'
}

export async function canUseAPI(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<boolean> {
  const plan = await getOrganizationPlan(supabase, organizationId)
  return PLAN_FEATURES[plan]?.apiAccess ?? false
}

export async function canUseWebhooks(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<boolean> {
  const plan = await getOrganizationPlan(supabase, organizationId)
  return PLAN_FEATURES[plan]?.webhooksAccess ?? false
}

export function getPlanFeatures(plan: PlanTier) {
  return PLAN_FEATURES[plan] || PLAN_FEATURES.free
}

export async function getOrganizationPlanFeatures(
  supabase: SupabaseClient<Database>,
  organizationId: string
) {
  const plan = await getOrganizationPlan(supabase, organizationId)
  return { plan, features: getPlanFeatures(plan) }
}
