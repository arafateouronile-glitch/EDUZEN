/**
 * CRON : Envoi automatique des émargements numériques
 *
 * Se déclenche toutes les 5 minutes.
 * Pour chaque séance dont l'heure de début se situe dans la fenêtre
 * [maintenant - 10 min, maintenant - 5 min] et dont aucune session
 * d'émargement électronique n'a encore été lancée aujourd'hui,
 * ce cron crée et active automatiquement la session d'émargement,
 * puis envoie les liens de signature à tous les apprenants inscrits.
 *
 * Prérequis organisation : settings.automation.auto_attendance_enabled !== false
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import { logger } from '@/lib/utils/logger'

const CRON_SECRET = process.env.CRON_SECRET

interface OrgSettings {
  automation?: {
    auto_attendance_enabled?: boolean
  }
}

interface SessionRow {
  id: string
  name: string
  start_date: string
  start_time: string | null
  end_time: string | null
  organization_id: string
  formations: { name: string } | { name: string }[] | null
  enrollments: { student_id: string }[]
}

function generateSignatureToken(): string {
  const timestamp = Date.now().toString(36)
  const r1 = Math.random().toString(36).substring(2, 15)
  const r2 = Math.random().toString(36).substring(2, 15)
  return `att-${timestamp}-${r1}-${r2}`
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:00`
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
  const todayStr = now.toISOString().split('T')[0]

  // Fenêtre de détection : séances dont l'heure de début est entre now-10min et now-5min
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
  const tenMinAgo = new Date(now.getTime() - 10 * 60 * 1000)
  const fiveMinAgoTime = formatTime(fiveMinAgo)
  const tenMinAgoTime = formatTime(tenMinAgo)

  const results: {
    sessionId: string
    organizationId: string
    launched: boolean
    emailsSent: number
    skipped?: string
    error?: string
  }[] = []

  try {
    // Récupérer les organisations actives
    const { data: organizations } = await supabaseAdmin
      .from('organizations')
      .select('id, settings')
      .eq('subscription_status', 'active')

    if (!organizations?.length) {
      return NextResponse.json({ success: true, message: 'No active organizations', results: [] })
    }

    for (const org of organizations) {
      const settings = (org.settings as OrgSettings) || {}

      // Vérifier si l'automatisation est activée (opt-out : activée par défaut)
      if (settings.automation?.auto_attendance_enabled === false) {
        continue
      }

      // Récupérer les séances de l'organisation qui démarrent dans la fenêtre
      const { data: sessions, error: sessionsError } = await supabaseAdmin
        .from('sessions')
        .select(`
          id,
          name,
          start_date,
          start_time,
          end_time,
          organization_id,
          formations(name),
          enrollments!inner(student_id)
        `)
        .eq('organization_id', org.id)
        .eq('start_date', todayStr)
        .gte('start_time', tenMinAgoTime)
        .lte('start_time', fiveMinAgoTime)
        .in('status', ['active', 'scheduled', 'in_progress', 'planned'])

      if (sessionsError) {
        logger.error('auto-launch-attendance: erreur récupération sessions', {
          orgId: org.id,
          error: sessionsError.message,
        })
        continue
      }

      if (!sessions?.length) continue

      // Charger les toggles par session (email_type = 'emargement_auto')
      const sessionIds = (sessions as SessionRow[]).map((s) => s.id)
      const { data: sessionToggles } = await supabaseAdmin
        .from('email_schedules')
        .select('session_id, is_active')
        .eq('email_type', 'emargement_auto')
        .in('session_id', sessionIds)

      const toggleMap = new Map(
        (sessionToggles ?? []).map((t) => [t.session_id, t.is_active])
      )

      for (const session of sessions as SessionRow[]) {
        // Si un toggle par session existe et est désactivé → on skip
        if (toggleMap.has(session.id) && toggleMap.get(session.id) === false) {
          results.push({ sessionId: session.id, organizationId: org.id, launched: false, emailsSent: 0, skipped: 'disabled_by_session_toggle' })
          continue
        }
        const result: {
          sessionId: string
          organizationId: string
          launched: boolean
          emailsSent: number
          error?: string
          skipped?: string
        } = {
          sessionId: session.id,
          organizationId: org.id,
          launched: false,
          emailsSent: 0,
        }

        try {
          // Vérifier qu'aucune session d'émargement n'existe déjà pour cette séance aujourd'hui
          const { data: existing } = await supabaseAdmin
            .from('electronic_attendance_sessions')
            .select('id')
            .eq('session_id', session.id)
            .eq('date', todayStr)
            .in('status', ['draft', 'active'])
            .maybeSingle()

          if (existing) {
            results.push({ ...result, skipped: 'already_exists' })
            continue
          }

          const formation = Array.isArray(session.formations)
            ? session.formations[0]
            : session.formations
          const sessionTitle = (formation?.name ?? session.name) || 'Formation'

          // Récupérer les apprenants inscrits avec email
          const { data: enrollments } = await supabaseAdmin
            .from('enrollments')
            .select('student_id, students(id, first_name, last_name, email)')
            .eq('session_id', session.id)
            .in('status', ['confirmed', 'pending'])

          const students = (
            enrollments as Array<{
              students: { id: string; first_name: string; last_name: string; email: string } | null
            }> | null
          )
            ?.map((e) => e.students)
            .filter((s): s is { id: string; first_name: string; last_name: string; email: string } =>
              !!s && !!s.email
            ) ?? []

          // Créer la session d'émargement directement en statut 'active'
          const tokenExpiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString()

          const { data: attendanceSession, error: createError } = await supabaseAdmin
            .from('electronic_attendance_sessions')
            .insert({
              organization_id: org.id,
              session_id: session.id,
              title: sessionTitle,
              date: todayStr,
              start_time: session.start_time ?? null,
              end_time: session.end_time ?? null,
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
                const student = students.find((s) => s.id === req.student_id)
                if (!student) return

                return sendEmailViaResend({
                  to: req.student_email,
                  subject: `Émargement : ${sessionTitle} — ${new Date(todayStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
                  html: buildAttendanceEmailHtml({
                    studentName: req.student_name,
                    sessionTitle,
                    date: todayStr,
                    startTime: session.start_time,
                    attendanceUrl,
                  }),
                })
              })
            )

            result.emailsSent = emailResults.filter((r) => r.status === 'fulfilled').length
          }

          result.launched = true
          logger.info('auto-launch-attendance: émargement lancé automatiquement', {
            sessionId: session.id,
            attendanceSessionId: attendanceSession.id,
            orgId: org.id,
            emailsSent: result.emailsSent,
          })
        } catch (sessionError) {
          result.error = sessionError instanceof Error ? sessionError.message : 'Unknown error'
          logger.error('auto-launch-attendance: erreur session', {
            sessionId: session.id,
            error: result.error,
          })
        }

        results.push(result)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Auto-launch attendance completed',
      window: { from: tenMinAgoTime, to: fiveMinAgoTime, date: todayStr },
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
