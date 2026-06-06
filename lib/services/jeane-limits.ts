import type { SupabaseClient } from '@supabase/supabase-js'

export const JEANE_TRIAL_LIMITS = {
  programs: 2,
  formations: 2,
  sessions: 2,
} as const

export type JeaneResourceType = keyof typeof JEANE_TRIAL_LIMITS

export interface JeaneUsage {
  programs: number
  formations: number
  sessions: number
}

export interface JeaneQuota {
  usage: JeaneUsage
  limits: typeof JEANE_TRIAL_LIMITS
  remaining: JeaneUsage
  isTrial: boolean
}

async function isTrialOrg(supabase: SupabaseClient, orgId: string): Promise<boolean> {
  const { data } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('organization_id', orgId)
    .maybeSingle()
  return !data || data.status === 'trialing'
}

function getUsageFromSettings(settings: Record<string, unknown>): JeaneUsage {
  const raw = (settings.jeane_trial_usage as Partial<JeaneUsage>) || {}
  return {
    programs: raw.programs ?? 0,
    formations: raw.formations ?? 0,
    sessions: raw.sessions ?? 0,
  }
}

export async function getJeaneQuota(supabase: SupabaseClient, orgId: string): Promise<JeaneQuota> {
  const isTrial = await isTrialOrg(supabase, orgId)

  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  const settings = (org?.settings as Record<string, unknown>) || {}
  const usage = getUsageFromSettings(settings)

  return {
    usage,
    limits: JEANE_TRIAL_LIMITS,
    remaining: {
      programs: Math.max(0, JEANE_TRIAL_LIMITS.programs - usage.programs),
      formations: Math.max(0, JEANE_TRIAL_LIMITS.formations - usage.formations),
      sessions: Math.max(0, JEANE_TRIAL_LIMITS.sessions - usage.sessions),
    },
    isTrial,
  }
}

export async function checkJeaneLimit(
  supabase: SupabaseClient,
  orgId: string,
  resource: JeaneResourceType
): Promise<{ allowed: boolean; remaining: number; message?: string }> {
  const isTrial = await isTrialOrg(supabase, orgId)
  if (!isTrial) return { allowed: true, remaining: Infinity }

  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  const settings = (org?.settings as Record<string, unknown>) || {}
  const usage = getUsageFromSettings(settings)
  const current = usage[resource]
  const limit = JEANE_TRIAL_LIMITS[resource]
  const remaining = Math.max(0, limit - current)

  if (current >= limit) {
    const labels: Record<JeaneResourceType, string> = {
      programs: 'programmes',
      formations: 'formations',
      sessions: 'sessions',
    }
    return {
      allowed: false,
      remaining: 0,
      message: `Limite atteinte : vous avez utilisé vos ${limit} ${labels[resource]} Jeane inclus dans l'essai gratuit. Passez à une formule payante pour créer sans limite.`,
    }
  }

  return { allowed: true, remaining }
}

export async function incrementJeaneUsage(
  supabase: SupabaseClient,
  orgId: string,
  resource: JeaneResourceType
): Promise<void> {
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single()

  const settings = (org?.settings as Record<string, unknown>) || {}
  const usage = getUsageFromSettings(settings)
  usage[resource] = (usage[resource] ?? 0) + 1

  await supabase
    .from('organizations')
    .update({ settings: { ...settings, jeane_trial_usage: usage } })
    .eq('id', orgId)
}
