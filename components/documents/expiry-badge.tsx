import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { expiryStatus, COMPLIANCE_STATUS_LABELS, type ComplianceStatus } from '@/lib/utils/document-expiry'

/** Badge d'expiration pour une date donnée (diplôme, certification...). */
export function ExpiryBadge({ date }: { date: string | null | undefined }) {
  const status = expiryStatus(date)
  if (!status || status === 'ok') return null
  const colors = {
    expired: 'bg-red-100 text-red-700 border-red-200',
    soon: 'bg-red-50 text-red-600 border-red-100',
    warning: 'bg-orange-50 text-orange-600 border-orange-100',
  } as const
  const labels = {
    expired: `Expiré (${new Date(date!).toLocaleDateString('fr-FR')})`,
    soon: `Expire le ${new Date(date!).toLocaleDateString('fr-FR')}`,
    warning: `Expire le ${new Date(date!).toLocaleDateString('fr-FR')}`,
  } as const
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${colors[status]}`}>
      <AlertTriangle className="w-3 h-3" />
      {labels[status]}
    </span>
  )
}

const COMPLIANCE_STYLES: Record<ComplianceStatus, { color: string; icon: typeof CheckCircle2 }> = {
  missing: { color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
  expired: { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  expiring_soon: { color: 'bg-orange-50 text-orange-600 border-orange-100', icon: Clock },
  ok: { color: 'bg-green-50 text-green-700 border-green-100', icon: CheckCircle2 },
}

/** Badge de conformité pour un document requis (manquant/expiré/expire bientôt/à jour). */
export function ComplianceStatusBadge({ status }: { status: ComplianceStatus }) {
  const { color, icon: Icon } = COMPLIANCE_STYLES[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {COMPLIANCE_STATUS_LABELS[status]}
    </span>
  )
}
