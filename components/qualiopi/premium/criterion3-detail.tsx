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
  Mail,
  FileSignature,
  Star,
  Users,
  GraduationCap,
  Accessibility,
  Info,
} from 'lucide-react'

// ─── Types métadonnées ────────────────────────────────────────────────────────

type Ind9Meta  = { total_convocations: number; document_type: string }
type Ind10Meta = { total_signed?: number; document_type?: string; total_convocations?: number }
type Ind11Meta = { sessions_with_hot_eval: number; total_hot_evals: number }
type Ind12Meta = { total_pointages: number; present_count: number; engagement_rate: number }
type Ind13Meta = { sessions_with_teacher: number; convention_formateur: number }
type Ind16Meta = { has_accessibility_config: boolean }
type CfaOnlyMeta = { cfa_only: boolean }

type C3EvidenceRow = {
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

// ─── Ind. 9 — Conditions de déroulement (convocations) ───────────────────────

function Ind9Panel({ evidence }: { evidence: C3EvidenceRow[] }) {
  const meta  = (evidence[0]?.metadata as Ind9Meta | null) ?? null
  const count = meta?.total_convocations ?? evidence.length
  const isValid = evidence.length > 0

  return (
    <StatusRow
      isValid={isValid}
      label={isValid ? `${count} convocation(s) envoyée(s)` : 'Aucune convocation enregistrée'}
      detail={!isValid ? 'Créez des convocations dans les sessions pour documenter les conditions de déroulement.' : undefined}
      badge={isValid && (
        <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 text-xs">{count}</Badge>
      )}
    />
  )
}

// ─── Ind. 10 — Adaptation et suivi (conventions + convocations) ──────────────

function Ind10Panel({ evidence }: { evidence: C3EvidenceRow[] }) {
  const conventions  = evidence.filter((e) => (e.metadata as Ind10Meta | null)?.document_type === 'convention')
  const convocations = evidence.filter((e) => (e.metadata as Ind10Meta | null)?.document_type === 'convocation')
  const total        = evidence.length
  const isValid      = total > 0

  return (
    <div className="space-y-1.5">
      <StatusRow
        isValid={conventions.length > 0}
        label={conventions.length > 0 ? `${conventions.length} convention(s) signée(s)` : 'Aucune convention signée'}
        badge={conventions.length > 0 && (
          <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 text-xs">{conventions.length}</Badge>
        )}
      />
      <StatusRow
        isValid={convocations.length > 0}
        label={convocations.length > 0 ? `${convocations.length} convocation(s) liées` : 'Aucune convocation liée'}
        badge={convocations.length > 0 && (
          <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 text-xs">{convocations.length}</Badge>
        )}
      />
      {!isValid && (
        <p className="text-xs text-slate-400 italic pl-1">
          Signez des conventions et envoyez des convocations pour documenter l'adaptation/suivi.
        </p>
      )}
    </div>
  )
}

// ─── Ind. 11 — Évaluation de l'atteinte des objectifs ────────────────────────

function Ind11Panel({ evidence }: { evidence: C3EvidenceRow[] }) {
  const entry = evidence[0]
  const meta  = (entry?.metadata as Ind11Meta | null) ?? null
  const isValid = entry?.status === 'valid'

  return (
    <StatusRow
      isValid={isValid}
      label={isValid
        ? `${meta?.sessions_with_hot_eval ?? 0} session(s) avec évaluation à chaud`
        : 'Aucune évaluation à chaud enregistrée'}
      detail={!isValid
        ? "Créez des évaluations de type « à chaud » pour mesurer l'atteinte des objectifs."
        : `${meta?.total_hot_evals ?? 0} évaluation(s) réalisée(s)`}
      badge={isValid && meta && (
        <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 text-xs">
          {meta.total_hot_evals} éval.
        </Badge>
      )}
    />
  )
}

// ─── Ind. 12 — Engagement des bénéficiaires ──────────────────────────────────

function Ind12Panel({ evidence }: { evidence: C3EvidenceRow[] }) {
  const entry = evidence[0]
  const meta  = (entry?.metadata as Ind12Meta | null) ?? null
  const rate  = meta?.engagement_rate ?? 0
  const isValid = entry?.status === 'valid'

  if (!meta || meta.total_pointages === 0) {
    return (
      <StatusRow
        isValid={false}
        label="Aucun émargement enregistré"
        detail="Saisissez les présences dans les sessions pour mesurer l'engagement des bénéficiaires."
      />
    )
  }

  return (
    <div className="space-y-2">
      <div className={cn(
        'p-3 rounded-xl border flex items-center gap-4',
        isValid ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
      )}>
        <div className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-black',
          rate >= 80 ? 'bg-green-500 text-white' : rate >= 60 ? 'bg-amber-400 text-white' : 'bg-red-400 text-white'
        )}>
          {rate}%
        </div>
        <div>
          <div className="font-semibold text-slate-800 text-sm">Taux de présence</div>
          <div className="text-xs text-slate-500">
            {meta.present_count} présence(s) / {meta.total_pointages} pointage(s)
          </div>
        </div>
        {rate >= 70 && <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />}
      </div>
      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            rate >= 80 ? 'bg-green-500' : rate >= 60 ? 'bg-amber-400' : 'bg-red-400'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${rate}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </div>
  )
}

// ─── Ind. 13 — Coordination des intervenants ─────────────────────────────────

function Ind13Panel({ evidence }: { evidence: C3EvidenceRow[] }) {
  const entry = evidence[0]
  const meta  = (entry?.metadata as Ind13Meta | null) ?? null
  const isValid = entry?.status === 'valid'

  return (
    <div className="space-y-1.5">
      <StatusRow
        isValid={(meta?.sessions_with_teacher ?? 0) > 0}
        label={`${meta?.sessions_with_teacher ?? 0} session(s) avec formateur assigné`}
        badge={(meta?.sessions_with_teacher ?? 0) > 0 && (
          <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 text-xs">
            {meta!.sessions_with_teacher}
          </Badge>
        )}
      />
      <StatusRow
        isValid={(meta?.convention_formateur ?? 0) > 0}
        label={`${meta?.convention_formateur ?? 0} convention(s) formateur`}
        badge={(meta?.convention_formateur ?? 0) > 0 && (
          <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 text-xs">
            {meta!.convention_formateur}
          </Badge>
        )}
      />
      {!isValid && (
        <p className="text-xs text-slate-400 italic pl-1">
          Assignez des formateurs aux sessions et créez des conventions formateur.
        </p>
      )}
    </div>
  )
}

// ─── Ind. 14 & 15 — CFA uniquement ───────────────────────────────────────────

function CfaOnlyPanel({ indicatorNumber }: { indicatorNumber: number }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm">
      <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-medium text-slate-600">Indicateur CFA uniquement</span>
        <p className="text-xs text-slate-400 mt-0.5">
          L'indicateur {indicatorNumber} est spécifique aux Centres de Formation d'Apprentis.
          Non applicable pour les organismes de formation classiques.
        </p>
      </div>
      <Badge variant="outline" className="ml-auto shrink-0 text-xs border-slate-300 text-slate-400">N/A</Badge>
    </div>
  )
}

// ─── Ind. 16 — Accessibilité handicap ────────────────────────────────────────

function Ind16Panel({ evidence }: { evidence: C3EvidenceRow[] }) {
  const entry   = evidence[0]
  const meta    = (entry?.metadata as Ind16Meta | null) ?? null
  const isValid = meta?.has_accessibility_config === true

  return (
    <StatusRow
      isValid={isValid}
      label={isValid ? 'Configuration accessibilité renseignée' : "Accessibilité non configurée"}
      detail={!isValid ? "Configurez le référent handicap et la politique d'accessibilité dans les paramètres." : "Référent handicap et politique d'accessibilité définis"}
      badge={isValid && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
    />
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function Criterion3Detail() {
  const { user } = useAuth()
  const supabase  = createClient()

  const { data: evidenceList = [], isLoading } = useQuery<C3EvidenceRow[]>({
    queryKey: ['c3-detail-evidence', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data } = await supabase
        .from('compliance_evidence_automated')
        .select('id, indicator_number, title, description, entity_name, confidence_score, status, metadata, event_date')
        .eq('organization_id', user.organization_id)
        .in('indicator_number', [9, 10, 11, 12, 13, 14, 15, 16])
        .order('indicator_number', { ascending: true })
        .order('event_date', { ascending: false })
      return (data ?? []) as C3EvidenceRow[]
    },
    enabled: !!user?.organization_id,
    staleTime: 60 * 1000,
  })

  const byIndicator = (n: number) => evidenceList.filter((e) => e.indicator_number === n)

  const sections = [
    { number: 9,  label: 'Conditions de déroulement',        icon: Mail,            panel: <Ind9Panel  evidence={byIndicator(9)}  /> },
    { number: 10, label: 'Adaptation et suivi stagiaires',    icon: FileSignature,   panel: <Ind10Panel evidence={byIndicator(10)} /> },
    { number: 11, label: 'Évaluation atteinte des objectifs', icon: Star,            panel: <Ind11Panel evidence={byIndicator(11)} /> },
    { number: 12, label: 'Engagement des bénéficiaires',      icon: Users,           panel: <Ind12Panel evidence={byIndicator(12)} /> },
    { number: 13, label: 'Coordination des intervenants',     icon: GraduationCap,   panel: <Ind13Panel evidence={byIndicator(13)} /> },
    { number: 14, label: 'Exercice de la citoyenneté',        icon: AlertCircle,     panel: <CfaOnlyPanel indicatorNumber={14} />      },
    { number: 15, label: 'Accompagnement socio-professionnel',icon: AlertCircle,     panel: <CfaOnlyPanel indicatorNumber={15} />      },
    { number: 16, label: 'Accessibilité handicap',            icon: Accessibility,   panel: <Ind16Panel evidence={byIndicator(16)} /> },
  ]

  return (
    <GlassCardPremium variant="cyan-accent" className="p-6 h-full" delay={0.2}>
      <div className="mb-5">
        <Badge className="bg-[#34B9EE] text-white mb-2">Critère 3</Badge>
        <h3 className="font-space-grotesk font-bold text-[#274472]">Adaptation aux publics bénéficiaires</h3>
        <p className="text-xs text-slate-500 mt-1">
          Convocations, conventions, évaluations, émargements, intervenants, accessibilité
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
