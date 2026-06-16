import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ResourceLibraryService } from '@/lib/services/resource-library.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * API Route pour télécharger une ressource
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resourceId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Table 'resources' absente des types générés Supabase ; chaîne typée manuellement
    type ResourceRow = { id: string; external_url?: string | null; file_url?: string | null; [key: string]: unknown }
    type ResourcesQuery = {
      from(_table: 'resources'): { select(_cols: string): { eq(_key: string, _value: string): { single(): Promise<{ data: ResourceRow | null; error: unknown }> } } }
    }
    const { data: resource, error } = await (supabase as unknown as ResourcesQuery)
      .from('resources')
      .select('id, external_url, file_url')
      .eq('id', resourceId)
      .single()

    if (error || !resource) {
      return NextResponse.json({ error: 'Ressource non trouvée' }, { status: 404 })
    }

    const res = resource

    // Enregistrer le téléchargement
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    const resourceLibraryService = new ResourceLibraryService(supabase)
    await resourceLibraryService.recordDownload(resourceId, user.id, ipAddress, userAgent)

    // Si c'est une URL externe, rediriger (validation pour éviter open redirect)
    if (res.external_url) {
      try {
        const url = new URL(res.external_url)
        if (!['http:', 'https:'].includes(url.protocol)) {
          return NextResponse.json({ error: 'URL externe invalide' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'URL externe malformée' }, { status: 400 })
      }
      return NextResponse.redirect(res.external_url)
    }

    // Si c'est un fichier, rediriger vers l'URL (validation identique)
    if (res.file_url) {
      try {
        const url = new URL(res.file_url)
        if (!['http:', 'https:'].includes(url.protocol)) {
          return NextResponse.json({ error: 'URL fichier invalide' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'URL fichier malformée' }, { status: 400 })
      }
      return NextResponse.redirect(res.file_url)
    }

    return NextResponse.json({ error: 'Aucun fichier disponible' }, { status: 404 })
  } catch (error: unknown) {
    logger.error('Error downloading resource:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du téléchargement',
      },
      { status: 500 }
    )
  }
}

