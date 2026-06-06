/**
 * POST /api/onboarding/progress
 * Sauvegarde les étapes de la checklist d'onboarding complétées en DB.
 * Stocké dans organizations.settings.onboarding_checklist_steps.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { stepId, completed } = await request.json()
    if (!stepId || typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'stepId et completed requis' }, { status: 400 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', userData.organization_id)
      .single()

    const settings = (org?.settings as Record<string, unknown>) || {}
    const steps = (settings.onboarding_checklist_steps as Record<string, string>) || {}

    if (completed && !steps[stepId]) {
      steps[stepId] = new Date().toISOString()
    }

    await supabase
      .from('organizations')
      .update({ settings: { ...settings, onboarding_checklist_steps: steps } })
      .eq('id', userData.organization_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[onboarding/progress] Error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
