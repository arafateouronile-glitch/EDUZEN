import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { complianceAlertsService } from '@/lib/services/compliance-alerts.service'
import { withCronSecurity } from '@/lib/utils/cron-security'

const CRON_SECRET = process.env.CRON_SECRET
const ALLOWED_IPS = process.env.CRON_ALLOWED_IPS?.split(',').map(ip => ip.trim()) || []

/**
 * GET /api/cron/compliance-alerts
 * Cron job pour vérifier les alertes de conformité (appelé toutes les heures)
 * Protégé par un secret pour éviter les appels non autorisés
 */
export async function GET(request: NextRequest) {
  return withCronSecurity(
    request,
    async (req) => {
      try {
        // Récupérer toutes les organisations actives
        const supabase = await createClient()
        const { data: organizations } = await supabase
          .from('organizations')
          .select('id')
          .eq('subscription_status', 'active')

        if (!organizations) {
          return NextResponse.json({ message: 'No active organizations' })
        }

        const results = []

        for (const org of organizations) {
          try {
            const orgResults = await complianceAlertsService.runAllChecks(org.id)
            results.push({
              organizationId: org.id,
              ...orgResults,
            })
          } catch (error: unknown) {
            results.push({
              organizationId: org.id,
              error: error instanceof Error ? error.message : 'Erreur inconnue',
            })
          }
        }

        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          organizationsChecked: organizations.length,
          results,
        })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        return NextResponse.json({ error: errorMessage }, { status: 500 })
      }
    },
    {
      secret: CRON_SECRET,
      allowedIPs: ALLOWED_IPS,
      requireSecret: !!CRON_SECRET,
      logExecution: true,
    }
  )
}
