import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

// Relaie un fichier des buckets Storage publics depuis notre propre domaine,
// pour que les <iframe> d'aperçu restent same-origin et ne soient pas
// bloquées par les protections anti-pistage des navigateurs (Brave Shields,
// Safari ITP...). Malgré le nom "elearning" (route historique), sert aussi
// le bucket "documents" (aperçu dans /dashboard/documents/[id]) — déjà
// public via getPublicUrl ailleurs dans l'app, ce relais ne change donc pas
// le niveau d'exposition, seulement le transport (same-origin).
const ALLOWED_BUCKETS = ['elearning-media', 'course-media', 'course-thumbnails', 'documents']

function extractBucketAndPath(fileUrl: string, supabaseUrl: string): { bucket: string; path: string } | null {
  const prefix = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/`
  if (!fileUrl.startsWith(prefix)) return null

  const rest = fileUrl.slice(prefix.length).split('?')[0].split('#')[0]
  const slashIdx = rest.indexOf('/')
  if (slashIdx === -1) return null

  const bucket = rest.slice(0, slashIdx)
  const path = rest.slice(slashIdx + 1)
  if (!path || path.includes('..') || !ALLOWED_BUCKETS.includes(bucket)) return null

  return { bucket, path }
}

export async function GET(request: NextRequest) {
  const fileUrl = request.nextUrl.searchParams.get('url')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!fileUrl || !supabaseUrl) {
    return NextResponse.json({ error: 'Paramètre url manquant' }, { status: 400 })
  }

  const target = extractBucketAndPath(fileUrl, supabaseUrl)
  if (!target) {
    return NextResponse.json({ error: 'URL non autorisée' }, { status: 400 })
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.storage.from(target.bucket).download(target.path)

    if (error || !data) {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
    }

    const buffer = await data.arrayBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    logger.error('elearning file-proxy error', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
