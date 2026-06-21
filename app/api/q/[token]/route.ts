/**
 * GET  /api/q/[token] — charge les données du questionnaire (public, sans auth)
 * POST /api/q/[token] — soumet les réponses (public, sans auth)
 *
 * questionnaire_links est une table récente non encore dans les types générés.
 * Les appels sur cette table utilisent (admin as unknown as any) pour contourner.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface QLinkRow {
  id: string
  student_name: string
  session_name: string
  assessment_type: string
  submitted_at: string | null
  viewed_at: string | null
  expires_at: string
  template_id: string
  instance_id: string | null
  student_id: string
  grade_id: string | null
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient() as any // questionnaire_links pas encore dans les types générés

  const { data: link } = await admin
    .from('questionnaire_links')
    .select('id, student_name, session_name, assessment_type, submitted_at, expires_at, template_id, instance_id, student_id')
    .eq('token', token)
    .maybeSingle() as { data: QLinkRow | null }

  if (!link) return NextResponse.json({ error: 'Lien introuvable' }, { status: 404 })
  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Lien expiré' }, { status: 410 })
  }

  if (!link.submitted_at) {
    await admin
      .from('questionnaire_links')
      .update({ viewed_at: new Date().toISOString() })
      .eq('token', token)
      .is('viewed_at', null)
  }

  const { data: questions } = await admin
    .from('evaluation_template_questions')
    .select('id, question_text, question_type, options, order_index, points')
    .eq('template_id', link.template_id)
    .order('order_index', { ascending: true })

  const { data: template } = await admin
    .from('evaluation_templates')
    .select('id, name, description')
    .eq('id', link.template_id)
    .single()

  return NextResponse.json({
    student_name: link.student_name,
    session_name: link.session_name,
    assessment_type: link.assessment_type,
    submitted_at: link.submitted_at,
    template: {
      id: (template as { id?: string } | null)?.id,
      name: (template as { name?: string } | null)?.name,
      description: (template as { description?: string } | null)?.description,
    },
    questions: (questions as unknown[]) ?? [],
  })
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient() as any // questionnaire_links pas encore dans les types générés

  const { data: link } = await admin
    .from('questionnaire_links')
    .select('id, submitted_at, expires_at, instance_id, student_id, grade_id')
    .eq('token', token)
    .maybeSingle() as { data: QLinkRow | null }

  if (!link) return NextResponse.json({ error: 'Lien introuvable' }, { status: 404 })
  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Lien expiré' }, { status: 410 })
  }
  if (link.submitted_at) {
    return NextResponse.json({ error: 'Questionnaire déjà soumis' }, { status: 409 })
  }

  const body = await req.json() as {
    answers: Record<string, { rating?: number; text?: string; choice?: string[] }>
  }

  const now = new Date().toISOString()
  const { instance_id: instanceId, student_id: studentId, grade_id: gradeId } = link

  if (instanceId) {
    const responseInserts = Object.entries(body.answers).map(([questionId, ans]) => ({
      instance_id: instanceId,
      question_id: questionId,
      student_id: studentId,
      answer_rating: ans.rating ?? null,
      answer_text: ans.text ?? null,
      answer_choice: ans.choice ?? null,
      created_at: now,
      updated_at: now,
    }))

    if (responseInserts.length > 0) {
      const { error: respErr } = await admin
        .from('evaluation_responses')
        .insert(responseInserts)
      if (respErr) {
        return NextResponse.json({ error: 'Erreur sauvegarde réponses' }, { status: 500 })
      }
    }

    await admin
      .from('evaluation_template_instances')
      .update({ completed_at: now, updated_at: now })
      .eq('id', instanceId)
  }

  const ratings = Object.values(body.answers).map(a => a.rating).filter((r): r is number => r != null)
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null

  if (avgRating !== null && gradeId) {
    await admin
      .from('grades')
      .update({ rating: avgRating, score: avgRating, percentage: Math.round(avgRating / 5 * 100), updated_at: now })
      .eq('id', gradeId)
  }

  await admin
    .from('questionnaire_links')
    .update({ submitted_at: now })
    .eq('token', token)

  return NextResponse.json({ success: true })
}
