'use client'

/**
 * BPF Audit Modal - Mode Audit pour drill-down sur les chiffres
 * Permet de voir le détail des calculs (quelles sessions et quels stagiaires)
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { BPFDrillDownMetric, BPFDrillDownResult, bpfService } from '@/lib/services/bpf.service'
import {
  Search,
  Clock,
  DollarSign,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface BPFAuditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  year: number
  metricType: BPFDrillDownMetric
  metricLabel: string
  metricValue: string | number
}

const METRIC_CONFIG: Record<
  BPFDrillDownMetric,
  {
    icon: typeof Clock
    columns: { key: string; label: string; format?: 'currency' | 'number' | 'date' }[]
    linkPrefix?: string
  }
> = {
  trainee_hours: {
    icon: Clock,
    columns: [
      { key: 'slot_date', label: 'Date', format: 'date' },
      { key: 'session_name', label: 'Session' },
      { key: 'slot_hours', label: 'Durée (h)', format: 'number' },
      { key: 'present_count', label: 'Présents', format: 'number' },
      { key: 'trainee_hours', label: 'Heures-stagiaires', format: 'number' },
    ],
    linkPrefix: '/dashboard/sessions',
  },
  revenue: {
    icon: DollarSign,
    columns: [
      { key: 'student_name', label: 'Stagiaire' },
      { key: 'session_name', label: 'Session' },
      { key: 'funding_name', label: 'Financement' },
      { key: 'bpf_category', label: 'Catégorie BPF' },
      { key: 'amount', label: 'Montant', format: 'currency' },
    ],
    linkPrefix: '/dashboard/students',
  },
  students: {
    icon: Users,
    columns: [
      { key: 'student_name', label: 'Nom' },
      { key: 'email', label: 'Email' },
      { key: 'gender', label: 'Genre' },
      { key: 'sessions_count', label: 'Sessions', format: 'number' },
      { key: 'total_spent', label: 'Total inscriptions', format: 'currency' },
    ],
    linkPrefix: '/dashboard/students',
  },
  sessions: {
    icon: Calendar,
    columns: [
      { key: 'session_name', label: 'Session' },
      { key: 'program_name', label: 'Programme' },
      { key: 'start_date', label: 'Début', format: 'date' },
      { key: 'enrolled_count', label: 'Inscrits', format: 'number' },
      { key: 'total_revenue', label: 'CA', format: 'currency' },
    ],
    linkPrefix: '/dashboard/sessions',
  },
}

const BPF_CATEGORY_LABELS: Record<string, string> = {
  cpf: 'CPF',
  opco: 'OPCO',
  companies: 'Entreprises',
  individuals: 'Particuliers',
  pole_emploi: 'Pôle Emploi',
  regions: 'Régions',
  state: 'État',
  other: 'Autres',
}

export function BPFAuditModal({
  open,
  onOpenChange,
  organizationId,
  year,
  metricType,
  metricLabel,
  metricValue,
}: BPFAuditModalProps) {
  const [data, setData] = useState<BPFDrillDownResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const pageSize = 20

  const config = METRIC_CONFIG[metricType]
  const Icon = config.icon

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, page])

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await bpfService.getDrillDown(organizationId, year, metricType, page, pageSize)
      setData(result)
    } catch (error) {
      // Error handling done in service
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: any, format?: 'currency' | 'number' | 'date') => {
    if (value === null || value === undefined) return '-'

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: 'EUR',
        }).format(Number(value))
      case 'number':
        return new Intl.NumberFormat('fr-FR', {
          maximumFractionDigits: 2,
        }).format(Number(value))
      case 'date':
        return new Date(value).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      default:
        // Handle BPF categories
        if (BPF_CATEGORY_LABELS[value]) {
          return BPF_CATEGORY_LABELS[value]
        }
        // Handle gender
        if (value === 'male') return 'Homme'
        if (value === 'female') return 'Femme'
        return String(value)
    }
  }

  const filteredItems = data?.items?.filter((item) => {
    if (!searchTerm) return true
    return Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  }) || []

  const totalPages = Math.ceil((data?.total_count || 0) / pageSize)

  const exportToCSV = () => {
    if (!data?.items || data.items.length === 0) return

    const headers = config.columns.map((col) => col.label).join(';')
    const rows = data.items.map((item) =>
      config.columns.map((col) => {
        const value = item[col.key]
        return formatValue(value, col.format).replace(/;/g, ',')
      }).join(';')
    )

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `bpf_${metricType}_${year}.csv`
    link.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-md">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Mode Audit - {metricLabel}
              </DialogTitle>
              <DialogDescription className="text-sm">
                Détail des calculs pour l'année {year}
              </DialogDescription>
            </div>
          </div>

          {/* Metric summary */}
          <div className="mt-4 p-4 bg-gradient-to-r from-brand-blue-ghost to-brand-cyan-ghost rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valeur calculée</p>
                <p className="text-2xl font-bold text-gray-900">{metricValue}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Éléments comptés</p>
                <p className="text-2xl font-bold text-brand-blue">
                  {data?.total_count?.toLocaleString('fr-FR') || '...'}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!data?.items?.length}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
        </div>

        {/* Data table */}
        <div className="flex-1 overflow-auto border rounded-lg">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {config.columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={config.columns.length + 1}
                      className="px-4 py-12 text-center text-gray-500"
                    >
                      {searchTerm ? 'Aucun résultat trouvé' : 'Aucune donnée disponible'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      {config.columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-gray-700">
                          {col.key === 'bpf_category' && item[col.key] ? (
                            <Badge variant="outline" className="font-normal">
                              {formatValue(item[col.key], col.format)}
                            </Badge>
                          ) : (
                            formatValue(item[col.key], col.format)
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        {config.linkPrefix && (item.session_id || item.student_id) && (
                          <Link
                            href={`${config.linkPrefix}/${item.session_id || item.student_id}`}
                            target="_blank"
                          >
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <ExternalLink className="h-4 w-4 text-gray-400" />
                            </Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-500">
              Page {page} sur {totalPages} ({data?.total_count?.toLocaleString('fr-FR')} résultats)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Audit trail info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">
            <strong>Mode Audit :</strong> Ce détail montre exactement comment le chiffre a été
            calculé. En cas de contrôle DREETS, vous pouvez prouver que vos données BPF sont le
            reflet exact des émargements et inscriptions enregistrées.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BPFAuditModal
