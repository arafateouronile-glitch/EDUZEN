/**
 * POST /api/evaluations/public-link — crée (ou réutilise) le lien public
 * (QR code) d'un lot d'évaluations créées ensemble (même session/sujet/
 * type/date). Idempotent : un upsert sur la contrainte unique
 * (session_id, subject, assessment_type, graded_at) renvoie le lien
 * existant si l'icône QR a déjà été cliquée pour ce lot.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'

// evaluation_public_links est une table récente non encore dans les types générés.
type AnyClient = any

export async function POST(req: NextRequest) {
  const supabase = await createClient() as AnyClient
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

  const body = await req.json() as {
    session_id?: string
    subject?: string
    assessment_type?: string
    graded_at?: string
  }
  const { session_id, subject, assessment_type, graded_at } = body

  if (!session_id || !subject || !assessment_type || !graded_at) {
    return NextResponse.json(
      { error: 'session_id, subject, assessment_type et graded_at sont requis' },
      { status: 400 }
    )
  }

  // Vérifie que la session appartient bien à l'organisation de l'utilisateur
  const { data: session } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', session_id)
    .eq('organization_id', orgId)
    .maybeSingle()
  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })

  const { data: link, error } = await supabase
    .from('evaluation_public_links')
    .upsert(
      {
        organization_id: orgId,
        session_id,
        subject,
        assessment_type,
        graded_at,
        created_by: user.id,
      },
      { onConflict: 'session_id,subject,assessment_type,graded_at', ignoreDuplicates: false }
    )
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token: link.token })
}
