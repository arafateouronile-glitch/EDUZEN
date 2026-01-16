'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, DollarSign, TrendingUp, AlertCircle, BookOpen, ClipboardList, Calendar, Award, TrendingDown, ExternalLink, Clock, Activity, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { TableRow } from '@/lib/types/supabase-helpers'
import type { PaymentWithRelations, InvoiceWithRelations, AttendanceWithRelations, EnrollmentWithRelations, SessionWithRelations } from '@/lib/types/query-types'
import { motion } from '@/components/ui/motion'
import { downloadReportPDF } from '@/lib/utils/report-pdf-export'
import { FileDown } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

// Lazy load des composants de graphiques lourds
const PremiumLineChart = dynamic(() => import('@/components/charts/premium-line-chart').then((mod) => mod.PremiumLineChart), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
})
const PremiumBarChart = dynamic(() => import('@/components/charts/premium-bar-chart').then((mod) => mod.PremiumBarChart), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
})
const PremiumPieChart = dynamic(() => import('@/components/charts/premium-pie-chart').then((mod) => mod.PremiumPieChart), { 
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
})

// Import des composants recharts pour les graphiques personnalisés
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts'

import { performanceMonitor } from '@/lib/utils/performance-monitor'

type Payment = TableRow<'payments'>
type Invoice = TableRow<'invoices'>

export default function DashboardPage() {
  const supabase = createClient() as any // Cast pour éviter les erreurs de types
  const { user } = useAuth()
  const { addToast } = useToast()

  // Récupérer les statistiques générales (optimisé avec Promise.all)
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.organization_id],
    staleTime: 2 * 60 * 1000, // Cache 2 minutes (données dashboard changent peu)
    gcTime: 10 * 60 * 1000, // Garder en cache 10 minutes
    refetchOnWindowFocus: false, // Ne pas refetch au focus
    refetchOnMount: false, // Utiliser cache si disponible
    queryFn: async () => {
      if (!user?.organization_id) return null
      const orgId = user.organization_id // Capture pour TypeScript

      return await performanceMonitor.measure('dashboard_stats', async () => {

      const currentMonth = new Date()
      currentMonth.setDate(1)
      const today = new Date().toISOString().split('T')[0]

      // Paralléliser toutes les requêtes indépendantes
      const [
        studentsResult,
        paymentsResult,
        invoicesResult,
        attendanceResult,
        teachersResult,
        activeSessionsResult,
        activeFormationsResult,
        activeProgramsResult,
        formationsResult,
        completedSessionsResult,
      ] = await Promise.all([
        // Nombre d'élèves actifs
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .eq('status', 'active'),

        // Revenus du mois
        supabase
          .from('payments')
          .select('amount, currency, paid_at')
          .eq('organization_id', user.organization_id)
          .eq('status', 'completed')
          .gte('paid_at', currentMonth.toISOString()),

        // Impayés
        supabase
          .from('invoices')
          .select('total_amount, document_type')
          .eq('organization_id', user.organization_id)
          .eq('status', 'overdue')
          .or('document_type.eq.invoice,document_type.is.null'),

        // Taux de présence
        supabase
          .from('attendance')
          .select('status')
          .eq('organization_id', user.organization_id)
          .eq('date', today),

        // Nombre d'enseignants actifs
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id)
          .eq('role', 'teacher')
          .eq('is_active', true),

        // Sessions en cours
        supabase
          .from('sessions')
          .select('*, formations!inner(organization_id)', { count: 'exact', head: true })
          .eq('formations.organization_id', user.organization_id)
          .eq('status', 'ongoing'),

        // Formations actives
        supabase
          .from('formations')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id)
          .eq('is_active', true),

        // Programmes actifs
        supabase
          .from('programs')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id)
          .eq('is_active', true),

        // Formations pour calculer les inscriptions
        supabase
          .from('formations')
          .select('id')
          .eq('organization_id', user.organization_id),

        // Sessions terminées
        supabase
          .from('sessions')
          .select('*, formations!inner(organization_id)', { count: 'exact', head: true })
          .eq('formations.organization_id', user.organization_id)
          .eq('status', 'completed'),
      ])

      // Traiter les résultats
      const studentsCount = studentsResult.count || 0

      const paymentsArray = (paymentsResult.data as Payment[]) || []
      const monthlyRevenue = paymentsArray.reduce((sum, p) => sum + Number(p.amount), 0)

      const invoicesArray = (invoicesResult.data as Invoice[]) || []
      const overdueAmount = invoicesArray.reduce((sum, inv) => sum + Number(inv.total_amount), 0)

      const attendanceData = (attendanceResult.data as AttendanceWithRelations[]) || []
      const totalAttendance = attendanceData.length
      const presentCount = attendanceData.filter((a) => a.status === 'present').length
      const avgAttendance = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0

      const teachersCount = teachersResult.count || 0
      const activeSessionsCount = activeSessionsResult.count || 0
      const activeFormationsCount = activeFormationsResult.count || 0
      const activeProgramsCount = activeProgramsResult.count || 0
      const completedSessions = completedSessionsResult.count || 0

      // Calculer les inscriptions totales (requête séparée car dépend de formations)
      let totalEnrollments = 0
      if (formationsResult.data && formationsResult.data.length > 0) {
        const formationIds = formationsResult.data.map((f: any) => f.id)
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .in('formation_id', formationIds)

        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map((s: any) => s.id)
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .in('session_id', sessionIds)
          totalEnrollments = count || 0
        }
      }

      return {
        studentsCount: studentsCount || 0,
        monthlyRevenue,
        overdueAmount,
        avgAttendance: Math.round(avgAttendance),
        teachersCount: teachersCount || 0,
        activeSessionsCount: activeSessionsCount || 0,
        activeFormationsCount: activeFormationsCount || 0,
        activeProgramsCount: activeProgramsCount || 0,
        totalEnrollments: totalEnrollments || 0,
        completedSessions: completedSessions || 0,
      }
      }, {
        organizationId: user.organization_id,
      })
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer l'évolution des revenus (6 derniers mois)
  const { data: revenueData } = useQuery({
    queryKey: ['revenue-evolution', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []

      const months = []
      const now = new Date()
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('organization_id', user.organization_id)
          .eq('status', 'completed')
          .gte('paid_at', month.toISOString())
          .lt('paid_at', nextMonth.toISOString())

        const monthlyPayments = (payments as Payment[]) || []
        const revenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0)
        
        months.push({
          month: month.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          revenue: Math.round(revenue),
        })
      }

      return months
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les élèves par session (remplace les classes)
  const { data: studentsBySession } = useQuery({
    queryKey: ['students-by-session', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, name, formations!inner(id, name, organization_id, programs(id, name))')
        .eq('formations.organization_id', user.organization_id)

      if (!sessions) return []

      const sessionData = await Promise.all(
        sessions.map(async (session: any) => {
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', session.id) // class_id stocke maintenant l'ID de session
            .eq('status', 'active')

          const formationName = session.formations?.name || ''
          const programName = session.formations?.programs?.name
          const displayName = programName 
            ? `${session.name} - ${formationName} (${programName})`
            : `${session.name} - ${formationName}`

          return {
            name: displayName,
            students: count || 0,
          }
        })
      )

      return sessionData.filter((s) => s.students > 0)
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les statuts de factures (uniquement les factures, pas les devis)
  const { data: invoiceStatus } = useQuery({
    queryKey: ['invoice-status', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []

      const { data: invoices } = await supabase
        .from('invoices')
        .select('status, document_type')
        .eq('organization_id', user.organization_id)
        .or('document_type.eq.invoice,document_type.is.null') // Uniquement les factures

      if (!invoices) return []

      let paidCount = 0
      let sentCount = 0
      let partialCount = 0
      let overdueCount = 0
      let draftCount = 0

      ;(invoices as Invoice[]).forEach((inv: Invoice) => {
        const status = inv.status
        if (status === 'paid') paidCount++
        else if (status === 'sent') sentCount++
        else if (status === 'partial') partialCount++
        else if (status === 'overdue') overdueCount++
        else if (status === 'draft') draftCount++
      })

      return [
        { name: 'Payées', value: paidCount, color: '#335ACF' },
        { name: 'Envoyées', value: sentCount, color: '#3B82F6' },
        { name: 'Partielles', value: partialCount, color: '#34B9EE' },
        { name: 'En retard', value: overdueCount, color: '#EF4444' },
        { name: 'Brouillons', value: draftCount, color: '#6B7280' },
      ].filter((item) => item.value > 0)
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les inscriptions récentes
  const { data: recentEnrollments } = useQuery({
    queryKey: ['recent-enrollments', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []

      // D'abord, récupérer les formations de l'organisation
      const { data: formations } = await supabase
        .from('formations')
        .select('id')
        .eq('organization_id', user.organization_id)

      if (!formations || formations.length === 0) return []

      const formationIds = formations.map((f: any) => f.id)

      // Ensuite, récupérer les sessions de ces formations
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .in('formation_id', formationIds)

      if (!sessions || sessions.length === 0) return []

      const sessionIds = sessions.map((s: any) => s.id)

      // Enfin, récupérer les inscriptions pour ces sessions
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, students(first_name, last_name), sessions(name, formations(name, programs(name)))')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Erreur lors de la récupération des inscriptions:', error)
        return []
      }

      return data || []
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les événements à venir (sessions)
  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcoming-events', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []

      const today = new Date().toISOString().split('T')[0]
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*, formations!inner(name, organization_id, programs(name))')
        .eq('formations.organization_id', user.organization_id)
        .gte('start_date', today)
        .in('status', ['planned', 'ongoing'])
        .order('start_date', { ascending: true })
        .limit(5)

      return (sessions || []).map((session: any) => ({
        id: session.id,
        name: session.name,
        formation: session.formations?.name || '',
        program: session.formations?.programs?.name || '',
        start_date: session.start_date,
        end_date: session.end_date,
        status: session.status,
      }))
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les top programmes par nombre d'inscriptions
  const { data: topPrograms } = useQuery({
    queryKey: ['top-programs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []

      // Récupérer tous les programmes avec leurs formations
      const { data: programs } = await supabase
        .from('programs')
        .select('id, name, code, formations(id)')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)

      if (!programs) return []

      // Pour chaque programme, compter les inscriptions via ses formations
      const programsWithStats = await Promise.all(
        programs.map(async (program: any) => {
          let totalEnrollments = 0
          
          // Pour chaque formation, récupérer ses sessions et leurs inscriptions
          for (const formation of program.formations || []) {
            const { data: sessions } = await supabase
              .from('sessions')
              .select('id')
              .eq('formation_id', formation.id)
            
            const sessionIds = (sessions || []).map((s: any) => s.id).filter((id: any): id is string => !!id)
            
            if (sessionIds && sessionIds.length > 0) {
              const { count, error: enrollmentsError } = await supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .in('session_id', sessionIds)
              if (enrollmentsError) throw enrollmentsError
              
              totalEnrollments += count || 0
            }
          }

          return {
            id: program.id,
            name: program.name,
            code: program.code,
            enrollments: totalEnrollments,
          }
        })
      )

      // Trier par nombre d'inscriptions et prendre le top 5
      return programsWithStats
        .filter(p => p.enrollments > 0)
        .sort((a, b) => b.enrollments - a.enrollments)
        .slice(0, 5)
    },
    enabled: !!user?.organization_id,
  })

  const COLORS = ['#335ACF', '#34B9EE', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899']

  // KPIs principaux avec design futuriste
  const mainKPIs = [
    {
      title: 'Inscriptions',
      value: stats?.totalEnrollments || 0,
      icon: UserCheck,
      gradient: 'from-[#34B9EE] to-[#335ACF]',
      neon: '#34B9EE',
    },
    {
      title: 'Chiffre d\'affaires',
      value: formatCurrency(stats?.monthlyRevenue || 0, 'XOF'),
      icon: DollarSign,
      gradient: 'from-[#335ACF] to-[#34B9EE]',
      neon: '#335ACF',
    },
    {
      title: 'Apprenants',
      value: stats?.studentsCount || 0,
      icon: Users,
      gradient: 'from-[#34B9EE] via-[#335ACF] to-[#34B9EE]',
      neon: '#34B9EE',
    },
    {
      title: 'Sessions en cours',
      value: stats?.activeSessionsCount || 0,
      icon: Activity,
      gradient: 'from-[#335ACF] to-[#34B9EE]',
      neon: '#335ACF',
    },
    {
      title: 'Taux de présence',
      value: `${stats?.avgAttendance || 0}%`,
      icon: TrendingUp,
      gradient: 'from-[#34B9EE] to-[#335ACF]',
      neon: '#34B9EE',
    },
  ]

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] overflow-y-auto">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A2E] via-[#0A0A0F] to-[#16213E] opacity-100"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(51,90,207,0.15),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(52,185,238,0.15),transparent_50%)]"></div>
      
      <div className="relative z-10 space-y-8 p-6 md:p-8 min-h-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-5xl font-light tracking-tight text-white mb-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 200 }}>
              Dashboard
            </h1>
            <p className="text-white/60 text-sm font-light" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
              Vue d'ensemble en temps réel
            </p>
          </div>
          <Button
            onClick={async () => {
              try {
                if (!stats || !user?.organization_id) {
                  addToast({
                    type: 'warning',
                    title: 'Données indisponibles',
                    description: 'Les statistiques ne sont pas encore chargées.',
                  })
                  return
                }

                // Récupérer les informations de l'organisation
                const { data: org } = await supabase
                  .from('organizations')
                  .select('name, address')
                  .eq('id', user.organization_id)
                  .single()

                await downloadReportPDF(
                  {
                    title: 'Rapport du Dashboard',
                    organization: {
                      name: org?.name || 'Organisation',
                      address: org?.address || undefined,
                    },
                    stats: {
                      totalStudents: stats.studentsCount || 0,
                      activeSessions: stats.activeSessionsCount || 0,
                      monthlyRevenue: stats.monthlyRevenue || 0,
                      pendingInvoices: (stats as any).pendingInvoices || 0,
                      attendanceRate: stats.avgAttendance,
                      completedPayments: (stats as any).completedPayments || 0,
                    },
                    generatedAt: new Date().toISOString(),
                  },
                  undefined,
                  {
                    organizationId: user.organization_id,
                    userId: user.id,
                  }
                )

                addToast({
                  type: 'success',
                  title: 'Export réussi',
                  description: 'Le rapport PDF a été téléchargé avec succès.',
                })

                // Track l'événement
                if (typeof window !== 'undefined') {
                  const { analytics } = await import('@/lib/utils/analytics')
                  analytics.export.pdf('dashboard_report')
                }
              } catch (error) {
                console.error('Erreur lors de l\'export PDF:', error)
                addToast({
                  type: 'error',
                  title: 'Erreur d\'export',
                  description: 'Une erreur est survenue lors de la génération du PDF.',
                })
              }
            }}
            variant="outline"
            className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exporter en PDF
          </Button>
          <Button
            onClick={async () => {
              try {
                if (!stats || !user?.organization_id) {
                  addToast({
                    type: 'warning',
                    title: 'Données indisponibles',
                    description: 'Les statistiques ne sont pas encore chargées.',
                  })
                  return
                }

                // Récupérer les informations de l'organisation
                const { data: org } = await supabase
                  .from('organizations')
                  .select('name, address')
                  .eq('id', user.organization_id)
                  .single()

                await downloadReportPDF({
                  title: 'Rapport du Dashboard',
                  organization: {
                    name: org?.name || 'Organisation',
                    address: org?.address || undefined,
                  },
                  stats: {
                    totalStudents: stats.studentsCount || 0,
                    activeSessions: stats.activeSessionsCount || 0,
                    monthlyRevenue: stats.monthlyRevenue || 0,
                    pendingInvoices: (stats as any).pendingInvoices || 0,
                    attendanceRate: stats.avgAttendance,
                    completedPayments: (stats as any).completedPayments || 0,
                  },
                  generatedAt: new Date().toISOString(),
                })

                addToast({
                  type: 'success',
                  title: 'Export réussi',
                  description: 'Le rapport PDF a été téléchargé avec succès.',
                })

                // Track l'événement
                if (typeof window !== 'undefined') {
                  const { analytics } = await import('@/lib/utils/analytics')
                  analytics.export.pdf('dashboard_report')
                }
              } catch (error) {
                console.error('Erreur lors de l\'export PDF:', error)
                addToast({
                  type: 'error',
                  title: 'Erreur d\'export',
                  description: 'Une erreur est survenue lors de la génération du PDF.',
                })
              }
            }}
            variant="outline"
            className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10"
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exporter en PDF
          </Button>
        </motion.div>

        {/* KPIs Principaux avec Glassmorphism */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {mainKPIs.map((kpi, index) => (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="relative group">
                {/* Gradient Border */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${kpi.gradient} rounded-2xl opacity-75 group-hover:opacity-100 blur-sm transition-opacity`}></div>
                
                {/* Glassmorphism Card */}
                <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/[0.08] transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${kpi.gradient} opacity-90`}>
                      <kpi.icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-white/60 text-xs font-light uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
                      {kpi.title}
                    </p>
                    <p 
                      className="text-3xl font-light text-white" 
                      style={{ 
                        fontFamily: 'Inter, sans-serif', 
                        fontWeight: 200,
                        textShadow: `0 0 20px ${kpi.neon}, 0 0 40px ${kpi.neon}40`
                      }}
                    >
                      {kpi.value}
                    </p>
                  </div>

                  {/* Neon glow effect on hover */}
                  <div 
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      boxShadow: `0 0 30px ${kpi.neon}40, inset 0 0 30px ${kpi.neon}20`
                    }}
                  ></div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Graphique Évolution CA avec style néon */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#335ACF] via-[#34B9EE] to-[#335ACF] rounded-2xl opacity-50 group-hover:opacity-75 blur-sm transition-opacity"></div>
          
          <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/[0.08] transition-all duration-300">
            <h3 className="text-white/90 text-lg font-light mb-6" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
              Évolution du chiffre d'affaires
            </h3>
            
            {revenueData && revenueData.length > 0 ? (
              // @ts-ignore - Composants recharts chargés dynamiquement sans types
              <ResponsiveContainer width="100%" height={300} {...({} as any)}>
                <LineChart data={revenueData} {...({} as any)}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34B9EE" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#335ACF" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...({ strokeDasharray: "3 3", stroke: "#ffffff20" } as any)} />
                  <XAxis 
                    {...({
                      dataKey: "month", 
                      stroke: "#ffffff60",
                      style: { fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300 }
                    } as any)}
                  />
                  <YAxis 
                    {...({
                      stroke: "#ffffff60",
                      style: { fontFamily: 'Inter, sans-serif', fontSize: '12px', fontWeight: 300 }
                    } as any)}
                  />
                  <Tooltip
                    {...({
                      contentStyle: {
                        backgroundColor: 'rgba(10, 10, 15, 0.95)',
                        border: '1px solid rgba(52, 185, 238, 0.5)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(20px)',
                        color: '#fff',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 300,
                      },
                      formatter: (value: any) => formatCurrency(value, 'XOF')
                    } as any)}
                  />
                  <Line
                    {...({
                      type: "monotone",
                      dataKey: "revenue",
                      stroke: "#34B9EE",
                      strokeWidth: 3,
                      dot: { fill: '#34B9EE', r: 5, filter: 'drop-shadow(0 0 6px #34B9EE)' },
                      activeDot: { r: 7, fill: '#34B9EE', filter: 'drop-shadow(0 0 12px #34B9EE)' },
                      strokeDasharray: "0"
                    } as any)}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-white/40 text-sm font-light" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
                Aucune donnée disponible
              </div>
            )}
          </div>
        </motion.div>

        {/* Section Événements à venir */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#34B9EE] via-[#335ACF] to-[#34B9EE] rounded-2xl opacity-50 group-hover:opacity-75 blur-sm transition-opacity"></div>
          
          <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6 hover:bg-white/[0.08] transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white/90 text-lg font-light" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
                Événements à venir
              </h3>
              <Calendar className="h-5 w-5 text-[#34B9EE]" />
            </div>
            
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event: any, index: number) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/[0.08] transition-all group/item"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-[#34B9EE] to-[#335ACF] opacity-80">
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white/90 font-light text-sm truncate" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400 }}>
                          {event.name}
                        </p>
                        <p className="text-white/50 text-xs font-light mt-1" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
                          {event.program && `${event.program} - `}{event.formation}
                        </p>
                        <p className="text-white/40 text-xs font-light mt-1" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
                          {new Date(event.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div 
                      className="px-3 py-1 rounded-lg text-xs font-light border"
                      style={{
                        backgroundColor: event.status === 'ongoing' ? 'rgba(52, 185, 238, 0.2)' : 'rgba(51, 90, 207, 0.2)',
                        borderColor: event.status === 'ongoing' ? 'rgba(52, 185, 238, 0.5)' : 'rgba(51, 90, 207, 0.5)',
                        color: event.status === 'ongoing' ? '#34B9EE' : '#335ACF',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 300,
                      }}
                    >
                      {event.status === 'ongoing' ? 'En cours' : 'Planifié'}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-white/40 text-sm font-light" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 300 }}>
                Aucun événement à venir
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
