'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Euro,
  GraduationCap,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Users,
  ArrowLeft,
  Download,
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subQuarters, subYears } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionTeacherRow = {
  id: string
  daily_rate: number | null
  intervention_days: number | null
  total_hours: number | null
  role: string | null
  teacher_id: string | null
  session: {
    id: string
    name: string | null
    start_date: string | null
    end_date: string | null
  } | null
  teacher: {
    id: string
    user: { full_name: string | null; email: string } | null
    specialization: string | null
  } | null
}

type TeacherSummary = {
  teacherId: string
  name: string
  email: string
  specialization: string | null
  missions: {
    sessionId: string
    sessionName: string
    startDate: string | null
    endDate: string | null
    days: number
    dailyRate: number
    total: number
    role: string | null
  }[]
  totalDays: number
  totalAmount: number
}

// ─── Période ──────────────────────────────────────────────────────────────────

type PeriodKey = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'all'

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: 'this_month',    label: 'Ce mois-ci' },
  { value: 'last_month',    label: 'Mois dernier' },
  { value: 'this_quarter',  label: 'Ce trimestre' },
  { value: 'last_quarter',  label: 'Trimestre dernier' },
  { value: 'this_year',     label: 'Cette année' },
  { value: 'last_year',     label: 'Année dernière' },
  { value: 'all',           label: 'Tout afficher' },
]

function getPeriodBounds(key: PeriodKey): { from: Date | null; to: Date | null } {
  const now = new Date()
  switch (key) {
    case 'this_month':   return { from: startOfMonth(now),              to: endOfMonth(now) }
    case 'last_month':   return { from: startOfMonth(subMonths(now,1)), to: endOfMonth(subMonths(now,1)) }
    case 'this_quarter': return { from: startOfQuarter(now),            to: endOfQuarter(now) }
    case 'last_quarter': return { from: startOfQuarter(subQuarters(now,1)), to: endOfQuarter(subQuarters(now,1)) }
    case 'this_year':    return { from: startOfYear(now),               to: endOfYear(now) }
    case 'last_year':    return { from: startOfYear(subYears(now,1)),   to: endOfYear(subYears(now,1)) }
    case 'all':          return { from: null, to: null }
  }
}

// ─── Ligne formateur expandable ───────────────────────────────────────────────

function TeacherRow({ summary, index }: { summary: TeacherSummary; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <TableCell>
          <div className="flex items-center gap-2">
            {open
              ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            }
            <div>
              <div className="font-medium text-slate-800">{summary.name}</div>
              <div className="text-xs text-slate-400">{summary.email}</div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          {summary.specialization
            ? <Badge variant="outline" className="text-xs">{summary.specialization}</Badge>
            : <span className="text-slate-400 text-xs">—</span>
          }
        </TableCell>
        <TableCell className="text-center">
          <Badge variant="outline" className="bg-slate-50 text-slate-600">
            {summary.missions.length} mission{summary.missions.length > 1 ? 's' : ''}
          </Badge>
        </TableCell>
        <TableCell className="text-center font-medium text-slate-700">
          {summary.totalDays} j
        </TableCell>
        <TableCell className="text-right font-bold text-slate-900">
          {formatCurrency(summary.totalAmount)}
        </TableCell>
      </TableRow>

      <AnimatePresence>
        {open && (
          <TableRow key={`detail-${summary.teacherId}`}>
            <TableCell colSpan={5} className="p-0 border-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden bg-slate-50/60"
              >
                <div className="px-8 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-200">
                        <th className="text-left pb-2 font-medium">Session</th>
                        <th className="text-left pb-2 font-medium">Dates</th>
                        <th className="text-center pb-2 font-medium">Jours</th>
                        <th className="text-right pb-2 font-medium">Tarif/j</th>
                        <th className="text-right pb-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.missions.map((m) => (
                        <tr key={m.sessionId} className="border-b border-slate-100 last:border-0">
                          <td className="py-2">
                            <Link
                              href={`/dashboard/sessions/${m.sessionId}`}
                              className="font-medium text-[#274472] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {m.sessionName}
                            </Link>
                            {m.role && (
                              <span className="ml-2 text-xs text-slate-400">({m.role})</span>
                            )}
                          </td>
                          <td className="py-2 text-slate-500 text-xs">
                            {m.startDate
                              ? format(new Date(m.startDate), 'd MMM yyyy', { locale: fr })
                              : '—'
                            }
                            {m.endDate && m.endDate !== m.startDate && (
                              <> → {format(new Date(m.endDate), 'd MMM yyyy', { locale: fr })}</>
                            )}
                          </td>
                          <td className="py-2 text-center text-slate-700">{m.days} j</td>
                          <td className="py-2 text-right text-slate-600">{formatCurrency(m.dailyRate)}</td>
                          <td className="py-2 text-right font-semibold text-slate-800">{formatCurrency(m.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </TableCell>
          </TableRow>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function RemunerationPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [period, setPeriod] = useState<PeriodKey>('this_month')

  const { from, to } = getPeriodBounds(period)

  // Fetch session_teachers avec session + teacher + user
  const { data: rows = [], isLoading } = useQuery<SessionTeacherRow[]>({
    queryKey: ['teacher-remuneration', user?.organization_id, period],
    queryFn: async () => {
      if (!user?.organization_id) return []

      // Étape 1 : sessions de l'org dans la période
      let sessionQuery = supabase
        .from('sessions')
        .select('id, name, start_date, end_date')
        .eq('organization_id', user.organization_id)
      if (from) sessionQuery = sessionQuery.gte('start_date', from.toISOString())
      if (to)   sessionQuery = sessionQuery.lte('start_date', to.toISOString())
      const { data: sessions, error: sessErr } = await sessionQuery
      if (sessErr) throw sessErr
      if (!sessions || sessions.length === 0) return []

      const sessionIds = sessions.map((s) => s.id)

      // Étape 2 : session_teachers pour ces sessions avec tarif renseigné
      const { data: stRows, error: stErr } = await supabase
        .from('session_teachers')
        .select('id, daily_rate, intervention_days, total_hours, role, teacher_id, session_id')
        .in('session_id', sessionIds)
        .not('daily_rate', 'is', null)
        .not('intervention_days', 'is', null)
      if (stErr) throw stErr

      // Étape 3 : formateurs + user_id
      const teacherIds = [...new Set((stRows ?? []).map((r) => r.teacher_id).filter(Boolean))] as string[]
      if (teacherIds.length === 0) return []

      const { data: teacherRows, error: tErr } = await supabase
        .from('teachers')
        .select('id, specialization, user_id')
        .in('id', teacherIds)
      if (tErr) throw tErr

      // Étape 4 : utilisateurs correspondants
      const userIds = [...new Set((teacherRows ?? []).map((t) => t.user_id).filter(Boolean))] as string[]
      const { data: userRows } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds)
      const userMap = new Map((userRows ?? []).map((u) => [u.id, u]))

      // Assembler
      const sessionMap  = new Map(sessions.map((s) => [s.id, s]))
      const teacherMap  = new Map((teacherRows ?? []).map((t) => [t.id, { ...t, user: t.user_id ? userMap.get(t.user_id) ?? null : null }]))

      return ((stRows ?? []) as { id: string; daily_rate: number | null; intervention_days: number | null; total_hours: number | null; role: string | null; teacher_id: string | null; session_id: string | null }[])
        .map((r): SessionTeacherRow => ({
          id:               r.id,
          daily_rate:       r.daily_rate,
          intervention_days: r.intervention_days,
          total_hours:      r.total_hours,
          role:             r.role,
          teacher_id:       r.teacher_id,
          session:          r.session_id ? sessionMap.get(r.session_id) ?? null : null,
          teacher:          r.teacher_id ? (teacherMap.get(r.teacher_id) as unknown as SessionTeacherRow['teacher']) ?? null : null,
        }))
        .filter((r) => r.session != null && r.teacher != null)
    },
    enabled: !!user?.organization_id,
    staleTime: 60 * 1000,
  })

  // Regrouper par formateur
  const summaries = useMemo((): TeacherSummary[] => {
    const map = new Map<string, TeacherSummary>()

    for (const row of rows) {
      if (!row.teacher_id || !row.teacher || !row.session) continue
      const days      = row.intervention_days ?? 0
      const dailyRate = row.daily_rate ?? 0
      const total     = days * dailyRate
      const name      = row.teacher.user?.full_name ?? row.teacher.user?.email ?? 'Formateur'
      const email     = row.teacher.user?.email ?? ''

      if (!map.has(row.teacher_id)) {
        map.set(row.teacher_id, {
          teacherId: row.teacher_id,
          name,
          email,
          specialization: row.teacher.specialization,
          missions: [],
          totalDays: 0,
          totalAmount: 0,
        })
      }
      const summary = map.get(row.teacher_id)!
      summary.missions.push({
        sessionId:   row.session.id,
        sessionName: row.session.name ?? 'Session',
        startDate:   row.session.start_date,
        endDate:     row.session.end_date,
        days,
        dailyRate,
        total,
        role: row.role,
      })
      summary.totalDays   += days
      summary.totalAmount += total
    }

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount)
  }, [rows])

  const totalOrg       = summaries.reduce((s, t) => s + t.totalAmount, 0)
  const totalDaysOrg   = summaries.reduce((s, t) => s + t.totalDays, 0)
  const totalMissions  = summaries.reduce((s, t) => s + t.missions.length, 0)

  // Export CSV simple
  const handleExportCsv = () => {
    const header = 'Formateur,Email,Spécialité,Sessions,Jours,Total (€)\n'
    const lines  = summaries
      .map((s) => `"${s.name}","${s.email}","${s.specialization ?? ''}",${s.missions.length},${s.totalDays},${s.totalAmount.toFixed(2)}`)
      .join('\n')
    const blob = new Blob(['﻿' + header + lines], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `remuneration-formateurs-${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? ''

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/settings/teachers">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Formateurs
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-space-grotesk">
            Récapitulatif rémunération
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Missions et coûts formateurs par période
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={summaries.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total rémunérations', value: formatCurrency(totalOrg), icon: Euro, color: 'text-[#274472] bg-[#274472]/8' },
          { label: 'Jours d\'intervention', value: `${totalDaysOrg} j`, icon: CalendarDays, color: 'text-[#34B9EE] bg-[#34B9EE]/10' },
          { label: 'Missions', value: `${totalMissions}`, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', kpi.color)}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-900">{kpi.value}</div>
                  <div className="text-xs text-slate-500">{kpi.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-[#274472]" />
            Formateurs — {periodLabel}
            {summaries.length > 0 && (
              <Badge variant="outline" className="ml-auto font-normal text-slate-500">
                {summaries.length} formateur{summaries.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              Chargement…
            </div>
          ) : summaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center px-6">
              <GraduationCap className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                Aucune mission avec tarif journalier pour cette période.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Assignez des formateurs aux sessions et renseignez leur tarif journalier.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-semibold text-slate-700">Formateur</TableHead>
                  <TableHead className="font-semibold text-slate-700">Spécialité</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">Missions</TableHead>
                  <TableHead className="text-center font-semibold text-slate-700">Jours</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Total dû</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((s, i) => (
                  <TeacherRow key={s.teacherId} summary={s} index={i} />
                ))}
              </TableBody>
            </Table>
          )}

          {/* Total footer */}
          {summaries.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 rounded-b-lg">
              <span className="text-sm font-medium text-slate-600">
                Total — {summaries.length} formateur{summaries.length > 1 ? 's' : ''}
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatCurrency(totalOrg)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
