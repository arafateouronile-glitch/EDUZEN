/**
 * POST /api/signing-processes/[id]/resend – Renvoyer le lien au signataire courant.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SigningProcessService } from '@/lib/services/signing-process.service'
import { logger } from '@/lib/utils/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: u } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!u?.organization_id || !['admin', 'secretary', 'teacher'].includes(u.role)) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const svc = new SigningProcessService(supabase)
    const process = await svc.getProcessWithDetail(id)
    if (!process) {
      return NextResponse.json({ error: 'Processus introuvable' }, { status: 404 })
    }
    if ((process as any).organization_id !== u.organization_id) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    if (process.status === 'completed') {
      return NextResponse.json(
        { error: 'Processus déjà complété' },
        { status: 400 }
      )
    }

    const sent = await svc.sendNextEmail(id)
    if (!sent) {
      return NextResponse.json(
        { error: 'Impossible d\'envoyer le mail (vérifier RESEND_API_KEY)' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'Lien renvoyé au signataire courant.' })
  } catch (e) {
    logger.error('POST /api/signing-processes/[id]/resend:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
