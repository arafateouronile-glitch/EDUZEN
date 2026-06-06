/**
 * POST /api/trial/extend
 * Accorde +7 jours d'essai si les 4 étapes de la checklist sont complètes.
 * Idempotent : ne prolonge qu'une seule fois (flag organizations.settings.trial_extended).
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
    }

    const orgId = userData.organization_id

    // Vérifier que l'org est bien en trial
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('trial_end_at, status')
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!sub || sub.status !== 'trialing') {
      return NextResponse.json({ error: 'Pas en essai gratuit' }, { status: 400 })
    }

    // Idempotence : vérifier si l'extension a déjà été accordée
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single()

    const settings = (org?.settings as Record<string, unknown>) || {}
    if (settings.trial_extended) {
      return NextResponse.json({ alreadyExtended: true })
    }

    // Vérifier que les 4 étapes sont complètes
    const steps = (settings.onboarding_checklist_steps as Record<string, string>) || {}
    const required = ['configure-org', 'document-templates', 'ask-jeane', 'generate-document']
    const allComplete = required.every(id => !!steps[id])

    if (!allComplete) {
      return NextResponse.json({ error: 'Checklist incomplète' }, { status: 400 })
    }

    // Prolonger le trial de 7 jours
    const currentEnd = new Date(sub.trial_end_at!)
    const newEnd = new Date(currentEnd.getTime() + 7 * 24 * 60 * 60_000)

    await supabase
      .from('subscriptions')
      .update({
        trial_end_at: newEnd.toISOString(),
        current_period_end: newEnd.toISOString(),
      })
      .eq('organization_id', orgId)

    // Marquer l'extension comme accordée
    await supabase
      .from('organizations')
      .update({ settings: { ...settings, trial_extended: true, trial_extended_at: new Date().toISOString() } })
      .eq('id', orgId)

    logger.info('[trial/extend] Trial extended', { orgId, newEnd: newEnd.toISOString() })
    return NextResponse.json({ success: true, newTrialEnd: newEnd.toISOString() })
  } catch (error) {
    logger.error('[trial/extend] Error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
