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
  BookOpen,
  Newspaper,
  Briefcase,
  Cpu,
  Users,
  Info,
  Layers,
  Plus,
} from 'lucide-react'
import { AddEvidenceModal } from './add-evidence-modal'

// ─── Types ────────────────────────────────────────────────────────────────────

type VeilleMeta    = { requires_manual_evidence: boolean }
type Ind28Meta     = { total_programs: number; programs_fully_defined: number; engineering_score: number }

type C6EvidenceRow = {
  id: string
  indicator_number: number
  title: string
  description: string | null
  confidence_score: number | null
  status: string | null
  metadata: unknown
}

// ─── Helper : ligne statut ────────────────────────────────────────────────────

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

// ─── Panels veille (Ind. 23-25) ───────────────────────────────────────────────

function VeillePanel({
  evidence, label, tip, indicatorNumber,
}: {
  evidence: C6EvidenceRow[]
  label: string
  tip: string
  indicatorNumber: number
}) {
  const entry   = evidence[0]
  const meta    = (entry?.metadata as VeilleMeta | null)
  const isValid = entry?.status === 'valid'
  const needsManual = meta?.requires_manual_evidence === true

  return (
    <div className="space-y-1.5">
      <div className={cn(
        'flex items-start gap-2 p-3 rounded-xl border text-sm',
        isValid ? 'bg-green-50/60 border-green-200' : 'bg-amber-50/40 border-amber-200'
      )}>
        {isValid
          ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
          : <Clock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        }
        <div className="flex-1">
          <span className="font-medium text-slate-800">{label}</span>
          {needsManual && (
            <p className="text-xs text-slate-500 mt-0.5">{tip}</p>
          )}
        </div>
        {needsManual && (
          <Badge variant="outline" className="shrink-0 text-xs border-amber-300 text-amber-600">Manuel</Badge>
        )}
      </div>
      {needsManual && (
        <AddEvidenceModal
          defaultIndicatorNumber={indicatorNumber}
          trigger={
            <button className="flex items-center gap-1.5 text-xs text-[#274472] hover:text-[#1a2f4a] font-medium pl-1 transition-colors">
              <Plus className="h-3.5 w-3.5" />
              Ajouter une preuve
            </button>
          }
        />
      )}
    </div>
  )
}

// ─── Ind. 26 — Mobilisation des acteurs ──────────────────────────────────────

function Ind26Panel({ evidence }: { evidence: C6EvidenceRow[] }) {
  const entry   = evidence[0]
  const isValid = entry?.status === 'valid'
  const meta    = (entry?.metadata as VeilleMeta | null)
  const needsManual = meta?.requires_manual_evidence === true

  return (
    <div className="space-y-1.5">
      <StatusRow
        isValid={isValid}
        label={isValid ? 'Partenariats acteurs orientation documentés' : 'Mobilisation acteurs à documenter'}
        detail={needsManual ? "Documentez vos partenariats avec Pôle Emploi, OPCO, Régions… dans les preuves manuelles." : undefined}
        badge={!isValid && <Badge variant="outline" className="shrink-0 text-xs border-amber-300 text-amber-600">Manuel</Badge>}
      />
      {needsManual && (
        <AddEvidenceModal
          defaultIndicatorNumber={26}
          trigger={
            <button className="flex items-center gap-1.5 text-xs text-[#274472] hover:text-[#1a2f4a] font-medium pl-1 transition-colors">
              <Plus className="h-3.5 w-3.5" />
              Ajouter une preuve
            </button>
          }
        />
      )}
    </div>
  )
}

// ─── Ind. 27 — CFA uniquement ────────────────────────────────────────────────

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

// ─── Ind. 28 — Ingénierie de formation ───────────────────────────────────────

function Ind28Panel({ evidence }: { evidence: C6EvidenceRow[] }) {
  const entry = evidence[0]
  const meta  = (entry?.metadata as Ind28Meta | null) ?? null
  const score = meta?.engineering_score ?? 0
  const isValid = entry?.status === 'valid'

  if (!meta || meta.total_programs === 0) {
    return (
      <StatusRow
        isValid={false}
        label="Aucun programme créé"
        detail="Créez des programmes de formation pour documenter votre activité d'ingénierie pédagogique."
      />
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
          score >= 80 ? 'bg-green-500 text-white' : 'bg-amber-400 text-white'
        )}>
          {score}%
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-sm">
            {meta.programs_fully_defined}/{meta.total_programs} programme(s) complet(s)
          </div>
          <div className="text-xs text-slate-500">Objectifs + contenu + modalités définis</div>
        </div>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', score >= 80 ? 'bg-green-500' : 'bg-amber-400')}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7 }}
        />
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function Criterion6Detail() {
  const { user } = useAuth()
  const supabase  = createClient()

  const { data: evidenceList = [], isLoading } = useQuery<C6EvidenceRow[]>({
    queryKey: ['c6-detail-evidence', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data } = await supabase
        .from('compliance_evidence_automated')
        .select('id, indicator_number, title, description, confidence_score, status, metadata')
        .eq('organization_id', user.organization_id)
        .in('indicator_number', [23, 24, 25, 26, 27, 28])
        .order('indicator_number', { ascending: true })
      return (data ?? []) as C6EvidenceRow[]
    },
    enabled: !!user?.organization_id,
    staleTime: 60 * 1000,
  })

  const byIndicator = (n: number) => evidenceList.filter((e) => e.indicator_number === n)

  const sections = [
    {
      number: 23, label: 'Veille légale et réglementaire', icon: Newspaper,
      panel: <VeillePanel evidence={byIndicator(23)} label="Veille légale" tip="Documentez vos sources : bulletins officiels, formations réglementaires, abonnements…" indicatorNumber={23} />,
    },
    {
      number: 24, label: 'Veille métiers et emploi', icon: Briefcase,
      panel: <VeillePanel evidence={byIndicator(24)} label="Veille métiers" tip="Études sectorielles, contacts avec des employeurs, GPEC, référentiels métiers…" indicatorNumber={24} />,
    },
    {
      number: 25, label: 'Veille technologique et pédagogique', icon: Cpu,
      panel: <VeillePanel evidence={byIndicator(25)} label="Veille technologique" tip="Innovations pédagogiques, nouveaux outils, formations de formateurs suivies…" indicatorNumber={25} />,
    },
    {
      number: 26, label: "Mobilisation des acteurs de l'orientation", icon: Users,
      panel: <Ind26Panel evidence={byIndicator(26)} />,
    },
    {
      number: 27, label: 'Réseau CFA', icon: AlertCircle,
      panel: <CfaOnlyPanel indicatorNumber={27} />,
    },
    {
      number: 28, label: 'Ingénierie de formation', icon: Layers,
      panel: <Ind28Panel evidence={byIndicator(28)} />,
    },
  ]

  return (
    <GlassCardPremium variant="cyan-accent" className="p-6 h-full" delay={0.2}>
      <div className="mb-5">
        <Badge className="bg-[#34B9EE] text-white mb-2">Critère 6</Badge>
        <h3 className="font-space-grotesk font-bold text-[#274472]">Inscription dans l'environnement professionnel</h3>
        <p className="text-xs text-slate-500 mt-1">
          Veille, partenariats et ingénierie de formation
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
              transition={{ delay: idx * 0.06 }}
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

          <div className="mt-2 p-3 rounded-xl border border-amber-100 bg-amber-50/40 text-xs text-amber-700">
            <strong>Note :</strong> Les indicateurs 23-26 nécessitent des preuves manuelles (comptes-rendus de veille,
            PV de réunion, conventions de partenariat…). Ajoutez-les dans l'onglet «&nbsp;Preuves manuelles&nbsp;».
          </div>
        </div>
      )}
    </GlassCardPremium>
  )
}
