/**
 * GET /api/sessions/[id]/evaluation-analytics — tableau « Suivi qualité »
 *
 * Agrège les réponses aux évaluations de la session (note /10 par type,
 * rubrique et question + distribution des réponses).
 *
 * Paramètres optionnels pour restreindre à un lot d'évaluations (même clé que
 * evaluation_public_links) : subject, assessment_type, graded_at.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import {
  buildEvaluationAnalytics,
  type AnalyticsGradeRow,
  type AnalyticsInstanceRow,
  type AnalyticsQuestionRow,
  type AnalyticsResponseRow,
  type AnalyticsStudentRow,
  type AnalyticsTemplateRow,
} from '@/lib/services/evaluation-analytics'

// La colonne section est récente ; on évite de dépendre des types générés.
type AnyClient = any

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const orgId = await getUserOrgId(supabase, user.id)
  if (!orgId) return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

  const client = supabase as AnyClient
  const search = req.nextUrl.searchParams
  const subject = search.get('subject')
  const assessmentType = search.get('assessment_type')
  const gradedAt = search.get('graded_at')

  try {
    let gradesQuery = client
      .from('grades')
      .select('id, student_id, assessment_type')
      .eq('session_id', sessionId)
      .eq('organization_id', orgId)
    if (subject) gradesQuery = gradesQuery.eq('subject', subject)
    if (assessmentType) gradesQuery = gradesQuery.eq('assessment_type', assessmentType)
    if (gradedAt) gradesQuery = gradesQuery.eq('graded_at', gradedAt)

    const { data: gradesData, error: gradesError } = await gradesQuery
    if (gradesError) throw gradesError
    const grades = (gradesData ?? []) as AnalyticsGradeRow[]

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

    return NextResponse.json(
      buildEvaluationAnalytics({ grades, instances, templates, questions, responses, students })
    )
  } catch (error) {
    console.error('[evaluation-analytics] GET error', error)
    return NextResponse.json({ error: 'Impossible de charger les résultats des évaluations' }, { status: 500 })
  }
}
