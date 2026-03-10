import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger, sanitizeError } from '@/lib/utils/logger'

type TopProgram = {
  id: string
  name: string
  code: string
  enrollments: number
}

type RecentEnrollment = {
  id: string
  status: string
  created_at: string
  students: {
    first_name: string | null
    last_name: string | null
    photo_url: string | null
  } | null
  sessions: {
    name: string | null
    formations: {
      name: string | null
      programs: { name: string | null } | null
    } | null
  } | null
}

type ActivityInsightsPayload = {
  topPrograms: TopProgram[]
  recentEnrollments: RecentEnrollment[]
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle()

    if (userError || !userRow?.organization_id) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    const organizationId = userRow.organization_id

    const { data: programs } = await supabase
      .from('programs')
      .select('id, name, code')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    const { data: formations } = await supabase
      .from('formations')
      .select('id, program_id')
      .eq('organization_id', organizationId)

    const formationIds = (formations || []).map((f: { id: string }) => f.id).filter(Boolean)

    const { data: sessions } = formationIds.length
      ? await supabase
          .from('sessions')
          .select('id, formation_id')
          .in('formation_id', formationIds)
      : { data: [] as Array<{ id: string; formation_id: string }>, error: null } as { data: Array<{ id: string; formation_id: string }> | null; error: unknown }

    const sessionIds = (sessions || []).map((s: { id: string }) => s.id).filter(Boolean)

    const { data: enrollments } = sessionIds.length
      ? await supabase
          .from('enrollments')
          .select('session_id')
          .in('session_id', sessionIds)
      : { data: [] as Array<{ session_id: string }>, error: null } as { data: Array<{ session_id: string }> | null; error: unknown }

    const formationToProgram = new Map<string, string>()
    for (const formation of formations || []) {
      if (formation.id && formation.program_id) {
        formationToProgram.set(formation.id, formation.program_id)
      }
    }

    const sessionToProgram = new Map<string, string>()
    for (const session of sessions || []) {
      if (!session.id || !session.formation_id) continue
      const programId = formationToProgram.get(session.formation_id)
      if (programId) {
        sessionToProgram.set(session.id, programId)
      }
    }

    const programCounts = new Map<string, number>()
    for (const enrollment of enrollments || []) {
      const programId = enrollment.session_id ? sessionToProgram.get(enrollment.session_id) : undefined
      if (!programId) continue
      programCounts.set(programId, (programCounts.get(programId) || 0) + 1)
    }

    const topPrograms: TopProgram[] = (programs || [])
      .map((program: { id: string; name: string; code: string }) => ({
        id: program.id,
        name: program.name,
        code: program.code,
        enrollments: programCounts.get(program.id) || 0,
      }))
      .filter((program) => program.enrollments > 0)
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 5)

    // eslint-disable-next-line
    const recentEnrollmentsQuery: any = supabase
      .from('enrollments')
      .select('id, status, created_at, students(first_name, last_name, photo_url), sessions!inner(name, formations!inner(name, organization_id, programs(name)))')
      .eq('sessions.formations.organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: recentEnrollments } = await recentEnrollmentsQuery

    const payload: ActivityInsightsPayload = {
      topPrograms,
      recentEnrollments: (recentEnrollments || []) as RecentEnrollment[],
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30')
    return res
  } catch (error) {
    logger.error('activity insights error', error instanceof Error ? error : new Error(String(error)), {
      error: sanitizeError(error),
    })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
