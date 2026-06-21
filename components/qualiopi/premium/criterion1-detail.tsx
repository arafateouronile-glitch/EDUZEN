'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { GlassCardPremium } from './glass-card-premium'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Users,
  CalendarClock,
  BarChart3,
  Star,
  BookOpen,
} from 'lucide-react'

// ─── Types métadonnées ────────────────────────────────────────────────────────

type Ind1Meta = {
  completeness_pct: number
  filled_count: number
  total_fields: number
  missing_fields: string[]
}

type Ind2Meta = {
  success_rate: number | null
  completion_rate: number | null
  satisfaction_rate: number | null
  sources: {
    success: 'computed' | 'manual' | 'none'
    completion: 'computed' | 'manual' | 'none'
    satisfaction: 'manual' | 'none'
  }
  sessions_analyzed: number
  grades_analyzed: number
}

type Ind3Meta = {
  avg_days: number
  median_days: number
  min_days: number
  max_days: number
  pct_under_10: number
  pct_under_30: number
  total_enrollments: number
  fallback?: boolean
}

type C1EvidenceRow = {
  id: string
  indicator_number: number
  title: string
  description: string | null
  entity_name: string | null
  confidence_score: number | null
  status: string | null
  metadata: unknown
  event_date: string | null
}

// ─── Sous-composant : Indicateur 1 ───────────────────────────────────────────

function Ind1Panel({ evidence }: { evidence: C1EvidenceRow[] }) {
  if (evidence.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 italic py-2">
        <Clock className="h-4 w-4" />
        Aucun programme publié détecté pour l'Indicateur 1.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {evidence.map((ev, i) => {
        const meta = (ev.metadata as Ind1Meta | null) ?? null
        const pct = meta?.completeness_pct ?? (ev.confidence_score ?? 0)
        const missing = meta?.missing_fields ?? []
        const isComplete = pct >= 80

        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className={cn(
              'p-3 rounded-xl border text-sm',
              isComplete
                ? 'border-green-200 bg-green-50/60'
                : 'border-amber-200 bg-amber-50/60'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {isComplete
                  ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                }
                <span className="font-medium text-slate-800 truncate">{ev.entity_name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-xs font-semibold text-slate-600">
                  {meta ? `${meta.filled_count}/${meta.total_fields}` : `${Math.round(pct)}%`}
                </div>
                {/* Barre de complétion */}
                <div className="w-20 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isComplete ? 'bg-green-500' : 'bg-amber-400'
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
            {missing.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {missing.map((f) => (
                  <Badge key={f} variant="outline" className="text-xs border-amber-300 text-amber-700 bg-transparent">
                    {f}
                  </Badge>
                ))}
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Sous-composant : Indicateur 2 ───────────────────────────────────────────

function Ind2Panel({ evidence }: { evidence: C1EvidenceRow[] }) {
  if (evidence.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 italic py-2">
        <Clock className="h-4 w-4" />
        Aucun indicateur de résultats détecté pour l'Indicateur 2.
      </div>
    )
  }

  // Agréger les taux moyens pondérés sur tous les programmes
  let totalSuccess = 0, countSuccess = 0
  let totalSatisfaction = 0, countSatisfaction = 0
  let totalCompletion = 0, countCompletion = 0
  let hasComputed = false
  let totalSessions = 0

  for (const ev of evidence) {
    const meta = ev.metadata as Ind2Meta | null
    if (!meta) continue
    if (meta.success_rate != null)    { totalSuccess += meta.success_rate; countSuccess++ }
    if (meta.satisfaction_rate != null) { totalSatisfaction += meta.satisfaction_rate; countSatisfaction++ }
    if (meta.completion_rate != null) { totalCompletion += meta.completion_rate; countCompletion++ }
    if (meta.sources?.success === 'computed' || meta.sources?.completion === 'computed') hasComputed = true
    totalSessions += meta.sessions_analyzed ?? 0
  }

  const avgSuccess     = countSuccess     > 0 ? Math.round(totalSuccess     / countSuccess)     : null
  const avgSatisf      = countSatisfaction > 0 ? (totalSatisfaction / countSatisfaction).toFixed(1) : null
  const avgCompletion  = countCompletion  > 0 ? Math.round(totalCompletion  / countCompletion)  : null

  const kpis = [
    {
      label: 'Taux de réussite',
      value: avgSuccess != null ? `${avgSuccess}%` : '—',
      icon: TrendingUp,
      color: avgSuccess == null ? 'text-slate-400' : avgSuccess >= 70 ? 'text-green-600' : 'text-amber-600',
      bg:    avgSuccess == null ? 'bg-slate-100' : avgSuccess >= 70 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200',
    },
    {
      label: 'Satisfaction',
      value: avgSatisf != null ? `${avgSatisf}/5` : '—',
      icon: Star,
      color: avgSatisf == null ? 'text-slate-400' : Number(avgSatisf) >= 4 ? 'text-green-600' : 'text-amber-600',
      bg:    avgSatisf == null ? 'bg-slate-100' : Number(avgSatisf) >= 4 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200',
    },
    {
      label: 'Complétion',
      value: avgCompletion != null ? `${avgCompletion}%` : '—',
      icon: Users,
      color: avgCompletion == null ? 'text-slate-400' : avgCompletion >= 80 ? 'text-green-600' : 'text-amber-600',
      bg:    avgCompletion == null ? 'bg-slate-100' : avgCompletion >= 80 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn('p-3 rounded-xl border text-center', kpi.bg)}
          >
            <kpi.icon className={cn('h-4 w-4 mx-auto mb-1', kpi.color)} />
            <div className={cn('text-xl font-bold', kpi.color)}>{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <BarChart3 className="h-3.5 w-3.5" />
        {hasComputed
          ? `Calculé depuis ${totalSessions} session(s) — ${evidence.length} programme(s)`
          : `Taux saisis manuellement — ${evidence.length} programme(s)`
        }
        {hasComputed && (
          <Badge variant="outline" className="ml-auto text-xs border-[#34B9EE] text-[#34B9EE]">
            Calculé
          </Badge>
        )}
      </div>
    </div>
  )
}

// ─── Sous-composant : Indicateur 3 ───────────────────────────────────────────

function Ind3Panel({ evidence }: { evidence: C1EvidenceRow[] }) {
  const orgEntry = evidence.find((e) => {
    const m = e.metadata as Ind3Meta | null
    return m && !m.fallback
  })
  const meta = orgEntry?.metadata as Ind3Meta | null

  if (!meta) {
    const hasFallback = evidence.some((e) => (e.metadata as Ind3Meta | null)?.fallback)
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 italic py-2">
        <Clock className="h-4 w-4" />
        {hasFallback
          ? 'Délai calculé à partir de la durée programme — aucune inscription enregistrée.'
          : 'Aucune donnée de délai disponible pour l\'Indicateur 3.'}
      </div>
    )
  }

  const avgDays = meta.avg_days
  const isGood  = avgDays <= 15
  const isFair  = avgDays <= 30

  const pctOver30 = Math.max(0, 100 - meta.pct_under_30)
  const pctBetween = Math.max(0, meta.pct_under_30 - meta.pct_under_10)

  return (
    <div className="space-y-3">
      {/* Gauge principale */}
      <div className={cn(
        'p-4 rounded-xl border flex items-center gap-4',
        isGood ? 'bg-green-50 border-green-200' : isFair ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
      )}>
        <CalendarClock className={cn(
          'h-8 w-8 shrink-0',
          isGood ? 'text-green-500' : isFair ? 'text-amber-500' : 'text-red-500'
        )} />
        <div>
          <div className={cn(
            'text-2xl font-bold',
            isGood ? 'text-green-700' : isFair ? 'text-amber-700' : 'text-red-700'
          )}>
            {avgDays} j
          </div>
          <div className="text-xs text-slate-500">
            Délai moyen d'accès · médiane {meta.median_days} j · {meta.total_enrollments} inscription(s)
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-sm font-medium text-slate-700">{meta.min_days} – {meta.max_days} j</div>
          <div className="text-xs text-slate-400">min – max</div>
        </div>
      </div>

      {/* Distribution */}
      <div className="space-y-1.5">
        {[
          { label: '< 10 jours', pct: meta.pct_under_10, color: 'bg-green-400' },
          { label: '10 – 30 jours', pct: pctBetween, color: 'bg-amber-400' },
          { label: '> 30 jours', pct: pctOver30, color: 'bg-red-400' },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-xs">
            <span className="w-24 text-slate-600 shrink-0">{row.label}</span>
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', row.color)}
                initial={{ width: 0 }}
                animate={{ width: `${row.pct}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <span className="w-10 text-right font-medium text-slate-700">{row.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function Criterion1Detail() {
  const { user } = useAuth()
  const supabase  = createClient()

  const { data: evidenceList = [], isLoading } = useQuery<C1EvidenceRow[]>({
    queryKey: ['c1-detail-evidence', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data } = await supabase
        .from('compliance_evidence_automated')
        .select('id, indicator_number, title, description, entity_name, confidence_score, status, metadata, event_date')
        .eq('organization_id', user.organization_id)
        .in('indicator_number', [1, 2, 3])
        .order('indicator_number', { ascending: true })
        .order('event_date', { ascending: false })
      return (data ?? []) as C1EvidenceRow[]
    },
    enabled: !!user?.organization_id,
    staleTime: 60 * 1000,
  })

  const ind1 = evidenceList.filter((e) => e.indicator_number === 1)
  const ind2 = evidenceList.filter((e) => e.indicator_number === 2)
  const ind3 = evidenceList.filter((e) => e.indicator_number === 3)

  const sections = [
    {
      number: 1,
      label: 'Information sur les prestations',
      icon: BookOpen,
      count: ind1.length,
      panel: <Ind1Panel evidence={ind1} />,
    },
    {
      number: 2,
      label: 'Indicateurs de résultats',
      icon: TrendingUp,
      count: ind2.length,
      panel: <Ind2Panel evidence={ind2} />,
    },
    {
      number: 3,
      label: 'Délais d\'accès',
      icon: CalendarClock,
      count: ind3.length,
      panel: <Ind3Panel evidence={ind3} />,
    },
  ]

  return (
    <GlassCardPremium variant="cyan-accent" className="p-6 h-full" delay={0.2}>
      <div className="mb-5">
        <Badge className="bg-[#34B9EE] text-white mb-2">Critère 1</Badge>
        <h3 className="font-space-grotesk font-bold text-[#274472]">Information du public</h3>
        <p className="text-xs text-slate-500 mt-1">
          Informations sur les prestations, indicateurs de résultats publiés, délais d'accès
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          Chargement…
        </div>
      ) : (
        <div className="space-y-6 max-h-[480px] overflow-y-auto pr-1">
          {sections.map((section, idx) => (
            <motion.div
              key={section.number}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.12 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#274472] text-white text-xs font-bold shrink-0">
                  {section.number}
                </div>
                <h4 className="text-sm font-semibold text-slate-700">{section.label}</h4>
                {section.count > 0 && (
                  <Badge variant="outline" className="ml-auto text-xs border-slate-300 text-slate-500">
                    {section.count} preuve{section.count > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              {section.panel}
            </motion.div>
          ))}
        </div>
      )}
    </GlassCardPremium>
  )
}
