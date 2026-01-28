'use client'

/**
 * BPF Inconsistency Panel - Panneau de vérification des incohérences
 * Signale les problèmes qui pourraient fausser le BPF
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { BPFInconsistency } from '@/lib/services/bpf.service'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ChevronRight,
  Shield,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'

interface BPFInconsistencyPanelProps {
  inconsistencies: BPFInconsistency[]
  loading?: boolean
  year: number
  onRefresh?: () => void
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    badgeColor: 'bg-red-100 text-red-800',
    iconColor: 'text-red-500',
    label: 'Critique',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    badgeColor: 'bg-amber-100 text-amber-800',
    iconColor: 'text-amber-500',
    label: 'Attention',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    badgeColor: 'bg-blue-100 text-blue-800',
    iconColor: 'text-blue-500',
    label: 'Information',
  },
}

const INCONSISTENCY_ACTIONS: Record<string, { label: string; href: string }> = {
  missing_funding_type: { label: 'Gérer les inscriptions', href: '/dashboard/students' },
  missing_attendance: { label: 'Gérer les émargements', href: '/dashboard/attendance' },
  incomplete_student_data: { label: 'Compléter les profils', href: '/dashboard/students' },
  orphan_payments: { label: 'Gérer les paiements', href: '/dashboard/payments' },
  funding_type_no_bpf_category: { label: 'Configurer les financements', href: '/dashboard/settings' },
  low_attendance_rate: { label: 'Voir les sessions', href: '/dashboard/sessions' },
}

export function BPFInconsistencyPanel({
  inconsistencies,
  loading,
  year,
  onRefresh,
}: BPFInconsistencyPanelProps) {
  const [expanded, setExpanded] = useState<string[]>([])

  const criticalCount = inconsistencies.filter((i) => i.severity === 'critical').length
  const warningCount = inconsistencies.filter((i) => i.severity === 'warning').length
  const infoCount = inconsistencies.filter((i) => i.severity === 'info').length
  const totalAffected = inconsistencies.reduce((acc, i) => acc + i.affected_count, 0)

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const hasNoIssues = inconsistencies.length === 0

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shadow-md ${
                hasNoIssues
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : criticalCount > 0
                    ? 'bg-gradient-to-br from-red-500 to-rose-600'
                    : 'bg-gradient-to-br from-amber-500 to-orange-600'
              }`}
            >
              {hasNoIssues ? (
                <CheckCircle className="h-5 w-5 text-white" />
              ) : (
                <Shield className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-gray-900">
                Vérificateur d'Incohérences
              </CardTitle>
              <CardDescription className="text-sm">
                Analyse de la qualité des données BPF {year}
              </CardDescription>
            </div>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={onRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
          )}
        </div>

        {/* Summary badges */}
        {!hasNoIssues && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {criticalCount > 0 && (
              <Badge className={SEVERITY_CONFIG.critical.badgeColor}>
                <AlertCircle className="h-3 w-3 mr-1" />
                {criticalCount} critique{criticalCount > 1 ? 's' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className={SEVERITY_CONFIG.warning.badgeColor}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                {warningCount} attention{warningCount > 1 ? 's' : ''}
              </Badge>
            )}
            {infoCount > 0 && (
              <Badge className={SEVERITY_CONFIG.info.badgeColor}>
                <Info className="h-3 w-3 mr-1" />
                {infoCount} info{infoCount > 1 ? 's' : ''}
              </Badge>
            )}
            <Badge variant="outline" className="text-gray-600">
              {totalAffected} élément{totalAffected > 1 ? 's' : ''} affecté
              {totalAffected > 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {hasNoIssues ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-4 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune incohérence détectée
            </h3>
            <p className="text-gray-500 text-sm max-w-md">
              Vos données BPF pour l'année {year} sont cohérentes. Votre rapport sera fiable face à
              un audit de la DREETS.
            </p>
          </div>
        ) : (
          <Accordion
            type="multiple"
            value={expanded}
            onValueChange={(val) => setExpanded(Array.isArray(val) ? val : [val])}
            className="space-y-3"
          >
            {inconsistencies
              .sort((a, b) => {
                const order = { critical: 0, warning: 1, info: 2 }
                return order[a.severity] - order[b.severity]
              })
              .map((inconsistency, index) => {
                const config = SEVERITY_CONFIG[inconsistency.severity]
                const Icon = config.icon
                const action = INCONSISTENCY_ACTIONS[inconsistency.inconsistency_type]

                return (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className={`border rounded-lg overflow-hidden ${config.borderColor} ${config.bgColor}`}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/50 transition-colors">
                      <div className="flex items-center gap-3 text-left">
                        <Icon className={`h-5 w-5 flex-shrink-0 ${config.iconColor}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium ${config.textColor}`}>
                              {inconsistency.description}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {inconsistency.affected_count} affecté
                              {inconsistency.affected_count > 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4">
                        {/* Impact explanation */}
                        <div className="text-sm text-gray-600">
                          <p className="font-medium mb-1">Impact sur le BPF :</p>
                          <p>
                            {inconsistency.severity === 'critical'
                              ? 'Cette incohérence peut significativement fausser vos chiffres BPF et entraîner des problèmes lors d\'un contrôle.'
                              : inconsistency.severity === 'warning'
                                ? 'Cette incohérence peut affecter la précision de votre rapport BPF.'
                                : 'Cette information est fournie à titre indicatif pour améliorer la qualité de vos données.'}
                          </p>
                        </div>

                        {/* Details table */}
                        {inconsistency.details && inconsistency.details.length > 0 && (
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div className="max-h-48 overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                    {Object.keys(inconsistency.details[0])
                                      .slice(0, 4)
                                      .map((key) => (
                                        <th
                                          key={key}
                                          className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                          {key.replace(/_/g, ' ')}
                                        </th>
                                      ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {inconsistency.details.slice(0, 10).map((detail, detailIndex) => (
                                    <tr
                                      key={detailIndex}
                                      className="hover:bg-gray-50 transition-colors"
                                    >
                                      {Object.entries(detail)
                                        .slice(0, 4)
                                        .map(([key, value], cellIndex) => (
                                          <td
                                            key={cellIndex}
                                            className="px-3 py-2 text-gray-700 truncate max-w-[150px]"
                                          >
                                            {typeof value === 'number'
                                              ? key.includes('amount') || key.includes('spent')
                                                ? new Intl.NumberFormat('fr-FR', {
                                                    style: 'currency',
                                                    currency: 'EUR',
                                                  }).format(value)
                                                : new Intl.NumberFormat('fr-FR').format(value)
                                              : typeof value === 'boolean'
                                                ? value
                                                  ? 'Oui'
                                                  : 'Non'
                                                : String(value || '-')}
                                          </td>
                                        ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {inconsistency.details.length > 10 && (
                                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-t">
                                  ... et {inconsistency.details.length - 10} autres
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action button */}
                        {action && (
                          <Link href={action.href}>
                            <Button size="sm" variant="outline" className="gap-2">
                              {action.label}
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
          </Accordion>
        )}

        {/* Help text */}
        {!hasNoIssues && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Comment résoudre ces incohérences ?</p>
                <p className="text-blue-600">
                  Cliquez sur chaque alerte pour voir les détails et accéder directement aux écrans
                  de correction. Une fois corrigées, actualisez cette page pour vérifier vos
                  données.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BPFInconsistencyPanel
