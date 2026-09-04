import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

interface EnsureOptions {
  /** Marque aussi payment_method_added=true (cas d'un paiement Stripe confirmé). Défaut: true. */
  markPaymentAdded?: boolean
  /** Contexte pour les logs (id d'abonnement Stripe, origine de l'appel…). */
  context?: Record<string, unknown>
}

/**
 * Écrit `onboarding_completed` (+ `payment_method_added` si `markPaymentAdded`)
 * dans `organizations.settings`, de façon **idempotente**, avec **relecture de
 * vérification** et **retry**.
 *
 * C'est le point d'écriture unique et fiable de la fin d'onboarding : utilisé
 * après un paiement Stripe (create-trial-subscription), par l'écran de secours
 * du dashboard, et par le bouton super-admin de réparation.
 *
 * @returns true si l'état final en base est cohérent, false sinon (un log
 *          `[billing][CRITICAL]` est alors émis pour alerte).
 */
export async function ensureOnboardingComplete(
  admin: SupabaseClient,
  organizationId: string,
  options: EnsureOptions = {}
): Promise<boolean> {
  const markPaymentAdded = options.markPaymentAdded ?? true
  const ctx = options.context ?? {}

  const isConsistent = (settings: Record<string, unknown>) =>
    settings.onboarding_completed === true &&
    (!markPaymentAdded || settings.payment_method_added === true)

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { data: orgRow, error: readError } = await admin
        .from('organizations')
        .select('settings')
        .eq('id', organizationId)
        .single()

      if (readError) {
        logger.warn('[billing] ensureOnboardingComplete — lecture échouée', {
          organizationId, attempt, error: readError.message, ...ctx,
        })
        await sleep(250 * attempt)
        continue
      }

      const current = (orgRow?.settings ?? {}) as Record<string, unknown>
      if (isConsistent(current)) return true

      const nowIso = new Date().toISOString()
      const nextSettings: Record<string, unknown> = {
        ...current,
        onboarding_completed: true,
        onboarding_completed_at: current.onboarding_completed_at ?? nowIso,
      }
      if (markPaymentAdded) {
        nextSettings.payment_method_added = true
        nextSettings.payment_method_added_at = current.payment_method_added_at ?? nowIso
      }

      const { error: writeError } = await admin
        .from('organizations')
        .update({ settings: nextSettings, subscription_status: 'active', updated_at: nowIso })
        .eq('id', organizationId)

      if (!writeError) {
        // Relecture : ne jamais faire confiance à un update non vérifié
        const { data: verifyRow } = await admin
          .from('organizations')
          .select('settings')
          .eq('id', organizationId)
          .single()
        if (isConsistent((verifyRow?.settings ?? {}) as Record<string, unknown>)) return true
      }

      logger.warn('[billing] ensureOnboardingComplete — retry', {
        organizationId, attempt, error: writeError?.message, ...ctx,
      })
      await sleep(250 * attempt)
    } catch (err) {
      logger.warn('[billing] ensureOnboardingComplete — exception', {
        organizationId, attempt, error: (err as Error).message, ...ctx,
      })
      await sleep(250 * attempt)
    }
  }

  logger.error('[billing][CRITICAL] Onboarding non finalisé après 3 tentatives', {
    organizationId, markPaymentAdded, ...ctx,
  })
  return false
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
