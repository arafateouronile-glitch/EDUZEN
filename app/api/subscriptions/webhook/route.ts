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
        // O7 : L'essai gratuit se termine dans 3 jours — envoi email de rappel avec liens checkout directs
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

            // Créer des sessions checkout Stripe directes pour chaque plan actif
            const stripe = getStripe()
            const stripeCustomerId = typeof subscription.customer === 'string'
              ? subscription.customer
              : (subscription.customer as Stripe.Customer)?.id
            type PlanLink = { name: string; priceHt: number; url: string }
            const planLinks: PlanLink[] = []
            if (stripeCustomerId) {
              const { data: plans } = await admin
                .from('plans')
                .select('id, name, price_monthly_ht, stripe_price_id_monthly, stripe_price_id')
                .eq('is_active', true)
                .order('price_monthly_ht', { ascending: true })
              for (const plan of plans ?? []) {
                const priceId = plan.stripe_price_id_monthly ?? plan.stripe_price_id
                if (!priceId) continue
                try {
                  const session = await stripe.checkout.sessions.create({
                    customer: stripeCustomerId,
                    payment_method_types: ['card'],
                    line_items: [{ price: priceId, quantity: 1 }],
                    mode: 'subscription',
                    success_url: `${APP_URLS.getBaseUrl()}/dashboard/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${APP_URLS.getBaseUrl()}/dashboard/subscribe?canceled=true`,
                    expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                    metadata: { organization_id: organizationId, plan_id: plan.id, billing_period: 'monthly' },
                  })
                  if (session.url) {
                    planLinks.push({ name: plan.name, priceHt: plan.price_monthly_ht ?? 0, url: session.url })
                  }
                } catch (planErr) {
                  logger.warn('Impossible créer checkout pour plan email', { planId: plan.id, error: sanitizeError(planErr) })
                }
              }
            }

            const plansHtml = planLinks.length > 0
              ? `<p style="margin:0 0 12px;">Choisissez votre plan et accédez directement au paiement :</p>
${planLinks.map(l => `<p style="margin:0 0 8px;"><a href="${l.url}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">${escapeHtml(l.name)} — ${l.priceHt} €/mois HT</a></p>`).join('\n')}
<p style="margin:8px 0 0;font-size:14px;color:#555;">ou <a href="${escapeHtml(dashboardUrl)}" style="color:#1a1a1a;">voir tous les plans</a></p>`
              : `<p style="margin:0 0 20px;"><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">Choisir mon abonnement</a></p>`

            if (uniqueEmails.length > 0) {
              await sendEmailViaResend({
                to: uniqueEmails,
                subject: `EDUZEN — Votre essai gratuit se termine le ${trialEndDate}`,
                html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour,</p>

            <p style="margin:0 0 20px;">Votre période d'essai gratuit d'EduZen pour <strong>${escapeHtml(orgName)}</strong> se termine dans 3 jours, le ${escapeHtml(trialEndDate)}.</p>

            <p style="margin:0 0 20px;">Pour continuer à profiter de toutes les fonctionnalités sans interruption :</p>

            ${plansHtml}

            <p style="margin:20px 0 40px;font-size:14px;color:#555;">Aucun prélèvement avant la fin de votre essai. Annulation possible à tout moment.</p>

            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
              L'équipe EduZen
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
                text: `Bonjour,\n\nVotre essai gratuit EduZen pour ${orgName} se termine le ${trialEndDate}.\n\nChoisissez votre plan et payez directement :\n${planLinks.length > 0 ? planLinks.map(l => `- ${l.name} (${l.priceHt} €/mois HT) : ${l.url}`).join('\n') : dashboardUrl}\n\nCordialement,\nL'équipe EduZen`,
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
