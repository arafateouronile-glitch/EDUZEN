'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { CustomerEvent, OrganizationCrmSummary, HealthStatus } from '@/types/crm.types'

export type DemoLead = {
  id: string
  first_name: string
  last_name: string
  company: string
  email: string
  created_at: string
}

async function ensureSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (!admin) throw new Error('Accès réservé aux super admins')
  return createAdminClient()
}

function computeHealthStatus(daysSince: number | null): HealthStatus {
  if (daysSince === null) return 'new'
  if (daysSince <= 3) return 'active'
  if (daysSince <= 14) return 'at_risk'
  return 'inactive'
}

function computeMilestone(eventTypes: string[]): string {
  const has = (type: string) => eventTypes.includes(type)

  if (has('subscription_canceled')) return 'Abonnement annulé'
  if (has('billing_started') && (has('first_pdf_generated') || has('first_document_generated'))) {
    return 'Power User actif'
  }
  if (has('billing_started')) return 'Abonnement payant démarré'
  if (has('first_pdf_generated') || has('first_document_generated')) return 'Premier document généré'
  if (has('first_student_added')) return 'Premier apprenant ajouté'
  if (has('first_session_created')) return 'Première session créée'
  if (has('first_formation_created')) return 'Première formation créée'
  if (has('onboarding_started') || has('login')) return 'Onboarding en cours'
  if (has('signup')) return 'Compte créé'
  return 'Nouveau compte'
}

export async function getCrmOrganizations(): Promise<{
  success: boolean
  data?: OrganizationCrmSummary[]
  error?: string
}> {
  try {
    const supabase = await ensureSuperAdmin()

    // Fetch all organizations
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, subscription_status, subscription_tier')
      .order('created_at', { ascending: false })

    if (orgError) throw orgError

    if (!orgs || orgs.length === 0) {
      return { success: true, data: [] }
    }

    const orgIds = orgs.map((o) => o.id)

    // Fetch latest event per org + event type list
    const { data: events, error: eventsError } = await (supabase as unknown as import('@supabase/supabase-js').SupabaseClient)
      .from('customer_events')
      .select('organization_id, event_type, created_at')
      .in('organization_id', orgIds)
      .order('created_at', { ascending: false })

    if (eventsError) throw eventsError

    // Group events by org
    const eventsByOrg = new Map<string, { event_types: string[]; last_at: string; count: number }>()

    for (const ev of events ?? []) {
      const entry = eventsByOrg.get(ev.organization_id)
      if (!entry) {
        eventsByOrg.set(ev.organization_id, {
          event_types: [ev.event_type],
          last_at: ev.created_at,
          count: 1,
        })
      } else {
        entry.event_types.push(ev.event_type)
        // already ordered DESC so first one is latest
        entry.count++
      }
    }

    const now = Date.now()

    const data: OrganizationCrmSummary[] = orgs.map((org) => {
      const entry = eventsByOrg.get(org.id)
      const lastActivityAt = entry?.last_at ?? null
      const daysSince = lastActivityAt
        ? Math.floor((now - new Date(lastActivityAt).getTime()) / 86_400_000)
        : null

      return {
        organization_id: org.id,
        organization_name: org.name,
        subscription_status: org.subscription_status,
        subscription_tier: org.subscription_tier,
        last_activity_at: lastActivityAt,
        health_status: computeHealthStatus(daysSince),
        current_milestone: computeMilestone(entry?.event_types ?? []),
        event_count: entry?.count ?? 0,
        days_since_activity: daysSince,
      }
    })

    return { success: true, data }
  } catch (err) {
    logger.error('[crm-actions] getCrmOrganizations', err)
    return { success: false, error: 'Impossible de charger les données CRM' }
  }
}

export async function getDemoLeads(): Promise<{
  success: boolean
  data?: DemoLead[]
  error?: string
}> {
  try {
    const supabase = await ensureSuperAdmin()

    const { data, error } = await (supabase as unknown as import('@supabase/supabase-js').SupabaseClient)
      .from('demo_leads')
      .select('id, first_name, last_name, company, email, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (err) {
    logger.error('[crm-actions] getDemoLeads', err)
    return { success: false, error: 'Impossible de charger les leads' }
  }
}

export async function getOrganizationTimeline(organizationId: string): Promise<{
  success: boolean
  data?: CustomerEvent[]
  orgName?: string
  error?: string
}> {
  try {
    const supabase = await ensureSuperAdmin()

    const [{ data: org }, { data: events, error: eventsError }] = await Promise.all([
      supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .maybeSingle(),
      (supabase as unknown as import('@supabase/supabase-js').SupabaseClient)
        .from('customer_events')
        .select('id, organization_id, user_id, event_type, metadata, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200),
    ])

    if (eventsError) throw eventsError

    // Resolve user names
    const userIds = [...new Set((events ?? []).map((e: { user_id?: string }) => e.user_id).filter(Boolean) as string[])]
    const userMap = new Map<string, string>()

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds)

      for (const u of users ?? []) {
        userMap.set(u.id, (u as { full_name?: string; email?: string }).full_name || (u as { full_name?: string; email?: string }).email || 'Utilisateur inconnu')
      }
    }

    const data: CustomerEvent[] = (events ?? []).map((ev: Record<string, unknown>) => ({
      ...ev,
      metadata: (ev.metadata as Record<string, unknown>) ?? {},
      user_name: ev.user_id ? (userMap.get(ev.user_id as string) ?? null) : null,
    } as CustomerEvent))

    return { success: true, data, orgName: org?.name ?? organizationId }
  } catch (err) {
    logger.error('[crm-actions] getOrganizationTimeline', err)
    return { success: false, error: 'Impossible de charger la timeline' }
  }
}
