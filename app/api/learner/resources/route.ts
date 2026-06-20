import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getStudentId(req: NextRequest): string | null {
  return (
    req.headers.get('x-learner-student-id') ||
    new URL(req.url).searchParams.get('studentId') ||
    null
  )
}

const BASE_SELECT =
  'id, title, description, resource_type, file_url, external_url, thumbnail_url, tags, created_at, visibility_scope, visibility_session_id, visibility_formation_id, visibility_program_id'

export async function GET(req: NextRequest) {
  const studentId = getStudentId(req)
  if (!studentId) {
    return NextResponse.json({ error: 'studentId manquant' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()

    // 1. Récupérer l'organisation de l'apprenant (compartimentage multi-tenant)
    const { data: student } = await admin
      .from('students')
      .select('organization_id')
      .eq('id', studentId)
      .single()

    if (!student?.organization_id) {
      return NextResponse.json({ error: 'Apprenant introuvable' }, { status: 404 })
    }
    const orgId = student.organization_id

    // 2. Récupérer les inscriptions actives (query simple, sans join imbriqué)
    const { data: enrollments } = await admin
      .from('enrollments')
      .select('session_id, sessions(id, formation_id)')
      .eq('student_id', studentId)
      .neq('status', 'cancelled')

    const sessionIds   = new Set<string>()
    const formationIds = new Set<string>()
    const programIds   = new Set<string>()

    for (const e of (enrollments ?? [])) {
      if (e.session_id) sessionIds.add(e.session_id)

      const sess = e.sessions as any
      if (sess?.formation_id) formationIds.add(sess.formation_id)
    }

    // 2. Formation IDs → program IDs (query séparée pour éviter les problèmes de FK)
    if (formationIds.size > 0) {
      const { data: formations } = await admin
        .from('formations')
        .select('id, program_id')
        .in('id', [...formationIds])

      for (const f of (formations ?? []) as any[]) {
        if (f.program_id) programIds.add(f.program_id)
      }
    }

    // 3. Ressources publiées — essayer avec visibility_learner_ids d'abord

    let resources: any[] | null = null

    const withLearnerIds = await admin
      .from('educational_resources')
      .select(`${BASE_SELECT}, visibility_learner_ids`)
      .eq('status', 'published')
      .eq('organization_id', orgId)

    if (withLearnerIds.error) {
      // Colonne pas encore migrée — fallback sans visibility_learner_ids
      const fallback = await admin
        .from('educational_resources')
        .select(BASE_SELECT)
        .eq('status', 'published')
        .eq('organization_id', orgId)
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 })
      }
      resources = fallback.data
    } else {
      resources = withLearnerIds.data
    }

    // 4. Filtrer selon la visibilité

    const visible = (resources ?? []).filter((r: any) => {
      const scope: string = r.visibility_scope ?? 'all'

      if (scope === 'all') return true

      if (scope === 'session') {
        if (!r.visibility_session_id || !sessionIds.has(r.visibility_session_id)) return false
        // Si des learner_ids spécifiques sont définis, l'apprenant doit en faire partie
        const learnerIds: string[] | null = r.visibility_learner_ids ?? null
        if (learnerIds && learnerIds.length > 0) {
          return learnerIds.includes(studentId)
        }
        return true
      }

      if (scope === 'formation') {
        return !!(r.visibility_formation_id && formationIds.has(r.visibility_formation_id))
      }

      if (scope === 'program') {
        return !!(r.visibility_program_id && programIds.has(r.visibility_program_id))
      }

      return false
    })

    return NextResponse.json(visible)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
