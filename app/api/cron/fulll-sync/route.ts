import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AccountingService } from '@/lib/services/accounting.service'
import { withCronSecurity } from '@/lib/utils/cron-security'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const maxDuration = 300

const CRON_SECRET = process.env.CRON_SECRET
const ALLOWED_IPS = process.env.CRON_ALLOWED_IPS?.split(',').map((ip) => ip.trim()) || []

// Fenêtre de rattrapage quand l'intégration n'a jamais synchronisé : 35 jours.
const BACKFILL_WINDOW_MS = 35 * 24 * 60 * 60 * 1000

/**
 * GET /api/cron/fulll-sync
 * Pour chaque organisation ayant activé la synchro auto Fulll :
 *  1. réconcilie les jobs d'import en attente ;
 *  2. pousse les nouvelles factures / avoirs depuis la dernière synchro.
 */
export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 })
  }

  return withCronSecurity(
    request,
    async () => {
      const supabase = createAdminClient()

      const { data: integrations, error } = await supabase
        .from('accounting_integrations')
        .select('id, organization_id, last_sync_at')
        .eq('provider', 'fulll')
        .eq('is_active', true)
        .eq('auto_sync', true)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (!integrations || integrations.length === 0) {
        return NextResponse.json({ success: true, integrations: 0, results: [] })
      }

      const service = new AccountingService(supabase)
      const results: Array<Record<string, unknown>> = []

      for (const integ of integrations) {
        try {
          const reconciled = await service
            .reconcilePendingJobs(integ.organization_id, 'fulll')
            .catch(() => null)

          const startDate = integ.last_sync_at
            ? new Date(integ.last_sync_at).toISOString()
            : new Date(Date.now() - BACKFILL_WINDOW_MS).toISOString()

          const push = await service.pushSalesDocuments(integ.organization_id, 'fulll', {
            startDate,
            syncType: 'incremental',
          })

          results.push({
            organizationId: integ.organization_id,
            reconciled,
            synced: push.records_synced,
            pending: push.records_created,
            failed: push.records_failed,
            skipped: push.records_skipped,
          })
        } catch (err) {
          logger.error('Fulll cron sync failed for org', err, {
            error: sanitizeError(err),
            org: maskId(integ.organization_id),
          })
          results.push({
            organizationId: integ.organization_id,
            error: err instanceof Error ? err.message : 'Erreur inconnue',
          })
        }
      }

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        integrations: integrations.length,
        results,
      })
    },
    {
      secret: CRON_SECRET,
      allowedIPs: ALLOWED_IPS,
      requireSecret: true,
      logExecution: true,
    }
  )
}
