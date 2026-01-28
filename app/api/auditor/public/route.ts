/**
 * API Route: GET /api/auditor/public?token=xxx
 * Accès public aux données du portail auditeur via un token temporaire
 * Cette route ne nécessite PAS d'authentification - le token fait office de clé d'accès
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { AuditorPortalService } from '@/lib/services/auditor-portal.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

// Créer le client Supabase admin à la demande
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * GET - Récupère les données du portail auditeur
 */
export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token requis' },
        { status: 400 }
      )
    }

    // Récupérer les données via le service
    const service = new AuditorPortalService(supabaseAdmin)
    const data = await service.getAuditorPortalData(token)

    if (!data) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré' },
        { status: 404 }
      )
    }

    // Logger l'accès
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    logger.info('Auditor portal accessed', {
      auditorName: data.link.auditor_name,
      organizationId: data.organization.id,
      ip,
    })

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    logger.error('Error accessing auditor portal:', sanitizeError(error))
    return NextResponse.json(
      { error: 'Erreur lors de l\'accès au portail' },
      { status: 500 }
    )
  }
}

/**
 * POST - Recherche par échantillon (mode échantillonnage)
 */
export async function POST(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token requis' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { searchTerm } = body

    if (!searchTerm || searchTerm.length < 2) {
      return NextResponse.json(
        { error: 'Terme de recherche trop court (min. 2 caractères)' },
        { status: 400 }
      )
    }

    // Valider le token
    const service = new AuditorPortalService(supabaseAdmin)
    const link = await service.validateToken(token)

    if (!link) {
      return NextResponse.json(
        { error: 'Lien invalide ou expiré' },
        { status: 404 }
      )
    }

    // Vérifier les permissions de sampling
    const permissions = link.permissions as { sampling_mode?: boolean }
    if (!permissions.sampling_mode) {
      return NextResponse.json(
        { error: 'Mode échantillonnage non autorisé pour ce lien' },
        { status: 403 }
      )
    }

    // Rechercher les preuves
    const evidence = await service.searchBySample(link.organization_id, searchTerm)

    // Logger la recherche
    await service.logAuditorAction(link.id, 'sampling_search', {
      searchQuery: searchTerm,
    })

    return NextResponse.json({
      success: true,
      data: {
        searchTerm,
        results: evidence,
        count: evidence.length,
      },
    })
  } catch (error) {
    logger.error('Error in sampling search:', sanitizeError(error))
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    )
  }
}
