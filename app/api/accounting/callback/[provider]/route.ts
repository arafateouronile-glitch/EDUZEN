import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { AccountingService } from '@/lib/services/accounting.service'
import { verifyState } from '@/lib/utils/oauth-state'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

export const runtime = 'nodejs'

const SETTINGS_PATH = '/dashboard/settings/fulll'

/**
 * GET /api/accounting/callback/fulll?code=...&state=...
 * Fin du flux OAuth2 : valide le `state`, échange le code contre les tokens
 * (via AccountingService.authenticate qui chiffre + persiste), puis renvoie
 * l'utilisateur vers la page de réglages.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params
  const origin = request.nextUrl.origin
  const redirect = (query: string) => NextResponse.redirect(`${origin}${SETTINGS_PATH}${query}`)

  if (provider !== 'fulll') {
    return NextResponse.json({ error: 'Not implemented', provider }, { status: 501 })
  }

  const url = request.nextUrl
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  if (oauthError) {
    return redirect(`?error=${encodeURIComponent(oauthError)}`)
  }
  if (!code || !stateParam) {
    return redirect('?error=missing_code')
  }

  const state = verifyState(stateParam)
  if (!state || state.provider !== 'fulll') {
    return redirect('?error=invalid_state')
  }

  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
          },
          setAll() {},
        },
      }
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return redirect('?error=auth')

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id || userData.organization_id !== state.organizationId) {
      return redirect('?error=org_mismatch')
    }
    if (!['super_admin', 'admin', 'accountant'].includes(userData.role)) {
      return redirect('?error=forbidden')
    }

    const service = new AccountingService(supabase)
    await service.authenticate(state.organizationId, 'fulll', code)

    return redirect('?connected=1')
  } catch (error) {
    logger.error('Fulll OAuth callback failed', error, {
      error: sanitizeError(error),
      org: maskId(state.organizationId),
    })
    return redirect('?error=exchange_failed')
  }
}
