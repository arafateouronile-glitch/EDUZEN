import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { createServiceRoleClient } from '@/lib/supabase/service'
import Stripe from 'stripe'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { ensureOnboardingComplete } from '@/lib/utils/billing/ensure-onboarding-complete'
function buildPostConversionEmail(prenom: string, planName: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${prenom},</p>

            <p style="margin:0 0 20px;">Votre abonnement ${planName} est actif. Merci de votre confiance — c'est une vraie joie de vous compter parmi nos clients.</p>

            <p style="margin:0 0 20px;">Maintenant que vous êtes lancé, voici les 3 choses que les clients les plus efficaces font en premier :</p>

            <p style="margin:0 0 12px;">1. <strong>Finalisez la configuration de votre organisme</strong> — logo, NDA, adresse. Ces infos apparaissent sur tous vos documents.</p>

            <p style="margin:0 0 12px;">2. <strong>Créez un modèle de convention personnalisé</strong> dans les réglages → Modèles de documents. Une fois fait, chaque nouvelle convention se génère en 45 secondes.</p>

            <p style="margin:0 0 20px;">3. <strong>Invitez votre équipe</strong> si vous avez des formateurs ou une assistante — chacun peut avoir son propre accès.</p>

            <p style="margin:0 0 20px;">Si vous avez des questions ou si vous voulez qu'on fasse un point ensemble pour aller plus loin, répondez à cet email ou appelez-moi au <a href="tel:+33610441324" style="color:#1a1a1a;">06 10 44 13 24</a>.</p>

            <p style="margin:0 0 40px;">Merci encore,</p>

            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
              Airtone NILE<br>
              <span style="font-size:14px;color:#555;">Fondateur, EduZen</span><br>
              <span style="font-size:14px;color:#555;"><a href="tel:+33610441324" style="color:#555;text-decoration:none;">06 10 44 13 24</a> · <a href="https://www.eduzen.io" style="color:#555;text-decoration:none;">eduzen.io</a></span>
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

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

// Schéma de validation - paymentMethodId et customerId optionnels si skipPaymentMethod
const createTrialSubscriptionSchema = z.object({
  planId: z.string().uuid('Plan ID invalide'),
  billingPeriod: z.enum(['monthly', 'yearly']),
  paymentMethodId: z.string().optional(),
  customerId: z.string().optional(),
  skipPaymentMethod: z.boolean().optional().default(false),
}).refine(
  (data) => data.skipPaymentMethod || (data.paymentMethodId && data.customerId),
  { message: 'paymentMethodId et customerId requis si skipPaymentMethod est false' }
)

/**
 * POST /api/subscriptions/create-trial-subscription
 *
 * Crée un abonnement Stripe avec une période d'essai de 14 jours.
 * La carte a déjà été collectée via SetupIntent.
 */
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

    // Valider le body
    const body = await request.json()
    const validationResult = createTrialSubscriptionSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { planId, billingPeriod, paymentMethodId, customerId, skipPaymentMethod } = validationResult.data

    // Récupérer le plan
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('id, name, stripe_price_id, stripe_price_id_yearly, stripe_price_id_monthly')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return NextResponse.json(
        { error: 'Plan non trouvé ou inactif' },
        { status: 404 }
      )
    }

    // Calculer les dates de trial
    const trialStartAt = new Date()
    const trialEndAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 jours

    // Vérifier que les variables d'environnement Supabase admin sont disponibles
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('[create-trial-subscription] SUPABASE_SERVICE_ROLE_KEY non configurée')
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY non configurée sur le serveur' }, { status: 500 })
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error('[create-trial-subscription] NEXT_PUBLIC_SUPABASE_URL non configurée')
      return NextResponse.json({ error: 'NEXT_PUBLIC_SUPABASE_URL non configurée sur le serveur' }, { status: 500 })
    }

    // ========================================
    // CAS 1: Démarrage sans carte bancaire
    // ========================================
    if (skipPaymentMethod) {
      logger.info('Démarrage essai sans carte', {
        organizationId: orgId,
        planId,
      })

      // Cookie affilié : conserver l'attribution pour la conversion ultérieure (O3)
      const cookieStore = await cookies()
      const affiliateRef = cookieStore.get('eduzen_affiliate_ref')?.value?.trim()

      // Utiliser le client admin pour bypass RLS sur organizations
      const adminClient = createServiceRoleClient()

      // Mettre à jour les settings de l'organisation
      const { data: orgData } = await adminClient
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single()

      const currentSettings = (orgData?.settings as Record<string, unknown>) || {}

      const { error: orgUpdateError } = await adminClient
        .from('organizations')
        .update({
          settings: {
            ...currentSettings,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
            payment_method_added: false, // Pas de carte
            selected_plan_id: planId,
            ...(affiliateRef ? { affiliate_id: affiliateRef } : {}),
          },
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId)

      if (orgUpdateError) {
        logger.error('Erreur mise à jour organisation (skip payment)', { error: orgUpdateError.message })
        return NextResponse.json({ error: `org_update: ${orgUpdateError.message}` }, { status: 500 })
      }

      // Créer la subscription en base sans Stripe
      const { error: subError } = await adminClient
        .from('subscriptions')
        .upsert({
          organization_id: orgId,
          plan_id: planId,
          status: 'trialing',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          payment_method_id: null,
          trial_start_at: trialStartAt.toISOString(),
          trial_end_at: trialEndAt.toISOString(),
          current_period_start: trialStartAt.toISOString(),
          current_period_end: trialEndAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id',
        })

      if (subError) {
        logger.error('Erreur création subscription (skip payment)', { error: subError.message })
        return NextResponse.json({ error: `sub_upsert: ${subError.message}` }, { status: 500 })
      }

      logger.info('Essai démarré sans carte', {
        organizationId: orgId,
        trialEndAt: trialEndAt.toISOString(),
      })

      // Email post-conversion (non bloquant)
      {
        const { data: userProfile } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', user.id)
          .single()
        if (userProfile?.email) {
          const prenom = (userProfile.full_name ?? userProfile.email).split(' ')[0]
          sendEmailViaResend({
            to: userProfile.email,
            from: 'Airtone NILE — EduZen <contact@eduzen.io>',
            replyTo: 'contact@eduzen.io',
            subject: `${prenom}, votre abonnement EduZen est actif`,
            html: buildPostConversionEmail(prenom, plan.name),
          }).catch(err => logger.error('[create-trial-subscription] Error sending conversion email:', err))
        }
      }

      revalidateTag(`layout-data-${user.id}`, { expire: 0 })
      return NextResponse.json({
        success: true,
        subscriptionId: null,
        trialStartAt: trialStartAt.toISOString(),
        trialEndAt: trialEndAt.toISOString(),
        status: 'trialing',
        planName: plan.name,
        paymentMethodRequired: true,
      })
    }

    // ========================================
    // CAS 2: Démarrage avec carte bancaire
    // ========================================
    // Déterminer le price_id Stripe selon la période
    const planAny = plan as Record<string, unknown>
    const stripePriceId = billingPeriod === 'yearly'
      ? (planAny.stripe_price_id_yearly as string || planAny.stripe_price_id as string)
      : (planAny.stripe_price_id_monthly as string || planAny.stripe_price_id as string)

    if (!stripePriceId) {
      return NextResponse.json(
        { error: `Configuration Stripe manquante pour ce plan (${billingPeriod})` },
        { status: 400 }
      )
    }

    if (!paymentMethodId || !customerId) {
      return NextResponse.json(
        { error: 'Payment method et customer ID requis' },
        { status: 400 }
      )
    }

    const stripe = getStripe()

    // Attacher la payment method au customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    })

    // Définir comme méthode de paiement par défaut
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    logger.info('Payment method attachée au customer', {
      paymentMethodId,
      customerId,
      organizationId: orgId,
    })

    // Vérifier si la checklist est complète pour accorder 7 jours bonus
    const { data: orgForChecklist } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single()

    const orgSettings = (orgForChecklist?.settings as Record<string, unknown>) || {}
    const checklistSteps = (orgSettings.onboarding_checklist_steps as Record<string, string>) || {}
    const REQUIRED_STEPS = ['configure-org', 'document-templates', 'ask-jeane', 'generate-document']
    const checklistComplete = REQUIRED_STEPS.every(id => !!checklistSteps[id])

    // 37 jours si checklist complète, 30 jours sinon
    const firstCycleDays = checklistComplete ? 37 : 30
    const firstCycleAnchor = Math.floor((Date.now() + firstCycleDays * 24 * 60 * 60_000) / 1000)

    logger.info('Création abonnement', {
      organizationId: orgId,
      checklistComplete,
      firstCycleDays,
    })

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePriceId }],
      billing_cycle_anchor: firstCycleAnchor,
      proration_behavior: 'none',
      default_payment_method: paymentMethodId,
      metadata: {
        organization_id: orgId,
        plan_id: planId,
        billing_period: billingPeriod,
        checklist_complete: String(checklistComplete),
      },
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
    })

    logger.info('Abonnement créé avec essai gratuit', {
      subscriptionId: subscription.id,
      customerId,
      organizationId: orgId,
      trialEnd: subscription.trial_end,
    })

    // La date de fin = billing_cycle_anchor (premier cycle 37j)
    const stripeTrialEndAt = subscription.billing_cycle_anchor
      ? new Date(subscription.billing_cycle_anchor * 1000)
      : new Date(firstCycleAnchor * 1000)

    // Utiliser la fonction RPC pour compléter l'onboarding (fonction peut ne pas être dans les types générés)
    const { error: rpcError } = await (supabase.rpc as (name: string, args: Record<string, unknown>) => ReturnType<typeof supabase.rpc>)(
      'complete_onboarding_with_payment',
      {
        p_organization_id: orgId,
        p_plan_id: planId,
        p_payment_method_id: paymentMethodId,
        p_stripe_customer_id: customerId,
        p_stripe_subscription_id: subscription.id,
        p_trial_days: 14,
      }
    )

    // Utiliser le client admin pour bypass RLS sur organizations
    const adminClient = createServiceRoleClient()

    if (rpcError) {
      logger.warn('RPC complete_onboarding_with_payment failed, fallback to manual update', {
        error: rpcError.message,
      })

      // Récupérer les settings actuels
      const { data: orgData } = await adminClient
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .single()

      const currentSettings = (orgData?.settings as Record<string, unknown>) || {}

      // Mettre à jour les settings de l'organisation
      const { error: orgUpdateError } = await adminClient
        .from('organizations')
        .update({
          settings: {
            ...currentSettings,
            onboarding_completed: true,
            onboarding_completed_at: new Date().toISOString(),
            payment_method_added: true,
            payment_method_added_at: new Date().toISOString(),
            selected_plan_id: planId,
          },
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orgId)

      if (orgUpdateError) {
        logger.error('Erreur mise à jour organisation (with payment)', { error: orgUpdateError.message })
        return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'organisation' }, { status: 500 })
      }

      // Créer ou mettre à jour la subscription
      const { error: subError } = await adminClient
        .from('subscriptions')
        .upsert({
          organization_id: orgId,
          plan_id: planId,
          status: 'trialing',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          payment_method_id: paymentMethodId,
          trial_start_at: trialStartAt.toISOString(),
          trial_end_at: stripeTrialEndAt.toISOString(),
          current_period_start: trialStartAt.toISOString(),
          current_period_end: stripeTrialEndAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id',
        })

      if (subError) {
        logger.error('Erreur création subscription (with payment)', { error: subError.message })
        return NextResponse.json({ error: 'Erreur lors de la création de l\'abonnement' }, { status: 500 })
      }
    }

    // Écriture faisant autorité des flags d'onboarding : idempotente, vérifiée,
    // avec retry. La RPC / le fallback ci-dessus peuvent avoir « réussi » sans
    // rien écrire (0 ligne, mauvaise org…) — on ne laisse jamais un client
    // facturé bloqué sur l'onboarding sans le savoir.
    const onboardingPersisted = await ensureOnboardingComplete(adminClient, orgId, {
      context: { source: 'create-trial-subscription', stripeSubscriptionId: subscription.id, customerId },
    })

    if (!onboardingPersisted) {
      logger.error('[billing][CRITICAL] Paiement Stripe OK mais onboarding non finalisé en base', {
        organizationId: orgId,
        stripeSubscriptionId: subscription.id,
        customerId,
        userId: user.id,
      })
      // Alerte interne — un humain doit réconcilier ce compte rapidement
      sendEmailViaResend({
        to: 'contact@eduzen.io',
        subject: '🚨 [BILLING] Client facturé mais bloqué sur l\'onboarding',
        html: `<p>Le paiement Stripe a réussi mais l'écriture des flags d'onboarding a échoué 3×.</p>
               <ul>
                 <li>organization_id : <code>${orgId}</code></li>
                 <li>stripe_subscription_id : <code>${subscription.id}</code></li>
                 <li>stripe_customer_id : <code>${customerId}</code></li>
                 <li>user_id : <code>${user.id}</code></li>
               </ul>
               <p>Réparer via /super-admin/subscriptions → Réparer l'onboarding, ou SQL.</p>`,
      }).catch(err => logger.error('[create-trial-subscription] Alerte interne non envoyée:', err))
    }

    revalidateTag(`layout-data-${user.id}`, { expire: 0 })
    logger.info('Onboarding complété avec succès', {
      organizationId: orgId,
      subscriptionId: subscription.id,
      trialEndAt: stripeTrialEndAt.toISOString(),
      onboardingPersisted,
    })

    // Email post-conversion (non bloquant)
    {
      const { data: userProfile } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', user.id)
        .single()
      if (userProfile?.email) {
        const prenom = (userProfile.full_name ?? userProfile.email).split(' ')[0]
        sendEmailViaResend({
          to: userProfile.email,
          from: 'Airtone NILE — EduZen <contact@eduzen.io>',
          replyTo: 'contact@eduzen.io',
          subject: `${prenom}, votre abonnement EduZen est actif`,
          html: buildPostConversionEmail(prenom, plan.name),
        }).catch(err => logger.error('[create-trial-subscription] Error sending conversion email:', err))
      }
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      trialStartAt: trialStartAt.toISOString(),
      trialEndAt: stripeTrialEndAt.toISOString(),
      status: subscription.status,
      planName: plan.name,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    logger.error('[create-trial-subscription] ERREUR:', errorMessage)
    logger.error('Erreur création abonnement trial', { error: errorMessage })

    // Gérer les erreurs Stripe spécifiques
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
