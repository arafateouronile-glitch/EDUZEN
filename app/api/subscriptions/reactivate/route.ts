import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import Stripe from 'stripe'
import { logger, sanitizeError } from '@/lib/utils/logger'

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, status, cancel_at_period_end')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!sub || !sub.stripe_subscription_id || !sub.cancel_at_period_end || sub.status !== 'active') {
      return NextResponse.json({ error: 'Aucune résiliation en cours à annuler' }, { status: 400 })
    }

    const stripe = getStripe()

    try {
      await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: false })
      // Pas d'écriture locale : le webhook customer.subscription.updated resynchronise.
    } catch (stripeError: unknown) {
      const code = (stripeError as { code?: string })?.code
      if (code === 'resource_missing') {
        return NextResponse.json({ error: "Cet abonnement n'existe plus, contactez le support" }, { status: 409 })
      }
      logger.error('Erreur réactivation Stripe', stripeError, { error: sanitizeError(stripeError) })
      const message = stripeError instanceof Error ? stripeError.message : 'Erreur lors de la réactivation'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    logger.error('Erreur réactivation abonnement', error, { error: sanitizeError(error) })
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
