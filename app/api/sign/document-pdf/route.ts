/**
 * GET /api/sign/document-pdf?token=...
 * Proxy du PDF du document à signer (même origine = pas de CORS).
 * Le viewer charge cette URL pour afficher le PDF sans blocage CORS par Supabase.
 */

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractStoragePathFromPublicUrl } from '@/lib/utils/sign-document-helpers'
import { logger } from '@/lib/utils/logger'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_REGEX.test(s)
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')?.trim()
    if (!token) {
      return new NextResponse('Token manquant', { status: 400 })
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
      return new NextResponse('Lien invalide ou expiré', { status: 404 })
    }

    if (sr.token_expires_at && new Date(sr.token_expires_at as string) < new Date()) {
      return new NextResponse('Lien expiré', { status: 410 })
    }
    if (sr.expires_at && new Date(sr.expires_at as string) < new Date()) {
      return new NextResponse('Demande expirée', { status: 410 })
    }

    const doc = sr.document as Record<string, unknown> | null
    const fileUrl = doc?.file_url as string | null | undefined
    if (!fileUrl || typeof fileUrl !== 'string') {
      return new NextResponse('Document sans fichier PDF', { status: 404 })
    }

    const path = extractStoragePathFromPublicUrl(fileUrl, supabaseUrl)
    if (!path) {
      return new NextResponse('URL du document non supportée', { status: 400 })
    }

    const { data, error } = await supabase.storage.from('documents').download(path)
    if (error || !data) {
      logger.error('Erreur téléchargement PDF document-pdf:', error)
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
    logger.error('Erreur GET /api/sign/document-pdf:', e)
    return new NextResponse(
      e instanceof Error ? e.message : 'Erreur serveur',
      { status: 500 }
    )
  }
}
