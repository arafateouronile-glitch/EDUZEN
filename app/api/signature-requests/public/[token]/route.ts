import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SignatureRequestService } from '@/lib/services/signature-request.service'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * GET /api/signature-requests/public/[token]
 * Récupère une demande de signature par son token (endpoint public)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = await createClient()
    const signatureRequestService = new SignatureRequestService(supabase)
    const signatureRequest = await signatureRequestService.getSignatureRequestByToken(token)

    return NextResponse.json(signatureRequest)
  } catch (error) {
    logger.error('Erreur lors de la récupération de la demande de signature:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
