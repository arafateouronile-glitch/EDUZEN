import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, generalRateLimiter } from '@/lib/utils/rate-limiter'

/**
 * GET /api/payments/stripe/status/[paymentIntentId]
 * Vérifier le statut d'un paiement Stripe
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { paymentIntentId: string } }
) {
  return withRateLimit(request, generalRateLimiter, async (req) => {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { paymentIntentId } = await params

      // TODO: Vérifier avec l'API Stripe réelle
      // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
      // const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

      // Pour l'instant, récupérer depuis la base de données
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .eq('payment_provider_transaction_id', paymentIntentId)
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

      return NextResponse.json({
        status: statusMap[payment.status] || payment.status,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        paid: payment.status === 'completed',
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  })
}
