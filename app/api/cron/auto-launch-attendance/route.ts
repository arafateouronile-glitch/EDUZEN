/**
 * CRON : Envoi automatique des émargements numériques
 *
 * Appelé toutes les 5 minutes par le planificateur Supabase (pg_cron + pg_net,
 * migration 20261026000001 — le plan Vercel Hobby ne permet qu'un passage par
 * jour ; l'entrée vercel.json ne sert que de filet).
 *
 * Pour chaque séance du jour (session_slots, heure de Paris) commencée il y a
 * 5 à 15 minutes, dont l'automatisation « Signature émargement » est ACTIVÉE
 * (règle de la session, sinon règle de l'organisme) et qui n'a pas encore son
 * émargement, crée la session d'émargement active et envoie les liens de
 * signature aux apprenants inscrits.
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'
import { ATTENDANCE_ELIGIBLE_ENROLLMENT_STATUSES } from '@/lib/services/electronic-attendance.service'
import { parisDay, slotInLaunchWindow } from '@/lib/services/email-schedule-run'

interface SlotRow {
  id: string
  date: string
  start_time: string
  end_time: string | null
  session_id: string
  sessions: {
    id: string
    name: string
    status: string | null
    organization_id: string
    formations: { name: string } | { name: string }[] | null
  } | null
}

const CRON_SECRET = process.env.CRON_SECRET

function generateSignatureToken(): string {
  const timestamp = Date.now().toString(36)
  const r1 = Math.random().toString(36).substring(2, 15)
  const r2 = Math.random().toString(36).substring(2, 15)
  return `att-${timestamp}-${r1}-${r2}`
}

function buildAttendanceEmailHtml(params: {
  studentName: string
  sessionTitle: string
  date: string
  startTime: string | null
  attendanceUrl: string
}): string {
  const { studentName, sessionTitle, date, startTime, attendanceUrl } = params
  const formattedDate = new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const timeText = startTime ? ` à ${startTime.substring(0, 5)}` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${studentName},</p>

            <p style="margin:0 0 20px;">Votre séance de formation vient de commencer. Merci de signer votre feuille d'émargement.</p>

            <p style="margin:0 0 8px;"><strong>Formation :</strong> ${sessionTitle}</p>
            <p style="margin:0 0 20px;"><strong>Date :</strong> ${formattedDate}${timeText}</p>

            <p style="margin:0 0 20px;">
              <a href="${attendanceUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">Signer mon émargement</a>
            </p>

            <p style="margin:0 0 40px;font-size:14px;color:#555;">Ce lien est valable 4 heures. Si vous ne pouvez pas cliquer, copiez-collez cette URL dans votre navigateur : <a href="${attendanceUrl}" style="color:#555;word-break:break-all;">${attendanceUrl}</a></p>

            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
              L'équipe EduZen
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createAdminClient()
  const now = new Date()
  // Les séances sont saisies en heure de Paris
  const todayStr = parisDay(now)

  const results: {
    sessionId: string
    slotId: string
    organizationId: string
    launched: boolean
    emailsSent: number
    skipped?: string
    error?: string
  }[] = []

  try {
    // Automatisation « Signature émargement » : règles actives (organisme ou session)
    // et règles de session désactivées (qui priment sur celle de l'organisme)
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from('email_schedules')
      .select('organization_id, session_id, is_active')
      .eq('email_type', 'emargement_auto')
    if (rulesError) throw rulesError

    const orgEnabled = new Set<string>()
    const sessionRule = new Map<string, boolean>()
    for (const r of rules ?? []) {
      if (r.session_id) sessionRule.set(r.session_id, !!r.is_active)
      else if (r.is_active) orgEnabled.add(r.organization_id)
    }
    const orgsWithSessionRule = new Set(
      (rules ?? []).filter((r) => r.session_id && r.is_active).map((r) => r.organization_id)
    )
    const candidateOrgIds = [...new Set([...orgEnabled, ...orgsWithSessionRule])]
    if (candidateOrgIds.length === 0) {
      return NextResponse.json({ success: true, message: 'Automatisation désactivée partout', results: [] })
    }

    // Organisations abonnées parmi celles qui ont activé l'automatisation
    const { data: organizations } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .in('id', candidateOrgIds)
      .eq('subscription_status', 'active')

    for (const org of organizations ?? []) {
      // Séances du jour de l'organisation
      const { data: slots, error: slotsError } = await supabaseAdmin
        .from('session_slots')
        .select('id, date, start_time, end_time, session_id, sessions!inner(id, name, status, organization_id, formations(name))')
        .eq('date', todayStr)
        .eq('sessions.organization_id', org.id)

      if (slotsError) {
        logger.error('auto-launch-attendance: erreur récupération séances', { orgId: org.id, error: slotsError.message })
        continue
      }

      for (const slot of (slots ?? []) as unknown as SlotRow[]) {
        const session = slot.sessions
        if (!session || session.status === 'cancelled') continue
        if (!slotInLaunchWindow(slot.start_time, now)) continue

        const enabled = sessionRule.has(session.id) ? sessionRule.get(session.id) : orgEnabled.has(org.id)
        if (!enabled) continue

        const result: (typeof results)[number] = {
          sessionId: session.id,
          slotId: slot.id,
          organizationId: org.id,
          launched: false,
          emailsSent: 0,
        }

        try {
          // Une séance = un émargement : clé session + date + heure de début
          // (deux séances le même jour ont chacune le leur)
          const { data: existing } = await supabaseAdmin
            .from('electronic_attendance_sessions')
            .select('id')
            .eq('session_id', session.id)
            .eq('date', todayStr)
            .eq('start_time', slot.start_time)
            .limit(1)
            .maybeSingle()

          if (existing) {
            results.push({ ...result, skipped: 'already_exists' })
            continue
          }

          const formation = Array.isArray(session.formations) ? session.formations[0] : session.formations
          const sessionTitle = (formation?.name ?? session.name) || 'Formation'

          // Récupérer les apprenants inscrits avec email
          const { data: enrollments } = await supabaseAdmin
            .from('enrollments')
            .select('student_id, students(id, first_name, last_name, email)')
            .eq('session_id', session.id)
            .in('status', ATTENDANCE_ELIGIBLE_ENROLLMENT_STATUSES)

          const students = (
            enrollments as Array<{
              students: { id: string; first_name: string; last_name: string; email: string } | null
            }> | null
          )
            ?.map((e) => e.students)
            .filter((s): s is { id: string; first_name: string; last_name: string; email: string } => !!s && !!s.email) ?? []

          // Créer la session d'émargement directement en statut 'active'
          const tokenExpiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()

          const { data: attendanceSession, error: createError } = await supabaseAdmin
            .from('electronic_attendance_sessions')
            .insert({
              organization_id: org.id,
              session_id: session.id,
              title: sessionTitle,
              date: todayStr,
              start_time: slot.start_time ?? null,
              end_time: slot.end_time ?? null,
              status: 'active',
              mode: 'electronic',
              require_signature: true,
              require_geolocation: false,
              allowed_radius_meters: 100,
              qr_code_enabled: false,
              total_expected: students.length,
            })
            .select()
            .single()

          if (createError || !attendanceSession) {
            result.error = createError?.message ?? 'Erreur création session émargement'
            results.push(result)
            continue
          }

          // Créer les demandes d'émargement pour chaque apprenant
          if (students.length > 0) {
            const requests = students.map((student) => ({
              organization_id: org.id,
              attendance_session_id: attendanceSession.id,
              student_id: student.id,
              student_email: student.email,
              student_name: `${student.first_name} ${student.last_name}`,
              status: 'pending' as const,
              signature_token: generateSignatureToken(),
              access_token: crypto.randomUUID(),
              token_expires_at: tokenExpiresAt,
            }))

            const { data: createdRequests, error: requestsError } = await supabaseAdmin
              .from('electronic_attendance_requests')
              .insert(requests)
              .select()

            if (requestsError) {
              result.error = requestsError.message
              results.push(result)
              continue
            }

            // Envoyer les emails de signature
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.io'
            const emailResults = await Promise.allSettled(
              (createdRequests ?? []).map(async (req) => {
                const token = (req as { access_token?: string; signature_token: string }).access_token ?? req.signature_token
                const attendanceUrl = `${baseUrl}/sign/${token}`
                const sent = await sendEmailViaResend({
                  to: req.student_email,
                  subject: `Émargement : ${sessionTitle} — ${new Date(todayStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
                  html: buildAttendanceEmailHtml({
                    studentName: req.student_name,
                    sessionTitle,
                    date: todayStr,
                    startTime: slot.start_time,
                    attendanceUrl,
                  }),
                })
                if (!sent.success) throw new Error(sent.error ?? 'Erreur envoi')
              })
            )

            result.emailsSent = emailResults.filter((r) => r.status === 'fulfilled').length
          }

          result.launched = true
          logger.info('auto-launch-attendance: émargement lancé automatiquement', {
            sessionId: session.id,
            slotId: slot.id,
            attendanceSessionId: attendanceSession.id,
            orgId: org.id,
            emailsSent: result.emailsSent,
          })
        } catch (slotError) {
          result.error = slotError instanceof Error ? slotError.message : 'Unknown error'
          logger.error('auto-launch-attendance: erreur séance', { sessionId: session.id, slotId: slot.id, error: result.error })
        }

        results.push(result)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-launch attendance completed',
      date: todayStr,
      results,
      totalLaunched: results.filter((r) => r.launched).length,
      totalSkipped: results.filter((r) => r.skipped).length,
      totalErrors: results.filter((r) => r.error).length,
    })
  } catch (error) {
    logger.error('CRON auto-launch-attendance error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
