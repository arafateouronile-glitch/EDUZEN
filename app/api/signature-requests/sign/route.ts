import { NextRequest, NextResponse } from 'next/server'
import { signatureRequestService } from '@/lib/services/signature-request.service'
import { signatureService } from '@/lib/services/signature.service'

/**
 * POST /api/signature-requests/sign
 * Signe une demande de signature (endpoint public)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, signatureData } = body

    if (!token || !signatureData) {
      return NextResponse.json(
        { error: 'Token et signature requis' },
        { status: 400 }
      )
    }

    // Récupérer la demande de signature
    const signatureRequest = await signatureRequestService.getSignatureRequestByToken(token)

    if (!signatureRequest || !signatureRequest.document) {
      return NextResponse.json(
        { error: 'Demande de signature introuvable' },
        { status: 404 }
      )
    }

    // Créer la signature
    const signature = await signatureService.createSignature({
      documentId: signatureRequest.document.id,
      organizationId: signatureRequest.organization_id,
      signerId: signatureRequest.recipient_id || signatureRequest.requester_id,
      signatureData,
      signatureType: 'handwritten',
      signerName: signatureRequest.recipient_name,
      signerEmail: signatureRequest.recipient_email,
    })

    // Mettre à jour la demande de signature
    await signatureRequestService.updateSignatureRequestStatus(
      signatureRequest.id,
      'signed',
      signature.id
    )

    return NextResponse.json({ success: true, signature })
  } catch (error) {
    console.error('Erreur lors de la signature:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
