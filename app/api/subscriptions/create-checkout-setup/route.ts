import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { logger } from '@/lib/utils/logger'

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(secretKey)
}

/**
 * POST /api/subscriptions/create-checkout-setup
 *
 * Crée une session Stripe Checkout en mode "setup" pour collecter la carte
 * sur la page hébergée par Stripe. Redirection vers success_url avec session_id.
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
    const planId = body.planId as string | undefined
    const billingPeriod = (body.billingPeriod as string) || 'monthly'

    if (!planId) {
      return NextResponse.json({ error: 'planId requis' }, { status: 400 })
    }

    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', userData.organization_id)
      .single()

    let customerId: string
    const stripe = getStripe()

    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', userData.organization_id)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle()

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id
    } else {
      const cookieStore = await cookies()
      const affiliateRef = cookieStore.get('eduzen_affiliate_ref')?.value?.trim()
      const metadata: Record<string, string> = {
        organization_id: userData.organization_id,
        user_id: user.id,
      }
      if (affiliateRef) metadata.affiliate_id = affiliateRef

      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: organization?.name || 'Organisation',
        metadata,
      })
      customerId = customer.id
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001')
    const origin = request.headers.get('origin') || new URL(request.url).origin || baseUrl

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'setup',
      success_url: `${origin}/dashboard/onboarding?step=4&session_id={CHECKOUT_SESSION_ID}&planId=${encodeURIComponent(planId)}&billingPeriod=${encodeURIComponent(billingPeriod)}`,
      cancel_url: `${origin}/dashboard/onboarding?step=4&canceled=1`,
      metadata: {
        organization_id: userData.organization_id,
        user_id: user.id,
        plan_id: planId,
        billing_period: billingPeriod,
        purpose: 'trial_onboarding',
      },
    })

    logger.info('Checkout setup session créée', {
      sessionId: session.id,
      organizationId: userData.organization_id,
    })

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    logger.error('Erreur création checkout setup', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
