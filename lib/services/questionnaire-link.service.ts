/**
 * Liens directs vers un questionnaire (/q/[token]), partagés par l'envoi manuel
 * depuis la session et les automatisations.
 *
 * questionnaire_links est une table récente non encore dans les types générés.
 */

type AnyClient = any

export interface QuestionnaireLinkInput {
  organizationId: string
  session: { id: string; name?: string | null }
  student: { id: string; first_name?: string | null; last_name?: string | null; email?: string | null }
  template: { id: string; name: string }
  assessmentType: string
}

export type QuestionnaireLinkResult =
  | { status: 'already_submitted' }
  | { status: 'ready'; token: string; created: boolean }

/**
 * Lien de l'apprenant pour ce type d'évaluation. Réutilise le lien, ou l'évaluation
 * déjà créée mais non remplie, pour ne pas compter deux fois l'apprenant dans les statistiques.
 */
export async function getOrCreateQuestionnaireLink(
  admin: AnyClient,
  input: QuestionnaireLinkInput
): Promise<QuestionnaireLinkResult> {
  const { organizationId, session, student, template, assessmentType } = input

  const { data: existing } = await admin
    .from('questionnaire_links')
    .select('token, submitted_at')
    .eq('session_id', session.id)
    .eq('student_id', student.id)
    .eq('assessment_type', assessmentType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.submitted_at) return { status: 'already_submitted' }
  if (existing) return { status: 'ready', token: existing.token as string, created: false }

  let gradeId: string | null = null
  let instanceId: string | null = null

  const { data: grades } = await admin
    .from('grades')
    .select('id')
    .eq('session_id', session.id)
    .eq('student_id', student.id)
    .eq('assessment_type', assessmentType)

  const gradeIds = ((grades ?? []) as Array<{ id: string }>).map((g) => g.id)
  if (gradeIds.length > 0) {
    const { data: instances } = await admin
      .from('evaluation_template_instances')
      .select('id, grade_id, completed_at')
      .in('grade_id', gradeIds)
      .eq('template_id', template.id)
    const rows = (instances ?? []) as Array<{ id: string; grade_id: string; completed_at: string | null }>
    if (rows.some((i) => i.completed_at)) return { status: 'already_submitted' }
    if (rows[0]) {
      gradeId = rows[0].grade_id
      instanceId = rows[0].id
    }
  }

  if (!gradeId) {
    const { data: gradeRow, error: gradeError } = await admin
      .from('grades')
      .insert({
        organization_id: organizationId,
        session_id: session.id,
        student_id: student.id,
        assessment_type: assessmentType,
        subject: template.name,
        graded_at: new Date().toISOString(),
        max_score: 5,
      })
      .select('id')
      .single()
    if (gradeError) throw new Error(`Création de l'évaluation impossible : ${gradeError.message}`)
    gradeId = gradeRow.id as string

    const { data: instanceRow, error: instanceError } = await admin
      .from('evaluation_template_instances')
      .insert({ grade_id: gradeId, template_id: template.id })
      .select('id')
      .single()
    if (instanceError) throw new Error(`Création de l'évaluation impossible : ${instanceError.message}`)
    instanceId = instanceRow.id as string
  }

  const { data: newLink, error: linkError } = await admin
    .from('questionnaire_links')
    .insert({
      organization_id: organizationId,
      session_id: session.id,
      student_id: student.id,
      template_id: template.id,
      grade_id: gradeId,
      instance_id: instanceId,
      student_name: `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim(),
      student_email: student.email ?? null,
      session_name: session.name ?? null,
      assessment_type: assessmentType,
    })
    .select('token')
    .single()
  if (linkError) throw new Error(`Création du lien impossible : ${linkError.message}`)

  return { status: 'ready', token: newLink.token as string, created: true }
}

// ── Destinataires autres que les apprenants ─────────────────────────────────

export type QuestionnaireAudience = 'student' | 'instructor' | 'manager' | 'funder'

/** Anciens libellés de type encore présents sur certains modèles */
const LEGACY_ASSESSMENT_TYPES: Record<string, string> = { a_chaud: 'hot', a_froid: 'cold' }

export function normalizeAssessmentType(assessmentType: string | null | undefined): string | null {
  if (!assessmentType) return null
  return LEGACY_ASSESSMENT_TYPES[assessmentType] ?? assessmentType
}

/** Public d'un modèle de questionnaire : null pour un modèle noté (quiz, examen, projet…) */
export function templateAudience(assessmentType: string | null | undefined): QuestionnaireAudience | null {
  const type = normalizeAssessmentType(assessmentType)
  if (!type || type === 'pre_formation' || type === 'hot' || type === 'cold') return 'student'
  if (type === 'instructor' || type === 'manager' || type === 'funder') return type
  return null
}

export interface QuestionnaireRecipient {
  type: Exclude<QuestionnaireAudience, 'student'>
  name: string
  email: string | null
  /** Précision affichée (entreprise du contact, rôle de l'intervenant…) */
  detail?: string | null
  userId?: string | null
  entityId?: string | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string | null | undefined): email is string {
  return !!email && EMAIL_PATTERN.test(email.trim())
}

/** Un destinataire par email (le premier trouvé l'emporte) ; ceux sans email restent, une fois par nom */
export function dedupeRecipients(recipients: QuestionnaireRecipient[]): QuestionnaireRecipient[] {
  const seen = new Set<string>()
  const result: QuestionnaireRecipient[] = []
  for (const r of recipients) {
    const email = r.email?.trim().toLowerCase() || null
    const key = email ? `@${email}` : `#${r.name.trim().toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ ...r, email })
  }
  return result
}

export interface RespondentLinkInput {
  organizationId: string
  session: { id: string; name?: string | null }
  template: { id: string; name: string }
  assessmentType: string
  respondent: QuestionnaireRecipient & { email: string }
  /** Lot d'évaluations à rejoindre (page Évaluations, QR code) : sujet et date communs */
  batch?: { subject: string; gradedAt: string }
}

/**
 * Lien d'un intervenant, d'une entreprise ou d'un financeur : un par email et
 * par modèle dans la session. L'évaluation créée n'a pas d'apprenant.
 */
export async function getOrCreateRespondentLink(
  admin: AnyClient,
  input: RespondentLinkInput
): Promise<QuestionnaireLinkResult> {
  const { organizationId, session, template, assessmentType, respondent, batch } = input
  const email = respondent.email.trim().toLowerCase()

  const { data: existing } = await admin
    .from('questionnaire_links')
    .select('token, submitted_at')
    .eq('session_id', session.id)
    .eq('template_id', template.id)
    .eq('student_email', email)
    .neq('respondent_type', 'student')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.submitted_at) return { status: 'already_submitted' }
  if (existing) return { status: 'ready', token: existing.token as string, created: false }

  const { data: gradeRow, error: gradeError } = await admin
    .from('grades')
    .insert({
      organization_id: organizationId,
      session_id: session.id,
      student_id: null,
      assessment_type: assessmentType,
      subject: batch?.subject ?? template.name,
      graded_at: batch?.gradedAt ?? new Date().toISOString(),
      max_score: 5,
    })
    .select('id')
    .single()
  if (gradeError) throw new Error(`Création de l'évaluation impossible : ${gradeError.message}`)

  const { data: instanceRow, error: instanceError } = await admin
    .from('evaluation_template_instances')
    .insert({ grade_id: gradeRow.id, template_id: template.id })
    .select('id')
    .single()
  if (instanceError) throw new Error(`Création de l'évaluation impossible : ${instanceError.message}`)

  const { data: newLink, error: linkError } = await admin
    .from('questionnaire_links')
    .insert({
      organization_id: organizationId,
      session_id: session.id,
      student_id: null,
      template_id: template.id,
      grade_id: gradeRow.id,
      instance_id: instanceRow.id,
      student_name: respondent.name.trim() || email,
      student_email: email,
      session_name: session.name ?? null,
      assessment_type: assessmentType,
      respondent_type: respondent.type,
      respondent_user_id: respondent.userId ?? null,
      respondent_entity_id: respondent.entityId ?? null,
    })
    .select('token')
    .single()
  if (linkError) throw new Error(`Création du lien impossible : ${linkError.message}`)

  return { status: 'ready', token: newLink.token as string, created: true }
}

export interface PublicQuestion {
  question_type: string
  options: string[] | null
}

const PUBLIC_QUESTION_TYPES: Record<string, string> = {
  essay: 'text',
  short_answer: 'text',
  numeric: 'text',
  text: 'text',
  multiple_choice: 'choice',
  choice: 'choice',
  true_false: 'boolean',
  boolean: 'boolean',
  rating: 'rating',
}

/** Libellés des choix uniquement : la bonne réponse ne doit jamais atteindre la page publique. */
function publicOptions(options: unknown): string[] | null {
  let parsed = options
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return null
    }
  }
  if (!Array.isArray(parsed)) return null
  return parsed
    .map((o) => (typeof o === 'string' ? o : (o as { text?: unknown } | null)?.text))
    .filter((o): o is string => typeof o === 'string' && o.length > 0)
}

/**
 * Convertit une question de modèle (essay, multiple_choice, true_false…) vers les
 * types affichés par /q/[token] (text, choice, boolean, rating).
 */
export function toPublicQuestion<T extends { question_type: string; options?: unknown }>(
  question: T
): Omit<T, 'question_type' | 'options'> & PublicQuestion {
  return {
    ...question,
    question_type: PUBLIC_QUESTION_TYPES[question.question_type] ?? 'text',
    options: publicOptions(question.options),
  }
}
