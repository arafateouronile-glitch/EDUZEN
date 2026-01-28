/**
 * GET /api/signing-processes – Liste des processus (org).
 * POST /api/signing-processes – Créer un processus et envoyer le premier mail.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SigningProcessService } from '@/lib/services/signing-process.service'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
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
    const list = await svc.listByOrganization(u.organization_id)
    return NextResponse.json(list)
  } catch (e) {
    logger.error('GET /api/signing-processes:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json().catch(() => ({}))
    const { document_id, signatories, title } = body as {
      document_id?: string
      signatories?: Array<{ email: string; name: string; order_index: number }>
      title?: string
    }

    if (!document_id || !Array.isArray(signatories) || signatories.length < 2) {
      return NextResponse.json(
        { error: 'document_id et au moins 2 signataires requis (ordre 0, 1, …)' },
        { status: 400 }
      )
    }

    const { data: doc } = await supabase
      .from('documents')
      .select('id, organization_id')
      .eq('id', document_id)
      .single()

    if (!doc || (doc as any).organization_id !== u.organization_id) {
      return NextResponse.json({ error: 'Document introuvable ou hors organisation' }, { status: 404 })
    }

    const svc = new SigningProcessService(supabase)
    const process = await svc.createProcess({
      organization_id: u.organization_id,
      document_id,
      signatories,
      title,
    })

    const sent = await svc.sendFirstEmail(process.id)
    if (!sent) {
      logger.warn('Premier mail process non envoyé', { processId: process.id })
    }

    return NextResponse.json({
      process,
      firstEmailSent: sent,
    })
  } catch (e) {
    logger.error('POST /api/signing-processes:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
