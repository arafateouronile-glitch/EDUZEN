import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DiplomaExpiryAlertService } from '@/lib/services/diploma-expiry-alert.service'
import { withCronSecurity } from '@/lib/utils/cron-security'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/diploma-expiry-alerts
 *
 * Séquence d'alertes email 3 niveaux :
 *   T-180j (warning_180d) — anticipation 6 mois
 *   T-90j  (warning_90d)  — relance 3 mois
 *   T-1j   (critical_1d)  — alerte critique
 *
 * Planifié quotidiennement à 8h (vercel.json crons).
 * Protégé par CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 })
  }

  return withCronSecurity(
    request,
    async () => {
      try {
        const supabase = await createClient()
        const service = new DiplomaExpiryAlertService(supabase)
        const results = await service.runDailyCheck()

        const totalSent = Object.values(results).reduce((acc, r) => acc + r.sent, 0)
        const totalErrors = Object.values(results).reduce((acc, r) => acc + r.errors, 0)

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          totalSent,
          totalErrors,
          details: results,
        })
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Erreur inconnue'
        return NextResponse.json({ error: msg }, { status: 500 })
      }
    },
    {
      secret: CRON_SECRET,
      requireSecret: true,
      logExecution: true,
    }
  )
}
