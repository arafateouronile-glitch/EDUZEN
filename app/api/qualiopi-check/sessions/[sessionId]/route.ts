/**
 * GET /api/qualiopi-check/sessions/[sessionId]
 * Détail conformité d'une session (score, étudiants, alertes).
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QualiopiCheckService } from '@/lib/services/qualiopi-check.service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userRow?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const orgId = userRow.organization_id

    const service = new QualiopiCheckService(supabase)
    const result = await service.getSessionCompliance(orgId, sessionId)
    if (!result) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
