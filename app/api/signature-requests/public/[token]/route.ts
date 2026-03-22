import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SignatureRequestService } from '@/lib/services/signature-request.service'
import { logger } from '@/lib/utils/logger'
import { withDistributedRateLimit } from '@/lib/utils/rate-limiter-distributed'

/**
 * GET /api/signature-requests/public/[token]
 * Récupère une demande de signature par son token (endpoint public).
 * Rate limit: 20 req/min par IP (anti brute-force).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return withDistributedRateLimit(request, 'public', async () => {
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
  })
}
