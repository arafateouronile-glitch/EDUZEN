'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { invoiceService } from '@/lib/services/invoice.service.client'
import { sessionChargesService } from '@/lib/services/session-charges.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Plus, Search, FileText, AlertCircle, CheckCircle, TrendingUp, X, DollarSign, Receipt, CreditCard, ArrowUpRight, SlidersHorizontal, TrendingDown, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import Link from 'next/link'
import { BRAND_COLORS } from '@/lib/config/app-config'
import { PremiumPieChart } from '@/components/charts/premium-pie-chart'
import { PremiumBarChart } from '@/components/charts/premium-bar-chart'
import { motion, AnimatePresence } from '@/components/ui/motion'
import type { TableRow } from '@/lib/types/supabase-helpers'
import type { InvoiceWithRelations } from '@/lib/types/query-types'
import { RoleGuard, FINANCE_ROLES } from '@/components/auth/role-guard'
import { logger, sanitizeError } from '@/lib/utils/logger'

type Payment = TableRow<'payments'>
type Invoice = TableRow<'invoices'>

export default function PaymentsPage() {
  return (
    <RoleGuard allowedRoles={FINANCE_ROLES}>
      <PaymentsPageContent />
    </RoleGuard>
  )
}

function PaymentsPageContent() {
  const { user } = useAuth()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [documentTypeFilter, setDocumentTypeFilter] = useState<'all' | 'quote' | 'invoice'>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'quotes' | 'invoices'>('all')
  const [showChargesSection, setShowChargesSection] = useState(false)
  const [showChargeForm, setShowChargeForm] = useState(false)
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')

  // Récupérer les sessions pour le formulaire de charge
  const { data: sessions } = useQuery({
    queryKey: ['sessions', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const { data, error } = await supabase
        .from('sessions')
        .select('id, name, start_date, end_date')
        .eq('organization_id', user.organization_id)
        .order('start_date', { ascending: false })
        .limit(100)
      if (error) {
        logger.error('Erreur récupération sessions:', error)
        return []
      }
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les catégories de charges
  const { data: chargeCategories } = useQuery({
    queryKey: ['charge-categories', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      const categories = await sessionChargesService.getCategories(user.organization_id)
      if (categories.length === 0) {
        await sessionChargesService.initDefaultCategories(user.organization_id)
        return sessionChargesService.getCategories(user.organization_id)
      }
      return categories
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer toutes les charges de l'organisation
  const { data: allCharges, isLoading: isLoadingCharges } = useQuery({
    queryKey: ['all-session-charges', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return await sessionChargesService.getAll(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  // Formulaire de charge
  const [chargeForm, setChargeForm] = useState({
    description: '',
    amount: '',
    currency: 'EUR',
    charge_date: new Date().toISOString().split('T')[0],
    category_id: '',
    payment_method: '',
    payment_status: 'pending' as 'pending' | 'paid' | 'cancelled',
    vendor: '',
    vendor_invoice_number: '',
    vendor_invoice_date: '',
    notes: '',
  })

  // Mutation pour créer une charge
  const createChargeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')
      if (!selectedSessionId) throw new Error('Veuillez sélectionner une session')
      if (!chargeForm.description || !chargeForm.amount) {
        throw new Error('La description et le montant sont requis')
      }

      return sessionChargesService.create(
        user.organization_id,
        selectedSessionId,
        {
          description: chargeForm.description,
          amount: parseFloat(chargeForm.amount),
          currency: chargeForm.currency,
          charge_date: chargeForm.charge_date,
          category_id: chargeForm.category_id || null,
          payment_method: chargeForm.payment_method || null,
          payment_status: chargeForm.payment_status,
          paid_at: chargeForm.payment_status === 'paid' ? new Date().toISOString() : null,
          vendor: chargeForm.vendor || null,
          vendor_invoice_number: chargeForm.vendor_invoice_number || null,
          vendor_invoice_date: chargeForm.vendor_invoice_date || null,
          notes: chargeForm.notes || null,
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-charges'] })
      queryClient.invalidateQueries({ queryKey: ['session-charges-summary'] })
      queryClient.invalidateQueries({ queryKey: ['all-session-charges', user?.organization_id] })
      setShowChargeForm(false)
      setChargeForm({
        description: '',
        amount: '',
        currency: 'EUR',
        charge_date: new Date().toISOString().split('T')[0],
        category_id: '',
        payment_method: '',
        payment_status: 'pending',
        vendor: '',
        vendor_invoice_number: '',
        vendor_invoice_date: '',
        notes: '',
      })
      setSelectedSessionId('')
    },
  })

  // Mutation pour transformer un devis en facture
  const convertQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      return invoiceService.convertQuoteToInvoice(quoteId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['overdue-invoices'] })
    },
  })

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices', user?.organization_id, search, statusFilter, documentTypeFilter],
    queryFn: async () => {
      if (!user?.organization_id) return []
      try {
        return await invoiceService.getAll(user.organization_id, {
          search,
          status: statusFilter !== 'all' ? (statusFilter as Invoice['status']) : undefined,
          documentType: documentTypeFilter !== 'all' ? documentTypeFilter : undefined,
        })
      } catch (error: unknown) {
        const err = error as { code?: string }
        if (err?.code === 'PGRST116' || err?.code === '42P01') return []
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  type InvRow = { document_type?: string; status?: string; total_amount?: number; paid_amount?: number }
  type ChargeRow = { id: string; amount?: number; payment_status?: string; category_id?: string; charge_date?: string; description?: string; currency?: string; vendor?: string; notes?: string; charge_categories?: { name?: string }; sessions?: { name?: string; start_date?: string } }
  type SessionOption = { id: string; name?: string; start_date?: string; end_date?: string }
  const filteredInvoices = invoices?.filter((inv) => {
    const row = inv as InvRow
    if (activeTab === 'quotes') return row.document_type === 'quote'
    if (activeTab === 'invoices') return row.document_type === 'invoice' || !row.document_type
    return true
  }) || []

  // Récupérer les factures impayées
  const { data: overdueInvoices } = useQuery({
    queryKey: ['overdue-invoices', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      try {
        return await invoiceService.getOverdue(user.organization_id)
      } catch (error: unknown) {
        const err = error as { code?: string }
        if (err?.code === 'PGRST116' || err?.code === '42P01') return []
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Calculer les statistiques des paiements par période (cache 2 min, requête limitée pour perf)
  const {
    data: paymentStats,
    isLoading: isLoadingPaymentStats,
    isError: isPaymentStatsError,
    error: paymentStatsError,
    refetch: refetchPaymentStats,
  } = useQuery({
    queryKey: ['payment-stats', user?.organization_id, dateRangeFilter],
    queryFn: async () => {
      if (!user?.organization_id) return null

      let startDate: Date | null = null
      const now = new Date()

      switch (dateRangeFilter) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3)
          startDate = new Date(now.getFullYear(), quarter * 3, 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          // "Toutes les périodes" : limiter à 24 mois pour alléger la requête
          startDate = new Date(now.getFullYear(), now.getMonth() - 23, 1)
      }

      const query = supabase
        .from('payments')
        .select('amount, currency, payment_method, paid_at')
        .eq('organization_id', user.organization_id)
        .eq('status', 'completed')
        .gte('paid_at', startDate.toISOString())
        .order('paid_at', { ascending: false })
        .limit(5000)

      const { data: payments, error } = await query

      if (error) {
        // Gérer les erreurs de table inexistante, erreurs 400, ou problèmes de schéma
        if (
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.code === 'PGRST301' ||
          error.code === '400' ||
          error.message?.includes('relation') ||
          error.message?.includes('relationship') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('schema cache') ||
          error.message?.includes('column') ||
          error.message?.includes('permission')
        ) {
          logger.warn('Erreur lors de la récupération des paiements', sanitizeError(error))
          return { totalAmount: 0, count: 0, byMethod: [], monthlyData: [] }
        }
        logger.error('Erreur Supabase lors de la récupération des paiements', sanitizeError(error))
        throw error
      }

      const paymentsArray = (payments as Payment[]) || []
      logger.debug('Paiements récupérés pour les graphiques', {
        count: paymentsArray.length,
        organizationId: user.organization_id,
        dateRangeFilter,
        startDate: startDate.toISOString(),
      })
      const totalAmount = paymentsArray.reduce((sum, p) => sum + Number(p.amount), 0)

      // Grouper par méthode de paiement
      const byMethod: Record<string, number> = {}
      paymentsArray.forEach((p) => {
        const method = p.payment_method || 'unknown'
        byMethod[method] = (byMethod[method] || 0) + Number(p.amount)
      })

      // Grouper par mois
      const byMonth: Record<string, number> = {}
      paymentsArray.forEach((p) => {
        if (p.paid_at) {
          const date = new Date(p.paid_at)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          byMonth[monthKey] = (byMonth[monthKey] || 0) + Number(p.amount)
        }
      })

      const monthlyData = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, amount]) => ({
          month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          amount: Math.round(amount),
        }))

      const methodData = Object.entries(byMethod).map(([method, amount]) => ({
        name: method === 'cash' ? 'Espèces' :
              method === 'mobile_money' ? 'Mobile Money' :
              method === 'card' ? 'Carte' :
              method === 'bank_transfer' ? 'Virement' : method,
        value: Math.round(amount),
        color: method === 'cash' ? '#335ACF' :
               method === 'mobile_money' ? BRAND_COLORS.secondary :
               method === 'card' ? '#3B82F6' :
               method === 'bank_transfer' ? BRAND_COLORS.accent : '#6B7280',
      }))

      const result = {
        totalAmount,
        count: payments?.length || 0,
        byMethod: methodData,
        monthlyData,
      }
      logger.debug('Statistiques de paiements calculées', {
        totalAmount,
        count: result.count,
        byMethodCount: methodData.length,
        monthlyDataCount: monthlyData.length,
        byMethod: methodData,
        monthlyData: monthlyData.slice(0, 3), // Log seulement les 3 premiers pour ne pas surcharger
      })
      return result
    },
    enabled: !!user?.organization_id,
    staleTime: 2 * 60 * 1000, // 2 min de cache pour éviter refetch à chaque visite
    gcTime: 10 * 60 * 1000,
    retry: 1, // une réessai si échec (ex. RLS pas encore appliqué)
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-100'
      case 'sent': return 'bg-blue-50 text-blue-700 border-blue-100'
      case 'partial': return 'bg-amber-50 text-amber-700 border-amber-100'
      case 'overdue': return 'bg-red-50 text-red-700 border-red-100'
      case 'draft': return 'bg-gray-50 text-gray-700 border-gray-100'
      default: return 'bg-gray-50 text-gray-700 border-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Payée'
      case 'sent': return 'Envoyée'
      case 'partial': return 'Partielle'
      case 'overdue': return 'En retard'
      case 'draft': return 'Brouillon'
      case 'cancelled': return 'Annulée'
      default: return status
    }
  }

  // Filtrer uniquement les factures
  const invoicesOnly = invoices?.filter((inv) => 
    (inv as InvRow).document_type === 'invoice' || !(inv as InvRow).document_type
  ) || []

  const totalPaid = invoicesOnly
    .filter((inv) => (inv as InvRow).status === 'paid')
    .reduce<number>((sum, inv) => sum + Number((inv as InvRow).total_amount ?? 0), 0) || 0
  const totalOverdue = (overdueInvoices ?? []).reduce<number>(
    (sum, inv) => sum + Number((inv as InvRow).total_amount ?? 0) - Number((inv as InvRow).paid_amount ?? 0),
    0
  ) || 0
  const totalPending = invoicesOnly
    .filter((inv) => ['sent', 'partial'].includes((inv as InvRow).status ?? ''))
    .reduce<number>((sum, inv) => {
      const row = inv as InvRow
      const paidAmount = row.paid_amount ?? 0
      return sum + Number(row.total_amount ?? 0) - Number(paidAmount)
    }, 0) || 0

  /* Pas d'animation d'entrée au niveau page : évite le décalage à la navigation */
  return (
    <div className="space-y-8 pb-12 max-w-[1600px] mx-auto">
      {/* Header Premium avec Gradient Background */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-mesh opacity-30 rounded-3xl" />
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-8 rounded-3xl bg-white/50 backdrop-blur-sm border border-gray-100">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <motion.div
                className="p-3 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-cyan"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <DollarSign className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h1 className="text-5xl font-black text-gray-900 tracking-tightest font-display">
                  Paiements
                </h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-4 py-1.5 bg-brand-blue-ghost text-brand-blue rounded-full text-sm font-semibold">
                    {filteredInvoices.length} documents
                  </span>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-500 font-medium">
                    {formatCurrency(totalPaid + totalPending + totalOverdue, 'EUR')} au total
                  </span>
                </div>
              </div>
            </div>
            <p className="text-lg text-gray-600 font-light ml-[72px]">
              Gérez vos devis, factures et suivez les paiements en temps réel
            </p>
          </div>

          <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link href="/dashboard/payments/new">
              <Button className="h-14 px-8 text-base font-semibold shadow-2xl shadow-brand-blue/20 hover:shadow-brand-blue/40 bg-gradient-to-r from-brand-blue to-brand-cyan hover:opacity-90 transition-all duration-300">
                <Plus className="mr-2 h-5 w-5" />
                Nouvelle transaction
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Statistiques Premium avec Glassmorphism */}
      <div>
        <BentoGrid columns={4} gap="md">
          {[
            {
              title: 'Total payé',
              value: formatCurrency(totalPaid, 'EUR'),
              icon: CheckCircle,
              color: 'text-emerald-600',
              bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
              borderColor: 'border-emerald-200',
              trend: '+12%',
              trendUp: true,
            },
            {
              title: 'En attente',
              value: formatCurrency(totalPending, 'EUR'),
              icon: AlertCircle,
              color: 'text-amber-600',
              bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
              borderColor: 'border-amber-200',
              trend: '-5%',
              trendUp: false,
            },
            {
              title: 'En retard',
              value: formatCurrency(totalOverdue, 'EUR'),
              icon: X,
              color: 'text-red-600',
              bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
              borderColor: 'border-red-200',
              trend: '-15%',
              trendUp: false,
            },
            {
              title: 'Total factures',
              value: invoicesOnly.length.toString(),
              icon: Receipt,
              color: 'text-brand-blue',
              bg: 'bg-gradient-to-br from-brand-blue-ghost to-brand-blue-pale/50',
              borderColor: 'border-brand-blue-pale',
              trend: '+8%',
              trendUp: true,
            },
          ].map((stat, index) => (
            <BentoCard key={stat.title} span={1}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
                <GlassCard
                  variant="premium"
                  hoverable
                  glow={index === 2 && totalOverdue > 0}
                  glowColor="rgba(239, 68, 68, 0.2)"
                  className={cn("h-full p-8 border-2", stat.borderColor, stat.bg)}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        {stat.title}
                      </p>
                      <div className={cn("text-3xl font-black tracking-tighter font-display mt-2", stat.color)}>
                        {stat.value}
                      </div>
                    </div>
                    <motion.div
                      className={cn("p-4 rounded-2xl shadow-lg", stat.bg)}
                      whileHover={{ scale: 1.15, rotate: 10 }}
                      transition={{ duration: 0.3 }}
                    >
                      <stat.icon className={cn("h-6 w-6", stat.color)} />
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-200/50">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.3, type: 'spring' }}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
                        stat.trendUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      )}
                    >
                      {stat.trendUp ? '↗' : '↘'} {stat.trend}
                    </motion.div>
                    <span className="text-xs text-gray-500 font-medium">vs mois dernier</span>
                  </div>
                </GlassCard>
              </motion.div>
            </BentoCard>
          ))}
        </BentoGrid>
      </div>

      {/* Onglets et Filtres - Design Premium */}
      <div>
        <GlassCard variant="default" className="p-4 shadow-xl">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            {/* Onglets avec Animation */}
            <div className="relative flex p-1.5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl w-full lg:w-auto shadow-inner">
              {(['all', 'quotes', 'invoices'] as const).map((tab) => (
                <motion.button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'relative px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 flex-1 lg:flex-none',
                    activeTab === tab
                      ? 'text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                  whileHover={{ scale: activeTab !== tab ? 1.05 : 1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="activeTabBg"
                      className="absolute inset-0 bg-gradient-to-r from-brand-blue to-brand-cyan rounded-xl shadow-lg"
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                    />
                  )}
                  <span className="relative z-10">
                    {tab === 'all' ? 'Tous' : tab === 'quotes' ? 'Devis' : 'Factures'}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Barre de Recherche et Filtres */}
            <div className="flex flex-1 w-full lg:w-auto gap-3">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-blue transition-all duration-300 group-focus-within:scale-110" />
                <input
                  type="text"
                  placeholder="Rechercher un document..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm font-medium placeholder:text-gray-400"
                />
              </div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'h-12 px-5 gap-2 rounded-xl font-semibold transition-all duration-300',
                    showFilters
                      ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtres
                </Button>
              </motion.div>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -20 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="overflow-hidden"
              >
                <div className="pt-6 mt-6 grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-gray-200">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-2"
                  >
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                      Statut
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/10 outline-none text-sm font-medium transition-all shadow-sm"
                    >
                      <option value="all">Tous les statuts</option>
                      <option value="paid">✓ Payée</option>
                      <option value="sent">→ Envoyée</option>
                      <option value="partial">⚡ Partielle</option>
                      <option value="overdue">⚠ En retard</option>
                      <option value="draft">📝 Brouillon</option>
                    </select>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-2"
                  >
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                      Période
                    </label>
                    <select
                      value={dateRangeFilter}
                      onChange={(e) => setDateRangeFilter(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 focus:border-brand-cyan/50 focus:ring-4 focus:ring-brand-cyan/10 outline-none text-sm font-medium transition-all shadow-sm"
                    >
                      <option value="all">Toutes les périodes</option>
                      <option value="month">📅 Ce mois</option>
                      <option value="quarter">📊 Ce trimestre</option>
                      <option value="year">📆 Cette année</option>
                    </select>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-widest">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Type de document
                    </label>
                    <select
                      value={documentTypeFilter}
                      onChange={(e) => setDocumentTypeFilter((e.target.value || 'all') as 'all' | 'quote' | 'invoice')}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 outline-none text-sm font-medium transition-all shadow-sm"
                    >
                      <option value="all">Tous les types</option>
                      <option value="quote">📄 Devis</option>
                      <option value="invoice">🧾 Factures</option>
                    </select>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Graphiques — même niveau que Formations / Programmes / Sessions */}
      {!paymentStats && !isPaymentStatsError && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[320px]">
          <GlassCard variant="default" className="p-6 border-2 border-gray-100">
            <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-6" />
            <div className="h-[300px] rounded-2xl bg-gray-100 animate-pulse" />
          </GlassCard>
          <GlassCard variant="default" className="p-6 border-2 border-gray-100">
            <div className="h-5 w-56 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse mb-6" />
            <div className="h-[300px] rounded-2xl bg-gray-100 animate-pulse" />
          </GlassCard>
        </div>
      )}
      {isPaymentStatsError && (
        <div className="grid grid-cols-1 gap-6 min-h-[320px]">
          <GlassCard variant="default" className="p-6 border-2 border-amber-100">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Impossible de charger les graphiques</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-md">
                {paymentStatsError instanceof Error ? paymentStatsError.message : 'Une erreur est survenue.'}
              </p>
              <Button variant="outline" onClick={() => refetchPaymentStats()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
      {!isLoadingPaymentStats && !isPaymentStatsError && paymentStats && (paymentStats.byMethod?.length > 0 || paymentStats.monthlyData?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[320px]">
          {paymentStats.byMethod?.length > 0 && (
            <div className="h-full min-h-[320px]">
              <GlassCard variant="default" className="p-6 h-full">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-brand-blue" />
                    Méthodes de paiement
                  </h3>
                </div>
                <div className="h-[300px]">
                  <PremiumPieChart
                    data={paymentStats.byMethod.map((m) => ({ name: m.name, value: m.value }))}
                    colors={paymentStats.byMethod.map((m) => m.color)}
                    variant="default"
                    className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                    innerRadius={70}
                  />
                </div>
              </GlassCard>
            </div>
          )}

          {paymentStats.monthlyData?.length > 0 && (
            <div className="h-full min-h-[320px]">
              <GlassCard variant="default" className="p-6 h-full">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-brand-cyan" />
                    Évolution des paiements
                  </h3>
                </div>
                <div className="h-[300px]">
                  <PremiumBarChart
                    data={paymentStats.monthlyData}
                    dataKey="amount"
                    xAxisKey="month"
                    color="#335ACF"
                    variant="default"
                    className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                  />
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      )}

      {/* Liste des documents Premium */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <GlassCard variant="premium" className="p-16 text-center border-2 border-dashed border-gray-200">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Receipt className="h-12 w-12 text-gray-300" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3 font-display">Aucun document trouvé</h3>
              <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
                {search || statusFilter !== 'all' || documentTypeFilter !== 'all'
                  ? 'Essayez de modifier vos filtres de recherche.'
                  : 'Commencez par créer votre premier document de paiement.'}
              </p>
              {!search && statusFilter === 'all' && documentTypeFilter === 'all' && (
                <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/dashboard/payments/new">
                    <Button className="h-12 px-8 text-base font-semibold shadow-lg">
                      <Plus className="mr-2 h-5 w-5" />
                      Créer un document
                    </Button>
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </GlassCard>
        ) : (
          <GlassCard variant="premium" className="p-6 border-2 border-gray-100">
            {(() => {
              const byStatus = (filteredInvoices as InvoiceWithRelations[]).reduce(
                (acc, invoice) => {
                  const status = invoice.status || 'draft'
                  if (!acc[status]) acc[status] = []
                  acc[status].push(invoice)
                  return acc
                },
                {} as Record<string, InvoiceWithRelations[]>
              )

              const preferredOrder = ['draft', 'sent', 'partial', 'overdue', 'paid', 'cancelled']
              const allStatuses = Object.keys(byStatus)
              const orderedStatuses = [
                ...preferredOrder.filter((s) => (byStatus[s]?.length || 0) > 0),
                ...allStatuses.filter((s) => !preferredOrder.includes(s)).sort(),
              ]

              return (
                <Accordion type="multiple" className="divide-y divide-gray-100">
                  {orderedStatuses.map((status) => {
                    const invoicesForStatus = byStatus[status] || []
                    const count = invoicesForStatus.length
                    if (count === 0) return null

                    return (
                      <AccordionItem key={status} value={status} className="border-0">
                        <AccordionTrigger className="py-5">
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                'px-3 py-1.5 rounded-xl text-xs font-bold border-2 shadow-sm',
                                getStatusColor(status)
                              )}
                            >
                              {getStatusLabel(status)}
                            </span>
                            <span className="text-sm text-gray-500 font-medium">
                              {count} document{count > 1 ? 's' : ''}
                            </span>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="pt-2 pb-6 text-gray-900 text-base">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            <AnimatePresence mode="popLayout">
                              {invoicesForStatus.map((invoice, index) => {
                                const isQuote = (invoice as InvRow).document_type === 'quote'
                                const student = invoice.students
                                return (
                                  <motion.div
                                    key={invoice.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95, y: 12 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -12 }}
                                    transition={{ delay: index * 0.02, duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                                  >
                                    <Link href={`/dashboard/payments/${invoice.id}`}>
                                      <motion.div whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.3 }}>
                                        <GlassCard
                                          variant="premium"
                                          hoverable
                                          className="h-full p-6 group flex flex-col justify-between relative overflow-hidden border-2 border-gray-100 hover:border-brand-blue/30 transition-all duration-300"
                                        >
                                          {/* Badge Devis/Facture */}
                                          {isQuote && (
                                            <div className="absolute top-0 right-0 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 text-[10px] font-bold px-3 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-sm">
                                              Devis
                                            </div>
                                          )}

                                          <div>
                                            <div className="flex items-start justify-between mb-5">
                                              <motion.div
                                                whileHover={{ scale: 1.15, rotate: 8 }}
                                                transition={{ duration: 0.3 }}
                                                className={cn(
                                                  'h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg',
                                                  isQuote
                                                    ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600'
                                                    : 'bg-gradient-to-br from-brand-blue-ghost to-brand-blue-pale text-brand-blue'
                                                )}
                                              >
                                                {isQuote ? <FileText className="h-6 w-6" /> : <Receipt className="h-6 w-6" />}
                                              </motion.div>
                                              <span
                                                className={cn(
                                                  'px-3 py-1.5 rounded-xl text-xs font-bold border-2 shadow-sm',
                                                  getStatusColor(invoice.status || 'draft')
                                                )}
                                              >
                                                {getStatusLabel(invoice.status || 'draft')}
                                              </span>
                                            </div>

                                            <div className="mb-5">
                                              <h3 className="text-lg font-black text-gray-900 truncate group-hover:text-brand-blue transition-colors font-display tracking-tight">
                                                {invoice.invoice_number || 'Brouillon'}
                                              </h3>
                                              <p className="text-sm text-gray-500 mt-1.5 font-medium">
                                                {student ? `${student.first_name} ${student.last_name}` : 'Client inconnu'}
                                              </p>
                                            </div>

                                            <div className="space-y-3 text-sm">
                                              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                                <span className="text-gray-500 font-medium">Montant</span>
                                                <span className="text-lg font-black text-brand-blue font-display">
                                                  {formatCurrency(Number(invoice.total_amount), invoice.currency || 'EUR')}
                                                </span>
                                              </div>
                                              {invoice.issue_date && (
                                                <div className="flex items-center justify-between text-xs">
                                                  <span className="text-gray-400 font-medium">Date d'émission</span>
                                                  <span className="text-gray-600 font-semibold">{formatDate(invoice.issue_date)}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          <div className="mt-6 pt-5 border-t-2 border-gray-100 flex items-center justify-between">
                                            {isQuote ? (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 text-xs font-semibold hover:text-brand-blue hover:bg-brand-blue-ghost -ml-2 px-3"
                                                onClick={(e) => {
                                                  e.preventDefault()
                                                  convertQuoteMutation.mutate(invoice.id)
                                                }}
                                                disabled={convertQuoteMutation.isPending}
                                              >
                                                Convertir en facture
                                              </Button>
                                            ) : (
                                              <span className="text-xs text-gray-400 font-medium">Voir les détails</span>
                                            )}
                                            <motion.div whileHover={{ x: 2, y: -2 }} transition={{ duration: 0.2 }}>
                                              <ArrowUpRight className="h-5 w-5 text-gray-300 group-hover:text-brand-blue transition-colors" />
                                            </motion.div>
                                          </div>
                                        </GlassCard>
                                      </motion.div>
                                    </Link>
                                  </motion.div>
                                )
                              })}
                            </AnimatePresence>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )
            })()}
          </GlassCard>
        )}
      </div>

      {/* Section Charges - Tableau de Bord */}
      <div>
        <GlassCard variant="premium" className="p-8 border-2 border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-3 rounded-2xl bg-gradient-to-br from-red-50 to-red-100"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <TrendingDown className="h-6 w-6 text-red-600" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight font-display">
                  Tableau de bord des charges
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  Suivez et analysez vos dépenses de session
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChargeForm(true)
                    setShowChargesSection(true)
                  }}
                  className="h-11 px-5 font-semibold"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle charge
                </Button>
              </motion.div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChargesSection(!showChargesSection)}
                className="h-11 w-11"
              >
                {showChargesSection ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Statistiques des charges */}
          {(() => {
            const chargesArray = allCharges || []
            const totalCharges = chargesArray.reduce<number>((sum, c) => sum + Number((c as ChargeRow).amount ?? 0), 0)
            const paidCharges = chargesArray.filter((c) => (c as ChargeRow).payment_status === 'paid')
            const totalPaidCharges = paidCharges.reduce<number>((sum, c) => sum + Number((c as ChargeRow).amount ?? 0), 0)
            const pendingCharges = chargesArray.filter((c) => (c as ChargeRow).payment_status === 'pending')
            const totalPendingCharges = pendingCharges.reduce<number>((sum, c) => sum + Number((c as ChargeRow).amount ?? 0), 0)
            const cancelledCharges = chargesArray.filter((c) => (c as ChargeRow).payment_status === 'cancelled')
            const totalCancelledCharges = cancelledCharges.reduce<number>((sum, c) => sum + Number((c as ChargeRow).amount ?? 0), 0)

            // Grouper par catégorie
            const byCategory: Record<string, { name: string; amount: number; count: number }> = {}
            chargesArray.forEach((c) => {
              const row = c as ChargeRow
              const catId = row.category_id || 'uncategorized'
              const catName = row.charge_categories?.name || 'Non catégorisé'
              if (!byCategory[catId]) {
                byCategory[catId] = { name: catName, amount: 0, count: 0 }
              }
              byCategory[catId].amount += Number(row.amount ?? 0)
              byCategory[catId].count += 1
            })

            const categoryData = Object.entries(byCategory).map(([id, data], index) => ({
              name: data.name,
              value: Math.round(data.amount),
              count: data.count,
              color: ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'][index % 7],
            }))

            // Grouper par mois
            const byMonth: Record<string, number> = {}
            chargesArray.forEach((c) => {
              const row = c as ChargeRow
              if (row.charge_date) {
                const date = new Date(row.charge_date)
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                byMonth[monthKey] = (byMonth[monthKey] || 0) + Number(row.amount ?? 0)
              }
            })

            const monthlyChargesData = Object.entries(byMonth)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(-6)
              .map(([month, amount]) => ({
                month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
                amount: Math.round(amount),
              }))

            return (
              <>
                {/* Cartes statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    {
                      title: 'Total des charges',
                      value: formatCurrency(totalCharges, 'EUR'),
                      count: chargesArray.length,
                      icon: TrendingDown,
                      color: 'text-red-600',
                      bg: 'bg-gradient-to-br from-red-50 to-red-100/50',
                      borderColor: 'border-red-200',
                    },
                    {
                      title: 'Charges payées',
                      value: formatCurrency(totalPaidCharges, 'EUR'),
                      count: paidCharges.length,
                      icon: CheckCircle,
                      color: 'text-emerald-600',
                      bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50',
                      borderColor: 'border-emerald-200',
                    },
                    {
                      title: 'En attente',
                      value: formatCurrency(totalPendingCharges, 'EUR'),
                      count: pendingCharges.length,
                      icon: AlertCircle,
                      color: 'text-amber-600',
                      bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50',
                      borderColor: 'border-amber-200',
                    },
                    {
                      title: 'Annulées',
                      value: formatCurrency(totalCancelledCharges, 'EUR'),
                      count: cancelledCharges.length,
                      icon: X,
                      color: 'text-gray-600',
                      bg: 'bg-gradient-to-br from-gray-50 to-gray-100/50',
                      borderColor: 'border-gray-200',
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                    >
                      <div className={cn("p-5 rounded-2xl border-2", stat.borderColor, stat.bg)}>
                        <div className="flex items-start justify-between mb-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {stat.title}
                          </p>
                          <div className={cn("p-2 rounded-xl", stat.bg)}>
                            <stat.icon className={cn("h-4 w-4", stat.color)} />
                          </div>
                        </div>
                        <div className={cn("text-2xl font-black tracking-tight font-display", stat.color)}>
                          {stat.value}
                        </div>
                        <p className="text-xs text-gray-500 mt-2 font-medium">
                          {stat.count} charge{stat.count > 1 ? 's' : ''}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Graphiques charges — même niveau que Formations / Programmes / Paiements */}
                {(categoryData.length > 0 || monthlyChargesData.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[320px] mb-8">
                    {categoryData.length > 0 && (
                      <div className="h-full min-h-[320px]">
                        <GlassCard variant="default" className="p-6 h-full">
                          <div className="mb-6 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                              <Receipt className="h-5 w-5 text-brand-blue" />
                              Répartition par catégorie
                            </h3>
                          </div>
                          <div className="h-[300px]">
                            <PremiumPieChart
                              data={categoryData.map((c) => ({ name: c.name, value: c.value }))}
                              colors={categoryData.map((c) => c.color)}
                              variant="default"
                              className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                              innerRadius={70}
                            />
                          </div>
                        </GlassCard>
                      </div>
                    )}

                    {monthlyChargesData.length > 0 && (
                      <div className="h-full min-h-[320px]">
                        <GlassCard variant="default" className="p-6 h-full">
                          <div className="mb-6 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                              <TrendingDown className="h-5 w-5 text-brand-cyan" />
                              Évolution des charges
                            </h3>
                          </div>
                          <div className="h-[300px]">
                            <PremiumBarChart
                              data={monthlyChargesData}
                              dataKey="amount"
                              xAxisKey="month"
                              color="#EF4444"
                              variant="default"
                              className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                            />
                          </div>
                        </GlassCard>
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          })()}

          {/* Liste détaillée des charges (dépliable) */}
          <AnimatePresence>
            {showChargesSection && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="overflow-hidden"
              >
                <div className="pt-6 border-t border-gray-200 space-y-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Liste des charges</h3>

                  {showChargeForm && (
                    <div className="border rounded-xl p-6 bg-gray-50/80 backdrop-blur-sm">
                      <h4 className="font-semibold mb-4">Créer une nouvelle charge</h4>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          createChargeMutation.mutate()
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium mb-2">Session *</label>
                          <select
                            required
                            value={selectedSessionId}
                            onChange={(e) => setSelectedSessionId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                          >
                            <option value="">Sélectionner une session</option>
                            {sessions?.map((session: SessionOption) => (
                              <option key={session.id} value={session.id}>
                                {session.name} ({session.start_date ? new Date(session.start_date).toLocaleDateString('fr-FR') : 'N/A'})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Description *</label>
                          <input
                            type="text"
                            required
                            value={chargeForm.description}
                            onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            placeholder="Ex: Location de salle pour la formation"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Montant *</label>
                            <input
                              type="number"
                              required
                              step="0.01"
                              min="0.01"
                              value={chargeForm.amount}
                              onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Devise</label>
                            <select
                              value={chargeForm.currency}
                              onChange={(e) => setChargeForm({ ...chargeForm, currency: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            >
                              <option value="EUR">EUR</option>
                              <option value="USD">USD</option>
                              <option value="XOF">XOF</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Date *</label>
                            <input
                              type="date"
                              required
                              value={chargeForm.charge_date}
                              onChange={(e) => setChargeForm({ ...chargeForm, charge_date: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Catégorie</label>
                            <select
                              value={chargeForm.category_id}
                              onChange={(e) => setChargeForm({ ...chargeForm, category_id: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            >
                              <option value="">Sélectionner une catégorie</option>
                              {chargeCategories?.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Méthode de paiement</label>
                            <select
                              value={chargeForm.payment_method}
                              onChange={(e) => setChargeForm({ ...chargeForm, payment_method: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            >
                              <option value="">Non spécifié</option>
                              <option value="cash">Espèces</option>
                              <option value="bank_transfer">Virement bancaire</option>
                              <option value="card">Carte bancaire</option>
                              <option value="mobile_money">Mobile Money</option>
                              <option value="check">Chèque</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Statut de paiement</label>
                            <select
                              value={chargeForm.payment_status}
                              onChange={(e) => setChargeForm({ ...chargeForm, payment_status: e.target.value as 'pending' | 'paid' | 'cancelled' })}
                              className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            >
                              <option value="pending">En attente</option>
                              <option value="paid">Payé</option>
                              <option value="cancelled">Annulé</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Fournisseur</label>
                          <input
                            type="text"
                            value={chargeForm.vendor}
                            onChange={(e) => setChargeForm({ ...chargeForm, vendor: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            placeholder="Nom du fournisseur/prestataire"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">N° facture fournisseur</label>
                            <input
                              type="text"
                              value={chargeForm.vendor_invoice_number}
                              onChange={(e) => setChargeForm({ ...chargeForm, vendor_invoice_number: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                              placeholder="N° de facture"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2">Date facture fournisseur</label>
                            <input
                              type="date"
                              value={chargeForm.vendor_invoice_date}
                              onChange={(e) => setChargeForm({ ...chargeForm, vendor_invoice_date: e.target.value })}
                              className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Notes</label>
                          <textarea
                            value={chargeForm.notes}
                            onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 rounded-lg bg-white border focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                            placeholder="Notes supplémentaires..."
                          />
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setShowChargeForm(false)
                              setSelectedSessionId('')
                            }}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="submit"
                            className="flex-1"
                            disabled={createChargeMutation.isPending}
                          >
                            {createChargeMutation.isPending ? 'Création...' : 'Créer la charge'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                  {!showChargeForm && (
                    <div className="space-y-4">
                      {(() => {
                        if (isLoadingCharges) {
                          return (
                            <div className="text-center py-8">
                              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                              <p className="mt-4 text-muted-foreground">Chargement des charges...</p>
                            </div>
                          )
                        }

                        if (allCharges && allCharges.length > 0) {
                          return (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-gray-600">
                                  {allCharges.length} charge{allCharges.length > 1 ? 's' : ''} enregistrée{allCharges.length > 1 ? 's' : ''}
                                </p>
                                <Button variant="outline" size="sm" onClick={() => setShowChargeForm(true)}>
                                  <Plus className="mr-2 h-4 w-4" />
                                  Ajouter
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {allCharges.map((charge) => {
                                  const ch = charge as ChargeRow
                                  const session = ch.sessions
                                  const category = ch.charge_categories
                                  const statusColors = {
                                    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                                    paid: 'bg-green-100 text-green-800 border-green-200',
                                    cancelled: 'bg-red-100 text-red-800 border-red-200',
                                  }
                                  return (
                                    <motion.div
                                      key={ch.id}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="border rounded-xl p-4 bg-white hover:shadow-md transition-all duration-200"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2">
                                            <h5 className="font-semibold text-gray-900">{ch.description ?? ''}</h5>
                                            <span
                                              className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                                                statusColors[ch.payment_status as keyof typeof statusColors] || statusColors.pending
                                              }`}
                                            >
                                              {ch.payment_status === 'pending'
                                                ? 'En attente'
                                                : ch.payment_status === 'paid'
                                                ? 'Payé'
                                                : 'Annulé'}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                            <div>
                                              <span className="font-medium">Montant:</span>{' '}
                                              <span className="font-bold text-gray-900">
                                                {formatCurrency(Number(ch.amount ?? 0), ch.currency || 'EUR')}
                                              </span>
                                            </div>
                                            {session && (
                                              <div>
                                                <span className="font-medium">Session:</span>{' '}
                                                <span className="text-gray-900">{session.name}</span>
                                              </div>
                                            )}
                                            {category && (
                                              <div>
                                                <span className="font-medium">Catégorie:</span>{' '}
                                                <span className="text-gray-900">{category.name}</span>
                                              </div>
                                            )}
                                            {ch.charge_date && (
                                              <div>
                                                <span className="font-medium">Date:</span>{' '}
                                                <span className="text-gray-900">{formatDate(ch.charge_date)}</span>
                                              </div>
                                            )}
                                          </div>
                                          {ch.vendor && (
                                            <div className="mt-2 text-sm text-gray-600">
                                              <span className="font-medium">Fournisseur:</span>{' '}
                                              <span className="text-gray-900">{ch.vendor}</span>
                                            </div>
                                          )}
                                          {ch.notes && (
                                            <div className="mt-2 text-sm text-gray-600">
                                              <span className="font-medium">Notes:</span>{' '}
                                              <span className="text-gray-900">{ch.notes}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        }

                        return (
                          <div className="text-center py-8 text-muted-foreground">
                            <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Aucune charge enregistrée pour le moment.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-4"
                              onClick={() => setShowChargeForm(true)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Ajouter une charge
                            </Button>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>
    </div>
  )
}
