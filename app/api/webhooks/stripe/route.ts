import { NextRequest, NextResponse } from 'next/server'
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

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

/**
 * Webhook Stripe principal — souscriptions + commissions affiliées.
 *
 * IMPORTANT : Ne configurer qu'UN SEUL endpoint webhook dans le dashboard Stripe.
 * Il existe aussi app/api/subscriptions/webhook/route.ts (souscriptions + emails).
 * Choisir celui-ci (webhooks/stripe) pour avoir souscriptions + affiliation + emails
 * (trial_will_end géré ici). Désactiver l'autre pour éviter le double traitement.
 *
 * Événements gérés :
 * - customer.subscription.created/updated/deleted
 * - invoice.payment_succeeded ( + commission affilié )
 * - invoice.payment_failed
 * - charge.refunded ( annulation commission )
 * - customer.subscription.trial_will_end ( email )
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

    // Webhooks Stripe n'ont pas de session utilisateur : utiliser service_role pour bypass RLS
    const supabase = createAdminClient()

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
        const stripe = getStripe()
        try {
          await handleAffiliateCommission(stripe, invoice)
        } catch (commissionError) {
          logger.error('Stripe Webhook - Erreur commission (réponse 200 pour éviter retry Stripe)', commissionError, {
            error: sanitizeError(commissionError),
            invoiceId: invoice.id,
          })
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        try {
          await handleAffiliateCommissionRefund(charge)
        } catch (refundError) {
          logger.error('Stripe Webhook - Erreur annulation commission (réponse 200)', refundError, {
            error: sanitizeError(refundError),
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailure(supabase, invoice)
        break
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        await sendTrialWillEndEmail(subscription)
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

/** O7 : Envoie l'email "fin d'essai dans 3 jours" (customer.subscription.trial_will_end). */
async function sendTrialWillEndEmail(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organization_id as string | undefined
  if (!organizationId) return
  try {
    const supabase = createAdminClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, email')
      .eq('id', organizationId)
      .single()
    const { data: adminUsers } = await supabase
      .from('users')
      .select('email')
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
    if (uniqueEmails.length === 0) return
    const escapeHtml = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    await sendEmailViaResend({
      to: uniqueEmails,
      subject: `EDUZEN — Votre essai gratuit se termine le ${trialEndDate}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; line-height: 1.6;">
<p>Bonjour,</p>
<p>Votre période d'essai gratuit d'EDUZEN pour <strong>${escapeHtml(orgName)}</strong> se termine dans 3 jours (le ${escapeHtml(trialEndDate)}).</p>
<p>Pour continuer sans interruption, ajoutez votre moyen de paiement :</p>
<p style="text-align: center; margin: 28px 0;"><a href="${escapeHtml(dashboardUrl)}" style="display: inline-block; background: #335ACF; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Ajouter ma carte et continuer</a></p>
<p style="font-size: 14px; color: #666;">Aucun prélèvement avant la fin de votre essai. Annulation possible à tout moment.</p>
<p>Cordialement,<br>L'équipe EDUZEN</p>
</body></html>`,
      text: `Bonjour,\n\nVotre essai EDUZEN pour ${orgName} se termine le ${trialEndDate}. Ajoutez votre moyen de paiement : ${dashboardUrl}\n\nCordialement,\nL'équipe EDUZEN`,
    })
    logger.info('Stripe Webhook - Email fin d\'essai envoyé', { organizationId, to: uniqueEmails })
  } catch (err) {
    logger.error('Stripe Webhook - Erreur email trial_will_end', err, { organizationId, error: sanitizeError(err) })
  }
}

/**
 * Calcule et enregistre la commission affilié sur une facture payée.
 * Lit affiliate_id dans les metadata du client Stripe (attribution conservée renouvellements/upgrades).
 */
async function handleAffiliateCommission(stripe: Stripe, invoice: Stripe.Invoice) {
  try {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
    if (!customerId) return

    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) return

    const affiliateId = (customer as Stripe.Customer).metadata?.affiliate_id
    if (!affiliateId) return

    const supabase = createAdminClient()
    const { data: affiliate, error: affError } = await supabase
      .from('affiliates')
      .select('id, status, commission_rate_override, campaign_id')
      .eq('id', affiliateId)
      .single()

    if (affError || !affiliate) {
      logger.warn('Stripe Webhook - Affilié introuvable', { affiliateId })
      return
    }

    const aff = affiliate as { status: string; commission_rate_override: number | null; campaign_id: string | null }
    if (aff.status !== 'approved') {
      logger.info('Stripe Webhook - Affilié non approuvé, pas de commission', { affiliateId })
      return
    }

    let commissionPercent = aff.commission_rate_override ?? null
    let commissionType: 'recurring' | 'one_time' = 'recurring'
    if (aff.campaign_id) {
      const { data: campaign } = await supabase
        .from('affiliate_campaigns')
        .select('commission_percent, commission_type')
        .eq('id', aff.campaign_id)
        .single()
      const camp = campaign as { commission_percent: number; commission_type?: string } | null
      if (commissionPercent == null && camp) commissionPercent = camp.commission_percent ?? 0
      if (camp?.commission_type === 'one_time') commissionType = 'one_time'
    }
    if (commissionPercent == null) commissionPercent = 0

    // O5 : one_time = une seule commission par client (pas sur les renouvellements)
    if (commissionType === 'one_time') {
      const { data: existingCommission } = await supabase
        .from('affiliate_commissions')
        .select('id')
        .eq('affiliate_id', affiliateId)
        .eq('stripe_customer_id', customerId)
        .limit(1)
        .maybeSingle()
      if (existingCommission) {
        logger.info('Stripe Webhook - Campagne one_time : commission déjà versée pour ce client', { affiliateId, customerId })
        return
      }
    }

    const amountPaid = (invoice.amount_paid ?? 0) / 100
    const commissionAmount = Math.round((amountPaid * Number(commissionPercent) / 100) * 100) / 100
    const currency = (invoice.currency ?? 'eur').toLowerCase()

    const { error: insertError } = await supabase.from('affiliate_commissions').insert({
      affiliate_id: affiliateId,
      stripe_customer_id: customerId,
      stripe_invoice_id: invoice.id,
      stripe_charge_id: (() => { const c = (invoice as { charge?: string | { id?: string } | null }).charge; return typeof c === 'string' ? c : c?.id ?? null })(),
      order_amount: amountPaid,
      commission_amount: commissionAmount,
      commission_percent: commissionPercent,
      currency,
      status: 'pending',
    })

    if (insertError) {
      const err = insertError as { code?: string; message?: string }
      const isDuplicate = err.code === '23505' || /unique|duplicate/i.test(err.message ?? '')
      if (isDuplicate) {
        logger.info('Stripe Webhook - Commission déjà enregistrée pour cette facture (idempotent)', { invoiceId: invoice.id })
        return
      }
      logger.error('Stripe Webhook - Erreur insert commission', insertError)
      throw insertError
    }

    logger.info('Stripe Webhook - Commission enregistrée', {
      affiliateId,
      invoiceId: invoice.id,
      orderAmount: amountPaid,
      commissionAmount,
      commissionPercent,
    })
  } catch (error) {
    logger.error('Stripe Webhook - Erreur handleAffiliateCommission', error, {
      error: sanitizeError(error),
    })
    throw error
  }
}

/**
 * En cas de remboursement, passe la commission liée à la facture en cancelled.
 */
async function handleAffiliateCommissionRefund(charge: Stripe.Charge) {
  try {
    const invoiceId = (() => { const inv = (charge as { invoice?: string | { id?: string } | null }).invoice; return typeof inv === 'string' ? inv : inv?.id })()
    if (!invoiceId) return

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('affiliate_commissions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('stripe_invoice_id', invoiceId)
      .in('status', ['pending', 'paid'])

    if (error) {
      logger.error('Stripe Webhook - Erreur annulation commission', error)
      throw error
    }

    logger.info('Stripe Webhook - Commission annulée (remboursement)', { invoiceId })
  } catch (error) {
    logger.error('Stripe Webhook - Erreur handleAffiliateCommissionRefund', error, {
      error: sanitizeError(error),
    })
    throw error
  }
}
