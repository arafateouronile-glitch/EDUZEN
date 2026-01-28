import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit, mutationRateLimiter } from '@/lib/utils/rate-limiter'
import { withBodyValidation, type ValidationSchema } from '@/lib/utils/api-validation'
import { logger, maskId, maskEmail, sanitizeError } from '@/lib/utils/logger'

// Schéma de validation pour création d'intention de paiement Stripe
const createIntentSchema: ValidationSchema = {
  amount: {
    type: 'float',
    required: true,
    min: 0.01,
    max: 999999999,
  },
  currency: {
    type: 'string',
    required: false,
    pattern: /^(EUR|USD|GBP|CHF|CAD)$/,
  },
  description: {
    type: 'string',
    required: false,
    maxLength: 500,
  },
  customer_email: {
    type: 'email',
    required: true,
  },
  customer_name: {
    type: 'string',
    required: false,
    maxLength: 100,
  },
  metadata: {
    type: 'json',
    required: false,
  },
  return_url: {
    type: 'url',
    required: false,
  },
  cancel_url: {
    type: 'url',
    required: false,
  },
}

/**
 * POST /api/payments/stripe/create-intent
 * Créer une intention de paiement Stripe
 * ✅ Validation stricte + Rate limiting
 */
export async function POST(request: NextRequest) {
  return withRateLimit(request, mutationRateLimiter, async () => {
    return withBodyValidation(request, createIntentSchema, async (_req, validatedData) => {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const amount = typeof validatedData.amount === 'number' ? validatedData.amount : parseFloat(String(validatedData.amount));
    const currency = typeof validatedData.currency === 'string' ? validatedData.currency : 'EUR';
    const description = validatedData.description as string | undefined;
    const customer_email = validatedData.customer_email as string;
    const customer_name = validatedData.customer_name as string | undefined;
    const metadata = validatedData.metadata as Record<string, unknown> | undefined;
    const return_url = validatedData.return_url as string | undefined;
    const cancel_url = validatedData.cancel_url as string | undefined;

    // NOTE: Intégration Stripe réelle requise
    // Nécessite: npm install stripe et configuration de STRIPE_SECRET_KEY
    // Pour l'instant, on simule la création d'une intention de paiement
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(amount * 100), // Convertir en centimes
    //   currency: currency.toLowerCase(),
    //   description,
    //   metadata: {
    //     ...metadata,
    //     user_id: user.id,
    //   },
    //   receipt_email: customer_email,
    // })

    // Simulation pour le développement
    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const clientSecret = `pi_${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 9)}`

    // Récupérer l'organization_id
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    // Enregistrer dans la base de données
    const { data: paymentRecord, error: dbError } = await supabase
      .from('payments')
      .insert({
        organization_id: userData?.organization_id || null,
        amount: amount.toString(),
        currency: currency.toUpperCase(),
        status: 'pending',
        payment_method: 'stripe',
        payment_provider: 'stripe',
        payment_provider_transaction_id: paymentIntentId,
        description,
        metadata: {
          customer_email,
          customer_name,
          ...(metadata || {}),
        } as Record<string, unknown>,
      } as any)
      .select()
      .single()

    if (dbError) {
      logger.error('Error saving payment to database', dbError, {
        amount,
        currency,
        userId: maskId(user.id),
        error: sanitizeError(dbError),
      })
      return NextResponse.json({ error: 'Erreur lors de l\'enregistrement' }, { status: 500 })
    }

    return NextResponse.json({
      paymentIntentId,
      clientSecret,
      status: 'requires_payment_method',
      paymentId: paymentRecord.id,
    })
  } catch (error: unknown) {
    const amount = typeof validatedData.amount === 'number' ? validatedData.amount : parseFloat(String(validatedData.amount));
    const currency = typeof validatedData.currency === 'string' ? validatedData.currency : 'EUR';
    const customer_email = validatedData.customer_email as string | undefined;
    
    logger.error('Error creating Stripe payment intent', error, {
      amount,
      currency,
      customerEmail: customer_email ? maskEmail(customer_email) : undefined,
      error: sanitizeError(error),
    })
    const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
    })
  })
}
