/** Désabonnement d'un lead des outils gratuits à partir du jeton de ses emails */

import { createAdminClient } from '@/lib/supabase/admin'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function unsubscribeLead(token: string): Promise<boolean> {
  if (!UUID.test(token)) return false
  const admin = createAdminClient() as any
  const { data } = await admin
    .from('lead_magnet_leads')
    .select('id, unsubscribed_at')
    .eq('unsubscribe_token', token)
    .maybeSingle()
  if (!data) return false
  if (!data.unsubscribed_at) {
    await admin
      .from('lead_magnet_leads')
      .update({ unsubscribed_at: new Date().toISOString(), next_email_at: null, updated_at: new Date().toISOString() })
      .eq('id', data.id)
  }
  return true
}
