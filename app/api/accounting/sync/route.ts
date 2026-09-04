import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { AccountingService } from '@/lib/services/accounting.service'
import type { AccountingProvider } from '@/lib/services/accounting/accounting.types'
import { authenticateAccountingRequest, isAccountingErrorResponse } from '@/lib/services/accounting/route-auth'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const maxDuration = 300

const SUPPORTED: AccountingProvider[] = ['fulll']

/**
 * POST /api/accounting/sync
 * Body: { provider: 'fulll', mode: 'range' | 'single', startDate?, endDate?, invoiceId?, force? }
 * Pousse les factures / avoirs de vente vers le système comptable.
 */
export async function POST(request: NextRequest) {
  const ctx = await authenticateAccountingRequest(request)
  if (isAccountingErrorResponse(ctx)) return ctx

  let body: {
    provider?: string
    mode?: 'range' | 'single'
    startDate?: string
    endDate?: string
    invoiceId?: string
    force?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const provider = (body.provider || 'fulll') as AccountingProvider
  if (!SUPPORTED.includes(provider)) {
    return NextResponse.json({ error: `Provider ${provider} non supporté` }, { status: 400 })
  }

  const mode = body.mode || (body.invoiceId ? 'single' : 'range')
  if (mode === 'single' && !body.invoiceId) {
    return NextResponse.json({ error: 'invoiceId requis pour le mode single' }, { status: 400 })
  }

  try {
    const service = new AccountingService(ctx.supabase)
    const result = await service.pushSalesDocuments(ctx.organizationId, provider, {
      startDate: body.startDate,
      endDate: body.endDate,
      invoiceIds: mode === 'single' && body.invoiceId ? [body.invoiceId] : undefined,
      force: Boolean(body.force),
      syncType: 'manual',
    })
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Accounting sync (push) failed', error, {
      error: sanitizeError(error),
      org: maskId(ctx.organizationId),
      provider,
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Échec de l'envoi comptable" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/accounting/sync?provider=fulll[&invoiceId=...]
 * Réconcilie d'abord les jobs en attente, puis renvoie l'état de l'intégration,
 * l'historique de synchronisation, et (si invoiceId) le mapping de ce document.
 */
export async function GET(request: NextRequest) {
  const ctx = await authenticateAccountingRequest(request)
  if (isAccountingErrorResponse(ctx)) return ctx

  const provider = (request.nextUrl.searchParams.get('provider') || 'fulll') as AccountingProvider
  const invoiceId = request.nextUrl.searchParams.get('invoiceId') || undefined

  if (!SUPPORTED.includes(provider)) {
    return NextResponse.json({ error: `Provider ${provider} non supporté` }, { status: 400 })
  }

  try {
    const service = new AccountingService(ctx.supabase)
    const config = await service.getConfig(ctx.organizationId, provider)

    let reconciled: Awaited<ReturnType<AccountingService['reconcilePendingJobs']>> | null = null
    if (config?.is_active) {
      reconciled = await service.reconcilePendingJobs(ctx.organizationId, provider).catch((e) => {
        logger.error('reconcilePendingJobs failed (GET status)', e, { error: sanitizeError(e) })
        return null
      })
    }

    const logs = await service.getSyncLogs(ctx.organizationId, provider).catch(() => [])

    let mappings: unknown[] = []
    if (invoiceId && config) {
      const { data } = await ctx.supabase
        .from('accounting_entity_mappings')
        .select('*')
        .eq('integration_id', config.id)
        .eq('local_entity_id', invoiceId)
        .in('entity_type', ['invoice', 'credit_note'])
      mappings = data || []
    }

    return NextResponse.json({
      integration: config
        ? {
            is_active: config.is_active,
            is_test_mode: config.is_test_mode,
            auto_sync: config.auto_sync,
            company_name: config.company_name,
            last_sync_at: config.last_sync_at,
            last_sync_status: config.last_sync_status,
            last_sync_error: config.last_sync_error,
          }
        : null,
      reconciled,
      logs,
      mappings,
    })
  } catch (error) {
    logger.error('Accounting sync (status) failed', error, {
      error: sanitizeError(error),
      org: maskId(ctx.organizationId),
      provider,
    })
    return NextResponse.json({ error: 'Échec de récupération du statut' }, { status: 500 })
  }
}
