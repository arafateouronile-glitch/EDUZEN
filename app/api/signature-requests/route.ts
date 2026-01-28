import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SignatureRequestService } from '@/lib/services/signature-request.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * GET /api/signature-requests
 * Récupère les demandes de signature pour une organisation
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer l'organization_id de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier les permissions
    if (!['admin', 'secretary', 'teacher'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as 'pending' | 'signed' | 'expired' | 'declined' | 'cancelled' | null
    const recipientType = searchParams.get('recipientType') as 'student' | 'funder' | 'teacher' | 'other' | null

    const filters: any = {}
    if (status) filters.status = status
    if (recipientType) filters.recipientType = recipientType

    const signatureRequestService = new SignatureRequestService(supabase)
    const requests = await signatureRequestService.getSignatureRequestsByOrganization(
      userData.organization_id,
      filters
    )

    return NextResponse.json(requests)
  } catch (error) {
    logger.error('Erreur lors de la récupération des demandes de signature:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/signature-requests
 * Crée une ou plusieurs demandes de signature
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    // Récupérer l'organization_id de l'utilisateur
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json(
        { error: 'Organisation non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier les permissions
    if (!['admin', 'secretary', 'teacher'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      )
    }

    const body = await request.json()

    const signatureRequestService = new SignatureRequestService(supabase)
    // Demande unique
    if (body.recipientEmail && body.recipientName) {
      const signatureRequest = await signatureRequestService.createSignatureRequest({
        documentId: body.documentId,
        organizationId: userData.organization_id,
        recipientEmail: body.recipientEmail,
        recipientName: body.recipientName,
        recipientType: body.recipientType,
        recipientId: body.recipientId,
        subject: body.subject,
        message: body.message,
        expiresAt: body.expiresAt,
        requiresNotarization: body.requiresNotarization,
        reminderFrequency: body.reminderFrequency,
      })

      return NextResponse.json(signatureRequest, { status: 201 })
    }

    // Demandes multiples
    if (body.recipients && Array.isArray(body.recipients)) {
      const result = await signatureRequestService.createBulkSignatureRequests(
        body.documentId,
        userData.organization_id,
        body.recipients,
        {
          subject: body.subject,
          message: body.message,
          expiresAt: body.expiresAt,
        }
      )

      return NextResponse.json(result, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Données invalides' },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Erreur lors de la création de la demande de signature:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
