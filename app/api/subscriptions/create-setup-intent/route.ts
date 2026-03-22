import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { logger } from '@/lib/utils/logger'

// Initialiser Stripe uniquement si la clé est disponible
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(secretKey)
}

/**
 * POST /api/subscriptions/create-setup-intent
 *
 * Crée un Stripe SetupIntent pour collecter les informations de carte
 * sans effectuer de paiement immédiat.
 *
 * Utilisé lors de l'onboarding pour configurer l'essai gratuit de 14 jours.
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

    // Récupérer les infos de l'organisation
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name')
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

    const stripe = getStripe()

    if (existingSubscription?.stripe_customer_id) {
      customerId = existingSubscription.stripe_customer_id
    } else {
      const cookieStore = await cookies()
      const affiliateRef = cookieStore.get('eduzen_affiliate_ref')?.value?.trim()
      const metadata: Record<string, string> = {
        organization_id: userData.organization_id,
        user_id: user.id,
      }
      if (affiliateRef) metadata.affiliate_id = affiliateRef

      // Créer un nouveau customer Stripe
      const customer = await stripe.customers.create({
        email: user.email,
        name: organization?.name || 'Organisation',
        metadata,
      })

      customerId = customer.id

      logger.info('Stripe customer créé pour onboarding', {
        customerId,
        organizationId: userData.organization_id,
      })
    }

    // Créer le SetupIntent pour collecter la carte
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session', // Permet les paiements récurrents
      metadata: {
        organization_id: userData.organization_id,
        user_id: user.id,
        purpose: 'trial_onboarding',
      },
    })

    logger.info('SetupIntent créé pour onboarding', {
      setupIntentId: setupIntent.id,
      customerId,
      organizationId: userData.organization_id,
    })

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
      setupIntentId: setupIntent.id,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    logger.error('Erreur création SetupIntent', { error: errorMessage })
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
