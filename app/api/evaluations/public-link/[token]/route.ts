/**
 * GET  /api/evaluations/public-link/[token] — résout un lien public
 * d'évaluations (QR code) : renvoie la liste des apprenants du lot
 * (même session/sujet/type/date), avec leur grade_id, pour que la page
 * publique les affiche et redirige celui qui se reconnaît vers son
 * évaluation. Pour un questionnaire intervenant, manager ou financeur, renvoie
 * à la place les répondants de ce public (intervenants de la session, contacts
 * des entreprises, entités facturées).
 * POST /api/evaluations/public-link/[token] — { key } : crée (ou réutilise) le
 *      lien de questionnaire du répondant choisi et renvoie son token /q.
 * Client service role (bypass RLS) — même pattern que
 * /api/electronic-attendance/public-link/[token].
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { withDistributedRateLimit } from '@/lib/utils/rate-limiter-distributed'
import { getOrCreateRespondentLink, templateAudience } from '@/lib/services/questionnaire-link.service'
import { loadRecipientCandidates } from '@/lib/services/questionnaire-recipients'

// evaluation_public_links est une table récente non encore dans les types générés.
type AnyClient = any

type PublicLinkRow = {
  id: string
  organization_id: string
  session_id: string
  subject: string
  assessment_type: string
  graded_at: string
  sessions: { name?: string | null } | null
}

async function loadLink(supabase: AnyClient, token: string): Promise<PublicLinkRow | null> {
  const { data } = await supabase
    .from('evaluation_public_links')
    .select('id, organization_id, session_id, subject, assessment_type, graded_at, sessions(name)')
    .eq('token', token)
    .maybeSingle()
  return data as PublicLinkRow | null
}

/** Répondants proposés (avec email, pour un lien unique par personne), sans exposer l'email */
async function respondentCandidates(supabase: AnyClient, link: PublicLinkRow) {
  const audience = templateAudience(link.assessment_type)
  if (!audience || audience === 'student') return null
  const candidates = await loadRecipientCandidates(supabase, link.session_id, audience)
  return candidates
    .filter((c) => c.email && (c.userId || c.entityId))
    .map((c) => ({ ...c, key: (c.userId ?? c.entityId) as string }))
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceRoleClient() as AnyClient

  const link = await loadLink(supabase, token)
  if (!link) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })

  const respondents = await respondentCandidates(supabase, link)
  if (respondents) {
    return NextResponse.json({
      subject: link.subject,
      session_name: link.sessions?.name ?? null,
      students: [],
      respondents: respondents.map((r) => ({ key: r.key, name: r.name, detail: r.detail ?? null })),
    })
  }

  const { data: grades, error } = await supabase
    .from('grades')
    .select('id, student_id, students(id, first_name, last_name)')
    .eq('session_id', link.session_id)
    .eq('subject', link.subject)
    .eq('assessment_type', link.assessment_type)
    .eq('graded_at', link.graded_at)
    .not('student_id', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const students = (grades ?? [])
    .filter((g: any) => g.students)
    .map((g: any) => ({
      grade_id: g.id,
      student_id: g.student_id,
      student_name: `${g.students.first_name} ${g.students.last_name}`.trim(),
    }))

  return NextResponse.json({
    subject: link.subject,
    session_name: link.sessions?.name ?? null,
    students,
  })
}

/** Modèle du lot : celui des évaluations créées, sinon le modèle du même nom et du même type */
async function batchTemplate(supabase: AnyClient, link: PublicLinkRow): Promise<{ id: string; name: string } | null> {
  const { data: grades } = await supabase
    .from('grades')
    .select('id')
    .eq('session_id', link.session_id)
    .eq('subject', link.subject)
    .eq('assessment_type', link.assessment_type)
    .eq('graded_at', link.graded_at)
  const gradeIds = ((grades ?? []) as Array<{ id: string }>).map((g) => g.id)

  let templateId: string | null = null
  if (gradeIds.length > 0) {
    const { data: instance } = await supabase
      .from('evaluation_template_instances')
      .select('template_id')
      .in('grade_id', gradeIds)
      .limit(1)
      .maybeSingle()
    templateId = (instance as { template_id?: string } | null)?.template_id ?? null
  }

  let query = supabase
    .from('evaluation_templates')
    .select('id, name')
    .or(`organization_id.eq.${link.organization_id},organization_id.is.null`)
  query = templateId
    ? query.eq('id', templateId)
    : query.eq('name', link.subject).eq('assessment_type', link.assessment_type)
  const { data: template } = await query.limit(1).maybeSingle()
  return (template as { id: string; name: string } | null) ?? null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return withDistributedRateLimit(req, 'public', async () => {
    const { token } = await params
    const supabase = createServiceRoleClient() as AnyClient

    const link = await loadLink(supabase, token)
    if (!link) return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 })

    const { key } = (await req.json().catch(() => ({}))) as { key?: string }
    const respondents = await respondentCandidates(supabase, link)
    const respondent = respondents?.find((r) => r.key === key)
    if (!respondents || !respondent) {
      return NextResponse.json({ error: 'Répondant introuvable' }, { status: 404 })
    }

    const template = await batchTemplate(supabase, link)
    if (!template) return NextResponse.json({ error: 'Questionnaire introuvable' }, { status: 404 })

    const result = await getOrCreateRespondentLink(supabase, {
      organizationId: link.organization_id,
      session: { id: link.session_id, name: link.sessions?.name ?? null },
      template,
      assessmentType: link.assessment_type,
      respondent: { ...respondent, email: respondent.email as string },
      batch: { subject: link.subject, gradedAt: link.graded_at },
    })

    if (result.status === 'already_submitted') {
      return NextResponse.json({ status: 'already_submitted' })
    }
    return NextResponse.json({ status: 'ready', token: result.token })
  })
}
