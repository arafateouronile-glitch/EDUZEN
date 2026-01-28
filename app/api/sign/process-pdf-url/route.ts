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
    const supabaseUrl = globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

    const { data: sig, error: sigErr } = await (supabase
      .from('signatories' as any)
      .select('id, process_id, order_index, signed_at')
      .eq('token', token)
      .maybeSingle() as any)

    if (sigErr || !sig) {
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })
    }

    if (sig.signed_at) {
      return NextResponse.json(
        { error: 'Vous avez déjà signé' },
        { status: 410 }
      )
    }

    const { data: signingProcess, error: procErr } = await (supabase
      .from('signing_processes' as any)
      .select('id, organization_id, document_id, status, current_index, intermediate_pdf_path, intermediate_pdf_url, document:documents(id, title, file_url)')
      .eq('id', sig.process_id)
      .single() as any)

    if (procErr || !signingProcess) {
      return NextResponse.json({ error: 'Processus introuvable' }, { status: 404 })
    }

    if ((signingProcess as any).status === 'completed') {
      return NextResponse.json(
        { error: 'Processus déjà complété' },
        { status: 410 }
      )
    }

    if ((signingProcess as any).current_index !== sig.order_index) {
      return NextResponse.json(
        { error: 'Ce n\'est pas encore votre tour de signer' },
        { status: 403 }
      )
    }

    let path: string | null = null

    if (sig.order_index === 0) {
      const doc = (signingProcess as any).document as { file_url?: string } | null
      const fileUrl = doc?.file_url
      if (!fileUrl || typeof fileUrl !== 'string') {
        return NextResponse.json(
          { error: 'Document sans fichier PDF' },
          { status: 404 }
        )
      }
      path = extractStoragePathFromPublicUrl(fileUrl, supabaseUrl)
    } else {
      path = (signingProcess as any).intermediate_pdf_path
    }

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'PDF non disponible pour ce signataire' },
        { status: 404 }
      )
    }

    const { data: signed, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, EXPIRES_IN)

    if (error || !signed?.signedUrl) {
      logger.error('Erreur signed URL process PDF:', error)
      return NextResponse.json(
        { error: 'Impossible de générer le lien de lecture' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: signed.signedUrl, expiresIn: EXPIRES_IN })
  } catch (e) {
    logger.error('GET /api/sign/process-pdf-url:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
