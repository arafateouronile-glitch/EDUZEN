import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TwoFactorAuthService } from '@/lib/services/2fa.service'
import { withRateLimit, authRateLimiter } from '@/lib/utils/rate-limiter'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * POST /api/2fa/verify
 * Vérifie un code TOTP lors de la connexion
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

      const body = await req.json()
      const { code } = body

      if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'Code requis' }, { status: 400 })
      }

      // Récupérer l'IP et le user agent
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      const userAgent = req.headers.get('user-agent') || 'unknown'

      // Vérifier le code
      const twoFactorAuthService = new TwoFactorAuthService(supabase)
      const result = await twoFactorAuthService.verifyCode(user.id, code, ipAddress, userAgent)

      if (!result.valid) {
        return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
      }

      // Créer une session 2FA temporaire
      const sessionToken = await twoFactorAuthService.create2FASession(user.id, ipAddress, userAgent)

      return NextResponse.json({
        success: true,
        isBackupCode: result.isBackupCode,
        sessionToken,
      })
    } catch (error: unknown) {
      logger.error('Error verifying 2FA code:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  })
}
