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
  AlertCircle,
  Users,
  FileText,
  BookOpen,
  Accessibility,
  Info,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Ind17Meta = { active_teachers: number; teacher_docs_count: number; total_sessions: number }
type Ind19Meta = { programs_with_content: number; total_programs: number; content_ratio: number }
type Ind20Meta = { has_accessibility_config: boolean }
type CfaOnlyMeta = { cfa_only: boolean }

type C4EvidenceRow = {
  id: string
  indicator_number: number
  title: string
  description: string | null
  entity_name: string | null
  confidence_score: number | null
  status: string | null
  metadata: unknown
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StatusRow({
  isValid, label, detail, badge,
}: {
  isValid: boolean
  label: string
  detail?: string
  badge?: React.ReactNode
}) {
  return (
    <div className={cn(
      'flex items-start gap-2 p-3 rounded-xl border text-sm',
      isValid ? 'bg-green-50/60 border-green-200' : 'bg-slate-50 border-slate-200'
    )}>
      {isValid
        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
        : <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
      }
      <div className="flex-1 min-w-0">
        <span className="font-medium text-slate-800">{label}</span>
        {detail && <p className="text-xs text-slate-500 mt-0.5">{detail}</p>}
      </div>
      {badge}
    </div>
  )
}

// ─── Ind. 17 — Moyens humains et techniques ──────────────────────────────────

function Ind17Panel({ evidence }: { evidence: C4EvidenceRow[] }) {
  const entry = evidence[0]
  const meta  = (entry?.metadata as Ind17Meta | null) ?? null
  const isValid = entry?.status === 'valid'

  if (!meta) {
    return <StatusRow isValid={false} label="Aucune donnée disponible" detail="Synchronisez les preuves pour calculer les moyens pédagogiques." />
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Formateurs', value: meta.active_teachers, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
        { label: 'Documents',  value: meta.teacher_docs_count, icon: FileText, color: 'text-blue-600 bg-blue-50' },
        { label: 'Sessions',   value: meta.total_sessions,  icon: BookOpen, color: 'text-violet-600 bg-violet-50' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="flex flex-col items-center gap-1 p-3 rounded-xl border border-slate-200 bg-white">
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', color)}>
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-xl font-black text-slate-800">{value}</span>
          <span className="text-xs text-slate-500">{label}</span>
        </div>
      ))}
      {!isValid && (
        <p className="col-span-3 text-xs text-amber-600 bg-amber-50 rounded-lg p-2 mt-1">
          Ajoutez des formateurs et leurs documents pour valider cet indicateur.
        </p>
      )}
    </div>
  )
}

// ─── Ind. 18 — CFA uniquement ────────────────────────────────────────────────

function CfaOnlyPanel({ indicatorNumber }: { indicatorNumber: number }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm">
      <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-medium text-slate-600">Indicateur CFA uniquement</span>
        <p className="text-xs text-slate-400 mt-0.5">
          L'indicateur {indicatorNumber} est spécifique aux Centres de Formation d'Apprentis.
        </p>
      </div>
      <Badge variant="outline" className="ml-auto shrink-0 text-xs border-slate-300 text-slate-400">N/A</Badge>
    </div>
  )
}

// ─── Ind. 19 — Ressources pédagogiques ───────────────────────────────────────

function Ind19Panel({ evidence }: { evidence: C4EvidenceRow[] }) {
  const entry = evidence[0]
  const meta  = (entry?.metadata as Ind19Meta | null) ?? null
  const isValid = entry?.status === 'valid'

  if (!meta) {
    return <StatusRow isValid={false} label="Aucune donnée disponible" />
  }

  const ratio = meta.content_ratio ?? 0

  return (
    <div className="space-y-2">
      <div className={cn(
        'flex items-center gap-3 p-3 rounded-xl border',
        isValid ? 'bg-green-50 border-green-200' : 'bg-amber-50/60 border-amber-200'
      )}>
        <div className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm',
          ratio >= 80 ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'
        )}>
          {ratio}%
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-sm">
            {meta.programs_with_content}/{meta.total_programs} programme(s) documenté(s)
          </div>
          <div className="text-xs text-slate-500">Objectifs pédagogiques et/ou contenu de formation</div>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', ratio >= 80 ? 'bg-green-500' : 'bg-amber-400')}
          initial={{ width: 0 }}
          animate={{ width: `${ratio}%` }}
          transition={{ duration: 0.7 }}
        />
      </div>
    </div>
  )
}

// ─── Ind. 20 — Personnel dédié handicap ──────────────────────────────────────

function Ind20Panel({ evidence }: { evidence: C4EvidenceRow[] }) {
  const entry   = evidence[0]
  const meta    = (entry?.metadata as Ind20Meta | null) ?? null
  const isValid = meta?.has_accessibility_config === true

  return (
    <StatusRow
      isValid={isValid}
      label={isValid ? 'Référent handicap désigné' : 'Référent handicap non configuré'}
      detail={!isValid ? "Configurez un référent handicap dans les paramètres d'accessibilité." : undefined}
      badge={isValid && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
    />
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function Criterion4Detail() {
  const { user } = useAuth()
  const supabase  = createClient()

  const { data: evidenceList = [], isLoading } = useQuery<C4EvidenceRow[]>({
    queryKey: ['c4-detail-evidence', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data } = await supabase
        .from('compliance_evidence_automated')
        .select('id, indicator_number, title, description, entity_name, confidence_score, status, metadata')
        .eq('organization_id', user.organization_id)
        .in('indicator_number', [17, 18, 19, 20])
        .order('indicator_number', { ascending: true })
      return (data ?? []) as C4EvidenceRow[]
    },
    enabled: !!user?.organization_id,
    staleTime: 60 * 1000,
  })

  const byIndicator = (n: number) => evidenceList.filter((e) => e.indicator_number === n)

  const sections = [
    { number: 17, label: 'Moyens humains et techniques',   icon: Users,          panel: <Ind17Panel evidence={byIndicator(17)} /> },
    { number: 18, label: 'Coordination alternants',        icon: AlertCircle,    panel: <CfaOnlyPanel indicatorNumber={18} />     },
    { number: 19, label: 'Ressources pédagogiques',        icon: BookOpen,       panel: <Ind19Panel evidence={byIndicator(19)} /> },
    { number: 20, label: 'Personnel dédié handicap',       icon: Accessibility,  panel: <Ind20Panel evidence={byIndicator(20)} /> },
  ]

  return (
    <GlassCardPremium variant="cyan-accent" className="p-6 h-full" delay={0.2}>
      <div className="mb-5">
        <Badge className="bg-[#34B9EE] text-white mb-2">Critère 4</Badge>
        <h3 className="font-space-grotesk font-bold text-[#274472]">Adéquation des moyens pédagogiques</h3>
        <p className="text-xs text-slate-500 mt-1">
          Formateurs, ressources, accessibilité handicap
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
              transition={{ delay: idx * 0.07 }}
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
