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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    logger.error('Erreur vérification webhook Stripe', err)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const stripe = getStripe()
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            { expand: ['items.data.price.product'] }
          )

          const organizationId = session.metadata?.organization_id
          const planId = session.metadata?.plan_id

          if (!organizationId || !planId) {
            logger.error('Metadata manquante dans checkout.session.completed', {
              organizationId,
              planId,
            })
            break
          }

          // Créer ou mettre à jour la subscription
          const subscriptionAny = subscription as any
          const subscriptionData: any = {
            organization_id: organizationId,
            plan_id: planId,
            status: subscription.status,
            current_period_start: new Date(subscriptionAny.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscriptionAny.current_period_end * 1000).toISOString(),
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
          }
          const { error: subError } = await supabase
            .from('subscriptions')
            .upsert(subscriptionData, {
              onConflict: 'organization_id',
            })

          if (subError) {
            logger.error('Erreur création subscription', subError)
          } else {
            logger.info('Subscription créée/mise à jour', {
              organizationId,
              planId,
              subscriptionId: subscription.id,
            })
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionAny = subscription as any
        
        const updateData: any = {
          status: subscription.status,
          current_period_start: new Date(subscriptionAny.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscriptionAny.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
        }
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update(updateData)
          .eq('stripe_subscription_id', subscription.id)

        if (updateError) {
          logger.error('Erreur mise à jour subscription', updateError)
        }
        break
      }

      default:
        logger.info(`Événement Stripe non géré: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    logger.error('Erreur traitement webhook Stripe', error)
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    )
  }
}
