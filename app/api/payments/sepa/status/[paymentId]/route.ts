import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

/**
 * GET /api/payments/sepa/status/[paymentId]
 * Vérifier le statut d'un paiement SEPA
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userRow?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    // Récupérer depuis la base de données (filtré par organisation)
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('organization_id', userRow.organization_id)
      .single()

    if (error || !payment) {
      return NextResponse.json({ error: 'Paiement non trouvé' }, { status: 404 })
    }

    return NextResponse.json({
      status: payment.status,
      amount: parseFloat(String(payment.amount)),
      currency: payment.currency,
      completed: payment.status === 'completed',
    })
  } catch (error: unknown) {
    const resolvedParams = await params
    const resolvedPaymentId = resolvedParams?.paymentId || ''
    const supabase = await createClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    
    logger.error('Error checking SEPA payment status', error, {
      paymentId: maskId(resolvedPaymentId),
      userId: currentUser ? maskId(currentUser.id) : undefined,
      error: sanitizeError(error),
    })
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
