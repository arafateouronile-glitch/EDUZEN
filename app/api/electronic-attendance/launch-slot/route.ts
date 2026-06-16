import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ElectronicAttendanceService } from '@/lib/services/electronic-attendance.service'
import { logger } from '@/lib/utils/logger'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'

/**
 * POST /api/electronic-attendance/launch-slot
 * Crée (si besoin) et lance une session d'émargement pour un créneau horaire donné.
 * Envoie les demandes aux apprenants inscrits ET aux formateurs assignés à la session.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 404 })
    }

    if (!['admin', 'secretary', 'teacher'].includes(userData.role)) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })
    }

    const body = await request.json()
    const { sessionId, date, startTime, endTime, timeSlot, title } = body

    if (!sessionId || !date) {
      return NextResponse.json({ error: 'sessionId et date requis' }, { status: 400 })
    }

    const organizationId = userData.organization_id

    // Vérifier si une session électronique existe déjà pour ce créneau
    const { data: existing } = await supabase
      .from('electronic_attendance_sessions')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('date', date)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (existing?.status === 'active') {
      return NextResponse.json({
        status: 'already_active',
        attendanceSessionId: existing.id,
        message: 'Les demandes ont déjà été envoyées pour ce créneau',
      })
    }

    const service = new ElectronicAttendanceService(supabase)

    // Créer la session si elle n'existe pas encore
    let attendanceSessionId: string
    if (existing) {
      attendanceSessionId = existing.id
    } else {
      const slotTitle = title || `Émargement du ${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}${timeSlot === 'morning' ? ' - Matin' : timeSlot === 'afternoon' ? ' - Après-midi' : ''}`
      const created = await service.createAttendanceSession({
        sessionId,
        organizationId,
        title: slotTitle,
        date,
        startTime: startTime ?? undefined,
        endTime: endTime ?? undefined,
        mode: 'electronic',
      })
      attendanceSessionId = created.id
    }

    // Lancer pour les apprenants (crée les requests + envoie les emails)
    const launched = await service.launchAttendanceSession(attendanceSessionId, true)

    // ── Formateurs ──────────────────────────────────────────────────────────
    // Récupérer les formateurs assignés à la session de formation
    const { data: sessionTeachers } = await supabase
      .from('session_teachers')
      .select('teacher_id, users:teacher_id(id, full_name, email)')
      .eq('session_id', sessionId)

    const trainers = (sessionTeachers ?? [])
      .map((st: any) => st.users)
      .filter((u: any): u is { id: string; full_name: string | null; email: string } =>
        !!u && !!u.email
      )

    if (trainers.length > 0) {
      const tokenExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()

      const trainerRequests = trainers.map((t) => ({
        organization_id: organizationId,
        attendance_session_id: attendanceSessionId,
        student_id: null,
        user_id: t.id,
        student_email: t.email,
        student_name: t.full_name ?? t.email,
        status: 'pending' as const,
        signature_token: crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''),
        access_token: crypto.randomUUID(),
        token_expires_at: tokenExpiresAt,
        requester_role: 'trainer' as const,
      }))

      const { data: createdTrainerRequests, error: trainerError } = await supabase
        .from('electronic_attendance_requests')
        .insert(trainerRequests)
        .select()

      if (trainerError) {
        logger.warn('Erreur création requests formateurs', { error: trainerError.message })
      }

      // Envoyer emails aux formateurs
      if (createdTrainerRequests) {
        const { data: sessionInfo } = await supabase
          .from('sessions')
          .select('name')
          .eq('id', sessionId)
          .single()

        for (const req of createdTrainerRequests) {
          const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/attendance/sign/${req.signature_token}`
          await sendEmailViaResend({
            to: req.student_email,
            subject: `Émargement formateur — ${sessionInfo?.name ?? 'Formation'}`,
            html: `
              <p>Bonjour ${req.student_name},</p>
              <p>Vous êtes invité(e) à émarger en tant que formateur pour la séance du <strong>${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
              <p><a href="${signingUrl}" style="background:#274472;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">Signer l'émargement</a></p>
              <p style="color:#6b7280;font-size:13px;">Ce lien expire dans 4 heures.</p>
            `,
          }).catch((err: unknown) => logger.warn('Email formateur non envoyé', { email: req.student_email, err }))
        }
      }
    }

    return NextResponse.json({
      status: 'launched',
      attendanceSessionId,
      studentRequestsSent: launched.requests?.length ?? 0,
      trainerRequestsSent: trainers.length,
    })
  } catch (error) {
    logger.error('Erreur launch-slot', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}
