import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { logger } from '@/lib/utils/logger'

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(secretKey)
}

/**
 * POST /api/subscriptions/complete-checkout-setup
 *
 * Après redirection depuis Stripe Checkout (mode setup), récupère la session
 * et retourne paymentMethodId + customerId pour que le client appelle
 * create-trial-subscription.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const sessionId = body.session_id as string | undefined

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id requis' }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['setup_intent'],
    })

    if (session.mode !== 'setup' || !session.setup_intent) {
      return NextResponse.json({ error: 'Session invalide ou expirée' }, { status: 400 })
    }

    const setupIntent = session.setup_intent as Stripe.SetupIntent
    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id

    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

    if (!paymentMethodId || !customerId) {
      return NextResponse.json({ error: 'Moyen de paiement non trouvé' }, { status: 400 })
    }

    logger.info('Checkout setup récupéré', {
      sessionId,
      organizationId: userData.organization_id,
    })

    return NextResponse.json({
      paymentMethodId,
      customerId,
    })
  } catch (error) {
    logger.error('Erreur complete-checkout-setup', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
