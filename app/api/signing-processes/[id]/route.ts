/**
 * GET /api/signing-processes/[id] – Détail d’un processus (Tour de contrôle).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SigningProcessService } from '@/lib/services/signing-process.service'
import { logger } from '@/lib/utils/logger'

export async function GET(
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

    return NextResponse.json(process)
  } catch (e) {
    logger.error('GET /api/signing-processes/[id]:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
