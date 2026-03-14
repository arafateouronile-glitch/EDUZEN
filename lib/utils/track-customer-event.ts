'use server'

/**
 * CRM — Tracking asynchrone du parcours client
 *
 * Cette fonction est fire-and-forget : elle ne jette jamais d'erreur
 * pour ne pas bloquer l'action utilisateur qui l'appelle.
 *
 * Usage dans une Server Action ou API Route :
 *   void trackCustomerEvent(orgId, userId, 'first_pdf_generated', { pages: 3 })
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import type { CustomerEventType } from '@/types/crm.types'

export async function trackCustomerEvent(
  organizationId: string,
  userId: string | null,
  eventType: CustomerEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { error } = await (supabase as any).from('customer_events').insert({
      organization_id: organizationId,
      user_id: userId ?? null,
      event_type: eventType,
      metadata: metadata ?? {},
    })

    if (error) {
      logger.warn('[CRM] trackCustomerEvent insert failed', {
        organizationId,
        eventType: eventType as string,
        error: error.message,
      })
    }
  } catch {
    // Jamais de throw — ne pas impacter l'action principale
    logger.warn('[CRM] trackCustomerEvent exception', {
      organizationId,
      eventType: eventType as string,
    })
  }
}
