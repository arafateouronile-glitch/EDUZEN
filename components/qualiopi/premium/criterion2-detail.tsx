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
  Target,
  BookOpen,
  AlignLeft,
  Layers,
  ClipboardCheck,
} from 'lucide-react'

// ─── Types métadonnées ────────────────────────────────────────────────────────

type Ind5Meta = { has_objectives: boolean; objectives_length: number }
type Ind6Meta = {
  has_objectives: boolean
  has_training_content: boolean
  has_modalities: boolean
  has_description: boolean
  content_fields: string[]
}
type Ind7Meta = {
  has_objectives: boolean
  has_training_content: boolean
  has_modalities: boolean
  alignment_score: number
}
type Ind48Meta = {
  sessions_with_pre_form?: number
  sessions_with_positioning?: number
  total_pre_form_evals?: number
  total_positioning_evals?: number
}

type C2EvidenceRow = {
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

// ─── Sous-composant : Ind. 4 — Analyse du besoin ─────────────────────────────

function Ind4Panel({ evidence }: { evidence: C2EvidenceRow[] }) {
  const entry = evidence[0]
  const meta  = (entry?.metadata as Ind48Meta | null) ?? null
  const count = meta?.sessions_with_pre_form ?? meta?.total_pre_form_evals ?? 0
  const isValid = entry?.status === 'valid'

  return (
    <div className={cn(
      'p-3 rounded-xl border text-sm',
      isValid ? 'bg-green-50/60 border-green-200' : 'bg-slate-50 border-slate-200'
    )}>
      <div className="flex items-center gap-2">
        {isValid
          ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          : <Clock className="h-4 w-4 text-slate-400 shrink-0" />
        }
        <span className="font-medium text-slate-800">
          {isValid
            ? `${meta?.sessions_with_pre_form ?? 0} session(s) avec analyse des besoins`
            : 'Aucune évaluation pré-formation enregistrée'}
        </span>
        {isValid && count > 0 && (
          <Badge className="ml-auto bg-green-100 text-green-700 border-green-200 text-xs">
            {meta?.total_pre_form_evals ?? 0} éval.
          </Badge>
        )}
      </div>
      {!isValid && (
        <p className="text-xs text-slate-500 mt-1.5 ml-6">
          Créez des évaluations de type « pré-formation » pour les sessions afin de documenter l'analyse des besoins.
        </p>
      )}
    </div>
  )
}

// ─── Sous-composant : Ind. 5 — Objectifs opérationnels ───────────────────────

function Ind5Panel({ evidence }: { evidence: C2EvidenceRow[] }) {
  if (evidence.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 italic py-1">
        <Clock className="h-4 w-4" />
        Aucun objectif pédagogique renseigné sur les programmes publiés.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {evidence.map((ev, i) => {
        const meta = ev.metadata as Ind5Meta | null
        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-center gap-2 p-2.5 rounded-lg border border-green-200 bg-green-50/50 text-sm"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            <span className="font-medium text-slate-700 truncate flex-1">{ev.entity_name}</span>
            {meta?.objectives_length && (
              <span className="text-xs text-slate-400 shrink-0">{meta.objectives_length} car.</span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Sous-composant : Ind. 6 — Contenu et modalités ─────────────────────────

function Ind6Panel({ evidence }: { evidence: C2EvidenceRow[] }) {
  if (evidence.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 italic py-1">
        <Clock className="h-4 w-4" />
        Aucun contenu renseigné sur les programmes publiés.
      </div>
    )
  }

  // Compteurs agrégés
  let withObj = 0, withContent = 0, withModal = 0

  for (const ev of evidence) {
    const m = ev.metadata as Ind6Meta | null
    if (m?.has_objectives)       withObj++
    if (m?.has_training_content) withContent++
    if (m?.has_modalities)       withModal++
  }

  const total = evidence.length

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Objectifs',  count: withObj,     icon: Target },
          { label: 'Contenu',    count: withContent, icon: AlignLeft },
          { label: 'Modalités',  count: withModal,   icon: Layers },
        ].map(({ label, count, icon: Icon }) => (
          <div key={label} className={cn(
            'p-2 rounded-lg border text-xs',
            count === total ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
          )}>
            <Icon className={cn('h-3.5 w-3.5 mx-auto mb-1', count === total ? 'text-green-500' : 'text-amber-500')} />
            <div className="font-semibold text-slate-700">{count}/{total}</div>
            <div className="text-slate-500">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sous-composant : Ind. 7 — Adéquation contenus/objectifs ────────────────

function Ind7Panel({ evidence }: { evidence: C2EvidenceRow[] }) {
  if (evidence.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400 italic py-1">
        <AlertCircle className="h-4 w-4" />
        Objectifs ET contenu requis pour valider l'adéquation. Renseignez les deux champs sur vos programmes.
      </div>
    )
  }

  const avgScore = Math.round(
    evidence.reduce((sum, ev) => {
      const m = ev.metadata as Ind7Meta | null
      return sum + (m?.alignment_score ?? 100)
    }, 0) / evidence.length
  )

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50/60">
        <div className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black',
          avgScore >= 80 ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'
        )}>
          {avgScore}%
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-sm">Score d'adéquation moyen</div>
          <div className="text-xs text-slate-500">{evidence.length} programme(s) avec objectifs + contenu définis</div>
        </div>
        <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {evidence.slice(0, 4).map((ev, i) => {
          const m = ev.metadata as Ind7Meta | null
          const score = m?.alignment_score ?? 100
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-1.5 p-2 rounded-lg bg-white/80 border border-slate-100 text-xs"
            >
              <div className={cn(
                'h-5 w-5 shrink-0 rounded text-center leading-5 font-bold text-xs',
                score >= 80 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              )}>
                {score}
              </div>
              <span className="truncate text-slate-600">{ev.entity_name}</span>
            </motion.div>
          )
        })}
        {evidence.length > 4 && (
          <div className="p-2 text-xs text-slate-400 italic">+{evidence.length - 4} autres…</div>
        )}
      </div>
    </div>
  )
}

// ─── Sous-composant : Ind. 8 — Positionnement initial ────────────────────────

function Ind8Panel({ evidence }: { evidence: C2EvidenceRow[] }) {
  const entry = evidence[0]
  const meta  = (entry?.metadata as Ind48Meta | null) ?? null
  const isValid = entry?.status === 'valid'

  return (
    <div className={cn(
      'p-3 rounded-xl border text-sm',
      isValid ? 'bg-green-50/60 border-green-200' : 'bg-slate-50 border-slate-200'
    )}>
      <div className="flex items-center gap-2">
        {isValid
          ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          : <Clock className="h-4 w-4 text-slate-400 shrink-0" />
        }
        <span className="font-medium text-slate-800">
          {isValid
            ? `${meta?.sessions_with_positioning ?? 0} session(s) avec positionnement initial`
            : 'Aucune évaluation de positionnement enregistrée'}
        </span>
        {isValid && (
          <Badge className="ml-auto bg-green-100 text-green-700 border-green-200 text-xs">
            {meta?.total_positioning_evals ?? 0} éval.
          </Badge>
        )}
      </div>
      {!isValid && (
        <p className="text-xs text-slate-500 mt-1.5 ml-6">
          Créez des évaluations de type « pré-formation » dans les sessions pour documenter les procédures de positionnement.
        </p>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function Criterion2Detail() {
  const { user } = useAuth()
  const supabase  = createClient()

  const { data: evidenceList = [], isLoading } = useQuery<C2EvidenceRow[]>({
    queryKey: ['c2-detail-evidence', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data } = await supabase
        .from('compliance_evidence_automated')
        .select('id, indicator_number, title, description, entity_name, confidence_score, status, metadata, event_date')
        .eq('organization_id', user.organization_id)
        .in('indicator_number', [4, 5, 6, 7, 8])
        .order('indicator_number', { ascending: true })
        .order('event_date', { ascending: false })
      return (data ?? []) as C2EvidenceRow[]
    },
    enabled: !!user?.organization_id,
    staleTime: 60 * 1000,
  })

  const ind4 = evidenceList.filter((e) => e.indicator_number === 4)
  const ind5 = evidenceList.filter((e) => e.indicator_number === 5)
  const ind6 = evidenceList.filter((e) => e.indicator_number === 6)
  const ind7 = evidenceList.filter((e) => e.indicator_number === 7)
  const ind8 = evidenceList.filter((e) => e.indicator_number === 8)

  const sections = [
    { number: 4, label: "Analyse du besoin",           icon: ClipboardCheck, panel: <Ind4Panel evidence={ind4} />, count: ind4.length },
    { number: 5, label: "Objectifs opérationnels",     icon: Target,         panel: <Ind5Panel evidence={ind5} />, count: ind5.length },
    { number: 6, label: "Contenu et modalités",        icon: AlignLeft,      panel: <Ind6Panel evidence={ind6} />, count: ind6.length },
    { number: 7, label: "Adéquation contenus/objectifs", icon: Layers,       panel: <Ind7Panel evidence={ind7} />, count: ind7.length },
    { number: 8, label: "Positionnement initial",      icon: BookOpen,       panel: <Ind8Panel evidence={ind8} />, count: ind8.length },
  ]

  return (
    <GlassCardPremium variant="cyan-accent" className="p-6 h-full" delay={0.2}>
      <div className="mb-5">
        <Badge className="bg-[#34B9EE] text-white mb-2">Critère 2</Badge>
        <h3 className="font-space-grotesk font-bold text-[#274472]">Identification précise des objectifs</h3>
        <p className="text-xs text-slate-500 mt-1">
          Analyse du besoin, objectifs opérationnels, contenu, adéquation et positionnement initial
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          Chargement…
        </div>
      ) : (
        <div className="space-y-5 max-h-[480px] overflow-y-auto pr-1">
          {sections.map((section, idx) => (
            <motion.div
              key={section.number}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="flex items-center gap-2 mb-2">
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
