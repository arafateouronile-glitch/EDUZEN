/**
 * GET /api/qualiopi-check/sessions
 * Liste les sessions de l'organisation avec score de conformité (résumé).
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { QualiopiCheckService } from '@/lib/services/qualiopi-check.service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const formationId = searchParams.get('formationId') ?? undefined
    const limit = Math.min(Number(searchParams.get('limit')) || 30, 100)

    const service = new QualiopiCheckService(supabase)
    const list = await service.listSessionsWithCompliance(orgId, { formationId, limit })
    return NextResponse.json(list)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
