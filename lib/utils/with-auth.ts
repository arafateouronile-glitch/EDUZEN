/**
 * Higher-order function pour protéger les routes API avec authentification Supabase.
 *
 * Usage :
 *   export const GET = withAuth(async (req, { user, supabase }) => {
 *     return NextResponse.json({ userId: user.id })
 *   })
 *
 * Le handler reçoit l'utilisateur authentifié et le client Supabase prêts à l'emploi.
 * Si l'utilisateur n'est pas authentifié, renvoie automatiquement un 401.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

/**
 * Récupère l'organization_id de l'utilisateur courant.
 * Retourne null si l'utilisateur n'a pas d'organisation.
 *
 * Usage :
 *   const orgId = await getUserOrgId(supabase, user.id)
 *   if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 400 })
 */
export async function getUserOrgId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()
  return data?.organization_id ?? null
}

/**
 * Récupère l'organization_id + role de l'utilisateur courant.
 */
export async function getUserProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ organization_id: string | null; role: string } | null> {
  const { data } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', userId)
    .maybeSingle()
  return data ?? null
}

/**
 * Vérifie qu'un utilisateur est super-admin ou possède la permission donnée.
 * Retourne une NextResponse 403 prête à retourner, ou null si l'accès est autorisé.
 *
 * Usage :
 *   const denied = await assertAdminPermission(supabase, user.id, 'manage_blog')
 *   if (denied) return denied
 */
export async function assertAdminPermission(
  supabase: SupabaseClient<Database>,
  userId: string,
  permission?: string
): Promise<NextResponse | null> {
  const { data: admin } = await supabase
    .from('platform_admins')
    .select('role, permissions')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (!admin) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const isSuperAdmin = admin.role === 'super_admin'
  if (isSuperAdmin) return null

  if (permission) {
    const perms = admin.permissions as Record<string, unknown> | null
    if (!perms?.[permission]) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
  }

  return null
}

type AuthContext = {
  user: User
  supabase: SupabaseClient<Database>
}

type AuthedHandler = (
  req: NextRequest,
  ctx: AuthContext
) => Promise<Response | NextResponse>

/**
 * Protège une route API avec auth Supabase SSR.
 * Renvoie 401 si l'utilisateur n'est pas connecté.
 */
export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest): Promise<Response> => {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return handler(req, { user, supabase })
  }
}

/**
 * Variante qui fournit aussi les paramètres de route Next.js (ex. /api/foo/[id]).
 */
export function withAuthAndParams<P = Record<string, string>>(
  handler: (req: NextRequest, ctx: AuthContext, params: P) => Promise<Response | NextResponse>
) {
  return async (req: NextRequest, { params }: { params: P }): Promise<Response> => {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    return handler(req, { user, supabase }, params)
  }
}
