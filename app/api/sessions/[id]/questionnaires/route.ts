/**
 * GET  /api/sessions/[id]/questionnaires — stats d'envoi et de réponse
 * POST /api/sessions/[id]/questionnaires — envoie le questionnaire à son public :
 *      apprenants inscrits, ou destinataires choisis (intervenants, entreprises,
 *      financeurs) pour les modèles formateur, manager et financeur
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { sendEmailViaResend, verifiedSenderAddress } from '@/lib/utils/send-email-resend'
import {
  getOrCreateQuestionnaireLink,
  getOrCreateRespondentLink,
  isValidEmail,
  normalizeAssessmentType,
  templateAudience,
  type QuestionnaireAudience,
} from '@/lib/services/questionnaire-link.service'
import { loadRecipientCandidates } from '@/lib/services/questionnaire-recipients'
import { buildEvaluationEmailHtml } from '@/lib/utils/evaluation-email'
import { escapeHtml } from '@/lib/utils/sanitize-html'

// questionnaire_links est une table récente non encore dans les types générés.
type AnyClient = any

// ── GET — statistiques ────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

  const { data: links } = await (supabase as AnyClient)
    .from('questionnaire_links')
    .select('id, student_name, student_email, assessment_type, submitted_at, viewed_at, created_at, expires_at')
    .eq('session_id', sessionId)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  const rows = links ?? []
  const byType: Record<string, { sent: number; viewed: number; submitted: number }> = {}
  for (const r of rows) {
    const t = r.assessment_type as string
    if (!byType[t]) byType[t] = { sent: 0, viewed: 0, submitted: 0 }
    byType[t].sent++
    if (r.viewed_at) byType[t].viewed++
    if (r.submitted_at) byType[t].submitted++
  }

  return NextResponse.json({ links: rows, byType })
}

// ── POST — envoi ──────────────────────────────────────────────────────────────

const MAX_RECIPIENTS = 200

/** Message de l'email selon le public du questionnaire */
function audienceMessage(audience: QuestionnaireAudience, assessmentType: string, sessionName: string): string {
  const session = `<strong>${escapeHtml(sessionName)}</strong>`
  switch (audience) {
    case 'instructor':
      return `Vous êtes intervenu(e) sur la formation ${session}. Merci de nous faire part de votre retour via ce questionnaire.`
    case 'manager':
      return `Un ou plusieurs de vos collaborateurs ont suivi la formation ${session}. Votre avis nous aide à mesurer l'impact de la formation : merci de répondre à ce questionnaire.`
    case 'funder':
      return `Vous avez financé la formation ${session}. Merci de nous faire part de votre retour via ce questionnaire.`
    default:
      if (assessmentType === 'pre_formation') {
        return `Afin de préparer ${session} selon vos besoins, merci de répondre à ce questionnaire.`
      }
      return `Merci de participer à ${session}.<br/>Nous souhaiterions recueillir votre avis via ce questionnaire de satisfaction ${assessmentType === 'cold' ? 'à froid' : 'à chaud'}.`
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await createClient()
  const admin = createAdminClient() as AnyClient

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

  const body = await req.json() as {
    template_id?: string
    assessment_type?: string
    recipients?: Array<{ name?: string; email?: string }>
  }
  if (!body.template_id) {
    return NextResponse.json({ error: 'template_id requis' }, { status: 400 })
  }

  // Vérifier la session appartient à l'org
  const { data: session } = await supabase
    .from('sessions')
    .select('id, name, start_date, end_date, organization_id')
    .eq('id', sessionId)
    .eq('organization_id', orgId)
    .single()
  if (!session) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })

  // Vérifier le template appartient à l'org ou est un template global (organization_id null)
  const { data: template } = await supabase
    .from('evaluation_templates')
    .select('id, name, assessment_type')
    .eq('id', body.template_id)
    .or(`organization_id.eq.${orgId},organization_id.is.null`)
    .single()
  if (!template) return NextResponse.json({ error: 'Template introuvable' }, { status: 404 })

  const audience = templateAudience(template.assessment_type)
  if (!audience) {
    return NextResponse.json(
      { error: 'Ce modèle est une évaluation notée : créez-la depuis « Nouvelle évaluation ».' },
      { status: 400 }
    )
  }
  // Le type vient du modèle ; le choix à chaud / à froid ne sert qu'aux modèles sans type
  const assessmentType =
    normalizeAssessmentType(template.assessment_type) ??
    (body.assessment_type === 'cold' ? 'cold' : 'hot')

  const { data: organization } = await supabase
    .from('organizations')
    .select('name, email')
    .eq('id', orgId)
    .single()
  const organizationName = (organization as { name?: string } | null)?.name ?? ''
  // Envoi direct par Resend (pas de fetch vers /api/email/send, qui n'a pas la
  // session de l'utilisateur côté serveur) : expéditeur au nom de l'organisme,
  // réponses à l'organisme
  const from = `${(organizationName || 'EDUZEN').replace(/[<>"]/g, '')} <${verifiedSenderAddress()}>`
  const replyTo = (organization as { email?: string | null } | null)?.email || undefined
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${process.env.PORT ?? 3001}`

  const title = audience === 'student' && assessmentType !== 'pre_formation' ? 'Questionnaire de satisfaction' : template.name
  const subject =
    audience === 'student' && assessmentType !== 'pre_formation'
      ? `${title} ${assessmentType === 'cold' ? 'à froid' : 'à chaud'} — ${session.name}`
      : `${title} — ${session.name}`

  const sendLink = async (email: string, recipientName: string, token: string) => {
    const questionnaireUrl = `${appUrl}/q/${token}`
    const sent = await sendEmailViaResend({
      from,
      replyTo,
      to: email,
      subject,
      html: buildEvaluationEmailHtml({
        organizationName,
        recipientName,
        title,
        messageHtml: audienceMessage(audience, assessmentType, session.name),
        url: questionnaireUrl,
        buttonLabel: 'Répondre au questionnaire',
        noteHtml: `Ce lien est valable 30 jours. Si le bouton ne fonctionne pas, copiez cette URL :<br/><a href="${questionnaireUrl}" style="color:#2563eb;word-break:break-all;">${questionnaireUrl}</a>`,
      }),
    })
    if (!sent.success) throw new Error(sent.error ?? 'Envoi impossible')
  }

  const results: { student_name: string; sent: boolean; reason?: string }[] = []
  let created = 0
  let skipped = 0

  if (audience !== 'student') {
    const requested = (Array.isArray(body.recipients) ? body.recipients : [])
      .filter((r) => isValidEmail(r?.email))
    const byEmail = new Map(requested.map((r) => [r.email!.trim().toLowerCase(), r]))
    if (byEmail.size === 0) {
      return NextResponse.json({ error: 'Aucun destinataire avec un email valide' }, { status: 400 })
    }
    if (byEmail.size > MAX_RECIPIENTS) {
      return NextResponse.json({ error: `${MAX_RECIPIENTS} destinataires au maximum` }, { status: 400 })
    }

    // Les identifiants (utilisateur, entité) ne viennent que de la liste calculée côté serveur
    const candidates = new Map(
      (await loadRecipientCandidates(admin, sessionId, audience))
        .filter((c) => c.email)
        .map((c) => [c.email!.toLowerCase(), c])
    )

    for (const [email, requestedRecipient] of byEmail) {
      const candidate = candidates.get(email)
      const name = requestedRecipient.name?.trim().slice(0, 200) || candidate?.name || email
      try {
        const link = await getOrCreateRespondentLink(admin, {
          organizationId: orgId,
          session,
          template,
          assessmentType,
          respondent: {
            type: audience,
            name,
            email,
            userId: candidate?.userId ?? null,
            entityId: candidate?.entityId ?? null,
          },
        })
        if (link.status === 'already_submitted') {
          results.push({ student_name: name, sent: false, reason: 'déjà soumis' })
          skipped++
          continue
        }
        if (link.created) created++
        await sendLink(email, name, link.token)
        results.push({ student_name: name, sent: true })
      } catch {
        results.push({ student_name: name, sent: false, reason: 'erreur envoi email' })
      }
    }

    return NextResponse.json({
      success: true,
      created,
      sent: results.filter((r) => r.sent).length,
      failed: results.filter((r) => r.reason === 'erreur envoi email').length,
      skipped,
      total: byEmail.size,
      results,
    })
  }

  // Apprenants inscrits (non annulés)
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id, student_id, students(id, first_name, last_name, email)')
    .eq('session_id', sessionId)
    .neq('status', 'cancelled')
    .not('student_id', 'is', null)

  const students = (enrollments ?? [])
    .map((e: { students: { id: string; first_name: string; last_name: string; email: string | null } | { id: string; first_name: string; last_name: string; email: string | null }[] | null }) => {
      const s = Array.isArray(e.students) ? e.students[0] : e.students
      return s
    })
    .filter(Boolean) as Array<{ id: string; first_name: string; last_name: string; email: string | null }>

  if (!students.length) {
    return NextResponse.json({ error: 'Aucun apprenant inscrit avec email' }, { status: 400 })
  }

  for (const student of students) {
    const studentName = `${student.first_name} ${student.last_name}`

    const link = await getOrCreateQuestionnaireLink(admin, {
      organizationId: orgId,
      session,
      student,
      template,
      assessmentType,
    })

    if (link.status === 'already_submitted') {
      results.push({ student_name: studentName, sent: false, reason: 'déjà soumis' })
      skipped++
      continue
    }

    if (link.created) created++

    // Envoi email si email disponible
    if (student.email) {
      try {
        await sendLink(student.email, studentName, link.token)
        results.push({ student_name: studentName, sent: true })
      } catch {
        results.push({ student_name: studentName, sent: false, reason: 'erreur envoi email' })
      }
    } else {
      results.push({ student_name: studentName, sent: false, reason: 'pas d\'email' })
    }
  }

  return NextResponse.json({
    success: true,
    created,
    sent: results.filter((r) => r.sent).length,
    failed: results.filter((r) => r.reason === 'erreur envoi email').length,
    skipped,
    total: students.length,
    results,
  })
}
