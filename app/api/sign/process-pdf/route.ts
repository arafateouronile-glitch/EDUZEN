/**
 * GET /api/sign/process-pdf?token=...
 * Proxy du PDF courant pour un signataire (process cascade).
 * Même origine = pas de CORS pour le viewer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractStoragePathFromPublicUrl } from '@/lib/utils/sign-document-helpers'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim()
    if (!token) {
      return new NextResponse('Token manquant', { status: 400 })
    }

    const supabase = createAdminClient()
    const env = typeof globalThis !== 'undefined' ? (globalThis as { process?: { env?: NodeJS.ProcessEnv } }).process?.env : undefined
    const supabaseUrl = env?.NEXT_PUBLIC_SUPABASE_URL ?? ''

    type SignatoryRow = { id: string; process_id: string; order_index: number; signed_at: string | null }
    type ProcessRow = { id: string; status: string; current_index: number | null; intermediate_pdf_path: string | null; document: { file_url?: string } | null }
    const { data: sig, error: sigErr } = await supabase
      .from('signatories')
      .select('id, process_id, order_index, signed_at')
      .eq('token', token)
      .maybeSingle()

    if (sigErr || !sig) {
      return new NextResponse('Lien invalide ou expiré', { status: 404 })
    }

    const signatory = sig as SignatoryRow
    if (signatory.signed_at) {
      return new NextResponse('Vous avez déjà signé', { status: 410 })
    }

    const { data: signingProcess, error: procErr } = await supabase
      .from('signing_processes')
      .select(
        'id, status, current_index, intermediate_pdf_path, document:documents(id, file_url)'
      )
      .eq('id', signatory.process_id)
      .single()

    if (procErr || !signingProcess) {
      return new NextResponse('Processus introuvable', { status: 404 })
    }

    const proc = signingProcess as ProcessRow
    if (proc.status === 'completed') {
      return new NextResponse('Processus déjà complété', { status: 410 })
    }

    if (proc.current_index !== signatory.order_index) {
      return new NextResponse("Ce n'est pas encore votre tour de signer", {
        status: 403,
      })
    }

    let path: string | null = null

    if (signatory.order_index === 0) {
      const doc = proc.document
      const fileUrl = doc?.file_url
      if (!fileUrl || typeof fileUrl !== 'string') {
        return new NextResponse('Document sans fichier PDF', { status: 404 })
      }
      path = extractStoragePathFromPublicUrl(fileUrl, supabaseUrl)
    } else {
      path = proc.intermediate_pdf_path
    }

    if (!path || typeof path !== 'string') {
      return new NextResponse('PDF non disponible pour ce signataire', {
        status: 404,
      })
    }

    const { data, error } = await supabase.storage.from('documents').download(path)
    if (error || !data) {
      logger.error('Erreur téléchargement PDF process-pdf:', error)
      return new NextResponse('Impossible de charger le document', { status: 500 })
    }

    const bytes = await data.arrayBuffer()
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (e) {
    logger.error('Erreur GET /api/sign/process-pdf:', e)
    return new NextResponse(
      e instanceof Error ? e.message : 'Erreur serveur',
      { status: 500 }
    )
  }
}
