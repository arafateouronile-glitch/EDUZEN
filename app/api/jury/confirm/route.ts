/**
 * GET /api/jury/confirm?token=UUID&action=confirm|decline
 *
 * Route publique (magic-link) — aucune authentification requise.
 * Le token UUID est le secret ; seul son détenteur peut répondre.
 *
 * Flux :
 *   1. Valider le token + action
 *   2. Mettre à jour session_jury.status + confirmed_at si 'confirm'
 *   3. Rediriger vers /jury/success?action=...&session=...
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.eduzen.io'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token  = searchParams.get('token')
  const action = searchParams.get('action') as 'confirm' | 'decline' | null

  // ── Validation des paramètres ───────────────────────────────────────────────
  if (!token || !action || !['confirm', 'decline'].includes(action)) {
    return NextResponse.redirect(
      `${APP_URL}/jury/success?action=invalid`,
      { status: 302 }
    )
  }

  const supabase = createAdminClient()

  // ── Récupérer l'entrée via le token ─────────────────────────────────────────
  const { data: sj, error } = await supabase
    .from('session_jury')
    .select('id, status, session_id, token_expires_at, sessions(name)')
    .eq('token', token)
    .single()

  if (error || !sj) {
    return NextResponse.redirect(
      `${APP_URL}/jury/success?action=invalid`,
      { status: 302 }
    )
  }

  // ── Vérifier l'expiration du token ──────────────────────────────────────────
  if (sj.token_expires_at && new Date(sj.token_expires_at) < new Date()) {
    return NextResponse.redirect(
      `${APP_URL}/jury/success?action=expired`,
      { status: 302 }
    )
  }

  // ── Mettre à jour le statut ─────────────────────────────────────────────────
  const newStatus  = action === 'confirm' ? 'confirmed' : 'declined'
  const updateData: Record<string, unknown> = { status: newStatus }

  if (action === 'confirm') {
    // Piste d'audit Qualiopi : enregistrer la date exacte de confirmation
    updateData.confirmed_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('session_jury')
    .update(updateData)
    .eq('id', sj.id)

  if (updateError) {
    logger.error('[jury/confirm] update failed', updateError instanceof Error ? updateError : new Error(String(updateError)))
    return NextResponse.redirect(
      `${APP_URL}/jury/success?action=error`,
      { status: 302 }
    )
  }

  // ── Rediriger vers la page de succès publique ───────────────────────────────
  const sessionName = encodeURIComponent(sj.sessions?.name || '')
  return NextResponse.redirect(
    `${APP_URL}/jury/success?action=${action}&session=${sessionName}`,
    { status: 302 }
  )
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
