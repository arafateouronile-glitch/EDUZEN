import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { twoFactorAuthService } from '@/lib/services/2fa.service'
import { withRateLimit, authRateLimiter } from '@/lib/utils/rate-limiter'

/**
 * POST /api/2fa/regenerate-backup-codes
 * Régénère les codes de récupération pour la 2FA
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

      // Vérifier que la 2FA est activée
      const config = await twoFactorAuthService.getConfig(user.id)
      if (!config || !config.is_enabled) {
        return NextResponse.json({ error: '2FA non activée' }, { status: 400 })
      }

      // Régénérer les codes de récupération
      const backupCodes = await twoFactorAuthService.regenerateBackupCodes(user.id)

      return NextResponse.json({
        success: true,
        backupCodes,
        message: 'Codes de récupération régénérés avec succès',
      })
    } catch (error: unknown) {
      console.error('Error regenerating backup codes:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur serveur'
      return NextResponse.json({ error: errorMessage }, { status: 500 })
    }
  })
}
