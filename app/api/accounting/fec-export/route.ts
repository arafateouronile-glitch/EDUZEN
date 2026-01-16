import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/types/database.types'
import { fecExportService } from '@/lib/services/fec-export.service'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const maxDuration = 60 // 60 secondes maximum

/**
 * GET /api/accounting/fec-export
 * Exporte les écritures comptables au format FEC
 * Query params:
 *   - startDate: Date de début (ISO format)
 *   - endDate: Date de fin (ISO format)
 *   - includePayments: Inclure les paiements (true/false)
 *   - journalCode: Code journal par défaut (optionnel)
 */
export async function GET(request: NextRequest) {
  try {
    // Créer un client Supabase pour les API routes
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }))
          },
          setAll() {
            // Les cookies seront gérés par le middleware
          },
        },
      }
    )

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer l'organisation de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 403 }
      )
    }

    // Vérifier les permissions (admin ou accountant)
    if (!['super_admin', 'admin', 'accountant'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Permission refusée' },
        { status: 403 }
      )
    }

    const organizationId = userData.organization_id

    // Récupérer les paramètres de la query string
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const includePayments = searchParams.get('includePayments') === 'true'
    const journalCode = searchParams.get('journalCode') || undefined

    // Générer le fichier FEC
    const fecContent = await fecExportService.generateFEC({
      organizationId,
      startDate,
      endDate,
      includePayments,
      journalCode,
    })

    // Générer le nom de fichier
    const filename = fecExportService.generateFECFilename(organizationId, {
      startDate,
      endDate,
    })

    // Retourner le fichier avec les bons headers
    return new NextResponse(fecContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    logger.error('FEC Export - Export failed', error, {
      error: sanitizeError(error),
    })
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'export FEC',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}



