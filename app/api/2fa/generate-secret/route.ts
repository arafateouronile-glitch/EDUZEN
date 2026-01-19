import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TwoFactorAuthService } from '@/lib/services/2fa.service'
import { withRateLimit, authRateLimiter } from '@/lib/utils/rate-limiter'
import { logger, maskId, maskEmail, sanitizeError } from '@/lib/utils/logger'

/**
 * POST /api/2fa/generate-secret
 * Génère un secret TOTP et un QR code pour activer la 2FA
 */
export async function POST(request: NextRequest) {
  return withRateLimit(request, authRateLimiter, async (req) => {
    try {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      }

      // Récupérer l'email de l'utilisateur
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', user.id)
        .single()

      const email = userData?.email || user.email || ''

      if (!email) {
        return NextResponse.json({ error: 'Email non trouvé' }, { status: 400 })
      }

      // Générer le secret et le QR code
      const twoFactorAuthService = new TwoFactorAuthService(supabase)
      const result = await twoFactorAuthService.generateSecret(user.id, email)

      return NextResponse.json({
        secret: result.secret,
        qrCodeUrl: result.qrCodeUrl,
        backupCodes: result.backupCodes,
      })
    } catch (error: unknown) {
      logger.error('[CRITICAL] 2FA secret generation failed', error, {
        error: sanitizeError(error),
      })
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  })
}
