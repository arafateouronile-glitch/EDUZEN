import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
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

    const organizationId = await getUserOrgId(supabase, user.id)
    if (!organizationId) {
      return NextResponse.json({ error: 'Organisation introuvable' }, { status: 403 })
    }

    // Calcul top programmes : join depuis enrollments → sessions → formations → programs
    // Évite de charger toutes les données org en mémoire
    const [{ data: enrollmentsByProgram }, { data: recentEnrollments }] = await Promise.all([
      supabase
        .from('enrollments')
        .select('sessions!inner(formations!inner(program_id, organization_id))')
        .eq('sessions.formations.organization_id', organizationId)
        .limit(5000),
      supabase
        .from('enrollments')
        .select('id, status, created_at, students(first_name, last_name, photo_url), sessions!inner(name, formations!inner(name, organization_id, programs(name)))')
        .eq('sessions.formations.organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    // Compter les inscriptions par program_id côté JS sur la liste déjà filtrée par org
    type EnrollmentProgramRow = { sessions: { formations: { program_id: string | null; organization_id: string } | null } | null }
    const programCounts = new Map<string, number>()
    for (const row of (enrollmentsByProgram ?? []) as unknown as EnrollmentProgramRow[]) {
      const pid = row.sessions?.formations?.program_id
      if (pid) programCounts.set(pid, (programCounts.get(pid) ?? 0) + 1)
    }

    // Récupérer uniquement les programmes qui ont des inscriptions (max 5 résultats)
    const topProgramIds = [...programCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)

    let topPrograms: TopProgram[] = []
    if (topProgramIds.length > 0) {
      const { data: programs } = await supabase
        .from('programs')
        .select('id, name, code')
        .in('id', topProgramIds)
      topPrograms = (programs ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        enrollments: programCounts.get(p.id) ?? 0,
      })).sort((a, b) => b.enrollments - a.enrollments)
    }

    const payload: ActivityInsightsPayload = {
      topPrograms,
      recentEnrollments: (recentEnrollments || []) as RecentEnrollment[],
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60')
    return res
  } catch (error) {
    logger.error('activity insights error', error instanceof Error ? error : new Error(String(error)), {
      error: sanitizeError(error),
    })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
