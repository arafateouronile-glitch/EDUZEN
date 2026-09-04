import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { FULLL_CONFIG } from '@/lib/config/app-config'
import { AccountingService } from '@/lib/services/accounting.service'
import { authenticateAccountingRequest, isAccountingErrorResponse } from '@/lib/services/accounting/route-auth'
import { signState } from '@/lib/utils/oauth-state'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export const runtime = 'nodejs'

/**
 * GET /api/accounting/authenticate/fulll
 * Démarre le flux OAuth2 : renvoie `{ auth_url }` vers lequel le front redirige.
 * Les autres providers (xero/quickbooks/sage) ne sont pas encore implémentés.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params

  if (provider !== 'fulll') {
    return NextResponse.json({ error: 'Not implemented', provider }, { status: 501 })
  }

  const ctx = await authenticateAccountingRequest(request)
  if (isAccountingErrorResponse(ctx)) return ctx

  if (!FULLL_CONFIG.isConfigured()) {
    return NextResponse.json(
      { error: 'Connecteur Fulll non configuré (onboarding partenaire en cours).' },
      { status: 503 }
    )
  }

  try {
    // Garantir une ligne accounting_integrations (l'échange de tokens en dépend)
    const service = new AccountingService(ctx.supabase)
    const existing = await service.getConfig(ctx.organizationId, 'fulll')
    if (!existing) {
      await service.upsertConfig(ctx.organizationId, 'fulll', { is_active: false })
    }

    const state = signState({ organizationId: ctx.organizationId, provider: 'fulll' })

    const authorizeUrl = new URL(`${FULLL_CONFIG.getBaseUrl()}${FULLL_CONFIG.authorizePath}`)
    authorizeUrl.searchParams.set('response_type', 'code')
    authorizeUrl.searchParams.set('client_id', FULLL_CONFIG.getClientId()!)
    authorizeUrl.searchParams.set('redirect_uri', FULLL_CONFIG.getRedirectUri())
    authorizeUrl.searchParams.set('scope', FULLL_CONFIG.oauthScope)
    authorizeUrl.searchParams.set('state', state)

    return NextResponse.json({ auth_url: authorizeUrl.toString() })
  } catch (error) {
    logger.error('Fulll OAuth authorize failed', error, {
      error: sanitizeError(error),
      org: maskId(ctx.organizationId),
    })
    return NextResponse.json({ error: "Impossible de démarrer la connexion Fulll" }, { status: 500 })
  }
}
