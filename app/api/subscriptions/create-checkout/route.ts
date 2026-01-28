import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    apiVersion: '2025-12-15.clover',
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
    
    // Récupérer l'organisation de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      )
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
      .select('*')
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
    const planAny = plan as any
    const stripePriceId = billingPeriod === 'yearly'
      ? (planAny.stripe_price_id_yearly || planAny.stripe_price_id) // Fallback sur l'ancien champ si nécessaire
      : (planAny.stripe_price_id_monthly || planAny.stripe_price_id) // Fallback sur l'ancien champ si nécessaire
    
    if (!stripePriceId) {
      return NextResponse.json(
        { error: `Configuration Stripe manquante pour ce plan (${billingPeriod})` },
        { status: 400 }
      )
    }
    
    // Récupérer ou créer le customer Stripe
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name, email')
      .eq('id', userData.organization_id)
      .single()
    
    let customerId: string
    
    // Vérifier si l'organisation a déjà un customer Stripe
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', userData.organization_id)
      .not('stripe_customer_id', 'is', null)
      .maybeSingle()
    
    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id
    } else {
      // Créer un nouveau customer Stripe
      const stripe = getStripe()
      const customer = await stripe.customers.create({
        email: organization?.email || user.email,
        name: organization?.name || 'Organisation',
        metadata: {
          organization_id: userData.organization_id,
          user_id: user.id,
        },
      })
      
      customerId = customer.id
    }
    
    // Créer la session de checkout Stripe
    const stripe = getStripe()
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
      success_url: `${APP_URLS.getBaseUrl()}/dashboard/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URLS.getBaseUrl()}/dashboard/subscribe?canceled=true`,
      metadata: {
        organization_id: userData.organization_id,
        plan_id: planId,
        billing_period: billingPeriod,
      },
      subscription_data: {
        metadata: {
          organization_id: userData.organization_id,
          plan_id: planId,
        },
      },
    })
    
    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    })
  } catch (error: any) {
    logger.error('Erreur création checkout Stripe', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
