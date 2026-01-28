/**
 * GET /api/sign/document-pdf-url?token=...
 * Retourne une URL signée temporaire pour le PDF du document à signer.
 * Obligation légale : le signataire doit pouvoir lire le document avant de signer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractStoragePathFromPublicUrl } from '@/lib/utils/sign-document-helpers'
import { logger } from '@/lib/utils/logger'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EXPIRES_IN = 3600

function isUuid(s: string): boolean {
  return UUID_REGEX.test(s)
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim()
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

    const fetchByAccessToken = () =>
      supabase
        .from('signature_requests')
        .select(
          'id, status, token_expires_at, expires_at, document:documents(id, title, file_url)'
        )
        .eq('access_token', token)
        .maybeSingle()

    const fetchBySignatureToken = () =>
      supabase
        .from('signature_requests')
        .select(
          'id, status, token_expires_at, expires_at, document:documents(id, title, file_url)'
        )
        .eq('signature_token', token)
        .maybeSingle()

    let res = isUuid(token)
      ? await fetchByAccessToken()
      : await fetchBySignatureToken()
    if (!res.data)
      res = isUuid(token)
        ? await fetchBySignatureToken()
        : await fetchByAccessToken()

    const sr = res.data as Record<string, unknown> | null
    if (!sr || (sr.status as string) !== 'pending') {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré' },
        { status: 404 }
      )
    }

    if (sr.token_expires_at && new Date(sr.token_expires_at as string) < new Date()) {
      return NextResponse.json({ error: 'Lien expiré' }, { status: 410 })
    }
    if (sr.expires_at && new Date(sr.expires_at as string) < new Date()) {
      return NextResponse.json({ error: 'Demande expirée' }, { status: 410 })
    }

    const doc = sr.document as Record<string, unknown> | null
    const fileUrl = doc?.file_url as string | null | undefined
    if (!fileUrl || typeof fileUrl !== 'string') {
      return NextResponse.json(
        { error: 'Document sans fichier PDF' },
        { status: 404 }
      )
    }

    const path = extractStoragePathFromPublicUrl(fileUrl, supabaseUrl)
    if (!path) {
      return NextResponse.json(
        { error: 'URL du document non supportée' },
        { status: 400 }
      )
    }

    const { data: signed, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, EXPIRES_IN)

    if (error || !signed?.signedUrl) {
      logger.error('Erreur création signed URL document PDF:', error)
      return NextResponse.json(
        { error: 'Impossible de générer le lien de lecture' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: signed.signedUrl,
      expiresIn: EXPIRES_IN,
    })
  } catch (e) {
    logger.error('Erreur GET /api/sign/document-pdf-url:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
