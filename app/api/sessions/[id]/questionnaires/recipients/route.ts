/**
 * GET /api/sessions/[id]/questionnaires/recipients?audience=instructor|manager|funder
 * — destinataires proposés (liste pré-cochée) pour un questionnaire formateur,
 * manager ou financeur de la session.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { loadRecipientCandidates } from '@/lib/services/questionnaire-recipients'

const AUDIENCES = ['instructor', 'manager', 'funder'] as const
type Audience = (typeof AUDIENCES)[number]

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const audience = req.nextUrl.searchParams.get('audience') as Audience | null
  if (!audience || !AUDIENCES.includes(audience)) {
    return NextResponse.json({ error: 'audience invalide' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

  // La session doit appartenir à l'organisme avant toute lecture en service role
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })

  try {
    const recipients = await loadRecipientCandidates(createAdminClient(), sessionId, audience)
    return NextResponse.json({ recipients })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chargement des destinataires impossible' },
      { status: 500 }
    )
  }
}
