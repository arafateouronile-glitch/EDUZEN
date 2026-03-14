'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type EmailLogStatus = 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed'

export interface EmailLog {
  id: string
  organization_id: string | null
  recipient: string
  subject: string
  template_type: string | null
  resend_id: string | null
  status: EmailLogStatus
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  organization?: { id: string; name: string } | null
}

export interface EmailLogsFilters {
  status?: EmailLogStatus | 'all'
  search?: string
  organizationId?: string
  templateType?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export interface EmailLogsResult {
  logs: EmailLog[]
  total: number
  stats: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    complained: number
    failed: number
  }
}

async function assertPlatformAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { data: admin } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!admin) throw new Error('Accès refusé')
}

export async function getEmailLogs(filters: EmailLogsFilters = {}): Promise<EmailLogsResult> {
  await assertPlatformAdmin()

  const supabase = createAdminClient()
  const {
    status = 'all',
    search = '',
    organizationId,
    templateType,
    dateFrom,
    dateTo,
    limit = 50,
    offset = 0,
  } = filters

  // ── Requête principale ──
  let query = (supabase as any)
    .from('email_logs')
    .select(`
      id,
      organization_id,
      recipient,
      subject,
      template_type,
      resend_id,
      status,
      metadata,
      created_at,
      updated_at,
      organization:organizations(id, name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status !== 'all') {
    query = query.eq('status', status)
  }
  if (search) {
    query = query.ilike('recipient', `%${search}%`)
  }
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }
  if (templateType) {
    query = query.eq('template_type', templateType)
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom)
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo)
  }

  const { data: logs, error, count } = await query

  if (error) throw new Error(`Erreur récupération email_logs : ${error.message}`)

  // ── Stats globales (sans les filtres de pagination) ──
  const { data: statsData } = await (supabase as any)
    .from('email_logs')
    .select('status')

  const stats = {
    sent:       0,
    delivered:  0,
    opened:     0,
    clicked:    0,
    bounced:    0,
    complained: 0,
    failed:     0,
  }
  for (const row of statsData ?? []) {
    const s = row.status as EmailLogStatus
    if (s in stats) stats[s]++
  }

  return {
    logs: (logs ?? []) as EmailLog[],
    total: count ?? 0,
    stats,
  }
}
