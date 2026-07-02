import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

// Proxy qui sert les fichiers SCORM depuis Supabase Storage.
// Indispensable : le contenu SCORM tente d'appeler window.parent.API
// ce qui nécessite same-origin. En passant par cette route Next.js,
// l'iframe est same-origin avec l'app et window.parent est accessible.
// Pour l'entry point HTML, on injecte le script scorm-again API bridge.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string; filePath: string[] }> }
) {
  try {
    const { lessonId, filePath } = await params
    const filePathStr = filePath.join('/')

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return new NextResponse('Configuration serveur manquante', { status: 500 })
    }

    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

    // Retrouver le storage_path depuis la table scorm_packages
    const { data: pkg, error: pkgError } = await admin
      .from('scorm_packages')
      .select('storage_path, entry_point, scorm_version')
      .eq('lesson_id', lessonId)
      .single()

    if (pkgError || !pkg) {
      return new NextResponse('Package SCORM introuvable', { status: 404 })
    }

    const storagePath = `${pkg.storage_path}${filePathStr}`

    const { data: blob, error: downloadError } = await admin.storage
      .from('scorm-packages')
      .download(storagePath)

    if (downloadError || !blob) {
      logger.error('scorm content proxy download error', { storagePath, error: downloadError })
      return new NextResponse('Fichier introuvable', { status: 404 })
    }

    const contentType = getContentType(filePathStr)
    // Même origine via ce proxy → window.parent.API fonctionne naturellement.
    // Pas d'injection de bridge nécessaire : ScormPlayer expose window.API sur la page parent.
    const buffer = await blob.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType + (contentType === 'text/html' ? '; charset=utf-8' : ''),
        'Cache-Control': contentType === 'text/html' ? 'no-store' : 'public, max-age=3600',
        'X-Frame-Options': 'ALLOWALL',
      },
    })
  } catch (error) {
    logger.error('scorm content proxy route', error)
    return new NextResponse('Erreur serveur', { status: 500 })
  }
}


function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    html: 'text/html',
    htm: 'text/html',
    js: 'application/javascript',
    css: 'text/css',
    xml: 'application/xml',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    woff: 'font/woff',
    woff2: 'font/woff2',
    ttf: 'font/ttf',
    swf: 'application/x-shockwave-flash',
  }
  return types[ext ?? ''] ?? 'application/octet-stream'
}
