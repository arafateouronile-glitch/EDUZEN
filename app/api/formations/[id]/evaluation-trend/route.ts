/**
 * GET /api/formations/[id]/evaluation-trend — évolution de la note « Suivi
 * qualité » d'une session à l'autre pour une même formation (preuve
 * d'amélioration continue, Qualiopi indicateur 32).
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { buildEvaluationAnalytics, type EvaluationTrendPoint } from '@/lib/services/evaluation-analytics'
import { loadAnalyticsRows, rowsForSession } from '@/lib/services/evaluation-analytics.server'

const MAX_SESSIONS = 12

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: formationId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

  try {
    const { data: sessionsData, error } = await supabase
      .from('sessions')
      .select('id, name, start_date')
      .eq('formation_id', formationId)
      .eq('organization_id', orgId)
      .order('start_date', { ascending: false })
      .limit(MAX_SESSIONS)
    if (error) throw error

    const sessions = (sessionsData ?? []).reverse()
    if (sessions.length === 0) return NextResponse.json({ points: [] })

    const rows = await loadAnalyticsRows(supabase, orgId, { sessionIds: sessions.map((s) => s.id) })

    const points: EvaluationTrendPoint[] = sessions.map((s) => {
      const analytics = buildEvaluationAnalytics(rowsForSession(rows, s.id))
      return {
        sessionId: s.id,
        name: s.name,
        startDate: s.start_date,
        overall10: analytics.overallScore10,
        byType: Object.fromEntries(analytics.types.map((t) => [t.assessmentType, t.score10])),
        respondents: analytics.totalRespondents,
      }
    })

    return NextResponse.json({ points })
  } catch (err) {
    console.error('[evaluation-trend] GET error', err)
    return NextResponse.json({ error: 'Impossible de charger l\'évolution des évaluations' }, { status: 500 })
  }
}
