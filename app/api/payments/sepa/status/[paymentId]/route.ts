import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

/**
 * GET /api/payments/sepa/status/[paymentId]
 * Vérifier le statut d'un paiement SEPA
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { paymentId } = params

    // Récupérer depuis la base de données
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (error || !payment) {
      return NextResponse.json({ error: 'Paiement non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      status: payment.status,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      completed: payment.status === 'completed',
    })
  } catch (error: unknown) {
    logger.error('Error checking SEPA payment status', error, {
      paymentId: maskId(paymentId),
      userId: user ? maskId(user.id) : undefined,
      error: sanitizeError(error),
    })
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
