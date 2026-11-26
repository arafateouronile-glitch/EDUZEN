/**
 * Leads des outils gratuits : création ou mise à jour (un lead par email),
 * trace de chaque document demandé, entrée dans la séquence marketing.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { OutilKey } from '@/lib/outils/tools'
import { nurtureSendDate } from '@/lib/outils/nurture-schedule'

// Tables récentes, absentes des types générés
type AnyClient = any

export interface LeadRecord {
  id: string
  email: string
  first_name: string | null
  unsubscribe_token: string
  created: boolean
}

export async function recordLead(input: {
  email: string
  firstName: string
  lastName: string
  organizationName: string
  phone?: string
  tool: OutilKey
  payload: Record<string, unknown>
  qualiopiScore?: number | null
}): Promise<LeadRecord> {
  const admin = createAdminClient() as AnyClient
  const email = input.email.trim().toLowerCase()
  const now = new Date()

  const { data: existing } = await admin
    .from('lead_magnet_leads')
    .select('id, tools, first_name, unsubscribe_token')
    .eq('email', email)
    .maybeSingle()

  let lead: { id: string; first_name: string | null; unsubscribe_token: string }
  let created = false

  if (existing) {
    const tools = Array.from(new Set([...(existing.tools ?? []), input.tool]))
    const { error } = await admin
      .from('lead_magnet_leads')
      .update({
        tools,
        first_name: input.firstName || existing.first_name,
        last_name: input.lastName,
        organization_name: input.organizationName,
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.qualiopiScore != null ? { qualiopi_score: input.qualiopiScore } : {}),
        updated_at: now.toISOString(),
      })
      .eq('id', existing.id)
    if (error) throw new Error(error.message)
    lead = existing
  } else {
    // Déjà client EduZen : pas de séquence marketing
    const { data: user } = await admin.from('users').select('id').ilike('email', email).limit(1).maybeSingle()
    const { data, error } = await admin
      .from('lead_magnet_leads')
      .insert({
        email,
        first_name: input.firstName,
        last_name: input.lastName,
        organization_name: input.organizationName,
        phone: input.phone || null,
        first_tool: input.tool,
        tools: [input.tool],
        qualiopi_score: input.qualiopiScore ?? null,
        next_email_at: user ? null : nurtureSendDate(now, 0)?.toISOString(),
        converted_at: user ? now.toISOString() : null,
      })
      .select('id, first_name, unsubscribe_token')
      .single()
    if (error) throw new Error(error.message)
    lead = data
    created = true
  }

  const { error: requestError } = await admin
    .from('lead_magnet_requests')
    .insert({ lead_id: lead.id, tool: input.tool, payload: input.payload })
  if (requestError) throw new Error(requestError.message)

  return { id: lead.id, email, first_name: lead.first_name, unsubscribe_token: lead.unsubscribe_token, created }
}

export function unsubscribeUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/desabonnement?t=${token}`
}

/** En-têtes de désabonnement en un clic (RFC 8058) */
export function unsubscribeHeaders(baseUrl: string, token: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${baseUrl}/api/outils/unsubscribe?t=${token}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}
