'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useEnterpriseCompany } from '@/lib/contexts/enterprise-company-context'
import { enterprisePortalService } from '@/lib/services/enterprise-portal.service'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { motion } from '@/components/ui/motion'
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Receipt,
  TrendingUp,
  Shield,
} from 'lucide-react'

type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue'

interface Invoice {
  id: string
  invoice_number?: string
  status?: string
  total_amount?: number
  paid_amount?: number
  issue_date?: string
  due_date?: string
  currency?: string
  document_type?: string
  student?: {
    id: string
    first_name: string
    last_name: string
  }
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid: { label: 'Payée', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  sent: { label: 'Envoyée', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  partial: { label: 'Partielle', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'En retard', className: 'bg-red-50 text-red-700 border-red-200' },
  draft: { label: 'Brouillon', className: 'bg-gray-50 text-gray-700 border-gray-200' },
  cancelled: { label: 'Annulée', className: 'bg-gray-50 text-gray-500 border-gray-200' },
}

const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i)

export default function EnterpriseBillingPage() {
  const { company, isEntityContext } = useEnterpriseCompany()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [yearFilter, setYearFilter] = useState<number | undefined>(undefined)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['enterprise-invoices', company?.id, statusFilter, yearFilter, page],
    queryFn: async () => {
      if (!company?.id) return { invoices: [], total: 0 }
      return enterprisePortalService.getCompanyInvoices(company.id, {
        status: statusFilter,
        year: yearFilter,
        page,
        limit: 20,
      })
    },
    enabled: !!company?.id,
  })

  const invoices = (data?.invoices || []) as Invoice[]
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 20)

  const filtered = invoices.filter((inv) => {
    if (!search) return true
    const name = `${inv.student?.first_name || ''} ${inv.student?.last_name || ''}`.toLowerCase()
    const num = inv.invoice_number?.toLowerCase() || ''
    return name.includes(search.toLowerCase()) || num.includes(search.toLowerCase())
  })

  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total_amount ?? 0), 0)

  const totalPending = invoices
    .filter((inv) => ['sent', 'partial'].includes(inv.status ?? ''))
    .reduce((sum, inv) => sum + Number(inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0), 0)

  const totalOverdue = invoices
    .filter((inv) => inv.status === 'overdue')
    .reduce((sum, inv) => sum + Number(inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0), 0)

  const handleDownload = (invoiceId: string) => {
    window.open(`/api/documents/generate-pdf?type=invoice&id=${invoiceId}`, '_blank')
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[#274472]" />
            Facturation
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivi des factures et paiements liés à vos formations
          </p>
        </div>
        {isEntityContext && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <Shield className="h-4 w-4" />
            Mode Administrateur
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total payé',
            value: formatCurrency(totalPaid, 'EUR'),
            icon: CheckCircle,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100',
          },
          {
            label: 'En attente',
            value: formatCurrency(totalPending, 'EUR'),
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'border-amber-100',
          },
          {
            label: 'En retard',
            value: formatCurrency(totalOverdue, 'EUR'),
            icon: AlertCircle,
            color: 'text-red-600',
            bg: 'bg-red-50',
            border: 'border-red-100',
          },
        ].map((stat) => (
          <GlassCard key={stat.label} className={cn('p-5 border', stat.border)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                <p className={cn('text-2xl font-bold mt-1', stat.color)}>{stat.value}</p>
              </div>
              <div className={cn('p-3 rounded-xl', stat.bg)}>
                <stat.icon className={cn('h-5 w-5', stat.color)} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par collaborateur ou n° facture..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:bg-white focus:border-[#274472]/40 focus:outline-none text-sm"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1) }}
            className="px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:border-[#274472]/40 focus:outline-none text-sm font-medium"
          >
            <option value="all">Tous les statuts</option>
            <option value="paid">Payées</option>
            <option value="pending">En attente</option>
            <option value="overdue">En retard</option>
          </select>

          {/* Year filter */}
          <select
            value={yearFilter ?? ''}
            onChange={(e) => { setYearFilter(e.target.value ? Number(e.target.value) : undefined); setPage(1) }}
            className="px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:border-[#274472]/40 focus:outline-none text-sm font-medium"
          >
            <option value="">Toutes les années</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Invoice list */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 bg-gray-100 rounded" />
                    <div className="h-3 w-24 bg-gray-100 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-gray-100 rounded-full" />
                  <div className="h-5 w-24 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Aucune facture trouvée</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              {search || statusFilter !== 'all' || yearFilter
                ? 'Essayez de modifier vos filtres.'
                : 'Les factures liées à vos formations apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">N° Facture</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Collaborateur</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Échéance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((invoice, i) => {
                    const statusCfg = STATUS_CONFIG[invoice.status ?? 'draft'] ?? STATUS_CONFIG.draft
                    return (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-[#274472]/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="h-4 w-4 text-[#274472]" />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {invoice.invoice_number || 'Brouillon'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-700">
                          {invoice.student
                            ? `${invoice.student.first_name} ${invoice.student.last_name}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">
                          {invoice.issue_date ? formatDate(invoice.issue_date) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-gray-500">
                          {invoice.due_date ? formatDate(invoice.due_date) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                          {formatCurrency(Number(invoice.total_amount ?? 0), invoice.currency || 'EUR')}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium border', statusCfg.className)}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(invoice.id)}
                            className="h-8 w-8 p-0 hover:bg-[#274472]/10"
                            title="Télécharger la facture"
                          >
                            <Download className="h-4 w-4 text-gray-500" />
                          </Button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map((invoice) => {
                const statusCfg = STATUS_CONFIG[invoice.status ?? 'draft'] ?? STATUS_CONFIG.draft
                return (
                  <div key={invoice.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {invoice.invoice_number || 'Brouillon'}
                          </span>
                          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0', statusCfg.className)}>
                            {statusCfg.label}
                          </span>
                        </div>
                        {invoice.student && (
                          <p className="text-xs text-gray-500 mb-1">
                            {invoice.student.first_name} {invoice.student.last_name}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {invoice.issue_date ? formatDate(invoice.issue_date) : '—'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="text-base font-bold text-gray-900">
                          {formatCurrency(Number(invoice.total_amount ?? 0), invoice.currency || 'EUR')}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(invoice.id)}
                          className="h-7 px-2 text-xs text-[#274472] hover:bg-[#274472]/10"
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500">
                  Page {page} sur {totalPages} · {total} facture{total > 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>

      {/* Summary footer */}
      {!isLoading && filtered.length > 0 && (
        <GlassCard className="p-4">
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#274472]" />
              <span className="font-medium">{total} facture{total > 1 ? 's' : ''} au total</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>{invoices.filter((i) => i.status === 'paid').length} payée{invoices.filter((i) => i.status === 'paid').length > 1 ? 's' : ''}</span>
            </div>
            {totalOverdue > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">{formatCurrency(totalOverdue, 'EUR')} en retard</span>
              </div>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
