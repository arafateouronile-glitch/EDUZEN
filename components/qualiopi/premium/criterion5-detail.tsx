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
  Award,
  GraduationCap,
  ShieldCheck,
  BookOpen,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Ind21Meta = {
  total_teacher_docs: number
  teachers_with_docs: number
  verified_docs: number
  qualification_docs: number
  active_teachers: number
}
type Ind22Meta = {
  dev_docs_count: number
  total_docs: number
  active_teachers: number
}

type C5EvidenceRow = {
  id: string
  indicator_number: number
  title: string
  description: string | null
  confidence_score: number | null
  status: string | null
  metadata: unknown
}

// ─── Ind. 21 — Compétences des intervenants ──────────────────────────────────

function Ind21Panel({ evidence }: { evidence: C5EvidenceRow[] }) {
  const entry   = evidence[0]
  const meta    = (entry?.metadata as Ind21Meta | null) ?? null
  const isValid = entry?.status === 'valid'
  const score   = entry?.confidence_score ?? 0

  if (!meta || meta.total_teacher_docs === 0) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm">
        <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-slate-800">Aucun document formateur enregistré</span>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajoutez des CV, diplômes et certifications dans le profil de chaque formateur.
          </p>
        </div>
      </div>
    )
  }

  const coverageColor = score >= 100 ? 'bg-green-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Formateurs couverts', value: `${meta.teachers_with_docs}/${meta.active_teachers}`, icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Docs vérifiés',       value: meta.verified_docs,  icon: ShieldCheck, color: 'text-green-600 bg-green-50'  },
          { label: 'Total documents',     value: meta.total_teacher_docs, icon: BookOpen,    color: 'text-blue-600 bg-blue-50'   },
          { label: 'Qualifications',      value: meta.qualification_docs, icon: Award,       color: 'text-violet-600 bg-violet-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white">
            <div className={cn('h-7 w-7 rounded-md flex items-center justify-center shrink-0', color)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="font-bold text-slate-800 text-sm">{value}</div>
              <div className="text-xs text-slate-500">{label}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Couverture formateurs</span>
          <span className={cn('font-semibold', isValid ? 'text-green-600' : 'text-amber-600')}>{score}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', coverageColor)}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 0.7 }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Ind. 22 — Développement des compétences ─────────────────────────────────

function Ind22Panel({ evidence }: { evidence: C5EvidenceRow[] }) {
  const entry   = evidence[0]
  const meta    = (entry?.metadata as Ind22Meta | null) ?? null
  const isValid = entry?.status === 'valid'

  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-xl border text-sm',
      isValid ? 'bg-green-50/60 border-green-200' : 'bg-slate-50 border-slate-200'
    )}>
      {isValid
        ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
        : <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
      }
      <div className="flex-1">
        <span className="font-medium text-slate-800">
          {isValid
            ? `${meta?.dev_docs_count} document(s) de développement professionnel`
            : 'Formation continue non documentée'}
        </span>
        <p className="text-xs text-slate-500 mt-0.5">
          {isValid
            ? `Attestations de formation continue, séminaires, CPF… (${meta?.total_docs} doc. total)`
            : "Ajoutez des attestations de formation suivie (formations, séminaires, CPF…) pour chaque formateur."}
        </p>
      </div>
      {isValid && meta && (
        <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200 text-xs">
          {meta.dev_docs_count} docs
        </Badge>
      )}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function Criterion5Detail() {
  const { user } = useAuth()
  const supabase  = createClient()

  const { data: evidenceList = [], isLoading } = useQuery<C5EvidenceRow[]>({
    queryKey: ['c5-detail-evidence', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data } = await supabase
        .from('compliance_evidence_automated')
        .select('id, indicator_number, title, description, confidence_score, status, metadata')
        .eq('organization_id', user.organization_id)
        .in('indicator_number', [21, 22])
        .order('indicator_number', { ascending: true })
      return (data ?? []) as C5EvidenceRow[]
    },
    enabled: !!user?.organization_id,
    staleTime: 60 * 1000,
  })

  const byIndicator = (n: number) => evidenceList.filter((e) => e.indicator_number === n)

  const sections = [
    { number: 21, label: 'Compétences des intervenants',     icon: Award,         panel: <Ind21Panel evidence={byIndicator(21)} /> },
    { number: 22, label: 'Développement des compétences',    icon: GraduationCap, panel: <Ind22Panel evidence={byIndicator(22)} /> },
  ]

  return (
    <GlassCardPremium variant="cyan-accent" className="p-6 h-full" delay={0.2}>
      <div className="mb-5">
        <Badge className="bg-[#34B9EE] text-white mb-2">Critère 5</Badge>
        <h3 className="font-space-grotesk font-bold text-[#274472]">Qualification et développement des formateurs</h3>
        <p className="text-xs text-slate-500 mt-1">
          CV, diplômes, certifications et formation continue des intervenants
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Chargement…</div>
      ) : (
        <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
          {sections.map((section, idx) => (
            <motion.div
              key={section.number}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
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

          <div className="mt-4 p-3 rounded-xl border border-blue-100 bg-blue-50/40 text-xs text-blue-700">
            <strong>Conseil :</strong> Pour chaque formateur, ajoutez son CV, ses diplômes et ses
            attestations de formation continue. Cochez «&nbsp;Vérifié&nbsp;» pour renforcer la traçabilité.
          </div>
        </div>
      )}
    </GlassCardPremium>
  )
}
