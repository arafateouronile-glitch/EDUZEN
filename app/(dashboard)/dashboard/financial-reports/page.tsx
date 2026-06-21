'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  DollarSign,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertCircle,
  Users,
  CreditCard,
  ChevronDown,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import dynamic from 'next/dynamic'

const PremiumBarChart = dynamic(
  () => import('@/components/charts/premium-bar-chart').then((m) => m.PremiumBarChart),
  { ssr: false, loading: () => <div className="h-[260px] animate-pulse bg-slate-100 rounded-xl" /> }
)

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnrollmentRow {
  id: string
  total_amount: number
  paid_amount: number | null
  payment_status: string | null
  enrollment_date: string | null
  session_id: string | null
  sessions: { name: string; start_date: string } | null
}

interface PaymentRow {
  id: string
  amount: number
  paid_at: string | null
  status: string | null
  payment_method: string
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - i))

// ── Helpers ───────────────────────────────────────────────────────────────────

function pctColor(pct: number) {
  if (pct >= 100) return 'text-emerald-700 border-emerald-200 bg-emerald-50'
  if (pct >= 50)  return 'text-amber-700 border-amber-200 bg-amber-50'
  return 'text-red-700 border-red-200 bg-red-50'
}

function methodLabel(method: string) {
  const map: Record<string, string> = {
    card: 'Carte bancaire',
    bank_transfer: 'Virement',
    check: 'Chèque',
    cash: 'Espèces',
    opco: 'OPCO',
    cpf: 'CPF',
    other: 'Autre',
  }
  return map[method] ?? method
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancialReportsPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const [year, setYear] = useState(String(CURRENT_YEAR))
  const [expandedSessions, setExpandedSessions] = useState(false)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['financial-reports', user?.organization_id, year],
    queryFn: async () => {
      if (!user?.organization_id) return null

      // Inscriptions de l'année avec info session
      const { data: enrollments, error: eErr } = await supabase
        .from('enrollments')
        .select(
          'id, total_amount, paid_amount, payment_status, enrollment_date, session_id, sessions!inner(name, start_date, organization_id)'
        )
        .eq('sessions.organization_id', user.organization_id)
        .gte('enrollment_date', `${year}-01-01`)
        .lte('enrollment_date', `${year}-12-31`)

      if (eErr) throw eErr

      // Paiements encaissés de l'année
      const { data: payments, error: pErr } = await supabase
        .from('payments')
        .select('id, amount, paid_at, status, payment_method')
        .eq('organization_id', user.organization_id)
        .gte('paid_at', `${year}-01-01`)
        .lte('paid_at', `${year}-12-31`)

      if (pErr) throw pErr

      return {
        enrollments: (enrollments ?? []) as EnrollmentRow[],
        payments: (payments ?? []) as PaymentRow[],
      }
    },
    enabled: !!user?.organization_id,
  })

  // ── KPIs ─────────────────────────────────────────────────────────────────────

  const enrollments = data?.enrollments ?? []
  const payments    = data?.payments ?? []

  const completedPayments = payments.filter(p => p.status === 'completed')

  const totalExpected   = enrollments.reduce((s, e) => s + (e.total_amount ?? 0), 0)
  const totalCollected  = completedPayments.reduce((s, p) => s + p.amount, 0)
  const totalOutstanding = enrollments.reduce(
    (s, e) => s + Math.max(0, (e.total_amount ?? 0) - (e.paid_amount ?? 0)),
    0
  )
  const enrollmentCount = enrollments.length
  const collectionRate  = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0

  // ── Données graphique mensuel ─────────────────────────────────────────────

  const monthlyChart = MONTHS_SHORT.map((month, i) => {
    const expected = enrollments
      .filter(e => e.enrollment_date && new Date(e.enrollment_date).getMonth() === i)
      .reduce((s, e) => s + (e.total_amount ?? 0), 0)
    const received = completedPayments
      .filter(p => p.paid_at && new Date(p.paid_at).getMonth() === i)
      .reduce((s, p) => s + p.amount, 0)
    return { month, 'CA attendu': expected, 'Encaissé': received }
  })

  // ── Sessions ──────────────────────────────────────────────────────────────

  const sessionMap = new Map<string, { name: string; start_date: string; count: number; expected: number; paid: number }>()
  for (const e of enrollments) {
    if (!e.session_id || !e.sessions) continue
    if (!sessionMap.has(e.session_id)) {
      sessionMap.set(e.session_id, {
        name:       e.sessions.name,
        start_date: e.sessions.start_date,
        count:      0,
        expected:   0,
        paid:       0,
      })
    }
    const row = sessionMap.get(e.session_id)!
    row.count++
    row.expected += e.total_amount ?? 0
    row.paid     += e.paid_amount  ?? 0
  }

  const sessionRows = Array.from(sessionMap.entries()).sort((a, b) => b[1].expected - a[1].expected)
  const visibleSessions = expandedSessions ? sessionRows : sessionRows.slice(0, 8)

  // ── Modes de paiement ────────────────────────────────────────────────────

  const methodMap = new Map<string, number>()
  for (const p of completedPayments) {
    methodMap.set(p.payment_method, (methodMap.get(p.payment_method) ?? 0) + p.amount)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-brand-blue" />
            Rapports financiers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Revenus et paiements — {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map(y => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-blue" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">CA attendu</p>
                    <p className="text-xl font-bold mt-1 text-blue-600 truncate">{formatCurrency(totalExpected)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{enrollmentCount} inscription{enrollmentCount > 1 ? 's' : ''}</p>
                  </div>
                  <div className="h-9 w-9 shrink-0 bg-blue-50 rounded-lg flex items-center justify-center ml-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Encaissé</p>
                    <p className="text-xl font-bold mt-1 text-emerald-600 truncate">{formatCurrency(totalCollected)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{collectionRate}% collecté</p>
                  </div>
                  <div className="h-9 w-9 shrink-0 bg-emerald-50 rounded-lg flex items-center justify-center ml-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Solde restant dû</p>
                    <p className={`text-xl font-bold mt-1 truncate ${totalOutstanding > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {formatCurrency(totalOutstanding)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">non encore encaissé</p>
                  </div>
                  <div className="h-9 w-9 shrink-0 bg-amber-50 rounded-lg flex items-center justify-center ml-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Inscriptions</p>
                    <p className="text-xl font-bold mt-1 text-slate-700">{enrollmentCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">sur {year}</p>
                  </div>
                  <div className="h-9 w-9 shrink-0 bg-slate-50 rounded-lg flex items-center justify-center ml-2">
                    <Users className="h-5 w-5 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Graphique mensuel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Évolution mensuelle {year}</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                  Aucune donnée pour {year}
                </div>
              ) : (
                <PremiumBarChart
                  data={monthlyChart}
                  dataKey="Encaissé"
                  xAxisKey="month"
                  color="#10b981"
                />
              )}
            </CardContent>
          </Card>

          {/* Table sessions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Revenus par session</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionRows.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Aucune session avec inscriptions sur cette période</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left pb-2 font-medium pr-4">Session</th>
                          <th className="text-right pb-2 font-medium px-2">Inscrits</th>
                          <th className="text-right pb-2 font-medium px-2">CA attendu</th>
                          <th className="text-right pb-2 font-medium px-2">CA encaissé</th>
                          <th className="text-right pb-2 font-medium pl-2">Taux</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleSessions.map(([id, s]) => {
                          const pct = s.expected > 0 ? Math.round((s.paid / s.expected) * 100) : 0
                          return (
                            <tr key={id} className="border-b last:border-0 hover:bg-slate-50/60 transition-colors">
                              <td className="py-2.5 pr-4">
                                <p className="font-medium leading-snug">{s.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(s.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </td>
                              <td className="text-right py-2.5 px-2">{s.count}</td>
                              <td className="text-right py-2.5 px-2 tabular-nums">{formatCurrency(s.expected)}</td>
                              <td className="text-right py-2.5 px-2 tabular-nums text-emerald-600">{formatCurrency(s.paid)}</td>
                              <td className="text-right py-2.5 pl-2">
                                <Badge variant="outline" className={`text-xs ${pctColor(pct)}`}>
                                  {pct}%
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {sessionRows.length > 8 && (
                    <div className="mt-3 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedSessions(!expandedSessions)}
                        className="text-muted-foreground"
                      >
                        <ChevronDown className={`h-4 w-4 mr-1.5 transition-transform ${expandedSessions ? 'rotate-180' : ''}`} />
                        {expandedSessions ? 'Voir moins' : `Voir ${sessionRows.length - 8} sessions de plus`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Modes de paiement */}
          {methodMap.size > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Répartition par mode de paiement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {Array.from(methodMap.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([method, total]) => {
                      const pct = totalCollected > 0 ? Math.round((total / totalCollected) * 100) : 0
                      return (
                        <div key={method} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                          <div>
                            <p className="text-sm font-medium">{methodLabel(method)}</p>
                            <p className="text-xs text-muted-foreground">{pct}% du total encaissé</p>
                          </div>
                          <p className="text-sm font-semibold text-emerald-600 ml-2">{formatCurrency(total)}</p>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* État vide global */}
          {enrollments.length === 0 && payments.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                <p className="text-muted-foreground font-medium">Aucune donnée financière pour {year}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Les inscriptions et paiements de cet exercice apparaîtront ici.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
