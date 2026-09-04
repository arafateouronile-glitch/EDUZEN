import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import Stripe from 'stripe'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { APP_URLS } from '@/lib/config/app-config'
import { ensureOnboardingComplete } from '@/lib/utils/billing/ensure-onboarding-complete'

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
        const subscription = event.data.object as Stripe.Subscription & { current_period_start: number; current_period_end: number }
        await handleSubscriptionUpdate(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancellation(supabase, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null }
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
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null }
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
 * Garde organizations.subscription_status synchronisé avec subscriptions.status.
 * Sans ça, plusieurs tâches cron (rappels, alertes de conformité, émargement
 * automatique) continuent de traiter une organisation comme active
 * indéfiniment après une résiliation, un échec de paiement, etc. — cette
 * colonne n'est écrite qu'une fois à l'inscription/essai et n'était ensuite
 * plus jamais mise à jour.
 */
async function syncOrganizationSubscriptionStatus(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  status: string
) {
  const { error } = await supabase
    .from('organizations')
    .update({ subscription_status: status })
    .eq('id', organizationId)
  if (error) {
    logger.error('Stripe Webhook - Erreur sync organizations.subscription_status', error, { organizationId, status })
  }
}

/**
 * Gère la création/mise à jour d'une souscription
 */
async function handleSubscriptionUpdate(
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription & { current_period_start: number; current_period_end: number }
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
    // stripe_price_id est déprécié (toujours NULL) — les IDs live sont sur
    // stripe_price_id_monthly / stripe_price_id_yearly depuis la migration du 25/03.
    const { data: plan } = await supabase
      .from('plans')
      .select('id')
      .or(`stripe_price_id.eq.${planPriceId},stripe_price_id_monthly.eq.${planPriceId},stripe_price_id_yearly.eq.${planPriceId}`)
      .single()

    if (!plan) {
      logger.warn('Stripe Webhook - Plan non trouvé', { planPriceId })
      return
    }

    // Résolution de l'organisation : d'abord par stripe_customer_id, puis en
    // SECOURS par subscription.metadata.organization_id — cas d'une ligne
    // `subscriptions` créée sans IDs Stripe (échec de create-trial-subscription
    // après un paiement réussi). Sans ce fallback, le webhook abandonnait et le
    // client payé restait bloqué sur l'onboarding.
    const metadataOrgId = (subscription.metadata?.organization_id as string | undefined) || undefined

    let organizationId: string | null = null
    const { data: byCustomer } = await supabase
      .from('subscriptions')
      .select('organization_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()

    if (byCustomer?.organization_id) {
      organizationId = byCustomer.organization_id
    } else if (metadataOrgId) {
      organizationId = metadataOrgId
      logger.warn('Stripe Webhook - Organisation résolue via metadata (stripe_customer_id absent de subscriptions)', {
        customerId, organizationId, stripeSubscriptionId: subscription.id,
      })
    }

    if (!organizationId) {
      logger.warn('Stripe Webhook - Organisation non trouvée', { customerId, metadataOrgId })
      return
    }

    const nextStatus = subscription.status === 'active' ? 'active' : subscription.status

    // Upsert par organization_id (contrainte unique) : met aussi à jour le
    // stripe_customer_id manquant pour que les prochains webhooks matchent.
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        organization_id: organizationId,
        plan_id: plan.id,
        status: nextStatus,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' })

    if (error) {
      logger.error('Stripe Webhook - Erreur mise à jour souscription', error)
      throw error
    }

    await syncOrganizationSubscriptionStatus(supabase, organizationId, nextStatus)

    // Abonnement actif / en essai payant = onboarding finalisé : garantir les
    // flags settings.onboarding_completed / payment_method_added, sinon le garde
    // du dashboard verrouille toute l'équipe.
    if (nextStatus === 'active' || nextStatus === 'trialing') {
      await ensureOnboardingComplete(supabase, organizationId, {
        context: { source: 'stripe-webhook:subscription-update', stripeStatus: subscription.status, stripeSubscriptionId: subscription.id },
      })
    }

    logger.info('Stripe Webhook - Souscription mise à jour', {
      subscriptionId: subscription.id,
      organizationId,
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
  supabase: SupabaseClient<Database>,
  subscription: Stripe.Subscription
) {
  try {
    // Mettre à jour le statut de la souscription
    const { data: updated, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)
      .select('organization_id')
      .maybeSingle()

    if (error) {
      logger.error('Stripe Webhook - Erreur annulation souscription', error)
      throw error
    }

    if (updated?.organization_id) {
      await syncOrganizationSubscriptionStatus(supabase, updated.organization_id, 'canceled')
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
async function handlePaymentSuccess(supabase: SupabaseClient<Database>, invoice: Stripe.Invoice & { subscription?: string | null }) {
  try {
    const subscriptionId = invoice.subscription as string

    // Mettre à jour le statut de la souscription en "active"
    const { data: updated, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId)
      .select('organization_id')
      .maybeSingle()

    if (error) {
      logger.error('Stripe Webhook - Erreur paiement réussi', error)
      throw error
    }

    if (updated?.organization_id) {
      await syncOrganizationSubscriptionStatus(supabase, updated.organization_id, 'active')
      // Filet de sécurité : un paiement d'abonnement réussi implique un
      // onboarding finalisé.
      await ensureOnboardingComplete(supabase, updated.organization_id, {
        context: { source: 'stripe-webhook:invoice.payment_succeeded', invoiceId: invoice.id },
      })
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
async function handlePaymentFailure(supabase: SupabaseClient<Database>, invoice: Stripe.Invoice & { subscription?: string | null }) {
  try {
    const subscriptionId = invoice.subscription as string

    // Mettre à jour le statut en "past_due"
    const { data: updated, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId)
      .select('organization_id')
      .maybeSingle()

    if (error) {
      logger.error('Stripe Webhook - Erreur échec paiement', error)
      throw error
    }

    if (updated?.organization_id) {
      await syncOrganizationSubscriptionStatus(supabase, updated.organization_id, 'past_due')
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

    // Créer des sessions checkout Stripe directes pour chaque plan actif
    const stripe = getStripe()
    const stripeCustomerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : (subscription.customer as Stripe.Customer)?.id
    type PlanLink = { name: string; priceHt: number; url: string }
    const planLinks: PlanLink[] = []
    if (stripeCustomerId) {
      const { data: plans } = await supabase
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
            allow_promotion_codes: true,
            success_url: `${APP_URLS.getBaseUrl()}/dashboard/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${APP_URLS.getBaseUrl()}/dashboard/subscribe?canceled=true`,
            expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
            metadata: { organization_id: organizationId, plan_id: plan.id, billing_period: 'monthly' },
          })
          if (session.url) {
            planLinks.push({ name: plan.name, priceHt: plan.price_monthly_ht ?? 0, url: session.url })
          }
        } catch (planErr) {
          logger.warn('Stripe Webhook - Impossible créer checkout pour plan email', { planId: plan.id, error: sanitizeError(planErr) })
        }
      }
    }

    const plansHtml = planLinks.length > 0
      ? `<p style="margin:0 0 12px;">Choisissez votre plan et accédez directement au paiement :</p>
${planLinks.map(l => `<p style="margin:0 0 8px;"><a href="${l.url}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">${escapeHtml(l.name)} — ${l.priceHt} €/mois HT</a></p>`).join('\n')}
<p style="margin:8px 0 0;font-size:14px;color:#555;">ou <a href="${escapeHtml(dashboardUrl)}" style="color:#1a1a1a;">voir tous les plans</a></p>`
      : `<p style="margin:0 0 20px;"><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">Choisir mon abonnement</a></p>`

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
      text: `Bonjour,\n\nVotre essai EduZen pour ${orgName} se termine le ${trialEndDate}.\n\nChoisissez votre plan et payez directement :\n${planLinks.length > 0 ? planLinks.map(l => `- ${l.name} (${l.priceHt} €/mois HT) : ${l.url}`).join('\n') : dashboardUrl}\n\nCordialement,\nL'équipe EduZen`,
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
