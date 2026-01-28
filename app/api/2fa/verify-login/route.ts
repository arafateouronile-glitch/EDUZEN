import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TwoFactorAuthService } from '@/lib/services/2fa.service'
import { withDistributedRateLimit } from '@/lib/utils/rate-limiter-distributed'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * POST /api/2fa/verify-login
 * Vérifie un code TOTP lors de la connexion (sans authentification préalable)
 * et définit le token de session 2FA dans un cookie httpOnly sécurisé
 */
export async function POST(request: NextRequest) {
  return withDistributedRateLimit(request, 'strict', async (req) => {
    try {
      const body = await req.json()
      const { userId, code } = body

      if (!userId || typeof userId !== 'string') {
        return NextResponse.json({ error: 'User ID requis' }, { status: 400 })
      }

      if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'Code requis' }, { status: 400 })
      }

      // Validation du format UUID pour userId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(userId)) {
        return NextResponse.json({ error: 'User ID invalide' }, { status: 400 })
      }

      // Validation du code (6 chiffres ou code de récupération 8 caractères hex)
      const codeRegex = /^([0-9]{6}|[A-F0-9]{8})$/i
      if (!codeRegex.test(code)) {
        return NextResponse.json({ error: 'Format de code invalide' }, { status: 400 })
      }

      // Récupérer l'IP et le user agent
      const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                        req.headers.get('x-real-ip') ||
                        'unknown'
      const userAgent = req.headers.get('user-agent') || 'unknown'

      // Créer le client Supabase avec les privilèges serveur
      const supabase = await createClient()
      const twoFactorAuthService = new TwoFactorAuthService(supabase)

      // Vérifier le code 2FA
      const result = await twoFactorAuthService.verifyCode(userId, code, ipAddress, userAgent)

      if (!result.valid) {
        return NextResponse.json({
          success: false,
          error: 'Code invalide ou expiré'
        }, { status: 400 })
      }

      // Créer une session 2FA temporaire
      const sessionToken = await twoFactorAuthService.create2FASession(userId, ipAddress, userAgent)

      // Créer la réponse avec le cookie httpOnly sécurisé
      const response = NextResponse.json({
        success: true,
        isBackupCode: result.isBackupCode,
      })

      // Définir le cookie de session 2FA de manière sécurisée
      const isProduction = process.env.NODE_ENV === 'production'

      response.cookies.set('2fa_session', sessionToken, {
        httpOnly: true,          // Protège contre XSS
        secure: isProduction,    // HTTPS seulement en production
        sameSite: 'strict',      // Protège contre CSRF
        maxAge: 15 * 60,         // 15 minutes (réduit de 30 min)
        path: '/',
      })

      return response
    } catch (error: unknown) {
      logger.error('Error verifying 2FA code:', error)
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la vérification'
      }, { status: 500 })
    }
  })
}
