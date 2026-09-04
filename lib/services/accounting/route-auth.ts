/**
 * Authentification + contrôle de rôle partagés par les routes `/api/accounting/*`.
 * Même schéma que `app/api/accounting/fec-export/route.ts` (client SSR sur cookies,
 * `users.organization_id` + `role`), factorisé pour les 3 routes du connecteur.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export const ACCOUNTING_ALLOWED_ROLES = ['super_admin', 'admin', 'accountant'] as const

export interface AccountingRequestContext {
  userId: string
  organizationId: string
  role: string
  supabase: ReturnType<typeof createServerClient<Database>>
}

/**
 * Renvoie le contexte authentifié, ou une `NextResponse` d'erreur (401/403) à
 * retourner telle quelle.
 */
export async function authenticateAccountingRequest(
  request: NextRequest
): Promise<AccountingRequestContext | NextResponse> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
        },
        setAll() {
          // cookies gérés par le middleware
        },
      },
    }
  )

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData?.organization_id) {
    return NextResponse.json({ error: 'Organisation non trouvée' }, { status: 403 })
  }

  if (!ACCOUNTING_ALLOWED_ROLES.includes(userData.role as (typeof ACCOUNTING_ALLOWED_ROLES)[number])) {
    return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
  }

  return {
    userId: user.id,
    organizationId: userData.organization_id,
    role: userData.role,
    supabase,
  }
}

export function isAccountingErrorResponse(
  ctx: AccountingRequestContext | NextResponse
): ctx is NextResponse {
  return ctx instanceof NextResponse
}
