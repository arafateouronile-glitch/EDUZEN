'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { invoiceService } from '@/lib/services/invoice.service'
import { paymentService } from '@/lib/services/payment.service'
import { sessionChargesService } from '@/lib/services/session-charges.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Plus, Search, FileText, AlertCircle, CheckCircle, TrendingUp, Calendar, Download, Filter, X, ArrowRight, DollarSign, Receipt, CreditCard, ArrowUpRight, SlidersHorizontal, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import Link from 'next/link'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { motion, AnimatePresence } from '@/components/ui/motion'
import type { TableRow } from '@/lib/types/supabase-helpers'
import type { InvoiceWithRelations } from '@/lib/types/query-types'
import { CardTitle } from '@/components/ui/card'
import { RoleGuard, FINANCE_ROLES } from '@/components/auth/role-guard'

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
        console.error('Erreur récupération sessions:', error)
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
    enabled: !!user?.organization_id && showChargesSection,
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
      } catch (error: any) {
        if (error?.code === 'PGRST116' || error?.code === '42P01') return []
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Filtrer selon l'onglet actif
  const filteredInvoices = invoices?.filter((inv: any) => {
    if (activeTab === 'quotes') {
      return (inv as any).document_type === 'quote'
    } else if (activeTab === 'invoices') {
      return (inv as any).document_type === 'invoice' || !(inv as any).document_type
    }
    return true
  }) || []

  // Récupérer les factures impayées
  const { data: overdueInvoices } = useQuery({
    queryKey: ['overdue-invoices', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      try {
        return await invoiceService.getOverdue(user.organization_id)
      } catch (error: any) {
        if (error?.code === 'PGRST116' || error?.code === '42P01') return []
        throw error
      }
    },
    enabled: !!user?.organization_id,
    retry: false,
  })

  // Calculer les statistiques des paiements par période
  const { data: paymentStats } = useQuery({
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
          startDate = null
      }

      let query = supabase
        .from('payments')
        .select('amount, currency, payment_method, paid_at')
        .eq('organization_id', user.organization_id)
        .eq('status', 'completed')

      if (startDate) {
        query = query.gte('paid_at', startDate.toISOString())
      }

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
          console.warn('Erreur lors de la récupération des paiements:', error.message)
          return { totalAmount: 0, count: 0, byMethod: [], monthlyData: [] }
        }
        throw error
      }

      const paymentsArray = (payments as Payment[]) || []
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
               method === 'mobile_money' ? '#34B9EE' :
               method === 'card' ? '#3B82F6' :
               method === 'bank_transfer' ? '#8B5CF6' : '#6B7280',
      }))

      return {
        totalAmount,
        count: payments?.length || 0,
        byMethod: methodData,
        monthlyData,
      }
    },
    enabled: !!user?.organization_id,
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
  const invoicesOnly = invoices?.filter((inv: any) => 
    (inv as any).document_type === 'invoice' || !(inv as any).document_type
  ) || []

  const totalPaid = invoicesOnly.filter((inv: any) => inv.status === 'paid')
    .reduce((sum: number, inv: any) => sum + Number(inv.total_amount), 0) || 0
  const totalOverdue = overdueInvoices?.reduce(
    (sum: number, inv: any) => sum + Number(inv.total_amount) - Number(inv.paid_amount || 0),
    0
  ) || 0
  const totalPending = invoicesOnly.filter((inv: any) => ['sent', 'partial'].includes(inv.status))
    .reduce((sum: number, inv: any) => {
      const paidAmount = inv.paid_amount || 0
      return sum + Number(inv.total_amount) - Number(paidAmount)
    }, 0) || 0

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }
    }
  }

  return (
    <motion.div
      className="space-y-8 pb-12 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Premium avec Gradient Background */}
      <motion.div variants={itemVariants} className="relative">
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
      </motion.div>

      {/* Statistiques Premium avec Glassmorphism */}
      <motion.div variants={itemVariants}>
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
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
      </motion.div>

      {/* Onglets et Filtres - Design Premium */}
      <motion.div variants={itemVariants}>
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
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
                      onChange={(e) => setDocumentTypeFilter(e.target.value as any)}
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
      </motion.div>

      {/* Graphiques Premium avec Glassmorphism */}
      {paymentStats && (paymentStats.byMethod.length > 0 || paymentStats.monthlyData.length > 0) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {paymentStats.byMethod.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <GlassCard variant="premium" className="p-8 h-full border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="p-3 rounded-2xl bg-gradient-to-br from-brand-blue-ghost to-brand-blue-pale"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <CreditCard className="h-6 w-6 text-brand-blue" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight font-display">
                        Méthodes de paiement
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">Répartition par type</p>
                    </div>
                  </div>
                </div>
                <div className="h-[340px] relative">
                  <div className="absolute inset-0 bg-gradient-mesh opacity-20 rounded-2xl" />
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentStats.byMethod}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={6}
                        dataKey="value"
                      >
                        {paymentStats.byMethod.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value), 'EUR')}
                        contentStyle={{
                          borderRadius: '16px',
                          border: 'none',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                          padding: '12px 16px',
                          fontWeight: '600',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={48}
                        wrapperStyle={{ fontSize: '14px', fontWeight: '600' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {paymentStats.monthlyData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <GlassCard variant="premium" className="p-8 h-full border-2 border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="mb-8 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="p-3 rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <TrendingUp className="h-6 w-6 text-brand-cyan" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight font-display">
                        Évolution des paiements
                      </h3>
                      <p className="text-sm text-gray-500 font-medium">6 derniers mois</p>
                    </div>
                  </div>
                </div>
                <div className="h-[340px] relative">
                  <div className="absolute inset-0 bg-gradient-aurora opacity-20 rounded-2xl" />
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={paymentStats.monthlyData}>
                      <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#E5E7EB" />
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12, fontWeight: '600' }}
                        dy={12}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#6B7280', fontSize: 12, fontWeight: '600' }}
                        dx={-10}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value), 'EUR')}
                        contentStyle={{
                          borderRadius: '16px',
                          border: 'none',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                          padding: '12px 16px',
                          fontWeight: '600',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="url(#colorGradient)"
                        strokeWidth={4}
                        dot={{ fill: '#34B9EE', r: 5, strokeWidth: 3, stroke: '#fff' }}
                        activeDot={{ r: 7, strokeWidth: 0, fill: '#274472' }}
                      />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#274472" />
                          <stop offset="100%" stopColor="#34B9EE" />
                        </linearGradient>
                      </defs>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Liste des documents Premium */}
      <motion.div variants={itemVariants}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            <AnimatePresence mode="popLayout">
              {(filteredInvoices as InvoiceWithRelations[]).map((invoice, index) => {
                const isQuote = (invoice as any).document_type === 'quote'
                const student = invoice.students
                return (
                  <motion.div
                    key={invoice.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    transition={{ delay: index * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link href={`/dashboard/payments/${invoice.id}`}>
                      <motion.div
                        whileHover={{ y: -8, scale: 1.02 }}
                        transition={{ duration: 0.3 }}
                      >
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
                                  getStatusColor(invoice.status)
                                )}
                              >
                                {getStatusLabel(invoice.status)}
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
                            <motion.div
                              whileHover={{ x: 2, y: -2 }}
                              transition={{ duration: 0.2 }}
                            >
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
        )}
      </motion.div>

      {/* Section Charges */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="default" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h3 className="font-bold text-gray-900">Charges de session</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowChargeForm(true)
                  setShowChargesSection(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle charge
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChargesSection(!showChargesSection)}
              >
                {showChargesSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {showChargesSection && (
            <div className="space-y-4">
              {showChargeForm && (
                <div className="border rounded-lg p-6 bg-gray-50">
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
                        {sessions?.map((session: any) => (
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
                  {isLoadingCharges ? (
                    <div className="text-center py-8">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                      <p className="mt-4 text-muted-foreground">Chargement des charges...</p>
                    </div>
                  ) : allCharges && allCharges.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900">
                          {allCharges.length} charge{allCharges.length > 1 ? 's' : ''} enregistrée{allCharges.length > 1 ? 's' : ''}
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowChargeForm(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Ajouter une charge
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {allCharges.map((charge: any) => {
                          const session = charge.sessions
                          const category = charge.charge_categories
                          const statusColors = {
                            pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                            paid: 'bg-green-100 text-green-800 border-green-200',
                            cancelled: 'bg-red-100 text-red-800 border-red-200',
                          }
                          return (
                            <div
                              key={charge.id}
                              className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h5 className="font-semibold text-gray-900">
                                      {charge.description}
                                    </h5>
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium border ${
                                        statusColors[charge.payment_status as keyof typeof statusColors] || statusColors.pending
                                      }`}
                                    >
                                      {charge.payment_status === 'pending'
                                        ? 'En attente'
                                        : charge.payment_status === 'paid'
                                        ? 'Payé'
                                        : 'Annulé'}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                    <div>
                                      <span className="font-medium">Montant:</span>{' '}
                                      <span className="font-bold text-gray-900">
                                        {formatCurrency(Number(charge.amount), charge.currency || 'EUR')}
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
                                    {charge.charge_date && (
                                      <div>
                                        <span className="font-medium">Date:</span>{' '}
                                        <span className="text-gray-900">
                                          {formatDate(charge.charge_date)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  {charge.vendor && (
                                    <div className="mt-2 text-sm text-gray-600">
                                      <span className="font-medium">Fournisseur:</span>{' '}
                                      <span className="text-gray-900">{charge.vendor}</span>
                                    </div>
                                  )}
                                  {charge.notes && (
                                    <div className="mt-2 text-sm text-gray-600">
                                      <span className="font-medium">Notes:</span>{' '}
                                      <span className="text-gray-900">{charge.notes}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Gérez les charges (dépenses) associées aux sessions de formation.</p>
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
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}
