'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/utils/logger'

export async function updateAffiliatePaymentDetails(
  payload: { payment_iban?: string | null; payment_bic?: string | null; payment_holder_name?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      return { success: false, error: 'Non authentifié' }
    }

    const admin = createAdminClient()
    const { data: affiliate, error: findError } = await admin
      .from('affiliates')
      .select('id')
      .eq('email', user.email)
      .eq('status', 'approved')
      .maybeSingle()

    if (findError || !affiliate) {
      return { success: false, error: 'Affilié introuvable' }
    }

    const { error: updateError } = await admin
      .from('affiliates')
      .update({
        payment_iban: payload.payment_iban ?? null,
        payment_bic: payload.payment_bic ?? null,
        payment_holder_name: payload.payment_holder_name ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', (affiliate as { id: string }).id)

    if (updateError) {
      logger.error('[affiliate-portal] updatePayment', updateError)
      return { success: false, error: updateError.message }
    }

    revalidatePath('/dashboard/affiliate')
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inconnue'
    logger.error('[affiliate-portal] updatePayment', e)
    return { success: false, error: msg }
  }
}
