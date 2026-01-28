/**
 * API Route: GET/DELETE /api/auditor/links
 * Gestion des liens d'accès auditeur
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuditorPortalService } from '@/lib/services/auditor-portal.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * GET - Récupère tous les liens d'accès de l'organisation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer l'utilisateur et son organisation
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        { error: 'Utilisateur ou organisation non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer les liens
    const service = new AuditorPortalService(supabase)
    const links = await service.getAccessLinks(userData.organization_id)

    return NextResponse.json({
      success: true,
      data: links,
    })
  } catch (error) {
    logger.error('Error fetching auditor links:', sanitizeError(error))
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des liens' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Révoque un lien d'accès
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer l'utilisateur et vérifier les droits
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json(
        { error: 'Utilisateur ou organisation non trouvé' },
        { status: 404 }
      )
    }

    if (!['admin', 'super_admin'].includes(userData.role || '')) {
      return NextResponse.json(
        { error: 'Droits insuffisants' },
        { status: 403 }
      )
    }

    // Récupérer l'ID du lien à révoquer
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')

    if (!linkId) {
      return NextResponse.json(
        { error: 'ID du lien requis' },
        { status: 400 }
      )
    }

    // Révoquer le lien
    const service = new AuditorPortalService(supabase)
    await service.revokeLink(linkId)

    logger.info('Auditor access link revoked', {
      linkId,
      revokedBy: userData.id,
    })

    return NextResponse.json({
      success: true,
      message: 'Lien révoqué avec succès',
    })
  } catch (error) {
    logger.error('Error revoking auditor link:', sanitizeError(error))
    return NextResponse.json(
      { error: 'Erreur lors de la révocation du lien' },
      { status: 500 }
    )
  }
}
