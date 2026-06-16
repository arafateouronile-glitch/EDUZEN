import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
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
    // Étape 1: Auth
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    // Étape 3: Body
    const body = await request.json().catch(() => ({}))
    const planId = body.planId as string | undefined
    const billingPeriod = (body.billingPeriod as string) || 'monthly'

    if (!planId) {
      return NextResponse.json({ error: 'planId requis' }, { status: 400 })
    }

    // Étape 4: Stripe key
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'STRIPE_SECRET_KEY non configurée sur le serveur' }, { status: 500 })
    }
    const stripe = new Stripe(secretKey, { apiVersion: '2026-01-28.clover' })

    // Étape 5: Organisation name
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', orgId)
      .single()

    // Étape 6: Customer Stripe
    let customerId: string
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', orgId)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle()

    const createNewCustomer = async () => {
      const cookieStore = await cookies()
      const affiliateRef = cookieStore.get('eduzen_affiliate_ref')?.value?.trim()
      const metadata: Record<string, string> = {
        organization_id: orgId!,
        user_id: user.id,
      }
      if (affiliateRef) metadata.affiliate_id = affiliateRef
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: organization?.name || 'Organisation',
        metadata,
      })
      return customer.id
    }

    if (existingSubscription?.stripe_customer_id) {
      // Vérifier que le customer existe encore dans Stripe (évite les erreurs test/live ou suppression)
      try {
        const existing = await stripe.customers.retrieve(existingSubscription.stripe_customer_id)
        // retrieve() ne throw pas si supprimé, il retourne { deleted: true }
        if ((existing as { deleted?: boolean }).deleted) {
          customerId = await createNewCustomer()
        } else {
          customerId = existingSubscription.stripe_customer_id
        }
      } catch {
        // Customer introuvable dans Stripe → en créer un nouveau
        customerId = await createNewCustomer()
      }
    } else {
      customerId = await createNewCustomer()
    }

    // Étape 7: Checkout session
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
        organization_id: orgId,
        user_id: user.id,
        plan_id: planId,
        billing_period: billingPeriod,
        purpose: 'trial_onboarding',
      },
    })

    logger.info('Checkout setup session créée', {
      sessionId: session.id,
      organizationId: orgId,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erreur serveur'
    logger.error('Erreur création checkout setup', { error: msg })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
