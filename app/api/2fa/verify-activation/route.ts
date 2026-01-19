import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TwoFactorAuthService } from '@/lib/services/2fa.service'
import { withRateLimit, authRateLimiter } from '@/lib/utils/rate-limiter'

/**
 * POST /api/2fa/verify-activation
 * Vérifie un code TOTP lors de l'activation de la 2FA
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

      // Vérifier le code d'activation
      const twoFactorAuthService = new TwoFactorAuthService(supabase)
      const isValid = await twoFactorAuthService.verifyActivationCode(user.id, code)

      if (!isValid) {
        return NextResponse.json({ error: 'Code invalide' }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        message: '2FA activée avec succès',
      })
    } catch (error: unknown) {
      console.error('Error verifying 2FA activation:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  })
}
