import { CheckCircle2, XCircle, GraduationCap, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Libellés FR des clés du jsonb `plans.features` — doit rester aligné avec
 * les clés réellement vérifiées côté backend (cf. QuotaService.hasFeature,
 * lib/services/quota.service.ts) : bpf_export, e_learning, qualiopi_dashboard,
 * automated_reminders, white_label, multi_establishments.
 */
const FEATURE_LABELS: Record<string, string> = {
  bpf_export: 'Export BPF automatisé',
  e_learning: 'Portail e-learning',
  qualiopi_dashboard: 'Dashboard Qualiopi',
  automated_reminders: 'Relances automatiques',
  white_label: 'Marque blanche / URL personnalisée',
  multi_establishments: 'Multi-établissements',
}

const DOCUMENT_GENERATION_LABELS: Record<string, string> = {
  standard: 'Génération de documents (standard)',
  unlimited: 'Génération de documents (illimitée)',
  custom: 'Génération de documents (sur-mesure)',
}

interface PlanFeatureListProps {
  /** Colonne jsonb `plans.features` (ex: { bpf_export: true, e_learning: false, document_generation: 'unlimited', ... }) */
  features: Record<string, unknown> | null | undefined
  /** `plans.max_students` — NULL = illimité */
  maxStudents?: number | null
  /** `plans.max_sessions_per_month` — NULL = illimité */
  maxSessionsPerMonth?: number | null
  className?: string
}

function Row({ included, label }: { included: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5">
      {included ? (
        <CheckCircle2 className="h-4 w-4 text-brand-blue flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0" />
      )}
      <span className={cn(included ? 'text-gray-700' : 'text-gray-400')}>{label}</span>
    </li>
  )
}

export function PlanFeatureList({ features, maxStudents, maxSessionsPerMonth, className }: PlanFeatureListProps) {
  const featuresObj = features && typeof features === 'object' && !Array.isArray(features)
    ? (features as Record<string, unknown>)
    : {}

  const hasQuotaInfo = maxStudents !== undefined || maxSessionsPerMonth !== undefined
  const documentGeneration = typeof featuresObj.document_generation === 'string'
    ? DOCUMENT_GENERATION_LABELS[featuresObj.document_generation as string]
    : null

  return (
    <ul className={className ?? 'space-y-2.5 text-sm'}>
      {maxStudents !== undefined && (
        <li className="flex items-center gap-2.5">
          <GraduationCap className="h-4 w-4 text-brand-blue flex-shrink-0" />
          <span className="text-gray-700">
            {maxStudents === null ? 'Apprenants illimités' : `${maxStudents} apprenants max`}
          </span>
        </li>
      )}
      {maxSessionsPerMonth !== undefined && (
        <li className="flex items-center gap-2.5">
          <CalendarDays className="h-4 w-4 text-brand-blue flex-shrink-0" />
          <span className="text-gray-700">
            {maxSessionsPerMonth === null ? 'Sessions illimitées' : `${maxSessionsPerMonth} sessions/mois max`}
          </span>
        </li>
      )}
      {Object.entries(FEATURE_LABELS).map(([key, label]) => (
        <Row key={key} included={featuresObj[key] === true} label={label} />
      ))}
      {documentGeneration && <Row included label={documentGeneration} />}
      {!hasQuotaInfo && Object.keys(featuresObj).length === 0 && (
        <li className="text-gray-400 text-sm italic">Aucune information disponible</li>
      )}
    </ul>
  )
}
