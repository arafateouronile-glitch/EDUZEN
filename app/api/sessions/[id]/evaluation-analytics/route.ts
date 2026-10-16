/**
 * GET /api/sessions/[id]/evaluation-analytics — tableau « Suivi qualité »
 *
 * Agrège les réponses aux évaluations de la session (note /10 par type,
 * rubrique et question + distribution des réponses, points d'attention,
 * comparaison avant/après).
 *
 * Paramètres optionnels pour restreindre à un lot d'évaluations (même clé que
 * evaluation_public_links) : subject, assessment_type, graded_at.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { buildAttentionPoints, buildBeforeAfter } from '@/lib/services/evaluation-analytics'
import { batchFromSearchParams, loadSessionAnalytics } from '@/lib/services/evaluation-analytics.server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

  try {
    const [analytics, { data: session }] = await Promise.all([
      loadSessionAnalytics(supabase, orgId, sessionId, batchFromSearchParams(req.nextUrl.searchParams)),
      supabase.from('sessions').select('formation_id').eq('id', sessionId).maybeSingle(),
    ])

    return NextResponse.json({
      ...analytics,
      attentionPoints: buildAttentionPoints(analytics),
      beforeAfter: buildBeforeAfter(analytics),
      formationId: session?.formation_id ?? null,
    })
  } catch (error) {
    console.error('[evaluation-analytics] GET error', error)
    return NextResponse.json({ error: 'Impossible de charger les résultats des évaluations' }, { status: 500 })
  }
}
