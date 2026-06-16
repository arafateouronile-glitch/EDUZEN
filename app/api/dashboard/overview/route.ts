import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrgId } from '@/lib/utils/with-auth'
import { logger, sanitizeError } from '@/lib/utils/logger'

type OverviewStats = {
  studentsCount: number
  monthlyRevenue: number
  currency: string
  overdueAmount: number
  avgAttendance: number
  teachersCount: number
  activeSessionsCount: number
  activeFormationsCount: number
  activeProgramsCount: number
  totalEnrollments: number
  completedSessions: number
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
    const currentMonth = new Date()
    currentMonth.setDate(1)
    const monthIso = currentMonth.toISOString()
    const today = new Date().toISOString().split('T')[0]

    // eslint-disable-next-line
    const qSessionsOngoing: any = supabase
      .from('sessions')
      .select('*, formations!inner(organization_id)', { count: 'exact', head: true })
      .eq('formations.organization_id', organizationId)
      .eq('status', 'ongoing')

    // eslint-disable-next-line
    const qSessionsCompleted: any = supabase
      .from('sessions')
      .select('*, formations!inner(organization_id)', { count: 'exact', head: true })
      .eq('formations.organization_id', organizationId)
      .eq('status', 'completed')

    const [
      studentsResult,
      paymentsResult,
      overdueInvoicesResult,
      attendanceResult,
      teachersResult,
      activeSessionsResult,
      activeFormationsResult,
      activeProgramsResult,
      formationsResult,
      completedSessionsResult,
    ] = await Promise.all([
      supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active'),
      supabase
        .from('payments')
        .select('amount, currency, paid_at, created_at')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .or(`paid_at.gte.${monthIso},and(paid_at.is.null,created_at.gte.${monthIso})`),
      supabase
        .from('invoices')
        .select('total_amount, document_type')
        .eq('organization_id', organizationId)
        .eq('status', 'overdue')
        .or('document_type.eq.invoice,document_type.is.null'),
      supabase
        .from('attendance')
        .select('status')
        .eq('organization_id', organizationId)
        .eq('date', today),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('role', 'teacher')
        .eq('is_active', true),
      qSessionsOngoing,
      supabase
        .from('formations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true),
      supabase
        .from('formations')
        .select('id')
        .eq('organization_id', organizationId),
      qSessionsCompleted,
    ])

    const payments = (paymentsResult.data || []) as Array<{
      amount: number | string | null
      currency: string | null
    }>
    const overdueInvoices = (overdueInvoicesResult.data || []) as Array<{
      total_amount: number | string | null
    }>
    const attendance = (attendanceResult.data || []) as Array<{ status: string | null }>

    const monthlyRevenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0)
    const presentCount = attendance.filter((a) => a.status === 'present').length
    const avgAttendance = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0

    let totalEnrollments = 0
    const formations = formationsResult.data || []
    if (formations.length > 0) {
      const formationIds = formations.map((f: { id: string }) => f.id)
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .in('formation_id', formationIds)

      const sessionIds = (sessions || []).map((s: { id: string }) => s.id).filter(Boolean)
      if (sessionIds.length > 0) {
        const { count } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
        totalEnrollments = count || 0
      }
    }

    const payload: OverviewStats = {
      studentsCount: studentsResult.count || 0,
      monthlyRevenue,
      currency: payments[0]?.currency || 'EUR',
      overdueAmount,
      avgAttendance,
      teachersCount: teachersResult.count || 0,
      activeSessionsCount: activeSessionsResult.count || 0,
      activeFormationsCount: activeFormationsResult.count || 0,
      activeProgramsCount: activeProgramsResult.count || 0,
      totalEnrollments,
      completedSessions: completedSessionsResult.count || 0,
    }

    const res = NextResponse.json(payload)
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=30')
    return res
  } catch (error) {
    logger.error('dashboard overview error', error instanceof Error ? error : new Error(String(error)), {
      error: sanitizeError(error),
    })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
