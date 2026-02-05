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

/** Récupère l'ID de subscription depuis une facture (compatible ancienne API Stripe avec .subscription ou nouvelle avec .subscription_details). */
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const inv = invoice as Stripe.Invoice & {
    subscription?: string
    subscription_details?: { subscription?: string | Stripe.Subscription }
  }
  const sub = inv.subscription ?? inv.subscription_details?.subscription
  if (typeof sub === 'string') return sub
  if (sub && typeof sub === 'object' && 'id' in sub) return sub.id
  return null
}

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

        const updateData: Record<string, unknown> = {
          status: subscription.status,
          current_period_start: new Date(subscriptionAny.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscriptionAny.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end || false,
        }

        // Si c'est une subscription avec trial, mettre à jour les dates de trial
        if (subscription.trial_start && subscription.trial_end) {
          updateData.trial_start_at = new Date(subscription.trial_start * 1000).toISOString()
          updateData.trial_end_at = new Date(subscription.trial_end * 1000).toISOString()
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

      case 'setup_intent.succeeded': {
        const setupIntent = event.data.object as Stripe.SetupIntent
        logger.info('SetupIntent réussi', {
          setupIntentId: setupIntent.id,
          customerId: setupIntent.customer,
          paymentMethodId: setupIntent.payment_method,
        })
        break
      }

      case 'customer.subscription.trial_will_end': {
        // L'essai gratuit se termine dans 3 jours
        const subscription = event.data.object as Stripe.Subscription
        const organizationId = subscription.metadata?.organization_id

        if (organizationId) {
          logger.info('Essai gratuit se termine bientôt', {
            organizationId,
            subscriptionId: subscription.id,
            trialEnd: subscription.trial_end,
          })

          // TODO: Envoyer une notification email à l'utilisateur
          // Vous pouvez intégrer un service d'email ici
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)
        if (subscriptionId) {
          logger.info('Paiement réussi pour subscription', {
            invoiceId: invoice.id,
            subscriptionId,
            amountPaid: invoice.amount_paid,
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)
        if (subscriptionId) {
          logger.warn('Paiement échoué pour subscription', {
            invoiceId: invoice.id,
            subscriptionId,
            attemptCount: invoice.attempt_count,
          })

          // Mettre à jour le statut de la subscription en 'past_due'
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId)

          if (updateError) {
            logger.error('Erreur mise à jour subscription past_due', updateError)
          }
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
