import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DocumentationService } from '@/lib/services/documentation.service'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

/**
 * API Route pour rechercher dans la documentation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const organizationId = searchParams.get('organization_id') || undefined

    if (!query) {
      return NextResponse.json({ error: 'Paramètre q requis' }, { status: 400 })
    }

    const documentationService = new DocumentationService(supabase)
    const results = await documentationService.searchArticles(query, organizationId)

    // Enregistrer la recherche dans l'historique
    await documentationService.recordSearch(user.id, query, results.length)

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    })
  } catch (error: unknown) {
    logger.error('Documentation Search - Error searching', error, {
      error: sanitizeError(error),
    })
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || 'Erreur lors de la recherche',
      },
      { status: 500 }
    )
  }
}
