import { getPublicErrorMessage } from '@/lib/utils/api-error-response'
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { withRateLimit, generalRateLimiter } from '@/lib/utils/rate-limiter'

/**
 * GET /api/payments/stripe/status/[paymentIntentId]
 * Vérifier le statut d'un paiement Stripe
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentIntentId: string }> }
) {
  return withRateLimit(request, generalRateLimiter, async (req) => {
    try {
      const { paymentIntentId } = await params
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const userOrgId = await getUserOrgId(supabase, user.id)
      if (!userOrgId) {
        return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
      }

      const { data: payment, error } = await supabase
        .from('payments')
        .select('id, status, amount, currency, paid_at, receipt_url')
        .eq('payment_provider_transaction_id', paymentIntentId)
        .eq('organization_id', userOrgId)
        .single()

      if (error || !payment) {
        return NextResponse.json({ error: 'Paiement non trouvé' }, { status: 404 })
      }

      // Mapper le statut
      const statusMap: Record<string, string> = {
        pending: 'requires_payment_method',
        processing: 'processing',
        completed: 'succeeded',
        failed: 'canceled',
        canceled: 'canceled',
      }

      const paymentStatus: string = payment.status ?? 'pending'
      return NextResponse.json({
        status: statusMap[paymentStatus] ?? paymentStatus,
        amount: Number(payment.amount) || 0,
        currency: payment.currency,
        paid: paymentStatus === 'completed',
      })
    } catch (error: unknown) {
      const errorMessage = getPublicErrorMessage(error)
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  })
}
