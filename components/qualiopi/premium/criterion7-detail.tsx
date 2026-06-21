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
  Clock,
  Star,
  MessageSquare,
  Wrench,
  TrendingUp,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Ind29Meta = { has_satisfaction_data: boolean; programs_with_satisfaction: number; avg_satisfaction: number }
type Ind30Meta = { total_actions: number; completed_actions: number; pending_actions: number }
type Ind31Meta = { completed_actions: number; total_actions: number; completion_rate: number }
type Ind32Meta = { total_actions: number; completed_actions: number; pending_actions: number; completion_rate: number; continuous_improvement: boolean }

type C7EvidenceRow = {
  id: string
  indicator_number: number
  title: string
  description: string | null
  entity_name: string | null
  confidence_score: number | null
  status: string | null
  metadata: unknown
}

// ─── Ind. 29 — Recueil des appréciations ─────────────────────────────────────

function Ind29Panel({ evidence }: { evidence: C7EvidenceRow[] }) {
  const programsWithSat = evidence.filter((e) => e.status === 'valid')
  const total           = evidence.length
  const isValid         = programsWithSat.length > 0

  if (total === 0) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm">
        <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-slate-800">Aucune note de satisfaction publiée</span>
          <p className="text-xs text-slate-500 mt-0.5">
            Renseignez les notes de satisfaction sur vos programmes pour documenter le recueil des appréciations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-xl border',
        isValid ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
      )}>
        <Star className="h-5 w-5 text-amber-400 shrink-0" />
        <div className="flex-1">
          <div className="font-semibold text-slate-800 text-sm">
            {programsWithSat.length}/{total} programme(s) avec satisfaction publiée
          </div>
        </div>
        {isValid && (
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {evidence.slice(0, 6).map((e) => (
          <Badge
            key={e.id}
            className={cn(
              'text-xs',
              e.status === 'valid'
                ? 'bg-green-100 text-green-700 border-green-200'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            )}
          >
            {e.entity_name ?? 'Programme'}
          </Badge>
        ))}
        {evidence.length > 6 && (
          <Badge className="text-xs bg-slate-100 text-slate-500 border-slate-200">
            +{evidence.length - 6}
          </Badge>
        )}
      </div>
    </div>
  )
}

// ─── Ind. 30 — Traitement des réclamations ───────────────────────────────────

function Ind30Panel({ evidence }: { evidence: C7EvidenceRow[] }) {
  const entry   = evidence[0]
  const meta    = (entry?.metadata as Ind30Meta | null) ?? null
  const isValid = entry?.status === 'valid'

  if (!meta || meta.total_actions === 0) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm">
        <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-slate-800">Aucune action corrective enregistrée</span>
          <p className="text-xs text-slate-500 mt-0.5">
            Enregistrez les réclamations et actions correctives dans le module Qualiopi pour documenter leur traitement.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Total',      value: meta.total_actions,     color: 'text-slate-600 bg-slate-100' },
        { label: 'En cours',   value: meta.pending_actions,   color: 'text-amber-600 bg-amber-50'  },
        { label: 'Résolues',   value: meta.completed_actions, color: 'text-green-600 bg-green-50'  },
      ].map(({ label, value, color }) => (
        <div key={label} className={cn('flex flex-col items-center gap-0.5 p-3 rounded-xl border border-slate-200', color.includes('slate') ? 'bg-slate-50' : '')}>
          <span className={cn('text-2xl font-black', color.split(' ')[0])}>{value}</span>
          <span className="text-xs text-slate-500">{label}</span>
        </div>
      ))}
      {isValid && (
        <p className="col-span-3 text-xs text-green-700 bg-green-50 rounded-lg p-2">
          Processus de traitement des réclamations documenté.
        </p>
      )}
    </div>
  )
}

// ─── Ind. 31 — Mesures d'amélioration ────────────────────────────────────────

function Ind31Panel({ evidence }: { evidence: C7EvidenceRow[] }) {
  const entry   = evidence[0]
  const meta    = (entry?.metadata as Ind31Meta | null) ?? null
  const rate    = meta?.completion_rate ?? 0
  const isValid = entry?.status === 'valid'

  if (!meta || meta.total_actions === 0) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm">
        <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-slate-800">Aucune mesure d'amélioration complétée</span>
          <p className="text-xs text-slate-500 mt-0.5">
            Marquez des actions correctives comme réalisées pour documenter vos mesures d'amélioration.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-xl border',
        isValid ? 'bg-green-50 border-green-200' : 'bg-amber-50/60 border-amber-200'
      )}>
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm',
          rate >= 80 ? 'bg-green-500 text-white' : rate >= 50 ? 'bg-amber-400 text-white' : 'bg-red-400 text-white'
        )}>
          {rate}%
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-sm">
            {meta.completed_actions}/{meta.total_actions} action(s) réalisée(s)
          </div>
          <div className="text-xs text-slate-500">Taux de résolution des actions correctives</div>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-amber-400' : 'bg-red-400')}
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </div>
  )
}

// ─── Ind. 32 — Amélioration continue ─────────────────────────────────────────

function Ind32Panel({ evidence }: { evidence: C7EvidenceRow[] }) {
  const entry   = evidence[0]
  const meta    = (entry?.metadata as Ind32Meta | null) ?? null
  const isValid = entry?.status === 'valid'

  if (!meta || meta.total_actions === 0) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm">
        <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-slate-800">Démarche d'amélioration non documentée</span>
          <p className="text-xs text-slate-500 mt-0.5">
            Créez et résolvez des actions correctives pour démontrer votre démarche d'amélioration continue.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-xl border text-sm',
      isValid ? 'bg-green-50/60 border-green-200' : 'bg-amber-50/40 border-amber-200'
    )}>
      <TrendingUp className={cn('h-5 w-5 shrink-0 mt-0.5', isValid ? 'text-green-500' : 'text-amber-400')} />
      <div className="flex-1">
        <span className="font-medium text-slate-800">
          {isValid
            ? `Démarche active — ${meta.completion_rate}% de résolution`
            : 'Démarche en cours de construction'}
        </span>
        <p className="text-xs text-slate-500 mt-0.5">
          {meta.completed_actions} action(s) résolue(s) · {meta.pending_actions} en attente · {meta.total_actions} total
        </p>
        {!isValid && meta.total_actions > 0 && (
          <p className="text-xs text-amber-600 mt-1">
            Complétez au moins une action et atteignez 2+ actions pour valider cet indicateur.
          </p>
        )}
      </div>
      {isValid && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function Criterion7Detail() {
  const { user } = useAuth()
  const supabase  = createClient()

  const { data: evidenceList = [], isLoading } = useQuery<C7EvidenceRow[]>({
    queryKey: ['c7-detail-evidence', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data } = await supabase
        .from('compliance_evidence_automated')
        .select('id, indicator_number, title, description, entity_name, confidence_score, status, metadata')
        .eq('organization_id', user.organization_id)
        .in('indicator_number', [29, 30, 31, 32])
        .order('indicator_number', { ascending: true })
        .order('entity_name', { ascending: true })
      return (data ?? []) as C7EvidenceRow[]
    },
    enabled: !!user?.organization_id,
    staleTime: 60 * 1000,
  })

  const byIndicator = (n: number) => evidenceList.filter((e) => e.indicator_number === n)

  const sections = [
    { number: 29, label: 'Modalités de recueil des appréciations', icon: Star,          panel: <Ind29Panel evidence={byIndicator(29)} /> },
    { number: 30, label: 'Traitement des réclamations',            icon: MessageSquare, panel: <Ind30Panel evidence={byIndicator(30)} /> },
    { number: 31, label: "Mesures d'amélioration",                 icon: Wrench,        panel: <Ind31Panel evidence={byIndicator(31)} /> },
    { number: 32, label: 'Amélioration continue',                  icon: TrendingUp,    panel: <Ind32Panel evidence={byIndicator(32)} /> },
  ]

  return (
    <GlassCardPremium variant="cyan-accent" className="p-6 h-full" delay={0.2}>
      <div className="mb-5">
        <Badge className="bg-[#34B9EE] text-white mb-2">Critère 7</Badge>
        <h3 className="font-space-grotesk font-bold text-[#274472]">Recueil et prise en compte des appréciations</h3>
        <p className="text-xs text-slate-500 mt-1">
          Satisfaction, réclamations et démarche d'amélioration continue
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Chargement…</div>
      ) : (
        <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
          {sections.map((section, idx) => (
            <motion.div
              key={section.number}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#274472] text-white text-xs font-bold shrink-0">
                  {section.number}
                </div>
                <h4 className="text-sm font-semibold text-slate-700">{section.label}</h4>
              </div>
              {section.panel}
            </motion.div>
          ))}
        </div>
      )}
    </GlassCardPremium>
  )
}
