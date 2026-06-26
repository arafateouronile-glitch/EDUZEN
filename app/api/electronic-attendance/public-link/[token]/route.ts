import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/electronic-attendance/public-link/[token]
 * Récupère les données de la page publique (sans auth).
 * Vérifie que le lien est actif et non expiré.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createServiceRoleClient()

    const { data: session, error } = await supabase
      .from('electronic_attendance_sessions')
      .select(`
        id,
        title,
        date,
        start_time,
        end_time,
        public_emargement_active,
        public_emargement_expires_at,
        public_emargement_pin,
        organization_id,
        session:sessions(id, name),
        requests:electronic_attendance_requests(
          id,
          student_id,
          student_name,
          student_email,
          status,
          signed_at,
          signed_via
        )
      `)
      .eq('public_emargement_token', token)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Lien introuvable' }, { status: 404 })
    }

    if (!session.public_emargement_active) {
      return NextResponse.json({ error: 'Ce lien est désactivé' }, { status: 410 })
    }

    if (session.public_emargement_expires_at && new Date(session.public_emargement_expires_at) < new Date()) {
      return NextResponse.json({ error: 'Ce lien a expiré' }, { status: 410 })
    }

    // Ne jamais exposer le PIN en clair — juste signaler qu'il y en a un
    const hasPin = !!session.public_emargement_pin

    // Logger la consultation
    await supabase.from('public_emargement_logs').insert({
      token,
      session_id: session.id,
      action: 'view',
      ip_address: null,
    })

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        date: session.date,
        start_time: session.start_time,
        end_time: session.end_time,
        session_name: (session.session as { name?: string } | null)?.name ?? null,
        organization_id: session.organization_id,
        has_pin: hasPin,
        requests: session.requests ?? [],
      },
    })
  } catch (error) {
    logger.error('Erreur public-link GET:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

/**
 * POST /api/electronic-attendance/public-link/[token]
 * body: { action: 'verify_pin', pin: string }
 * Vérifie le PIN sans exposer la session entière.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { action, pin } = body as { action: string; pin?: string }

    if (action !== 'verify_pin') {
      return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { data: session, error } = await supabase
      .from('electronic_attendance_sessions')
      .select('id, public_emargement_active, public_emargement_expires_at, public_emargement_pin')
      .eq('public_emargement_token', token)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Lien introuvable' }, { status: 404 })
    }

    if (!session.public_emargement_active) {
      return NextResponse.json({ error: 'Lien désactivé' }, { status: 410 })
    }

    // Logger la tentative
    await supabase.from('public_emargement_logs').insert({
      token,
      session_id: session.id,
      action: 'pin_attempt',
    })

    const valid = session.public_emargement_pin === String(pin ?? '')
    if (!valid) {
      return NextResponse.json({ valid: false, error: 'Code incorrect, réessayez' }, { status: 401 })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    logger.error('Erreur public-link POST:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
