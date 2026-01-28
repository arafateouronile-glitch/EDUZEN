/**
 * GET /api/sign/public/[token]
 * Résout un token (UUID v4 ou legacy) et retourne la demande de signature, d'émargement,
 * ou de processus en cascade (signatories).
 * Utilisé par le portail /sign/[token] (lien email).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(s: string): boolean {
  return UUID_REGEX.test(s)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token?.trim()) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 })
    }

    const supabase = await createClient()
    const t = token.trim()

    if (isUuid(t)) {
      const [sig, att] = await Promise.all([
        supabase
          .from('signature_requests')
          .select(
            `id, organization_id, document_id, requester_id, recipient_email, recipient_name, recipient_type,
             subject, message, status, signature_token, access_token, expires_at, token_expires_at, created_at,
             document:documents(id, title, file_url, type),
             requester:users!signature_requests_requester_id_fkey(id, full_name, email)`
          )
          .eq('access_token', t)
          .maybeSingle(),
        supabase
          .from('electronic_attendance_requests')
          .select(
            `id, organization_id, attendance_session_id, student_id, student_email, student_name, status,
             signature_token, access_token, token_expires_at, created_at,
             attendance_session:electronic_attendance_sessions(
               id, title, date, start_time, end_time, require_signature, require_geolocation,
               allowed_radius_meters, latitude, longitude, location_name, status, closes_at
             )`
          )
          .eq('access_token', t)
          .maybeSingle(),
      ])

      const sigData = sig.data as Record<string, unknown> | null
      const attData = att.data as Record<string, unknown> | null

      if (sigData && !sig.error) {
        if (sigData.status !== 'pending') {
          return NextResponse.json({ type: 'signature', data: sigData })
        }
        if (sigData.token_expires_at && new Date(sigData.token_expires_at as string) < new Date()) {
          return NextResponse.json(
            { error: 'Lien expiré', type: 'signature', data: sigData },
            { status: 410 }
          )
        }
        return NextResponse.json({ type: 'signature', data: sigData })
      }

      if (attData && !att.error) {
        const session = attData.attendance_session as Record<string, unknown> | null
        if (attData.status !== 'pending') {
          return NextResponse.json({ type: 'attendance', data: attData })
        }
        if (session?.status === 'closed') {
          return NextResponse.json(
            { error: 'Session d\'émargement fermée', type: 'attendance', data: attData },
            { status: 410 }
          )
        }
        if (
          attData.token_expires_at &&
          new Date(attData.token_expires_at as string) < new Date()
        ) {
          return NextResponse.json(
            { error: 'Lien expiré', type: 'attendance', data: attData },
            { status: 410 }
          )
        }
        if (
          session?.closes_at &&
          new Date(session.closes_at as string) < new Date()
        ) {
          return NextResponse.json(
            { error: 'Session d\'émargement expirée', type: 'attendance', data: attData },
            { status: 410 }
          )
        }
        return NextResponse.json({ type: 'attendance', data: attData })
      }
    }

    const [sigLegacy, attLegacy] = await Promise.all([
      supabase
        .from('signature_requests')
        .select(
          `id, organization_id, document_id, requester_id, recipient_email, recipient_name, recipient_type,
           subject, message, status, signature_token, access_token, expires_at, token_expires_at, created_at,
           document:documents(id, title, file_url, type),
           requester:users!signature_requests_requester_id_fkey(id, full_name, email)`
        )
        .eq('signature_token', t)
        .maybeSingle(),
      supabase
        .from('electronic_attendance_requests')
        .select(
          `id, organization_id, attendance_session_id, student_id, student_email, student_name, status,
           signature_token, access_token, token_expires_at, created_at,
           attendance_session:electronic_attendance_sessions(
             id, title, date, start_time, end_time, require_signature, require_geolocation,
             allowed_radius_meters, latitude, longitude, location_name, status, closes_at
           )`
        )
        .eq('signature_token', t)
        .maybeSingle(),
    ])

    const sigLegacyData = sigLegacy.data as Record<string, unknown> | null
    const attLegacyData = attLegacy.data as Record<string, unknown> | null

    if (sigLegacyData && !sigLegacy.error) {
      if (sigLegacyData.status !== 'pending') {
        return NextResponse.json({ type: 'signature', data: sigLegacyData })
      }
      if (
        sigLegacyData.token_expires_at &&
        new Date(sigLegacyData.token_expires_at as string) < new Date()
      ) {
        return NextResponse.json(
          { error: 'Lien expiré', type: 'signature', data: sigLegacyData },
          { status: 410 }
        )
      }
      if (sigLegacyData.expires_at && new Date(sigLegacyData.expires_at as string) < new Date()) {
        return NextResponse.json(
          { error: 'Demande expirée', type: 'signature', data: sigLegacyData },
          { status: 410 }
        )
      }
      return NextResponse.json({ type: 'signature', data: sigLegacyData })
    }

    if (attLegacyData && !attLegacy.error) {
      const session = attLegacyData.attendance_session as Record<string, unknown> | null
      if (attLegacyData.status !== 'pending') {
        return NextResponse.json({ type: 'attendance', data: attLegacyData })
      }
      if (session?.status === 'closed') {
        return NextResponse.json(
          { error: 'Session d\'émargement fermée', type: 'attendance', data: attLegacyData },
          { status: 410 }
        )
      }
      if (
        session?.closes_at &&
        new Date(session.closes_at as string) < new Date()
      ) {
        return NextResponse.json(
          { error: 'Session d\'émargement expirée', type: 'attendance', data: attLegacyData },
          { status: 410 }
        )
      }
      return NextResponse.json({ type: 'attendance', data: attLegacyData })
    }

    if (isUuid(t)) {
      const admin = createAdminClient()
      const { data: sig } = await (admin
        .from('signatories' as any)
        .select('id, process_id, email, name, order_index, token, signed_at')
        .eq('token', t)
        .maybeSingle() as any)

      if (sig && !sig.signed_at) {
        const { data: proc } = await (admin
          .from('signing_processes' as any)
          .select(
            'id, organization_id, document_id, status, current_index, title, document:documents(id, title, file_url, type)'
          )
          .eq('id', sig.process_id)
          .single() as any)

        if (proc && proc.status !== 'completed' && proc.current_index === sig.order_index) {
          return NextResponse.json({
            type: 'process',
            data: {
              process: proc,
              signatory: sig,
              document: (proc as any).document,
            },
          })
        }
      }
    }

    return NextResponse.json(
      { error: 'Lien invalide ou expiré' },
      { status: 404 }
    )
  } catch (e) {
    logger.error('Erreur GET /api/sign/public/[token]:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
