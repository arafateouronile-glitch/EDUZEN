/**
 * GET /api/sign/process-pdf-url?token=...
 * URL signée du PDF courant pour un signataire (process cascade).
 * Premier signataire : document original. Suivants : PDF intermédiaire.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractStoragePathFromPublicUrl } from '@/lib/utils/sign-document-helpers'
import { logger } from '@/lib/utils/logger'

const EXPIRES_IN = 3600

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim()
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const env = typeof globalThis !== 'undefined' ? (globalThis as { process?: { env?: NodeJS.ProcessEnv } }).process?.env : undefined
    const supabaseUrl = env?.NEXT_PUBLIC_SUPABASE_URL ?? ''

    const { data: sig, error: sigErr } = await supabase
      .from('signatories')
      .select('id, process_id, order_index, signed_at')
      .eq('token', token)
      .maybeSingle()

    if (sigErr || !sig) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    }

    if (sig.signed_at) {
      return NextResponse.json(
        { error: 'Vous avez déjà signé' },
        { status: 410 }
      )
    }

    type ProcessRow = { status?: string; current_index?: number; document?: { file_url?: string } | null; intermediate_pdf_path?: string | null }
    const { data: signingProcess, error: procErr } = await supabase
      .from('signing_processes')
      .select('id, organization_id, document_id, status, current_index, intermediate_pdf_path, intermediate_pdf_url, document:documents(id, title, file_url)')
      .eq('id', sig.process_id)
      .single()

    if (procErr || !signingProcess) {
      return NextResponse.json({ error: 'Processus introuvable' }, { status: 404 })
    }

    const proc = signingProcess as ProcessRow
    if (proc.status === 'completed') {
      return NextResponse.json(
        { error: 'Processus déjà complété' },
        { status: 410 }
      )
    }

    if (proc.current_index !== sig.order_index) {
      return NextResponse.json(
        { error: 'Ce n\'est pas encore votre tour de signer' },
        { status: 403 }
      )
    }

    let path: string | null = null

    if (sig.order_index === 0) {
      const rawDoc = proc.document
      const doc = Array.isArray(rawDoc) ? rawDoc[0] : rawDoc
      const fileUrl = doc && typeof doc === 'object' && 'file_url' in doc ? (doc as { file_url?: string }).file_url : null
      if (!fileUrl || typeof fileUrl !== 'string') {
        return NextResponse.json(
          { error: 'Document sans fichier PDF' },
          { status: 404 }
        )
      }
      path = extractStoragePathFromPublicUrl(fileUrl, supabaseUrl)
    } else {
      path = proc.intermediate_pdf_path ?? null
    }

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'PDF non disponible pour ce signataire' },
        { status: 404 }
      )
    }

    // Retourner l’URL du proxy (même origine) pour éviter le blocage CORS du viewer.
    const url = `/api/sign/process-pdf?token=${encodeURIComponent(token)}`
    return NextResponse.json({ url, expiresIn: EXPIRES_IN })
  } catch (e) {
    logger.error('GET /api/sign/process-pdf-url:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
