import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmailViaResend } from '@/lib/utils/send-email-resend'
import type { Database } from '@/types/database.types'

type AttendanceRequestInsert = Database['public']['Tables']['electronic_attendance_requests']['Insert']

function generateSignatureToken(): string {
  return `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
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
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
      .info-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
      .cta-button { display: inline-block; background: #10b981; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 20px 0; }
      .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>✍️ Émargement numérique</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${studentName}</strong>,</p>
      <p>Votre séance de formation vient de commencer. Merci de signer votre feuille d'émargement.</p>
      <div class="info-box">
        <p><strong>📚 Formation :</strong> ${sessionTitle}</p>
        <p><strong>📅 Date :</strong> ${formattedDate}${timeText}</p>
      </div>
      <p style="text-align:center;">
        <a href="${attendanceUrl}" class="cta-button">Signer mon émargement</a>
      </p>
      <p style="color:#6b7280;font-size:13px;">Ce lien est valable 4 heures. Si vous ne pouvez pas cliquer, copiez-collez l'URL suivante dans votre navigateur :<br>${attendanceUrl}</p>
    </div>
    <div class="footer">
      <p>EDUZEN — Plateforme de gestion de formations</p>
    </div>
  </body>
</html>`
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    // Auth via SSR client
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    // Récupérer l'organization_id de l'utilisateur
    const { data: userRow } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!userRow?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient()

    // Récupérer la session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('id, name, start_date, start_time, end_time, organization_id, formations(name)')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })
    }

    // Vérifier que la session appartient bien à l'organisation de l'utilisateur
    if (session.organization_id !== userRow.organization_id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer les apprenants inscrits avec email
    const { data: enrollments } = await supabaseAdmin
      .from('enrollments')
      .select('student_id, students(id, first_name, last_name, email)')
      .eq('session_id', sessionId)
      .in('status', ['confirmed', 'active'])

    type StudentRow = { id: string; first_name: string; last_name: string; email: string }
    const students = (
      enrollments as Array<{ students: StudentRow | null }> | null
    )
      ?.map((e) => e.students)
      .filter((s): s is StudentRow => !!s && !!s.email) ?? []

    if (students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun apprenant avec email inscrit' },
        { status: 422 }
      )
    }

    const formation = Array.isArray(session.formations)
      ? session.formations[0]
      : session.formations
    const sessionTitle = (formation?.name ?? session.name) || 'Formation'

    const todayStr = new Date().toISOString().split('T')[0]
    const tokenExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()

    // Créer la session d'émargement électronique
    const { data: attendanceSession, error: createError } = await supabaseAdmin
      .from('electronic_attendance_sessions')
      .insert({
        organization_id: session.organization_id,
        session_id: sessionId,
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
      return NextResponse.json(
        { error: createError?.message ?? 'Erreur création session émargement' },
        { status: 500 }
      )
    }

    // Insérer les demandes d'émargement pour chaque apprenant
    const requests: AttendanceRequestInsert[] = students.map((student) => ({
      organization_id: session.organization_id as string,
      attendance_session_id: (attendanceSession as { id: string }).id,
      student_id: student.id,
      student_email: student.email,
      student_name: `${student.first_name} ${student.last_name}`,
      status: 'pending',
      signature_token: generateSignatureToken(),
      access_token: crypto.randomUUID(),
      token_expires_at: tokenExpiresAt,
    }))

    const { data: createdRequests, error: requestsError } = await supabaseAdmin
      .from('electronic_attendance_requests')
      .insert(requests)
      .select()

    if (requestsError) {
      return NextResponse.json({ error: requestsError.message }, { status: 500 })
    }

    // Envoyer les emails
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eduzen.io'
    const emailResults = await Promise.allSettled(
      (createdRequests ?? []).map(async (req) => {
        const token = (req as { access_token?: string; signature_token: string }).access_token ?? req.signature_token
        const attendanceUrl = `${baseUrl}/sign/${token}`
        const result = await sendEmailViaResend({
          to: req.student_email,
          subject: `[TEST] Émargement : ${sessionTitle} — ${new Date(todayStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          html: buildAttendanceEmailHtml({
            studentName: req.student_name,
            sessionTitle,
            date: todayStr,
            startTime: session.start_time,
            attendanceUrl,
          }),
        })
        return { email: req.student_email, ...result }
      })
    )

    const successes = emailResults
      .filter((r): r is PromiseFulfilledResult<{ email: string; success: boolean; error?: string }> =>
        r.status === 'fulfilled' && r.value.success === true
      )
      .map((r) => r.value.email)

    const failures = emailResults
      .filter((r): r is PromiseFulfilledResult<{ email: string; success: boolean; error?: string }> =>
        r.status === 'fulfilled' && r.value.success === false
      )
      .map((r) => ({ email: r.value.email, error: r.value.error }))

    return NextResponse.json({
      success: failures.length === 0,
      emailsSent: successes.length,
      failures,
      ...(failures.length > 0 && {
        error: `${failures.length} email(s) non envoyé(s) : ${failures.map((f) => `${f.email} (${f.error})`).join(', ')}`,
      }),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
