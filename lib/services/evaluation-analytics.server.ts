/**
 * Chargement Supabase des lignes nécessaires au tableau « Suivi qualité ».
 * Partagé par les routes analytics (session), tendance (formation) et rapport PDF.
 */

import {
  buildEvaluationAnalytics,
  type AnalyticsGradeRow,
  type AnalyticsInstanceRow,
  type AnalyticsQuestionRow,
  type AnalyticsResponseRow,
  type AnalyticsStudentRow,
  type AnalyticsTemplateRow,
  type EvaluationAnalytics,
  type EvaluationAnalyticsInput,
} from './evaluation-analytics'

// La colonne section est récente ; on évite de dépendre des types générés.
type AnyClient = any

export interface EvaluationBatchParams {
  subject?: string | null
  assessment_type?: string | null
  graded_at?: string | null
}

/** Découpe les filtres .in() pour rester sous la limite de taille d'URL PostgREST */
async function selectIn<T>(
  client: AnyClient,
  table: string,
  columns: string,
  column: string,
  ids: string[]
): Promise<T[]> {
  const rows: T[] = []
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await client.from(table).select(columns).in(column, ids.slice(i, i + 200))
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
  }
  return rows
}

export async function loadAnalyticsRows(
  client: AnyClient,
  orgId: string,
  { sessionIds, batch }: { sessionIds: string[]; batch?: EvaluationBatchParams }
): Promise<EvaluationAnalyticsInput> {
  const grades: AnalyticsGradeRow[] = []
  for (let i = 0; i < sessionIds.length; i += 200) {
    let query = client
      .from('grades')
      .select('id, student_id, assessment_type, session_id')
      .in('session_id', sessionIds.slice(i, i + 200))
      .eq('organization_id', orgId)
    if (batch?.subject) query = query.eq('subject', batch.subject)
    if (batch?.assessment_type) query = query.eq('assessment_type', batch.assessment_type)
    if (batch?.graded_at) query = query.eq('graded_at', batch.graded_at)
    const { data, error } = await query
    if (error) throw error
    grades.push(...((data ?? []) as AnalyticsGradeRow[]))
  }

  const instances = await selectIn<AnalyticsInstanceRow>(
    client, 'evaluation_template_instances', 'id, grade_id, template_id', 'grade_id', grades.map((g) => g.id)
  )
  const templateIds = [...new Set(instances.map((i) => i.template_id))]

  const [templates, questions, responses] = await Promise.all([
    selectIn<AnalyticsTemplateRow>(client, 'evaluation_templates', 'id, name', 'id', templateIds),
    selectIn<AnalyticsQuestionRow>(
      client,
      'evaluation_template_questions',
      'id, template_id, question_text, question_type, options, correct_answer, order_index, section',
      'template_id',
      templateIds
    ).catch((err: { code?: string }) => {
      // Migration des rubriques pas encore appliquée : on analyse sans rubriques.
      if (err?.code !== '42703') throw err
      return selectIn<AnalyticsQuestionRow>(
        client,
        'evaluation_template_questions',
        'id, template_id, question_text, question_type, options, correct_answer, order_index',
        'template_id',
        templateIds
      ).then((rows) => rows.map((q) => ({ ...q, section: null })))
    }),
    selectIn<AnalyticsResponseRow>(
      client,
      'evaluation_responses',
      'instance_id, question_id, student_id, answer_text, answer_choice, answer_boolean, answer_rating',
      'instance_id',
      instances.map((i) => i.id)
    ),
  ])

  const studentIds = [...new Set(grades.map((g) => g.student_id).filter((id): id is string => !!id))]
  const students = await selectIn<AnalyticsStudentRow>(client, 'students', 'id, first_name, last_name', 'id', studentIds)

  return { grades, instances, templates, questions, responses, students }
}

/** Restreint les lignes chargées à une seule session (tendance multi-sessions) */
export function rowsForSession(rows: EvaluationAnalyticsInput, sessionId: string): EvaluationAnalyticsInput {
  const grades = rows.grades.filter((g) => g.session_id === sessionId)
  const gradeIds = new Set(grades.map((g) => g.id))
  const instances = rows.instances.filter((i) => gradeIds.has(i.grade_id))
  const instanceIds = new Set(instances.map((i) => i.id))
  return { ...rows, grades, instances, responses: rows.responses.filter((r) => instanceIds.has(r.instance_id)) }
}

export async function loadSessionAnalytics(
  client: AnyClient,
  orgId: string,
  sessionId: string,
  batch?: EvaluationBatchParams
): Promise<EvaluationAnalytics> {
  return buildEvaluationAnalytics(await loadAnalyticsRows(client, orgId, { sessionIds: [sessionId], batch }))
}

export function batchFromSearchParams(search: URLSearchParams): EvaluationBatchParams {
  return {
    subject: search.get('subject'),
    assessment_type: search.get('assessment_type'),
    graded_at: search.get('graded_at'),
  }
}
