import { NextRequest, NextResponse } from 'next/server'
import { signatureRequestService } from '@/lib/services/signature-request.service'

/**
 * GET /api/signature-requests/public/[token]
 * Récupère une demande de signature par son token (endpoint public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const signatureRequest = await signatureRequestService.getSignatureRequestByToken(params.token)

    return NextResponse.json(signatureRequest)
  } catch (error) {
    console.error('Erreur lors de la récupération de la demande de signature:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
