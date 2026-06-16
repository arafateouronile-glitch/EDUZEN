/**
 * POST /api/qualiopi-check/sessions/[sessionId]/resend
 * Relance les retardataires : renvoie les liens de signature par email pour les demandes en attente.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { QualiopiCheckService } from '@/lib/services/qualiopi-check.service'
import { SignatureRequestService } from '@/lib/services/signature-request.service'
import { logger } from '@/lib/utils/logger'

export async function POST(
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

    const orgId = await getUserOrgId(supabase, user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const checkService = new QualiopiCheckService(supabase)
    const compliance = await checkService.getSessionCompliance(orgId, sessionId)
    if (!compliance) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }

    const pendingRequestIds = compliance.students
      .map((s) => s.pendingSignatureRequestId)
      .filter((id): id is string => !!id)
    const uniqueIds = [...new Set(pendingRequestIds)]

    const sigService = new SignatureRequestService(supabase)
    let sent = 0
    for (const requestId of uniqueIds) {
      try {
        await sigService.sendReminder(requestId)
        sent++
      } catch (err) {
        logger.error('QualiopiCheck resend reminder failed', { requestId, err })
      }
    }

    return NextResponse.json({
      success: true,
      message: sent > 0
        ? `${sent} lien(s) de signature renvoyé(s) par email.`
        : 'Aucune demande de signature en attente pour cette session.',
      sent,
      totalPending: uniqueIds.length,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
