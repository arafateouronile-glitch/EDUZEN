'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn, formatCurrency } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import { exportData } from '@/lib/utils/export'
import { useToast } from '@/components/ui/toast'
import dynamic from 'next/dynamic'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  GraduationCap,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Filter,
  RefreshCw,
  ChevronDown,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BookOpen,
  Target,
  Activity,
  PieChart,
  LayoutDashboard
} from 'lucide-react'

// Lazy load des graphiques
const PremiumLineChart = dynamic(
  () => import('@/components/charts/premium-line-chart').then(mod => ({ default: mod.PremiumLineChart })),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" /> }
)

const PremiumPieChart = dynamic(
  () => import('@/components/charts/premium-pie-chart').then(mod => ({ default: mod.PremiumPieChart })),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" /> }
)

// Types
type ReportTab = 'overview' | 'sessions' | 'students' | 'finances' | 'attendance'
type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'custom'

interface FilterState {
  dateRange: DateRange
  customStart?: string
  customEnd?: string
  sessionId?: string
  formationId?: string
  status?: string
  search?: string
}

// Composant StatCard
function StatCard({ 
  title, 
  value, 
  change, 
  changeType,
  icon: Icon, 
  color,
  description
}: { 
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: React.ElementType
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal'
  description?: string
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    teal: 'bg-teal-50 text-teal-600 border-teal-200',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-xl border-2 p-5', colorClasses[color])}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              changeType === 'increase' ? 'text-green-600' :
              changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
            )}>
              {changeType === 'increase' ? <ArrowUpRight className="h-4 w-4" /> :
               changeType === 'decrease' ? <ArrowDownRight className="h-4 w-4" /> :
               <Minus className="h-4 w-4" />}
              <span>{change > 0 ? '+' : ''}{change}%</span>
              <span className="text-gray-400 font-normal">vs période précédente</span>
            </div>
          )}
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </motion.div>
  )
}

// Composant de tableau réutilisable
function DataTable({ 
  columns, 
  data, 
  emptyMessage = 'Aucune donnée',
  onRowClick
}: { 
  columns: { key: string; label: string; render?: (value: any, row: any) => React.ReactNode }[]
  data: any[]
  emptyMessage?: string
  onRowClick?: (row: any) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th key={col.key} className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <motion.tr
                key={row.id || index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-sm text-gray-900">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// Composant Filtre
function FilterBar({ 
  filters, 
  onChange,
  sessions,
  formations
}: { 
  filters: FilterState
  onChange: (filters: FilterState) => void
  sessions?: { id: string; name: string }[]
  formations?: { id: string; name: string }[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-xl">
      {/* Date Range */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-400" />
        <select
          value={filters.dateRange}
          onChange={(e) => onChange({ ...filters, dateRange: e.target.value as DateRange })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
          <option value="quarter">Ce trimestre</option>
          <option value="year">Cette année</option>
          <option value="custom">Personnalisé</option>
        </select>
      </div>

      {filters.dateRange === 'custom' && (
        <>
          <input
            type="date"
            value={filters.customStart || ''}
            onChange={(e) => onChange({ ...filters, customStart: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          />
          <span className="text-gray-400">à</span>
          <input
            type="date"
            value={filters.customEnd || ''}
            onChange={(e) => onChange({ ...filters, customEnd: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
          />
        </>
      )}

      {/* Formation Filter */}
      {formations && formations.length > 0 && (
        <select
          value={filters.formationId || ''}
          onChange={(e) => onChange({ ...filters, formationId: e.target.value || undefined })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">Toutes les formations</option>
          {formations.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}

      {/* Session Filter */}
      {sessions && sessions.length > 0 && (
        <select
          value={filters.sessionId || ''}
          onChange={(e) => onChange({ ...filters, sessionId: e.target.value || undefined })}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">Toutes les sessions</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      )}

      {/* Status Filter */}
      <select
        value={filters.status || ''}
        onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
        className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
      >
        <option value="">Tous les statuts</option>
        <option value="active">Actif</option>
        <option value="completed">Terminé</option>
        <option value="cancelled">Annulé</option>
      </select>

      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
            className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 bg-white"
          />
        </div>
      </div>

      {/* Reset */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange({ dateRange: 'month' })}
        className="text-gray-500"
      >
        <RefreshCw className="h-4 w-4 mr-1" />
        Réinitialiser
      </Button>
    </div>
  )
}

// Page principale
export default function ReportsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<ReportTab>('overview')
  const [filters, setFilters] = useState<FilterState>({ dateRange: 'month' })
  const [isExporting, setIsExporting] = useState(false)

  // Calcul des dates selon le filtre
  const dateFilter = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date = now

    switch (filters.dateRange) {
      case 'week':
        start = new Date(now.setDate(now.getDate() - 7))
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3)
        start = new Date(now.getFullYear(), quarter * 3, 1)
        break
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        break
      case 'custom':
        start = filters.customStart ? new Date(filters.customStart) : new Date(now.getFullYear(), 0, 1)
        end = filters.customEnd ? new Date(filters.customEnd) : now
        break
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return { start: start.toISOString(), end: end.toISOString() }
  }, [filters.dateRange, filters.customStart, filters.customEnd])

  // Query: Statistiques globales
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['report-stats', user?.organization_id, dateFilter],
    queryFn: async () => {
      if (!user?.organization_id) return null

      const [
        studentsResult,
        sessionsResult,
        enrollmentsResult,
        attendanceResult,
        paymentsResult,
        invoicesResult,
      ] = await Promise.all([
        // Étudiants actifs
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id)
          .eq('status', 'active'),

        // Sessions
        supabase
          .from('sessions')
          .select('*, formations!inner(organization_id)', { count: 'exact' })
          .eq('formations.organization_id', user.organization_id)
          .gte('start_date', dateFilter.start)
          .lte('end_date', dateFilter.end),

        // Inscriptions
        supabase
          .from('enrollments')
          .select('*, sessions!inner(formations!inner(organization_id))', { count: 'exact' })
          .eq('sessions.formations.organization_id', user.organization_id)
          .gte('created_at', dateFilter.start),

        // Présences
        supabase
          .from('attendance')
          .select('status')
          .eq('organization_id', user.organization_id)
          .gte('date', dateFilter.start.split('T')[0]),

        // Paiements
        supabase
          .from('payments')
          .select('amount')
          .eq('organization_id', user.organization_id)
          .eq('status', 'completed')
          .gte('paid_at', dateFilter.start),

        // Factures impayées
        supabase
          .from('invoices')
          .select('total_amount')
          .eq('organization_id', user.organization_id)
          .eq('status', 'overdue'),
      ])

      // Calcul du taux de présence
      const attendanceData = attendanceResult.data || []
      const totalAttendance = attendanceData.length
      const presentCount = attendanceData.filter((a: any) => a.status === 'present' || a.status === 'late').length
      const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0

      // Total des paiements
      const totalPayments = (paymentsResult.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)

      // Total impayés
      const totalOverdue = (invoicesResult.data || []).reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0)

      return {
        students: studentsResult.count || 0,
        sessions: sessionsResult.count || 0,
        enrollments: enrollmentsResult.count || 0,
        attendanceRate,
        totalPayments,
        totalOverdue,
      }
    },
    enabled: !!user?.organization_id,
  })

  // Query: Sessions avec détails
  const { data: sessions } = useQuery({
    queryKey: ['report-sessions', user?.organization_id, dateFilter, filters.formationId],
    queryFn: async () => {
      if (!user?.organization_id) return []

      let query = supabase
        .from('sessions')
        .select(`
          *,
          formations!inner(id, name, organization_id),
          enrollments(count),
          session_slots(count)
        `)
        .eq('formations.organization_id', user.organization_id)
        .order('start_date', { ascending: false })

      if (filters.formationId) {
        query = query.eq('formation_id', filters.formationId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Query: Formations
  const { data: formations } = useQuery({
    queryKey: ['report-formations', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []

      const { data, error } = await supabase
        .from('formations')
        .select('id, name')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Query: Étudiants avec stats
  const { data: studentsData } = useQuery({
    queryKey: ['report-students', user?.organization_id, dateFilter, filters.sessionId],
    queryFn: async () => {
      if (!user?.organization_id) return []

      let query = supabase
        .from('students')
        .select(`
          *,
          enrollments(
            id,
            status,
            sessions(id, name)
          )
        `)
        .eq('organization_id', user.organization_id)
        .order('created_at', { ascending: false })
        .limit(50)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
    enabled: !!user?.organization_id && activeTab === 'students',
  })

  // Tabs configuration
  const tabs: { id: ReportTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'sessions', label: 'Sessions', icon: Calendar },
    { id: 'students', label: 'Apprenants', icon: Users },
    { id: 'attendance', label: 'Présences', icon: CheckCircle2 },
    { id: 'finances', label: 'Finances', icon: CreditCard },
  ]

  // Données pour les graphiques
  const chartData = useMemo(() => {
    // Données exemple - à remplacer par des vraies données
    return {
      enrollmentsTrend: [
        { name: 'Jan', value: 45 },
        { name: 'Fév', value: 52 },
        { name: 'Mar', value: 48 },
        { name: 'Avr', value: 61 },
        { name: 'Mai', value: 55 },
        { name: 'Juin', value: 67 },
      ],
      attendanceDistribution: [
        { name: 'Présent', value: stats?.attendanceRate || 0, color: '#10B981' },
        { name: 'Absent', value: 100 - (stats?.attendanceRate || 0), color: '#EF4444' },
      ],
      paymentsTrend: [
        { name: 'Jan', value: 12500 },
        { name: 'Fév', value: 15000 },
        { name: 'Mar', value: 18200 },
        { name: 'Avr', value: 14800 },
        { name: 'Mai', value: 21000 },
        { name: 'Juin', value: stats?.totalPayments || 0 },
      ],
    }
  }, [stats])

  // Fonction d'export
  const handleExport = async () => {
    if (!user?.organization_id) {
      addToast({
        type: 'error',
        title: 'Erreur',
        description: 'Vous devez être connecté pour exporter les données',
      })
      return
    }

    setIsExporting(true)

    try {
      // Générer le nom de fichier avec la date au format YYYY-MM-DD
      const dateStr = formatDate(new Date(), 'yyyy-MM-dd')
      let dataToExport: Record<string, any>[] = []
      let filename = ''
      let sheetName = ''

      switch (activeTab) {
        case 'overview': {
          // Export des statistiques globales
          dataToExport = [
            {
              'Métrique': 'Apprenants actifs',
              'Valeur': stats?.students || 0,
            },
            {
              'Métrique': 'Sessions en cours',
              'Valeur': stats?.sessions || 0,
            },
            {
              'Métrique': 'Inscriptions',
              'Valeur': stats?.enrollments || 0,
            },
            {
              'Métrique': 'Taux de présence',
              'Valeur': `${stats?.attendanceRate || 0}%`,
            },
            {
              'Métrique': 'Chiffre d\'affaires',
              'Valeur': formatCurrency(stats?.totalPayments || 0),
            },
            {
              'Métrique': 'Impayés',
              'Valeur': formatCurrency(stats?.totalOverdue || 0),
            },
          ]
          filename = `rapport-vue-ensemble-${dateStr}`
          sheetName = 'Vue d\'ensemble'
          break
        }

        case 'sessions': {
          // Export des sessions
          if (!sessions || sessions.length === 0) {
            addToast({
              type: 'warning',
              title: 'Aucune donnée',
              message: 'Aucune session à exporter',
            })
            setIsExporting(false)
            return
          }

          dataToExport = (sessions || []).map((session: any) => ({
            'Session': session.name || '',
            'Formation': session.formations?.name || '',
            'Date de début': session.start_date ? formatDate(session.start_date, 'dd/MM/yyyy') : '',
            'Date de fin': session.end_date ? formatDate(session.end_date, 'dd/MM/yyyy') : '',
            'Statut': session.status === 'ongoing' ? 'En cours' :
                     session.status === 'completed' ? 'Terminée' :
                     session.status === 'planned' ? 'Planifiée' : session.status || '',
            'Inscrits': session.enrollments?.[0]?.count || 0,
          }))
          filename = `rapport-sessions-${dateStr}`
          sheetName = 'Sessions'
          break
        }

        case 'students': {
          // Export des apprenants
          if (!studentsData || studentsData.length === 0) {
            addToast({
              type: 'warning',
              title: 'Aucune donnée',
              message: 'Aucun apprenant à exporter',
            })
            setIsExporting(false)
            return
          }

          dataToExport = (studentsData || []).map((student: any) => ({
            'Nom': `${student.first_name || ''} ${student.last_name || ''}`.trim() || '-',
            'Email': student.email || '',
            'Téléphone': student.phone || '',
            'Statut': student.status === 'active' ? 'Actif' :
                     student.status === 'inactive' ? 'Inactif' : student.status || '',
            'Inscriptions': student.enrollments?.length || 0,
            'Date d\'inscription': student.created_at ? formatDate(student.created_at, 'dd/MM/yyyy') : '',
          }))
          filename = `rapport-apprenants-${dateStr}`
          sheetName = 'Apprenants'
          break
        }

        case 'attendance': {
          // Export des présences (statistiques)
          dataToExport = [
            {
              'Métrique': 'Taux de présence global',
              'Valeur': `${stats?.attendanceRate || 0}%`,
            },
            {
              'Métrique': 'Présences totales',
              'Valeur': stats?.attendanceRate ? Math.round((stats.attendanceRate / 100) * (stats.enrollments || 0)) : 0,
            },
            {
              'Métrique': 'Absences',
              'Valeur': stats?.attendanceRate ? Math.round(((100 - stats.attendanceRate) / 100) * (stats.enrollments || 0)) : 0,
            },
          ]
          filename = `rapport-presences-${dateStr}`
          sheetName = 'Présences'
          break
        }

        case 'finances': {
          // Export des finances
          dataToExport = [
            {
              'Métrique': 'Chiffre d\'affaires',
              'Valeur': formatCurrency(stats?.totalPayments || 0),
            },
            {
              'Métrique': 'Factures en attente',
              'Valeur': formatCurrency(0), // TODO: Récupérer depuis les données
            },
            {
              'Métrique': 'Impayés',
              'Valeur': formatCurrency(stats?.totalOverdue || 0),
            },
            {
              'Métrique': 'Taux de recouvrement',
              'Valeur': stats?.totalPayments && stats?.totalOverdue 
                ? `${Math.round(((stats.totalPayments - stats.totalOverdue) / stats.totalPayments) * 100)}%`
                : '0%',
            },
          ]
          filename = `rapport-finances-${dateStr}`
          sheetName = 'Finances'
          break
        }

        default:
          addToast({
            type: 'error',
            title: 'Erreur',
            message: 'Onglet non supporté pour l\'export',
          })
          setIsExporting(false)
          return
      }

      if (dataToExport.length === 0) {
        addToast({
          type: 'warning',
          title: 'Aucune donnée',
          message: 'Aucune donnée à exporter pour cet onglet',
        })
        setIsExporting(false)
        return
      }

      // Exporter les données
      await exportData(dataToExport, {
        filename,
        sheetName,
        format: 'xlsx',
        entityType: 'other',
        organizationId: user.organization_id,
        userId: user.id,
      })

      addToast({
        type: 'success',
        title: 'Export réussi',
        message: `Les données ont été exportées avec succès (${dataToExport.length} ligne(s))`,
      })
    } catch (error) {
      console.error('Erreur lors de l\'export:', error)
      addToast({
        type: 'error',
        title: 'Erreur d\'export',
        message: error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'export',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapports & Analytics</h1>
          <p className="text-gray-500 mt-1">Suivez l'activité de votre organisation</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Export en cours...' : 'Exporter'}
          </Button>
          <Button 
            className="gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-4">
        {tabs.map((tab) => {
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all',
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              <TabIcon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Filtres */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        sessions={sessions?.map(s => ({ id: s.id, name: s.name }))}
        formations={formations}
      />

      {/* Contenu selon l'onglet */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Apprenants actifs"
                value={stats?.students || 0}
                change={12}
                changeType="increase"
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Sessions en cours"
                value={stats?.sessions || 0}
                change={5}
                changeType="increase"
                icon={Calendar}
                color="purple"
              />
              <StatCard
                title="Taux de présence"
                value={`${stats?.attendanceRate || 0}%`}
                change={-2}
                changeType="decrease"
                icon={CheckCircle2}
                color="green"
              />
              <StatCard
                title="Chiffre d'affaires"
                value={formatCurrency(stats?.totalPayments || 0)}
                change={18}
                changeType="increase"
                icon={CreditCard}
                color="teal"
              />
            </div>

            {/* Graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Évolution des inscriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PremiumLineChart
                    data={chartData.enrollmentsTrend}
                    dataKey="value"
                    xAxisKey="name"
                    height={250}
                    color="#3B82F6"
                    showArea={true}
                    gradientColors={{
                      from: '#3B82F6',
                      to: '#60A5FA'
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-green-600" />
                    Répartition des présences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PremiumPieChart
                    data={chartData.attendanceDistribution}
                    height={250}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Alertes */}
            {stats?.totalOverdue && stats.totalOverdue > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="font-medium text-red-800">Attention : Factures impayées</p>
                  <p className="text-sm text-red-600">
                    {formatCurrency(stats.totalOverdue)} en factures impayées
                  </p>
                </div>
                <Button variant="outline" size="sm" className="ml-auto border-red-300 text-red-600 hover:bg-red-100">
                  Voir les détails
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'sessions' && (
          <motion.div
            key="sessions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Suivi des Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { key: 'name', label: 'Session' },
                    { 
                      key: 'formations', 
                      label: 'Formation',
                      render: (_, row) => row.formations?.name || '-'
                    },
                    { 
                      key: 'start_date', 
                      label: 'Début',
                      render: (value) => value ? formatDate(value) : '-'
                    },
                    { 
                      key: 'end_date', 
                      label: 'Fin',
                      render: (value) => value ? formatDate(value) : '-'
                    },
                    { 
                      key: 'status', 
                      label: 'Statut',
                      render: (value) => (
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          value === 'ongoing' ? 'bg-green-100 text-green-700' :
                          value === 'completed' ? 'bg-blue-100 text-blue-700' :
                          value === 'planned' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {value === 'ongoing' ? 'En cours' :
                           value === 'completed' ? 'Terminée' :
                           value === 'planned' ? 'Planifiée' : value}
                        </span>
                      )
                    },
                    { 
                      key: 'enrollments', 
                      label: 'Inscrits',
                      render: (value) => value?.[0]?.count || 0
                    },
                  ]}
                  data={sessions || []}
                  emptyMessage="Aucune session trouvée"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'students' && (
          <motion.div
            key="students"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Suivi des Apprenants</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={[
                    { 
                      key: 'full_name', 
                      label: 'Nom',
                      render: (_, row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || '-'
                    },
                    { key: 'email', label: 'Email' },
                    { 
                      key: 'status', 
                      label: 'Statut',
                      render: (value) => (
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          value === 'active' ? 'bg-green-100 text-green-700' :
                          value === 'inactive' ? 'bg-gray-100 text-gray-700' :
                          'bg-blue-100 text-blue-700'
                        )}>
                          {value === 'active' ? 'Actif' :
                           value === 'inactive' ? 'Inactif' : value}
                        </span>
                      )
                    },
                    { 
                      key: 'enrollments', 
                      label: 'Inscriptions',
                      render: (value) => value?.length || 0
                    },
                    { 
                      key: 'created_at', 
                      label: 'Inscrit le',
                      render: (value) => value ? formatDate(value) : '-'
                    },
                  ]}
                  data={studentsData || []}
                  emptyMessage="Aucun apprenant trouvé"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'attendance' && (
          <motion.div
            key="attendance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Stats de présence */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Taux de présence global"
                value={`${stats?.attendanceRate || 0}%`}
                icon={CheckCircle2}
                color="green"
              />
              <StatCard
                title="Présences ce mois"
                value="1,245"
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Absences non justifiées"
                value="23"
                icon={AlertCircle}
                color="red"
              />
              <StatCard
                title="Retards"
                value="45"
                icon={Clock}
                color="orange"
              />
            </div>

            {/* Graphique évolution présences */}
            <Card>
              <CardHeader>
                <CardTitle>Évolution du taux de présence</CardTitle>
              </CardHeader>
              <CardContent>
                <PremiumLineChart
                  data={[
                    { name: 'Sem 1', value: 92 },
                    { name: 'Sem 2', value: 88 },
                    { name: 'Sem 3', value: 95 },
                    { name: 'Sem 4', value: 91 },
                  ]}
                  dataKey="value"
                  xAxisKey="name"
                  height={250}
                  color="#10B981"
                  showArea={true}
                  gradientColors={{
                    from: '#10B981',
                    to: '#34D399'
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'finances' && (
          <motion.div
            key="finances"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Stats financières */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard
                title="Chiffre d'affaires"
                value={formatCurrency(stats?.totalPayments || 0)}
                change={18}
                changeType="increase"
                icon={TrendingUp}
                color="green"
              />
              <StatCard
                title="Factures en attente"
                value={formatCurrency(12500)}
                icon={FileText}
                color="orange"
              />
              <StatCard
                title="Impayés"
                value={formatCurrency(stats?.totalOverdue || 0)}
                icon={AlertCircle}
                color="red"
              />
              <StatCard
                title="Taux de recouvrement"
                value="94%"
                icon={Target}
                color="teal"
              />
            </div>

            {/* Graphique revenus */}
            <Card>
              <CardHeader>
                <CardTitle>Évolution du chiffre d'affaires</CardTitle>
              </CardHeader>
              <CardContent>
                <PremiumLineChart
                  data={chartData.paymentsTrend}
                  dataKey="value"
                  xAxisKey="name"
                  height={250}
                  color="#8B5CF6"
                  showArea={true}
                  gradientColors={{
                    from: '#8B5CF6',
                    to: '#A78BFA'
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
