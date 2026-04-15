import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
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


function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || webhookSecret.length === 0) {
    logger.error('Subscriptions webhook: STRIPE_WEBHOOK_SECRET non configuré')
    return NextResponse.json(
      { error: 'Webhook non configuré' },
      { status: 503 }
    )
  }

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

  // Webhooks Stripe n'ont pas de session : utiliser service_role pour bypass RLS
  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription' && session.subscription) {
          const stripe = getStripe()
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            { expand: ['items.data.price.product'] }
          ) as Stripe.Response<Stripe.Subscription> & { current_period_start: number; current_period_end: number }

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
          const subscriptionData = {
            organization_id: organizationId,
            plan_id: planId,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
        const subscription = event.data.object as Stripe.Subscription & { current_period_start: number; current_period_end: number }

        const updateData: Record<string, unknown> = {
          status: subscription.status,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
        // O7 : L'essai gratuit se termine dans 3 jours — envoi email de rappel
        const subscription = event.data.object as Stripe.Subscription
        const organizationId = subscription.metadata?.organization_id as string | undefined

        if (organizationId) {
          logger.info('Essai gratuit se termine bientôt', {
            organizationId,
            subscriptionId: subscription.id,
            trialEnd: subscription.trial_end,
          })

          try {
            const admin = createAdminClient()
            const { data: org } = await admin
              .from('organizations')
              .select('id, name, email')
              .eq('id', organizationId)
              .single()

            const { data: adminUsers } = await admin
              .from('users')
              .select('email, full_name')
              .eq('organization_id', organizationId)
              .in('role', ['admin', 'super_admin'])
              .limit(3)

            const toEmails = [
              ...(org?.email ? [org.email] : []),
              ...(adminUsers?.map((u) => u.email).filter(Boolean) ?? []),
            ]
            const uniqueEmails = [...new Set(toEmails)].slice(0, 5)
            const orgName = org?.name ?? 'Votre organisation'
            const dashboardUrl = `${APP_URLS.getBaseUrl()}/dashboard/subscribe`
            const trialEndDate = subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'sous 3 jours'

            if (uniqueEmails.length > 0) {
              await sendEmailViaResend({
                to: uniqueEmails,
                subject: `EDUZEN — Votre essai gratuit se termine le ${trialEndDate}`,
                html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a; line-height: 1.6;">
  <p>Bonjour,</p>
  <p>Votre période d'essai gratuit d'EDUZEN pour <strong>${escapeHtml(orgName)}</strong> se termine dans 3 jours (le ${escapeHtml(trialEndDate)}).</p>
  <p>Pour continuer à profiter de toutes les fonctionnalités sans interruption, ajoutez votre moyen de paiement avant cette date :</p>
  <p style="text-align: center; margin: 28px 0;"><a href="${escapeHtml(dashboardUrl)}" style="display: inline-block; background: #335ACF; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Ajouter ma carte et continuer</a></p>
  <p style="font-size: 14px; color: #666;">Vous pourrez annuler à tout moment. Aucun prélèvement avant la fin de votre essai.</p>
  <p>Cordialement,<br>L'équipe EDUZEN</p>
</body>
</html>`,
                text: `Bonjour,\n\nVotre essai gratuit EDUZEN pour ${orgName} se termine le ${trialEndDate}. Ajoutez votre moyen de paiement ici : ${dashboardUrl}\n\nCordialement,\nL'équipe EDUZEN`,
              })
              logger.info('Email fin d\'essai envoyé', { organizationId, to: uniqueEmails })
            }
          } catch (emailErr) {
            logger.error('Erreur envoi email trial_will_end', emailErr, { organizationId, error: sanitizeError(emailErr) })
          }
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
