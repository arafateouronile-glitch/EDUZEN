import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TwoFactorAuthService } from '@/lib/services/2fa.service'
import { withRateLimit, authRateLimiter } from '@/lib/utils/rate-limiter'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * POST /api/2fa/disable
 * Désactive la 2FA pour un utilisateur
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
      const { password } = body

      // Vérifier le mot de passe avant de désactiver
      if (password) {
        const { error: passwordError } = await supabase.auth.signInWithPassword({
          email: user.email || '',
          password,
        })

        if (passwordError) {
          return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
        }
      }

      // Désactiver la 2FA
      const twoFactorAuthService = new TwoFactorAuthService(supabase)
      await twoFactorAuthService.disable2FA(user.id)

      return NextResponse.json({
        success: true,
        message: '2FA désactivée avec succès',
      })
    } catch (error: unknown) {
      logger.error('Error disabling 2FA:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  })
}
