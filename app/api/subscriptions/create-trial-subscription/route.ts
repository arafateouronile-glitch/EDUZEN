import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import Stripe from 'stripe'
import { logger } from '@/lib/utils/logger'
import { z } from 'zod'

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
      .select('*')
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

    // ========================================
    // CAS 1: Démarrage sans carte bancaire
    // ========================================
    if (skipPaymentMethod) {
      logger.info('Démarrage essai sans carte', {
        organizationId: userData.organization_id,
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
        .eq('id', userData.organization_id)
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
          subscription_status: 'trialing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userData.organization_id)

      if (orgUpdateError) {
        logger.error('Erreur mise à jour organisation (skip payment)', { error: orgUpdateError.message })
        return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'organisation' }, { status: 500 })
      }

      // Créer la subscription en base sans Stripe
      const { error: subError } = await adminClient
        .from('organization_subscriptions')
        .upsert({
          organization_id: userData.organization_id,
          plan_id: planId,
          status: 'trialing',
          billing_cycle: billingPeriod,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          payment_method: null,
          trial_ends_at: trialEndAt.toISOString(),
          current_period_start: trialStartAt.toISOString(),
          current_period_end: trialEndAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id',
        })

      if (subError) {
        logger.error('Erreur création subscription (skip payment)', { error: subError.message })
        return NextResponse.json({ error: 'Erreur lors de la création de l\'abonnement' }, { status: 500 })
      }

      logger.info('Essai démarré sans carte', {
        organizationId: userData.organization_id,
        trialEndAt: trialEndAt.toISOString(),
      })

      return NextResponse.json({
        success: true,
        subscriptionId: null,
        trialStartAt: trialStartAt.toISOString(),
        trialEndAt: trialEndAt.toISOString(),
        status: 'trialing',
        planName: plan.name,
        paymentMethodRequired: true, // Indique que la carte sera nécessaire
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
      organizationId: userData.organization_id,
    })

    // Créer l'abonnement avec période d'essai de 14 jours
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePriceId }],
      trial_period_days: 14,
      default_payment_method: paymentMethodId,
      metadata: {
        organization_id: userData.organization_id,
        plan_id: planId,
        billing_period: billingPeriod,
      },
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
    })

    logger.info('Abonnement créé avec essai gratuit', {
      subscriptionId: subscription.id,
      customerId,
      organizationId: userData.organization_id,
      trialEnd: subscription.trial_end,
    })

    // Mettre à jour la date de fin de trial depuis Stripe
    const stripeTrialEndAt = subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : trialEndAt

    // Utiliser la fonction RPC pour compléter l'onboarding (fonction peut ne pas être dans les types générés)
    const { error: rpcError } = await (supabase.rpc as (name: string, args: Record<string, unknown>) => ReturnType<typeof supabase.rpc>)(
      'complete_onboarding_with_payment',
      {
        p_organization_id: userData.organization_id,
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
        .eq('id', userData.organization_id)
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
        .eq('id', userData.organization_id)

      if (orgUpdateError) {
        logger.error('Erreur mise à jour organisation (with payment)', { error: orgUpdateError.message })
        return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'organisation' }, { status: 500 })
      }

      // Créer ou mettre à jour la subscription
      const { error: subError } = await adminClient
        .from('organization_subscriptions')
        .upsert({
          organization_id: userData.organization_id,
          plan_id: planId,
          status: 'trialing',
          billing_cycle: billingPeriod,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          payment_method: { id: paymentMethodId },
          trial_ends_at: stripeTrialEndAt.toISOString(),
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

    logger.info('Onboarding complété avec succès', {
      organizationId: userData.organization_id,
      subscriptionId: subscription.id,
      trialEndAt: stripeTrialEndAt.toISOString(),
    })

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
