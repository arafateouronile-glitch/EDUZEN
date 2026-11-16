/**
 * PATCH  /api/users/[id] — modifie un utilisateur de l'organisation (nom, email,
 *        téléphone, rôle, actif/inactif).
 * DELETE /api/users/[id] — supprime un utilisateur ; s'il a de l'historique
 *        (sessions, documents…), il est désactivé à la place.
 *
 * Les règles RLS de public.users ne laissent un utilisateur modifier que sa
 * propre ligne : depuis le navigateur, la désactivation d'un autre utilisateur
 * ne changeait rien. On vérifie ici que l'appelant est administrateur de la même
 * organisation, puis on écrit avec le client admin.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger, maskId } from '@/lib/utils/logger'

// Même liste que ADMIN_ROLES (components/auth/role-guard.tsx, module client)
const ADMIN_ROLES = ['super_admin', 'admin', 'secretary', 'accountant']
const ASSIGNABLE_ROLES = ['admin', 'teacher', 'secretary', 'accountant', 'parent', 'student']
// Compte bloqué à la connexion tant que l'utilisateur est désactivé (~100 ans)
const BAN_DURATION = '876000h'

type TargetUser = { id: string; role: string; organization_id: string | null; email: string | null }

type AccessResult =
  | { ok: true; callerId: string; callerRole: string; target: TargetUser }
  | { ok: false; response: NextResponse }

const deny = (error: string, status: number): AccessResult => ({
  ok: false,
  response: NextResponse.json({ error }, { status }),
})

async function checkAccess(targetUserId: string): Promise<AccessResult> {
  const supabase = await createClient()
  const { data: { user: caller }, error: authError } = await supabase.auth.getUser()
  if (authError || !caller) return deny('Non authentifié', 401)

  const admin = createAdminClient()
  const { data: callerRow } = await admin
    .from('users')
    .select('role, organization_id')
    .eq('id', caller.id)
    .maybeSingle()
  const callerUser = callerRow as { role: string; organization_id: string | null } | null
  if (!callerUser?.organization_id || !ADMIN_ROLES.includes(callerUser.role)) {
    return deny('Permission refusée', 403)
  }

  const { data: targetRow } = await admin
    .from('users')
    .select('id, role, organization_id, email')
    .eq('id', targetUserId)
    .maybeSingle()
  const target = targetRow as TargetUser | null
  if (!target || target.organization_id !== callerUser.organization_id) {
    return deny('Utilisateur introuvable', 404)
  }
  if (target.role === 'super_admin' && callerUser.role !== 'super_admin') {
    return deny('Seul un super administrateur peut modifier ce compte', 403)
  }

  return { ok: true, callerId: caller.id, callerRole: callerUser.role, target }
}

/** Bloque (ou débloque) la connexion du compte, en plus de users.is_active */
async function setLoginBlocked(userId: string, blocked: boolean) {
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
    ban_duration: blocked ? BAN_DURATION : 'none',
  })
  if (error) logger.warn('Users - blocage de connexion impossible', { userId: maskId(userId), error: error.message })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await checkAccess(id)
  if (!access.ok) return access.response
  const { callerId, callerRole, target } = access

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (typeof body.full_name === 'string') {
    if (!body.full_name.trim()) return NextResponse.json({ error: 'Le nom est obligatoire' }, { status: 400 })
    update.full_name = body.full_name.trim()
  }
  if ('phone' in body) update.phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
  if (typeof body.role === 'string' && body.role !== target.role) {
    if (id === callerId) return NextResponse.json({ error: 'Vous ne pouvez pas changer votre propre rôle' }, { status: 400 })
    const allowed = callerRole === 'super_admin' ? [...ASSIGNABLE_ROLES, 'super_admin'] : ASSIGNABLE_ROLES
    if (!allowed.includes(body.role)) return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
    update.role = body.role
  }
  if (typeof body.is_active === 'boolean') {
    if (id === callerId && !body.is_active) {
      return NextResponse.json({ error: 'Vous ne pouvez pas désactiver votre propre compte' }, { status: 400 })
    }
    update.is_active = body.is_active
  }

  const admin = createAdminClient()

  // Email : aussi l'identifiant de connexion, gardé synchronisé
  if (typeof body.email === 'string') {
    const email = body.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
    }
    if (email !== (target.email ?? '').toLowerCase()) {
      const { error } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true })
      if (error) return NextResponse.json({ error: `Email non modifiable : ${error.message}` }, { status: 400 })
      update.email = email
    }
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ success: true })

  const { error } = await admin
    .from('users')
    .update({ ...update, updated_at: new Date().toISOString() } as never)
    .eq('id', id)
  if (error) {
    logger.error('Users - mise à jour impossible', error, { userId: maskId(id) })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (typeof update.is_active === 'boolean') await setLoginBlocked(id, !update.is_active)

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const access = await checkAccess(id)
  if (!access.ok) return access.response
  if (id === access.callerId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error: deleteError } = await admin.from('users').delete().eq('id', id)

  if (deleteError) {
    // 23503 : l'utilisateur est référencé (sessions, documents, paiements…) —
    // on garde l'historique et on coupe l'accès
    if (deleteError.code !== '23503') {
      logger.error('Users - suppression impossible', deleteError, { userId: maskId(id) })
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }
    const { error: deactivateError } = await admin
      .from('users')
      .update({ is_active: false, updated_at: new Date().toISOString() } as never)
      .eq('id', id)
    if (deactivateError) return NextResponse.json({ error: deactivateError.message }, { status: 500 })
    await setLoginBlocked(id, true)
    return NextResponse.json({ success: true, deactivated: true })
  }

  const { error: authError } = await admin.auth.admin.deleteUser(id)
  if (authError) logger.warn('Users - compte de connexion non supprimé', { userId: maskId(id), error: authError.message })

  return NextResponse.json({ success: true, deleted: true })
}
