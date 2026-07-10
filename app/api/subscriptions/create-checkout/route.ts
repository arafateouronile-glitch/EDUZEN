import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import Stripe from 'stripe'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { APP_URLS } from '@/lib/config/app-config'

// Initialiser Stripe uniquement si la clé est disponible
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
    
    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }
    
    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }
    
    const { planId, billingPeriod } = await request.json()
    
    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID requis' },
        { status: 400 }
      )
    }
    
    // Récupérer le plan
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, stripe_price_id_yearly, stripe_price_id_monthly, stripe_price_id')
      .eq('id', planId)
      .eq('is_active', true)
      .single()
    
    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan non trouvé' },
        { status: 404 }
      )
    }
    
    // Déterminer le price_id Stripe selon la période
    const planPrices = plan as { stripe_price_id_yearly?: string; stripe_price_id_monthly?: string; stripe_price_id?: string }
    const stripePriceId = billingPeriod === 'yearly'
      ? (planPrices.stripe_price_id_yearly || planPrices.stripe_price_id)
      : (planPrices.stripe_price_id_monthly || planPrices.stripe_price_id)
    
    if (!stripePriceId) {
      return NextResponse.json(
        { error: `Configuration Stripe manquante pour ce plan (${billingPeriod})` },
        { status: 400 }
      )
    }
    
    // Récupérer ou créer le customer Stripe
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, email, settings')
      .eq('id', orgId)
      .single()

    const stripe = getStripe()

    // Crée un customer Stripe frais
    const createFreshCustomer = async () => {
      const cookieStore = await cookies()
      const affiliateRef = cookieStore.get('eduzen_affiliate_ref')?.value?.trim()
      const savedAffiliateId = (organization?.settings as Record<string, unknown> | null)?.affiliate_id as string | undefined
      const affiliateId = affiliateRef || (savedAffiliateId && String(savedAffiliateId).trim()) || undefined
      const metadata: Record<string, string> = { organization_id: orgId as string, user_id: user.id }
      if (affiliateId) metadata.affiliate_id = affiliateId
      const customer = await stripe.customers.create({
        email: organization?.email || user.email || undefined,
        name: organization?.name || 'Organisation',
        metadata,
      })
      return customer.id
    }

    let customerId: string

    // Vérifier si l'organisation a déjà un customer Stripe
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id, id')
      .eq('organization_id', orgId)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle()

    if (existingSubscription?.stripe_customer_id) {
      // Vérifier que ce customer existe bien dans Stripe (évite l'erreur test→live)
      try {
        const existing = await stripe.customers.retrieve(existingSubscription.stripe_customer_id)
        if ((existing as { deleted?: boolean }).deleted) {
          customerId = await createFreshCustomer()
        } else {
          customerId = existingSubscription.stripe_customer_id
        }
      } catch {
        // "No such customer" — customer issu du mauvais environnement Stripe (test vs live)
        logger.warn('create-checkout: customer_id invalide (test→live ?), création d\'un nouveau', {
          oldId: existingSubscription.stripe_customer_id,
          organizationId: orgId,
        })
        customerId = await createFreshCustomer()
        // Mettre à jour le record existant avec le nouveau customer ID
        if (existingSubscription.id) {
          await supabase
            .from('subscriptions')
            .update({ stripe_customer_id: customerId })
            .eq('id', existingSubscription.id)
        }
      }
    } else {
      customerId = await createFreshCustomer()
    }

    // Créer la session de checkout Stripe
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      allow_promotion_codes: true,
      success_url: `${APP_URLS.getBaseUrl()}/dashboard/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URLS.getBaseUrl()}/dashboard/subscribe?canceled=true`,
      metadata: {
        organization_id: orgId,
        plan_id: planId,
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          organization_id: orgId,
          plan_id: planId,
        },
      },
    })
    
    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Erreur création checkout Stripe', error, { error: sanitizeError(error) })
    // Stripe errors have a specific type — expose the message to the client for debugging
    const stripeType = (error as { type?: string })?.type
    return NextResponse.json(
      { error: message, ...(stripeType && { stripeType }) },
      { status: 500 }
    )
  }
}
