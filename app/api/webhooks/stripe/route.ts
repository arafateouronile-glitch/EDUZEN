import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { logger, sanitizeError } from '@/lib/utils/logger'

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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

/**
 * Webhook Stripe pour gérer automatiquement les souscriptions
 * 
 * Événements gérés :
 * - customer.subscription.created : Création d'une souscription
 * - customer.subscription.updated : Mise à jour (changement de plan, renouvellement)
 * - customer.subscription.deleted : Annulation
 * - invoice.payment_succeeded : Paiement réussi
 * - invoice.payment_failed : Échec de paiement
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature || !webhookSecret) {
      logger.error('Stripe Webhook - Signature ou secret manquant')
      return NextResponse.json(
        { error: 'Missing signature or webhook secret' },
        { status: 400 }
      )
    }

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      logger.error('Stripe Webhook - Erreur de vérification signature', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Traiter l'événement selon son type
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancellation(supabase, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSuccess(supabase, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailure(supabase, invoice)
        break
      }

      default:
        logger.info(`Stripe Webhook - Événement non géré: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('Stripe Webhook - Erreur serveur', error, {
      error: sanitizeError(error),
    })
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

/**
 * Gère la création/mise à jour d'une souscription
 */
async function handleSubscriptionUpdate(
  supabase: any,
  subscription: Stripe.Subscription
) {
  try {
    const customerId = subscription.customer as string
    const planPriceId = subscription.items.data[0]?.price.id

    // Récupérer le plan depuis Stripe
    const stripe = getStripe()
    const price = await stripe.prices.retrieve(planPriceId)
    const productId = price.product as string
    const product = await stripe.products.retrieve(productId)

    // Trouver le plan dans notre base de données
    const { data: plan } = await supabase
      .from('plans')
      .select('id')
      .eq('stripe_price_id', planPriceId)
      .single()

    if (!plan) {
      logger.warn('Stripe Webhook - Plan non trouvé', { planPriceId })
      return
    }

    // Trouver l'organisation via le customer_id
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('organization_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    if (!existingSubscription) {
      logger.warn('Stripe Webhook - Organisation non trouvée', { customerId })
      return
    }

    // Mettre à jour ou créer la souscription
    const subscriptionAny = subscription as any
    const subscriptionData: any = {
      plan_id: plan.id,
      status: subscription.status === 'active' ? 'active' : subscription.status,
      current_period_start: new Date(subscriptionAny.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscriptionAny.current_period_end * 1000).toISOString(),
      stripe_subscription_id: subscription.id,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('stripe_customer_id', customerId)

    if (error) {
      logger.error('Stripe Webhook - Erreur mise à jour souscription', error)
      throw error
    }

    logger.info('Stripe Webhook - Souscription mise à jour', {
      subscriptionId: subscription.id,
      organizationId: existingSubscription.organization_id,
    })
  } catch (error) {
    logger.error('Stripe Webhook - Erreur handleSubscriptionUpdate', error, {
      error: sanitizeError(error),
    })
    throw error
  }
}

/**
 * Gère l'annulation d'une souscription
 */
async function handleSubscriptionCancellation(
  supabase: any,
  subscription: Stripe.Subscription
) {
  try {
    const customerId = subscription.customer as string

    // Mettre à jour le statut de la souscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      logger.error('Stripe Webhook - Erreur annulation souscription', error)
      throw error
    }

    logger.info('Stripe Webhook - Souscription annulée', {
      subscriptionId: subscription.id,
    })

    // Optionnel : Basculer sur un plan "Free" ou restreint
    // const { data: org } = await supabase
    //   .from('subscriptions')
    //   .select('organization_id')
    //   .eq('stripe_customer_id', customerId)
    //   .single()
    //
    // if (org) {
    //   // Créer une souscription "Free"
    //   const { data: freePlan } = await supabase
    //     .from('plans')
    //     .select('id')
    //     .eq('name', 'Free')
    //     .single()
    //
    //   if (freePlan) {
    //     await supabase.from('subscriptions').insert({
    //       organization_id: org.organization_id,
    //       plan_id: freePlan.id,
    //       status: 'active',
    //     })
    //   }
    // }
  } catch (error) {
    logger.error('Stripe Webhook - Erreur handleSubscriptionCancellation', error, {
      error: sanitizeError(error),
    })
    throw error
  }
}

/**
 * Gère un paiement réussi
 */
async function handlePaymentSuccess(supabase: any, invoice: Stripe.Invoice) {
  try {
    const invoiceAny = invoice as any
    const subscriptionId = invoiceAny.subscription as string

    // Mettre à jour le statut de la souscription en "active"
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId)

    if (error) {
      logger.error('Stripe Webhook - Erreur paiement réussi', error)
      throw error
    }

    logger.info('Stripe Webhook - Paiement réussi', {
      invoiceId: invoice.id,
      subscriptionId,
    })
  } catch (error) {
    logger.error('Stripe Webhook - Erreur handlePaymentSuccess', error, {
      error: sanitizeError(error),
    })
    throw error
  }
}

/**
 * Gère un échec de paiement
 */
async function handlePaymentFailure(supabase: any, invoice: Stripe.Invoice) {
  try {
    const invoiceAny = invoice as any
    const subscriptionId = invoiceAny.subscription as string

    // Mettre à jour le statut en "past_due"
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId)

    if (error) {
      logger.error('Stripe Webhook - Erreur échec paiement', error)
      throw error
    }

    logger.warn('Stripe Webhook - Échec de paiement', {
      invoiceId: invoice.id,
      subscriptionId,
    })

    // Optionnel : Envoyer un email d'alerte à l'organisation
    // await emailService.sendPaymentFailedAlert(organizationId)
  } catch (error) {
    logger.error('Stripe Webhook - Erreur handlePaymentFailure', error, {
      error: sanitizeError(error),
    })
    throw error
  }
}
