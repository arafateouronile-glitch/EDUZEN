/**
 * POST /api/qualiopi/sync-questionnaire-analysis
 * Analyse les réponses aux questionnaires de satisfaction (chaud/froid)
 * et génère des preuves automatiques pour les indicateurs Qualiopi 29-32.
 *
 * GET /api/qualiopi/sync-questionnaire-analysis
 * Retourne les stats de satisfaction par session sans modifier les preuves.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SessionBucket = {
  session_id: string
  session_name: string
  assessment_type: string
  ratings: number[]
  comment_count: number
  respondent_instance_ids: Set<string>
  last_date: string
}

async function buildSessionBuckets(orgId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: grades } = await supabase
    .from('grades')
    .select('id, session_id, assessment_type')
    .eq('organization_id', orgId)
    .not('session_id', 'is', null)

  if (!grades?.length) return null

  const gradeIds = grades.map((g) => g.id)

  const { data: instances } = await supabase
    .from('evaluation_template_instances')
    .select('id, grade_id, template_id, completed_at')
    .in('grade_id', gradeIds)
    .not('completed_at', 'is', null)

  if (!instances?.length) return null

  const templateIds = [...new Set(instances.map((i) => i.template_id))]
  const { data: templates } = await supabase
    .from('evaluation_templates')
    .select('id, assessment_type')
    .in('id', templateIds)
  const templateMap = new Map(templates?.map((t) => [t.id, t]) ?? [])

  const instanceIds = instances.map((i) => i.id)
  const { data: responses } = await supabase
    .from('evaluation_responses')
    .select('id, instance_id, answer_rating, answer_text, created_at')
    .in('instance_id', instanceIds)
    .not('answer_rating', 'is', null)

  if (!responses?.length) return null

  const sessionIds = [...new Set(grades.map((g) => g.session_id as string).filter(Boolean))]
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name')
    .in('id', sessionIds)
  const sessionMap = new Map(sessions?.map((s) => [s.id, s]) ?? [])

  const gradeMap = new Map(grades.map((g) => [g.id, g]))
  const instanceMeta = new Map(
    instances.map((i) => {
      const grade = gradeMap.get(i.grade_id)
      const template = templateMap.get(i.template_id)
      const assessmentType = grade?.assessment_type ?? template?.assessment_type ?? 'unknown'
      return [i.id, { session_id: grade?.session_id as string | undefined, assessmentType }]
    })
  )

  const buckets = new Map<string, SessionBucket>()

  for (const r of responses) {
    const meta = instanceMeta.get(r.instance_id)
    if (!meta?.session_id) continue
    const key = `${meta.session_id}:${meta.assessmentType}`
    const session = sessionMap.get(meta.session_id)
    if (!buckets.has(key)) {
      buckets.set(key, {
        session_id: meta.session_id,
        session_name: session?.name ?? meta.session_id,
        assessment_type: meta.assessmentType,
        ratings: [],
        comment_count: 0,
        respondent_instance_ids: new Set(),
        last_date: r.created_at,
      })
    }
    const b = buckets.get(key)!
    b.ratings.push(r.answer_rating as number)
    if (r.answer_text?.trim()) b.comment_count++
    b.respondent_instance_ids.add(r.instance_id)
    if (r.created_at > b.last_date) b.last_date = r.created_at
  }

  return buckets
}

function typeLabel(t: string) {
  if (t === 'hot' || t === 'a_chaud') return 'à chaud'
  if (t === 'cold' || t === 'a_froid') return 'à froid'
  return t
}

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: userRow } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()
    if (!userRow?.organization_id)
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

    const orgId = userRow.organization_id
    const now = new Date().toISOString()

    // Supprimer les preuves questionnaires précédentes pour éviter les doublons
    await supabase
      .from('compliance_evidence_automated')
      .delete()
      .eq('organization_id', orgId)
      .eq('source', 'system')
      .eq('entity_type', 'questionnaire_analysis')

    const buckets = await buildSessionBuckets(orgId, supabase)
    if (!buckets?.size) {
      return NextResponse.json({ success: true, count: 0, sessions: 0, message: '0 preuve générée (aucune réponse de satisfaction).' })
    }

    const inserted: string[] = []

    for (const b of buckets.values()) {
      if (!b.ratings.length) continue
      const avg = Math.round((b.ratings.reduce((a, c) => a + c, 0) / b.ratings.length) * 10) / 10
      const label = typeLabel(b.assessment_type)

      // Ind. 29 — Recueil des appréciations par session
      await supabase.from('compliance_evidence_automated').insert({
        organization_id: orgId,
        indicator_number: 29,
        evidence_type: 'feedback',
        source: 'system',
        entity_type: 'questionnaire_analysis',
        entity_id: b.session_id,
        entity_name: b.session_name,
        title: `Questionnaire ${label} – ${b.session_name}`,
        description: `${b.ratings.length} réponse(s) · Satisfaction moyenne : ${avg}/5 · ${b.respondent_instance_ids.size} participant(s)`,
        status: 'valid',
        confidence_score: 100,
        event_date: b.last_date,
      })
      inserted.push(`q29:${b.session_id}:${b.assessment_type}`)

      // Ind. 31 — Mesures d'amélioration : commentaires recueillis
      if (b.comment_count > 0) {
        await supabase.from('compliance_evidence_automated').insert({
          organization_id: orgId,
          indicator_number: 31,
          evidence_type: 'feedback',
          source: 'system',
          entity_type: 'questionnaire_analysis',
          entity_id: b.session_id,
          entity_name: b.session_name,
          title: `Retours apprenants – ${b.session_name}`,
          description: `${b.comment_count} commentaire(s) recueilli(s) · Session : ${b.session_name} (${label})`,
          status: 'valid',
          confidence_score: 80,
          event_date: b.last_date,
        })
        inserted.push(`q31:${b.session_id}`)
      }
    }

    // Ind. 32 — Amélioration continue : synthèse globale (si ≥2 sessions)
    if (buckets.size >= 2) {
      const allRatings = [...buckets.values()].flatMap((b) => b.ratings)
      const globalAvg = Math.round((allRatings.reduce((a, c) => a + c, 0) / allRatings.length) * 10) / 10
      const totalComments = [...buckets.values()].reduce((s, b) => s + b.comment_count, 0)

      await supabase.from('compliance_evidence_automated').insert({
        organization_id: orgId,
        indicator_number: 32,
        evidence_type: 'data_point',
        source: 'system',
        entity_type: 'questionnaire_analysis',
        entity_id: orgId,
        entity_name: 'Organisation',
        title: 'Amélioration continue – Synthèse des évaluations',
        description: `${allRatings.length} réponse(s) · ${buckets.size} session(s) · Satisfaction globale : ${globalAvg}/5 · ${totalComments} commentaire(s)`,
        status: 'valid',
        confidence_score: 90,
        event_date: now,
      })
      inserted.push('q32:global')
    }

    return NextResponse.json({
      success: true,
      count: inserted.length,
      sessions: buckets.size,
      message: `${inserted.length} preuve(s) générée(s) depuis ${buckets.size} session(s).`,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: userRow } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()
    if (!userRow?.organization_id)
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })

    const orgId = userRow.organization_id
    const buckets = await buildSessionBuckets(orgId, supabase)

    if (!buckets?.size) {
      return NextResponse.json({ stats: [], globalAvg: null, totalResponses: 0, totalComments: 0 })
    }

    const stats = [...buckets.values()].map((b) => ({
      session_id: b.session_id,
      session_name: b.session_name,
      assessment_type: b.assessment_type,
      type_label: typeLabel(b.assessment_type),
      avg_rating: b.ratings.length
        ? Math.round((b.ratings.reduce((a, c) => a + c, 0) / b.ratings.length) * 10) / 10
        : 0,
      response_count: b.ratings.length,
      comment_count: b.comment_count,
      respondent_count: b.respondent_instance_ids.size,
    }))

    const allRatings = stats.flatMap((s) => Array(s.response_count).fill(s.avg_rating))
    const globalAvg = allRatings.length
      ? Math.round((allRatings.reduce((a, c) => a + c, 0) / allRatings.length) * 10) / 10
      : null
    const totalComments = stats.reduce((s, b) => s + b.comment_count, 0)

    return NextResponse.json({
      stats,
      globalAvg,
      totalResponses: allRatings.length,
      totalComments,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur serveur' }, { status: 500 })
  }
}
