/**
 * GET /api/qualiopi-check/sessions/[sessionId]/audit-zip
 * Télécharge un ZIP contenant les preuves de la session (conventions signées, etc.) pour l'audit.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QualiopiCheckService } from '@/lib/services/qualiopi-check.service'
import { logger } from '@/lib/utils/logger'

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

    const checkService = new QualiopiCheckService(supabase)
    const compliance = await checkService.getSessionCompliance(orgId, sessionId)
    if (!compliance) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }

    // Récupérer les documents signés (conventions) pour les étudiants de la session
    const docIds = compliance.students
      .map((s) => s.contractDocumentId)
      .filter((id): id is string => !!id)
    if (docIds.length === 0) {
      return NextResponse.json(
        { error: 'Aucun document signé à inclure dans l\'archive.' },
        { status: 400 }
      )
    }

    const { data: documents } = await supabase
      .from('documents')
      .select('id, title, student_id, file_url')
      .in('id', docIds)

    const docs = (documents ?? []) as unknown as Array<{
      id: string
      title: string
      student_id: string | null
      file_url: string
      signed_file_url?: string
    }>

    const studentByName = new Map(compliance.students.map((s) => [s.student_id, s.student_name]))

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '-')
    const sessionSlug = compliance.sessionName.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 40)
    const zipFilename = `Preuves_${dateStr}_Session_${sessionSlug}.zip`

    // Documents signés : on utilise signed_file_url si la table l'expose (migration), sinon file_url
    const files: Array<{ name: string; url: string }> = []
    for (const doc of docs) {
      const url = (doc as { signed_file_url?: string; file_url: string }).signed_file_url ?? doc.file_url
      if (!url) continue
      const nameParts = (studentByName.get(doc.student_id ?? '') ?? 'Inconnu').split(/\s+/)
      const lastName = (nameParts.pop() ?? 'X').slice(0, 3).toUpperCase()
      const firstName = (nameParts[0] ?? 'X').slice(0, 2).toUpperCase()
      const safeName = `${dateStr}_Convention_${lastName}_${firstName}.pdf`
      files.push({ name: safeName, url })
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier signé disponible pour le téléchargement.' },
        { status: 400 }
      )
    }

    // Retourner les métadonnées pour que le client puisse déclencher les téléchargements
    // ou on pourra plus tard générer un vrai ZIP côté serveur avec jszip/archiver.
    return NextResponse.json({
      sessionId,
      sessionName: compliance.sessionName,
      zipFilename,
      files,
      message: 'Utilisez les URLs signées Supabase pour télécharger chaque fichier. La génération d\'un ZIP unique sera ajoutée dans une prochaine version.',
    })
  } catch (e) {
    logger.error('QualiopiCheck audit-zip', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
