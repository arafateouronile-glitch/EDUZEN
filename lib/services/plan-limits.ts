import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Codes correspondant exactement aux valeurs de subscription_plans.code en base
export type PlanTier = 'trial' | 'free' | 'pro' | 'premium' | 'enterprise'

const PLAN_FEATURES: Record<PlanTier, {
  apiAccess: boolean
  webhooksAccess: boolean
  maxApiKeysCount: number
  maxWebhooksCount: number
  maxRequestsPerMonth: number
}> = {
  trial: {
    apiAccess: false,
    webhooksAccess: false,
    maxApiKeysCount: 0,
    maxWebhooksCount: 0,
    maxRequestsPerMonth: 0,
  },
  free: {
    apiAccess: false,
    webhooksAccess: false,
    maxApiKeysCount: 0,
    maxWebhooksCount: 0,
    maxRequestsPerMonth: 0,
  },
  pro: {
    apiAccess: false,
    webhooksAccess: false,
    maxApiKeysCount: 0,
    maxWebhooksCount: 0,
    maxRequestsPerMonth: 0,
  },
  // @deprecated 'premium' n'est plus un plan vendable (le plan vendable
  // au-dessus de Pro s'appelle "Enterprise"). Conservé en alias sur les
  // mêmes valeurs qu'"enterprise" pour ne pas faire tomber en fail-closed
  // silencieux une organisation dont `subscription_tier` porterait encore
  // cette valeur legacy (champ texte libre, sans contrainte CHECK).
  premium: {
    apiAccess: true,
    webhooksAccess: true,
    maxApiKeysCount: 20,
    maxWebhooksCount: 50,
    maxRequestsPerMonth: -1,
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
