import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import Stripe from 'stripe'
import { logger, sanitizeError } from '@/lib/utils/logger'

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  })
}

const VALID_REASON_CODES = ['too_expensive', 'missing_features', 'not_using', 'technical_issues', 'switching_solution', 'other'] as const

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 404 })
    }

    const { reasonCode, reasonDetail, improvementSuggestions } = await request.json()

    if (!reasonCode || !VALID_REASON_CODES.includes(reasonCode)) {
      return NextResponse.json({ error: 'Motif de résiliation requis' }, { status: 400 })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, status, cancel_at_period_end, current_period_end')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!sub || !sub.stripe_subscription_id) {
      return NextResponse.json({ error: 'Aucun abonnement actif à résilier' }, { status: 400 })
    }

    if (!['active', 'trialing', 'past_due'].includes(sub.status)) {
      return NextResponse.json({ error: 'Cet abonnement ne peut pas être résilié dans son état actuel' }, { status: 400 })
    }

    if (sub.cancel_at_period_end) {
      return NextResponse.json({ error: 'La résiliation est déjà programmée' }, { status: 409 })
    }

    const stripe = getStripe()

    try {
      await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true })
      // Ne pas écrire status/cancel_at_period_end ici : le webhook Stripe
      // (customer.subscription.updated) est la source de vérité pour cette table.
    } catch (stripeError: unknown) {
      const code = (stripeError as { code?: string })?.code
      if (code === 'resource_missing') {
        // L'abonnement n'existe plus côté Stripe : aucun webhook ne viendra
        // jamais corriger l'état local, donc on l'aligne directement ici.
        logger.warn('Cancel subscription: Stripe subscription introuvable, alignement local', { stripeSubscriptionId: sub.stripe_subscription_id, organizationId: orgId })
        await supabase.from('subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('id', sub.id)
      } else {
        logger.error('Erreur résiliation Stripe', stripeError, { error: sanitizeError(stripeError) })
        const message = stripeError instanceof Error ? stripeError.message : 'Erreur lors de la résiliation'
        return NextResponse.json({ error: message }, { status: 500 })
      }
    }

    const { error: feedbackError } = await supabase.from('subscription_cancellation_feedback').insert({
      organization_id: orgId,
      subscription_id: sub.id,
      user_id: user.id,
      reason_code: reasonCode,
      reason_detail: reasonDetail || null,
      improvement_suggestions: improvementSuggestions || null,
    })

    if (feedbackError) {
      logger.warn('Cancel subscription: échec insertion feedback (non bloquant)', { error: sanitizeError(feedbackError) })
    }

    return NextResponse.json({ success: true, currentPeriodEnd: sub.current_period_end })
  } catch (error: unknown) {
    logger.error('Erreur résiliation abonnement', error, { error: sanitizeError(error) })
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
