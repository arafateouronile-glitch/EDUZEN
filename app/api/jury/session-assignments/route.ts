/**
 * GET    /api/jury/session-assignments?sessionId=XXX — Liste les jurys d'une session
 * POST   /api/jury/session-assignments — Ajoute un membre de jury à une session
 * DELETE /api/jury/session-assignments — Retire un membre de jury d'une session
 *
 * Auth : vérifié via supabase.auth.getUser() (cookie SSR).
 * DB   : toutes les requêtes passent par le client admin (bypass RLS).
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

async function getAuthContext(request: NextRequest) {
  const supabaseAuth = await createClient()
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) return null

  const admin = createAdminClient() as any
  const { data: userData } = await admin
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!userData?.organization_id) return null
  return { userId: user.id, orgId: userData.organization_id as string, admin }
}

// ── GET : liste les jurys d'une session ───────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Non authentifié ou organisation introuvable' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId requis' }, { status: 400 })
    }

    // Vérifier ownership via admin (bypass RLS sessions)
    const { data: session } = await ctx.admin
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('organization_id', ctx.orgId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'Session introuvable ou accès refusé' }, { status: 403 })
    }

    const { data, error } = await ctx.admin
      .from('session_jury')
      .select('*, jury_members(*)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Erreur lecture session_jury', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err) {
    logger.error('GET /api/jury/session-assignments', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST : assigner un jury à une session ─────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Non authentifié ou organisation introuvable' }, { status: 401 })
    }

    const body = await request.json() as { sessionId?: string; juryMemberId?: string }
    const { sessionId, juryMemberId } = body

    if (!sessionId || !juryMemberId) {
      return NextResponse.json({ error: 'sessionId et juryMemberId requis' }, { status: 400 })
    }

    // Vérifier ownership
    const { data: session } = await ctx.admin
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('organization_id', ctx.orgId)
      .maybeSingle()

    if (!session) {
      return NextResponse.json({ error: 'Session introuvable ou accès refusé' }, { status: 403 })
    }

    const { data, error } = await ctx.admin
      .from('session_jury')
      .insert({ session_id: sessionId, jury_member_id: juryMemberId })
      .select('*, jury_members(*)')
      .single()

    if (error) {
      logger.error('Erreur insertion session_jury', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    logger.error('POST /api/jury/session-assignments', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── DELETE : retirer un jury d'une session ────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getAuthContext(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Non authentifié ou organisation introuvable' }, { status: 401 })
    }

    const body = await request.json() as { sessionJuryId?: string }
    const { sessionJuryId } = body

    if (!sessionJuryId) {
      return NextResponse.json({ error: 'sessionJuryId requis' }, { status: 400 })
    }

    // Vérifier ownership via la relation session_jury → sessions
    const { data: existing } = await ctx.admin
      .from('session_jury')
      .select('id, sessions!inner(organization_id)')
      .eq('id', sessionJuryId)
      .maybeSingle()

    if (!existing || existing.sessions?.organization_id !== ctx.orgId) {
      return NextResponse.json({ error: 'Assignation introuvable ou accès refusé' }, { status: 403 })
    }

    const { error } = await ctx.admin
      .from('session_jury')
      .delete()
      .eq('id', sessionJuryId)

    if (error) {
      logger.error('Erreur suppression session_jury', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    logger.error('DELETE /api/jury/session-assignments', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
