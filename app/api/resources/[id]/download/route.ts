import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resourceLibraryService } from '@/lib/services/resource-library.service'

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

    // Récupérer la ressource
    const { data: resource, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .single()

    if (error || !resource) {
      return NextResponse.json({ error: 'Ressource non trouvée' }, { status: 404 })
    }

    // Enregistrer le téléchargement
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
    const userAgent = request.headers.get('user-agent') || undefined

    await resourceLibraryService.recordDownload(resourceId, user.id, ipAddress, userAgent)

    // Si c'est une URL externe, rediriger
    if (resource.external_url) {
      return NextResponse.redirect(resource.external_url)
    }

    // Si c'est un fichier, rediriger vers l'URL
    if (resource.file_url) {
      return NextResponse.redirect(resource.file_url)
    }

    return NextResponse.json({ error: 'Aucun fichier disponible' }, { status: 404 })
  } catch (error: unknown) {
    console.error('Error downloading resource:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors du téléchargement',
      },
      { status: 500 }
    )
  }
}

