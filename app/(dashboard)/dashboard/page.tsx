'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { usePageAnalytics, useTimeOnPage } from '@/lib/hooks/use-page-analytics'
import { CardTitle, Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  BookOpen, 
  Calendar, 
  Award, 
  ExternalLink, 
  ArrowUpRight, 
  Sparkles, 
  Activity, 
  Plus, 
  FileText, 
  UserPlus, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  ClipboardList, 
  Mail, 
  Phone, 
  Target, 
  Zap, 
  RefreshCw 
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn, formatDate } from '@/lib/utils'
import { useVocabulary } from '@/lib/hooks/use-vocabulary'
import type { TableRow } from '@/lib/types/supabase-helpers'
import type { InvoiceWithRelations, AttendanceWithRelations } from '@/lib/types/query-types'
import { motion } from '@/components/ui/motion'
import { useEffect, useState, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
import { Badge } from '@/components/ui/badge'
import { ErrorBoundary } from '@/components/error-boundary'
import { StatsCardSkeleton, ChartSkeleton } from '@/components/ui/skeleton'
import { logger, sanitizeError } from '@/lib/utils/logger'

// Lazy load des composants de graphiques lourds (améliore LCP)
const PremiumLineChart = dynamic(() => import('@/components/charts/premium-line-chart').then((mod) => mod.PremiumLineChart), {
  ssr: false,
  loading: () => <ChartSkeleton />
})

const PremiumBarChart = dynamic(() => import('@/components/charts/premium-bar-chart').then((mod) => mod.PremiumBarChart), {
  ssr: false,
  loading: () => <ChartSkeleton />
})

const PremiumPieChart = dynamic(() => import('@/components/charts/premium-pie-chart').then((mod) => mod.PremiumPieChart), {
  ssr: false,
  loading: () => <ChartSkeleton />
})

// Lazy load des composants lourds (améliore LCP et TBT)
const AdminQuickActions = dynamic(() => import('@/components/dashboard/admin-quick-actions').then((mod) => mod.AdminQuickActions), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
})

const AdminActivityHeatmap = dynamic(() => import('@/components/dashboard/admin-activity-heatmap').then((mod) => mod.AdminActivityHeatmap), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
})

const AdminStatsRing = dynamic(() => import('@/components/dashboard/admin-stats-ring').then((mod) => mod.AdminStatsRing), {
  ssr: false,
  loading: () => <div className="h-32 w-32 bg-gray-100 rounded-full animate-pulse" />
})

const ParticlesBackground = dynamic(() => import('@/components/dashboard/particles-background').then((mod) => mod.ParticlesBackground), {
  ssr: false,
})

const OnboardingChecklist = dynamic(() => import('@/components/onboarding/onboarding-checklist').then((mod) => mod.OnboardingChecklist), {
  ssr: false,
})

const QualiopiComplianceScore = dynamic(() => import('@/components/qualiopi/compliance-score').then((mod) => mod.QualiopiComplianceScore), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
})

type Payment = TableRow<'payments'>
type Invoice = TableRow<'invoices'>

// Dashboard spécifique pour les enseignants
function TeacherDashboard() {
  const supabase = createClient()
  const { user } = useAuth()
  const vocab = useVocabulary()
  const [currentDate, setCurrentDate] = useState<string>('')

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }))
  }, [])

  // Récupérer les sessions de l'enseignant avec toutes les informations
  const { data: teacherSessions, isLoading: isLoadingSessions, refetch: refetchTeacherSessions } = useQuery({
    queryKey: ['teacher-dashboard-sessions', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        logger.debug('TeacherDashboard - Pas d\'user ID')
        return []
      }
      
      logger.debug('TeacherDashboard - Récupération sessions pour enseignant', { teacherId: user.id })
      
      // D'abord, vérifier si des entrées existent dans session_teachers
      const { data: sessionTeachersCheck, error: checkError } = await supabase
        .from('session_teachers')
        .select('session_id, teacher_id')
        .eq('teacher_id', user.id)
      
      logger.debug('TeacherDashboard - Vérification session_teachers', { 
        count: sessionTeachersCheck?.length || 0, 
        error: checkError,
        data: sessionTeachersCheck 
      })
      
      if (checkError) {
        logger.error('TeacherDashboard - Erreur lors de la vérification session_teachers', checkError)
      }
      
      // Si pas d'entrées dans session_teachers, essayer de récupérer via teacher_id dans sessions
      if (!sessionTeachersCheck || sessionTeachersCheck.length === 0) {
        logger.debug('TeacherDashboard - Aucune entrée dans session_teachers, tentative via sessions.teacher_id')
        
        const { data: sessionsByTeacherId, error: sessionsError } = await supabase
          .from('sessions')
          .select(`
            id,
            name,
            start_date,
            end_date,
            status,
            formation_id,
            formations (
              id,
              name,
              program_id,
              programs (
                id,
                name
              )
            )
          `)
          .eq('teacher_id', user.id)
          .order('start_date', { ascending: false })
        
        if (sessionsError) {
          logger.error('TeacherDashboard - Erreur récupération sessions via teacher_id', sessionsError)
        } else {
          logger.debug('TeacherDashboard - Sessions trouvées via teacher_id', { count: sessionsByTeacherId?.length || 0 })
          
          // Si on trouve des sessions via teacher_id, les convertir au format attendu
          if (sessionsByTeacherId && sessionsByTeacherId.length > 0) {
            return sessionsByTeacherId.map((session: any) => ({
              session_id: session.id,
              role: 'instructor',
              is_primary: true,
              sessions: session,
            }))
          }
        }
      }
      
      // Récupérer les sessions avec toutes les informations via session_teachers
      const { data, error } = await supabase
        .from('session_teachers')
        .select(`
          session_id,
          role,
          is_primary,
          sessions (
            id,
            name,
            start_date,
            end_date,
            status,
            formation_id,
            formations (
              id,
              name,
              program_id,
              programs (
                id,
                name
              )
            )
          )
        `)
        .eq('teacher_id', user.id)
      
      if (error) {
        logger.error('Erreur récupération sessions enseignant:', error, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        return []
      }
      
      logger.debug('TeacherDashboard - Sessions récupérées via session_teachers', { 
        count: data?.length || 0,
        sessions: data?.map((st: any) => ({
          sessionId: st.session_id,
          sessionName: st.sessions?.name,
          hasSession: !!st.sessions,
        }))
      })
      
      // Filtrer les entrées qui ont bien une session (certaines peuvent être null si la session a été supprimée)
      const validSessions = (data || []).filter((st: any) => st.sessions !== null && st.sessions !== undefined)
      
      // Trier les sessions par date de début (plus récentes en premier)
      const sorted = validSessions.sort((a: any, b: any) => {
        const dateA = a.sessions?.start_date ? new Date(a.sessions.start_date).getTime() : 0
        const dateB = b.sessions?.start_date ? new Date(b.sessions.start_date).getTime() : 0
        return dateB - dateA // Tri décroissant
      })
      
      logger.debug('TeacherDashboard - Sessions triées et filtrées', { count: sorted.length })
      
      return sorted
    },
    enabled: !!user?.id,
    staleTime: 0, // Toujours considérer les données comme obsolètes
    gcTime: 0, // Ne pas mettre en cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Récupérer le nombre total d'apprenants uniques dans toutes les sessions
  const { data: studentsCount } = useQuery({
    queryKey: ['teacher-students-count-unique', user?.id, teacherSessions],
    queryFn: async () => {
      if (!user?.id || !teacherSessions || teacherSessions.length === 0) return 0
      
      const sessionIds = teacherSessions
        .map((ts: any) => ts.session_id || ts.sessions?.id || ts.id)
        .filter((id: any) => id && typeof id === 'string')
      
      if (sessionIds.length === 0) return 0
      
      // Récupérer tous les apprenants uniques (distinct) dans toutes les sessions
      // Accepter tous les statuts sauf cancelled, rejected, dropped
      const { data, error } = await supabase
        .from('enrollments')
        .select('student_id, status')
        .in('session_id', sessionIds)
      
      if (error) {
        logger.error('Erreur comptage apprenants:', error)
        return 0
      }
      
      // Filtrer pour exclure les statuts invalides
      const invalidStatuses = ['cancelled', 'rejected', 'dropped']
      const validEnrollments = (data || []).filter((e: any) => {
        const status = e.status?.toLowerCase()
        return status && !invalidStatuses.includes(status)
      })
      
      // Compter les apprenants uniques
      const uniqueStudentIds = new Set(validEnrollments.map((e: any) => e.student_id).filter(Boolean))
      return uniqueStudentIds.size
    },
    enabled: !!user?.id && teacherSessions && teacherSessions.length > 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Récupérer le nombre d'apprenants par session
  const { data: studentsBySession } = useQuery({
    queryKey: ['teacher-students-by-session', user?.id, teacherSessions],
    queryFn: async () => {
      if (!user?.id || !teacherSessions || teacherSessions.length === 0) return {}
      
      const sessionIds = teacherSessions
        .map((ts: any) => ts.session_id || ts.sessions?.id || ts.id)
        .filter((id: any) => id && typeof id === 'string')
      
      if (sessionIds.length === 0) return {}
      
      // Récupérer le nombre d'apprenants par session
      // Accepter tous les statuts sauf cancelled, rejected, dropped
      const { data, error } = await supabase
        .from('enrollments')
        .select('session_id, student_id, status')
        .in('session_id', sessionIds)
      
      if (error) {
        logger.error('Erreur récupération apprenants par session:', error)
        return {}
      }
      
      // Filtrer pour exclure les statuts invalides
      const invalidStatuses = ['cancelled', 'rejected', 'dropped']
      const validEnrollments = (data || []).filter((e: any) => {
        const status = e.status?.toLowerCase()
        return status && !invalidStatuses.includes(status)
      })
      
      // Compter les apprenants par session
      const counts: Record<string, number> = {}
      validEnrollments.forEach((e: any) => {
        if (e.session_id) {
          counts[e.session_id] = (counts[e.session_id] || 0) + 1
        }
      })
      
      return counts
    },
    enabled: !!user?.id && teacherSessions && teacherSessions.length > 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Récupérer les émargements à faire aujourd'hui
  // Filtrer uniquement les émargements des sessions assignées à l'enseignant
  const { data: todayAttendance } = useQuery({
    queryKey: ['teacher-today-attendance', user?.id, teacherSessions],
    queryFn: async () => {
      if (!user?.id || !teacherSessions || teacherSessions.length === 0) {
        logger.debug('TeacherDashboard - Pas de sessions, retour stats vides pour émargements')
        return { total: 0, done: 0 }
      }
      
      // Extraire les sessionIds en gérant les différents formats
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const sessionIds = teacherSessions
        .map((ts: any) => ts.session_id || ts.sessions?.id || ts.id)
        .filter((id: any) => id && typeof id === 'string' && uuidRegex.test(id))
      
      if (sessionIds.length === 0) {
        logger.debug('TeacherDashboard - Aucun session_id valide, retour stats vides pour émargements')
        return { total: 0, done: 0 }
      }
      
      const today = new Date().toISOString().split('T')[0]
      
      logger.debug('TeacherDashboard - Récupération émargements pour aujourd\'hui', {
        sessionIds,
        today,
        count: sessionIds.length
      })
      
      // Émargements pour aujourd'hui - filtrés par les sessions de l'enseignant
      const { data, error } = await supabase
        .from('attendance')
        .select('id, status, session_id')
        .in('session_id', sessionIds)
        .eq('date', today)
      
      if (error) {
        logger.error('TeacherDashboard - Erreur récupération émargements:', error)
        return { total: 0, done: 0 }
      }
      
      logger.debug('TeacherDashboard - Émargements récupérés', {
        count: data?.length || 0,
        data: data?.map((a: any) => ({ id: a.id, status: a.status, session_id: a.session_id }))
      })
      
      const total = data?.length || 0
      const done = data?.filter((a: any) => a.status !== 'pending').length || 0
      
      logger.debug('TeacherDashboard - Stats émargements calculées', { total, done })
      
      return { total, done }
    },
    enabled: !!user?.id && teacherSessions && teacherSessions.length > 0,
    staleTime: 0, // Toujours considérer les données comme obsolètes
    gcTime: 0, // Ne pas mettre en cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Toutes les sessions assignées (triées par date)
  const allSessions = useMemo(() => {
    if (!teacherSessions || teacherSessions.length === 0) return []
    return teacherSessions.filter((ts: any) => {
      // Vérifier si la session existe (peut être dans ts.sessions ou directement dans ts)
      return ts.sessions !== null && ts.sessions !== undefined
    })
  }, [teacherSessions])
  
  // Prochaines sessions (à venir ou en cours)
  const upcomingSessions = useMemo(() => {
    return allSessions
      .filter((ts: any) => {
        const session = ts.sessions
        if (!session) return false
        const startDate = new Date(session.start_date)
        const now = new Date()
        return startDate >= now || session.status === 'in_progress' || session.status === 'active' || session.status === 'ongoing'
      })
      .slice(0, 5)
  }, [allSessions])

  // Sessions actives : en cours ou actives
  const activeSessions = useMemo(() => {
    const count = allSessions.filter((ts: any) => {
      const session = ts.sessions
      if (!session) return false
      const status = session.status?.toLowerCase()
      return status === 'active' || status === 'in_progress' || status === 'ongoing'
    }).length
    
    logger.debug('TeacherDashboard - Calcul sessions actives', {
      totalSessions: allSessions.length,
      activeSessions: count,
      sessionsStatuses: allSessions.map((ts: any) => ({
        id: ts.session_id || ts.sessions?.id,
        status: ts.sessions?.status
      }))
    })
    
    return count
  }, [allSessions])

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header Premium */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="mb-10"
      >
        <div className="flex items-center justify-between">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-brand-subtle rounded-lg blur opacity-75"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-lg px-6 py-4 border border-brand-blue/10 shadow-lg">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent mb-2">
                Bonjour, {(() => {
                  const firstName = user?.full_name?.trim()?.split(' ')[0]
                  // Si le prénom existe et n'est pas "admin", l'utiliser
                  if (firstName && firstName.length > 0 && firstName.toLowerCase() !== 'admin') {
                    return firstName
                  }
                  // Sinon, utiliser l'email ou le fallback "Enseignant"
                  return user?.email?.split('@')[0] || 'Enseignant'
                })()} 👋
              </h1>
              <p className="text-gray-600 capitalize font-medium">{currentDate}</p>
            </div>
          </div>
          <Link href="/dashboard/attendance" aria-label="Accéder à la page d'émargement">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button variant="gradient" className="shadow-lg hover:shadow-xl">
                <ClipboardList className="h-4 w-4 mr-2" />
                Émargement
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Stats Cards Premium */}
      <BentoGrid columns={4} gap="md" className="mb-10">
        <BentoCard>
          <GlassCard 
            variant="premium" 
            hoverable 
            glow 
            glowColor="rgba(39, 68, 114, 0.3)"
            className="p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-brand-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-brand-blue/10 rounded-xl backdrop-blur-sm border border-brand-blue/20">
                  <Users className="h-6 w-6 text-brand-blue" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-brand-blue/40 group-hover:text-brand-blue transition-colors" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-2">Mes apprenants</p>
              <p className="text-3xl font-bold text-brand-blue">
                <AnimatedCounter value={studentsCount || 0} />
              </p>
            </div>
          </GlassCard>
        </BentoCard>

        <BentoCard>
          <GlassCard 
            variant="premium" 
            hoverable 
            glow 
            glowColor="rgba(52, 185, 238, 0.3)"
            className="p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/10 via-brand-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-brand-cyan/10 rounded-xl backdrop-blur-sm border border-brand-cyan/20">
                  <BookOpen className="h-6 w-6 text-brand-cyan" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-brand-cyan/40 group-hover:text-brand-cyan transition-colors" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-2">Sessions actives</p>
              <p className="text-3xl font-bold text-brand-cyan">
                <AnimatedCounter value={activeSessions} />
              </p>
            </div>
          </GlassCard>
        </BentoCard>

        <BentoCard>
          <GlassCard 
            variant="premium" 
            hoverable 
            glow 
            glowColor="rgba(39, 68, 114, 0.3)"
            className="p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-brand-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-brand-blue/10 rounded-xl backdrop-blur-sm border border-brand-blue/20">
                  <CheckCircle2 className="h-6 w-6 text-brand-blue" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-brand-blue/40 group-hover:text-brand-blue transition-colors" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-2">Émargements aujourd'hui</p>
              <p className="text-3xl font-bold text-brand-blue">
                <AnimatedCounter value={todayAttendance?.done || 0} />/<AnimatedCounter value={todayAttendance?.total || 0} />
              </p>
            </div>
          </GlassCard>
        </BentoCard>

        <BentoCard>
          <GlassCard 
            variant="premium" 
            hoverable 
            glow 
            glowColor="rgba(52, 185, 238, 0.3)"
            className="p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/10 via-brand-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-brand-cyan/10 rounded-xl backdrop-blur-sm border border-brand-cyan/20">
                  <Calendar className="h-6 w-6 text-brand-cyan" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-brand-cyan/40 group-hover:text-brand-cyan transition-colors" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-2">Total sessions</p>
              <p className="text-3xl font-bold text-brand-cyan">
                <AnimatedCounter value={teacherSessions?.length || 0} />
              </p>
            </div>
          </GlassCard>
        </BentoCard>
      </BentoGrid>

      {/* Main Content Premium */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Toutes les sessions assignées */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="lg:col-span-2"
        >
          <Card variant="premium" hoverable={false} className="overflow-hidden">
            <CardHeader className="bg-gradient-brand-subtle border-b border-brand-blue/10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-brand-blue/10 rounded-lg border border-brand-blue/20">
                    <Calendar className="h-5 w-5 text-brand-blue" />
                  </div>
                  <span className="text-brand-blue">
                    Mes sessions assignées
                  </span>
                </CardTitle>
                <motion.div
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.5 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchTeacherSessions()}
                    className="hover:bg-brand-blue/10"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
              <CardDescription className="flex items-center justify-between mt-2">
                <span className="text-gray-600">
                  Toutes les sessions sur lesquelles vous êtes assigné ({allSessions.length} session{allSessions.length > 1 ? 's' : ''})
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {isLoadingSessions ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-blue border-t-transparent mx-auto mb-4"></div>
                  <p className="font-medium">Chargement des sessions...</p>
                </div>
              ) : !allSessions || allSessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="font-semibold text-gray-700 mb-2">Aucune session assignée</p>
                  <p className="text-sm text-gray-500 max-w-md mx-auto">
                    Les sessions vous seront visibles une fois que vous serez assigné en tant qu'intervenant
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {allSessions.map((ts: any, index: number) => {
                    const session = ts.sessions
                    const formation = session?.formations
                    const program = formation?.programs
                    const isActive = session?.status === 'active' || session?.status === 'in_progress' || session?.status === 'ongoing'
                    const isUpcoming = session?.start_date ? new Date(session.start_date) >= new Date() : false
                    const studentsCount = studentsBySession?.[ts.session_id] || 0
                    
                    return (
                      <motion.div
                        key={ts.session_id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.4 }}
                      >
                        <Link
                          href={`/dashboard/attendance?session=${ts.session_id}`}
                          className="block group"
                        >
                          <GlassCard
                            variant="premium"
                            hoverable
                            className={`p-5 relative overflow-hidden transition-all duration-300 ${
                              isActive 
                                ? 'border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 to-brand-cyan/5' 
                                : isUpcoming 
                                ? 'border-brand-blue/30 bg-gradient-to-br from-brand-blue/10 to-brand-blue/5' 
                                : 'border-gray-200/50 bg-white/70'
                            }`}
                          >
                            <div className={`absolute inset-0 ${
                              isActive 
                                ? 'bg-gradient-brand-subtle' 
                                : isUpcoming 
                                ? 'bg-gradient-brand-subtle' 
                                : 'bg-gray-500/5'
                            } opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                            
                            <div className="relative z-10">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-bold text-gray-900 truncate text-lg group-hover:text-brand-blue transition-colors">
                                      {session?.name}
                                    </h3>
                                    {ts.is_primary && (
                                      <Badge className="bg-gradient-to-r from-brand-blue to-purple-600 text-white border-0 text-xs">
                                        Principal
                                      </Badge>
                                    )}
                                    {ts.role && (
                                      <Badge variant="outline" className="text-xs border-gray-300">
                                        {ts.role}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm font-semibold text-gray-700 mb-1">
                                    {formation?.name || 'Formation non spécifiée'}
                                  </p>
                                  {program && (
                                    <p className="text-xs text-gray-500 mb-2">
                                      Programme: <span className="font-medium">{program.name}</span>
                                    </p>
                                  )}
                                </div>
                                <Badge 
                                  className={`${
                                    isActive 
                                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0' 
                                      : isUpcoming 
                                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0' 
                                      : 'bg-gray-100 text-gray-700 border-gray-300'
                                  } shadow-sm`}
                                >
                                  {isActive ? 'En cours' : isUpcoming ? 'À venir' : session?.status || 'Terminée'}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 pt-3 border-t border-gray-200/50">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">
                                    {session?.start_date ? formatDate(session.start_date) : 'N/A'} - {session?.end_date ? formatDate(session.end_date) : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Users className="h-4 w-4 text-gray-400" />
                                  <span className="font-semibold">
                                    {studentsCount} apprenant{studentsCount > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </GlassCard>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions rapides Premium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <Card variant="premium" hoverable={false} className="overflow-hidden">
            <CardHeader className="bg-gradient-brand-subtle border-b border-brand-blue/10">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-brand-cyan/10 rounded-lg border border-brand-cyan/20">
                  <Sparkles className="h-5 w-5 text-brand-cyan" />
                </div>
                <span className="text-brand-cyan">
                  Actions rapides
                </span>
              </CardTitle>
              <CardDescription className="mt-2">
                Accédez rapidement à vos tâches courantes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { href: '/dashboard/attendance', icon: ClipboardList, label: 'Émargement', useBrand: true },
                  { href: '/dashboard/my-students', icon: Users, label: 'Mes apprenants', useBrand: false },
                  { href: '/dashboard/evaluations', icon: Award, label: 'Évaluations', useBrand: true },
                  { href: '/dashboard/resources', icon: FileText, label: 'Ressources', useBrand: false },
                ].map((action, index) => {
                  const Icon = action.icon
                  const isBrand = action.useBrand
                  return (
                    <motion.div
                      key={action.href}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.4 }}
                    >
                      <Link href={action.href} className="block group">
                        <GlassCard
                          variant="premium"
                          hoverable
                          className="p-6 h-full relative overflow-hidden"
                        >
                          <div className={`absolute inset-0 ${isBrand ? 'bg-gradient-brand-subtle' : 'bg-brand-cyan/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl`}></div>
                          <div className="relative z-10 flex flex-col items-center justify-center gap-3">
                            <div className={`p-4 ${isBrand ? 'bg-brand-blue/10 border border-brand-blue/20' : 'bg-brand-cyan/10 border border-brand-cyan/20'} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className={`h-7 w-7 ${isBrand ? 'text-brand-blue' : 'text-brand-cyan'} group-hover:scale-110 transition-transform duration-300`} />
                            </div>
                            <span className="font-semibold text-gray-700 group-hover:text-gray-900 transition-colors text-sm text-center">
                              {action.label}
                            </span>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

// Animation pour les compteurs
function AnimatedCounter({ value, duration = 1500, className = '' }: { value: number, duration?: number, className?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(value * easeOutQuart))
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCount(value)
      }
    }
    requestAnimationFrame(animate)
  }, [value, duration])

  return <span className={className}>{count.toLocaleString('fr-FR')}</span>
}

export default function DashboardPage() {
  const supabase = createClient()
  const { user, isLoading: userLoading } = useAuth()
  const vocab = useVocabulary()
  const prefersReducedMotion = useReducedMotion()
  const [currentDate, setCurrentDate] = useState<string>('')

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }))
  }, [])

  // Tous les hooks doivent être appelés AVANT les retours conditionnels
  // Récupérer les statistiques générales - ✅ OPTIMISÉ avec Promise.all
  // PRIORITÉ 1: Données critiques pour le LCP (chargées immédiatement)

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats', user?.organization_id],
    enabled: !!user?.organization_id && user?.role !== 'teacher',
    staleTime: 2 * 60 * 1000, // Cache 2 minutes (données dashboard changent peu)
    gcTime: 10 * 60 * 1000, // Garder en cache 10 minutes
    refetchOnWindowFocus: false, // Ne pas refetch au focus
    refetchOnMount: false, // Utiliser cache si disponible
    queryFn: async () => {
      if (!user?.organization_id) return null

      const currentMonth = new Date()
      currentMonth.setDate(1)
      const today = new Date().toISOString().split('T')[0]

      logger.debug('📊 [DASHBOARD] Calcul des stats - PARALLEL', {
        currentMonth: currentMonth.toISOString(),
        organization_id: user.organization_id,
      })

      // ✅ Exécuter toutes les requêtes indépendantes en parallèle (13 requêtes)
      const [
        studentsResult,
        paymentsResult,
        overdueInvoicesResult,
        attendanceResult,
        teachersResult,
        activeSessionsResult,
        activeFormationsResult,
        activeProgramsResult,
        formationsResult,
        completedSessionsResult
      ] = await Promise.all([
        // Nombre d'apprenants actifs
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', user.organization_id)
          .eq('status', 'active'),

        // Revenus du mois - paiements complétés
        supabase
          .from('payments')
          .select('amount, currency, paid_at, created_at, status, payment_method')
          .eq('organization_id', user.organization_id)
          .eq('status', 'completed')
          .gte('created_at', currentMonth.toISOString()),

        // Impayés (invoices seulement)
        supabase
          .from('invoices')
          .select('total_amount, document_type')
          .eq('organization_id', user.organization_id)
          .eq('status', 'overdue')
          .or('document_type.eq.invoice,document_type.is.null'),

        // Taux de présence aujourd'hui
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

        // Formations (pour calculer enrollments)
        supabase
          .from('formations')
          .select('id')
          .eq('organization_id', user.organization_id),

        // Sessions terminées
        supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed')
      ])

      const studentsCount = studentsResult.count || 0
      const { data: payments, error: paymentsError } = paymentsResult

      if (paymentsError) {
        logger.error('❌ [DASHBOARD] Erreur lors de la récupération des paiements:', paymentsError)
      }

      const paymentsArray = (payments as Payment[]) || []
      logger.debug('📊 [DASHBOARD] Paiements récupérés:', {
        total: paymentsArray.length,
        payments: paymentsArray.map((p) => ({
          amount: p.amount,
          paid_at: p.paid_at,
          created_at: p.created_at,
          method: (p as any).payment_method,
        })),
      })
      
      // Filtrer pour ne garder que ceux avec paid_at dans le mois OU paid_at null
      const monthlyPayments = paymentsArray.filter((p) => {
        if (p.paid_at) {
          return new Date(p.paid_at) >= currentMonth
        }
        // Si paid_at est null, utiliser created_at (si défini)
        return p.created_at ? new Date(p.created_at) >= currentMonth : false
      })
      
      logger.debug('📊 [DASHBOARD] Paiements du mois filtrés:', {
        count: monthlyPayments.length,
        payments: monthlyPayments.map((p) => ({
          amount: p.amount,
          paid_at: p.paid_at,
          created_at: p.created_at,
        })),
      })
      
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      logger.debug('💰 [DASHBOARD] Revenus du mois calculés:', {
        monthlyRevenue,
        currency: monthlyPayments[0]?.currency || 'EUR',
      })

      // ✅ Utiliser les résultats de Promise.all
      const { data: overdueInvoices } = overdueInvoicesResult
      const invoicesArray = (overdueInvoices as Invoice[]) || []
      const overdueAmount = invoicesArray.reduce((sum, inv) => sum + Number(inv.total_amount), 0)

      // Taux de présence moyen
      const { data: attendance } = attendanceResult
      const attendanceData = (attendance as AttendanceWithRelations[]) || []
      const totalAttendance = attendanceData.length
      const presentCount = attendanceData.filter((a) => a.status === 'present').length
      const avgAttendance = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0

      // Nombre d'enseignants actifs
      const teachersCount = teachersResult.count || 0

      // Sessions en cours
      const activeSessionsCount = activeSessionsResult.count || 0

      // ✅ Utiliser les résultats de Promise.all
      const activeFormationsCount = activeFormationsResult.count || 0
      const activeProgramsCount = activeProgramsResult.count || 0
      const { data: formations } = formationsResult
      const completedSessions = completedSessionsResult.count || 0

      // Inscriptions totales - requêtes séquentielles nécessaires (dépendance)
      let totalEnrollments = 0
      if (formations && formations.length > 0) {
        const formationIds = formations.map((f: { id: string }) => f.id)

        // ✅ Ces 2 requêtes peuvent être parallélisées
        const { data: sessions } = await supabase
          .from('sessions')
          .select('id')
          .in('formation_id', formationIds)

        if (sessions && sessions.length > 0) {
          const sessionIds = sessions.map((s: { id: string }) => s.id)
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
        currency: monthlyPayments[0]?.currency || 'EUR',
        overdueAmount,
        avgAttendance: Math.round(avgAttendance),
        teachersCount: teachersCount || 0,
        activeSessionsCount: activeSessionsCount || 0,
        activeFormationsCount: activeFormationsCount || 0,
        activeProgramsCount: activeProgramsCount || 0,
        totalEnrollments: totalEnrollments || 0,
        completedSessions: completedSessions || 0,
      }
    },
  })

  // PRIORITÉ 2: Données secondaires (chargées après le LCP)
  // Charger les données secondaires seulement après que les stats critiques soient chargées
  const [shouldLoadSecondaryData, setShouldLoadSecondaryData] = useState(false)

  useEffect(() => {
    // Attendre que les stats critiques soient chargées avant de charger les données secondaires
    // ✅ OPTIMISATION LCP: Augmenter le délai pour laisser plus de temps au LCP
    if (!isLoadingStats && stats) {
      // Délai plus long pour laisser le LCP se terminer complètement
      const timer = setTimeout(() => {
        setShouldLoadSecondaryData(true)
      }, 300) // Augmenté de 100ms à 300ms pour améliorer le LCP
      return () => clearTimeout(timer)
    }
  }, [isLoadingStats, stats])

  // PRIORITÉ 3: Données tertiaires (chargées après les données secondaires)
  // Charger les données tertiaires seulement après que les données secondaires soient chargées
  const [shouldLoadTertiaryData, setShouldLoadTertiaryData] = useState(false)

  useEffect(() => {
    // Attendre que les données secondaires soient chargées avant de charger les données tertiaires
    // ✅ OPTIMISATION LCP: Augmenter le délai pour améliorer le LCP
    if (shouldLoadSecondaryData) {
      // Délai plus long pour laisser les données secondaires se charger complètement
      const timer = setTimeout(() => {
        setShouldLoadTertiaryData(true)
      }, 500) // Augmenté de 200ms à 500ms pour améliorer le LCP
      return () => clearTimeout(timer)
    }
  }, [shouldLoadSecondaryData])

  // Récupérer l'évolution des revenus (6 derniers mois)
  const { data: revenueData } = useQuery({
    queryKey: ['revenue-evolution', user?.organization_id],
    enabled: !!user?.organization_id && user?.role !== 'teacher' && shouldLoadSecondaryData,
    staleTime: 5 * 60 * 1000, // Cache 5 minutes
    gcTime: 15 * 60 * 1000, // Garder en cache 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      if (!user?.organization_id) return []

      logger.debug('📈 [REVENUE-EVOLUTION] Calcul de l\'évolution des revenus...', {
        organization_id: user.organization_id,
      })

      const months = []
      const now = new Date()
      
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        
        // Récupérer les paiements avec paid_at dans ce mois
        const { data: paymentsWithPaidAt, error: error1 } = await supabase
          .from('payments')
          .select('amount, paid_at, created_at')
          .eq('organization_id', user.organization_id)
          .eq('status', 'completed')
          .not('paid_at', 'is', null)
          .gte('paid_at', month.toISOString())
          .lt('paid_at', nextMonth.toISOString())

        // Récupérer les paiements avec paid_at null mais created_at dans ce mois
        const { data: paymentsWithoutPaidAt, error: error2 } = await supabase
          .from('payments')
          .select('amount, paid_at, created_at')
          .eq('organization_id', user.organization_id)
          .eq('status', 'completed')
          .is('paid_at', null)
          .gte('created_at', month.toISOString())
          .lt('created_at', nextMonth.toISOString())

        if (error1 || error2) {
          const error = error1 || error2
          logger.error(`❌ [REVENUE-EVOLUTION] Erreur pour le mois ${month.toLocaleDateString('fr-FR')}:`, error)
          // Gérer les erreurs de table inexistante, erreurs 400, ou problèmes de schéma
          if (
            error?.code === 'PGRST116' ||
            error?.code === '42P01' ||
            error?.code === 'PGRST301' ||
            error?.code === '400' ||
            error?.message?.includes('relation') ||
            error?.message?.includes('relationship') ||
            error?.message?.includes('does not exist') ||
            error?.message?.includes('schema cache') ||
            error?.message?.includes('column') ||
            error?.message?.includes('permission')
          ) {
            // Ignorer silencieusement et continuer avec un tableau vide
          }
        }

        // Combiner les deux résultats
        const payments1 = (paymentsWithPaidAt as Payment[]) || []
        const payments2 = (paymentsWithoutPaidAt as Payment[]) || []
        const monthlyPayments = [...payments1, ...payments2]
        
        const revenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0)
        
        logger.debug(`📈 [REVENUE-EVOLUTION] Mois ${month.toLocaleDateString('fr-FR')}:`, {
          paymentsWithPaidAt: payments1.length,
          paymentsWithoutPaidAt: payments2.length,
          totalPayments: monthlyPayments.length,
          revenue: Math.round(revenue),
          payments: monthlyPayments.map((p) => ({
            amount: p.amount,
            paid_at: p.paid_at,
            created_at: p.created_at,
          })),
        })
        
        months.push({
          month: month.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          revenue: Math.round(revenue),
        })
      }

      logger.debug('✅ [REVENUE-EVOLUTION] Évolution calculée', { months })
      return months
    },
  })

  // Récupérer les apprenants par classe
  const { data: studentsBySession } = useQuery({
    queryKey: ['students-by-class', user?.organization_id],
    enabled: !!user?.organization_id && user?.role !== 'teacher',
    queryFn: async () => {
      if (!user?.organization_id) return []

      // Récupérer les classes avec le nombre d'étudiants
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, code')
        .eq('organization_id', user.organization_id)

      if (!classes || classes.length === 0) return []

      const classData = await Promise.all(
        classes.map(async (classItem: any) => {
          if (!user.organization_id) return null
          const { count } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classItem.id)
            .eq('organization_id', user.organization_id)
            .eq('status', 'active')

          const displayName = classItem.name.length > 20 ? classItem.name.substring(0, 20) + '...' : classItem.name

          return {
            name: displayName,
            students: count || 0,
            fullLabel: `${classItem.code} - ${classItem.name}`
          }
        })
      )

      return classData.filter((c): c is NonNullable<typeof c> => c !== null && c.students > 0).slice(0, 10) // Limiter à 10 pour la lisibilité
    },
  })

  // Récupérer les statuts de factures
  const { data: invoiceStatus, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoice-status', user?.organization_id, 'v3'], // v3 pour forcer le rafraîchissement
    enabled: !!user?.organization_id && user?.role !== 'teacher' && shouldLoadSecondaryData,
    staleTime: 3 * 60 * 1000, // Cache 3 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      if (!user?.organization_id) return []

      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('status, document_type')
        .eq('organization_id', user.organization_id)

      logger.debug('📊 [DASHBOARD] Requête factures:', {
        hasError: !!error,
        error,
        count: invoices?.length || 0,
        sample: invoices?.slice(0, 3),
      })

      if (!invoices || error) {
        logger.error('❌ [DASHBOARD] Erreur factures:', error)
        return []
      }

      const statusCounts = {
        paid: 0,
        sent: 0,
        partial: 0,
        overdue: 0,
        draft: 0,
      } as const

      type StatusCounts = {
        paid: number
        sent: number
        partial: number
        overdue: number
        draft: number
      }

      const counts: StatusCounts = { ...statusCounts }

      logger.debug('📊 [DASHBOARD] Début du comptage:', {
        invoicesLength: invoices.length,
        firstInvoice: invoices[0],
      })

      invoices.forEach((inv: any) => {
        const status = inv.status as keyof StatusCounts
        if (status in counts) {
          counts[status]++
        }
      })

      logger.debug('📊 [DASHBOARD] Comptage terminé:', counts)

      const result = [
        { name: 'Payées', value: counts.paid },
        { name: 'Envoyées', value: counts.sent },
        { name: 'Partielles', value: counts.partial },
        { name: 'En retard', value: counts.overdue },
        { name: 'Brouillons', value: counts.draft },
      ].filter((item) => item.value > 0)

      logger.debug('📊 [DASHBOARD] Répartition factures', { result })

      return result
    },
  })

  // Récupérer les inscriptions récentes
  const { data: recentEnrollments } = useQuery({
    queryKey: ['recent-enrollments', user?.organization_id],
    enabled: !!user?.organization_id && user?.role !== 'teacher',
    queryFn: async () => {
      if (!user?.organization_id) return []

      const { data: formations } = await supabase
        .from('formations')
        .select('id')
        .eq('organization_id', user.organization_id)

      if (!formations || formations.length === 0) return []
      const formationIds = formations.map(f => f.id)

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .in('formation_id', formationIds)

      if (!sessions || sessions.length === 0) return []
      const sessionIds = sessions.map(s => s.id)

      const { data, error } = await supabase
        .from('enrollments')
        .select('*, students(first_name, last_name, photo_url), sessions(name, formations(name, programs(name)))')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) return []
      return data || []
    },
  })

  // Récupérer les top programmes
  const { data: topPrograms } = useQuery({
    queryKey: ['top-programs', user?.organization_id],
    enabled: !!user?.organization_id && user?.role !== 'teacher' && shouldLoadTertiaryData,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      if (!user?.organization_id) return []

      const { data: programs } = await supabase
        .from('programs')
        .select('id, name, code, formations(id)')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true)

      if (!programs) return []

      const programsWithStats = await Promise.all(
        programs.map(async (program: any) => {
          let totalEnrollments = 0
          for (const formation of program.formations || []) {
            const { data: sessions } = await supabase
              .from('sessions')
              .select('id')
              .eq('formation_id', formation.id)
            
            const sessionIds = (sessions || []).map((s: any) => s.id).filter((id): id is string => !!id)
            
            if (sessionIds && sessionIds.length > 0) {
              const { count } = await supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .in('session_id', sessionIds)
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

      return programsWithStats
        .filter(p => p.enrollments > 0)
        .sort((a, b) => b.enrollments - a.enrollments)
        .slice(0, 5)
    },
  })

  // Maintenant que tous les hooks sont appelés, on peut faire les retours conditionnels
  // Afficher un loader pendant le chargement de l'utilisateur
  if (userLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ minHeight: '200px' }}>
              <StatsCardSkeleton />
            </div>
          ))}
        </div>
        <div style={{ minHeight: '300px', width: '100%' }}>
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  // Si l'utilisateur est un enseignant, afficher le dashboard enseignant
  if (user?.role === 'teacher') {
    return <TeacherDashboard />
  }

  // ✅ OPTIMISATION TBT: Mémoriser les calculs coûteux avec useMemo
  const statCards = useMemo(() => [
    {
      title: `${vocab.students} actifs`,
      value: stats?.studentsCount || 0,
      icon: Users,
      gradient: 'from-brand-blue to-brand-blue-dark',
      bgColor: 'bg-brand-blue-ghost',
      iconColor: 'text-brand-blue',
      isNumber: true,
      trend: '+12%',
      link: '/dashboard/students'
    },
    {
      title: 'Revenus du mois',
      value: stats?.monthlyRevenue || 0,
      icon: DollarSign,
      gradient: 'from-brand-cyan to-brand-cyan-dark',
      bgColor: 'bg-brand-cyan-ghost',
      iconColor: 'text-brand-cyan',
      isNumber: false,
      trend: '+8%',
      link: '/dashboard/financial-reports'
    },
    {
      title: 'Taux de présence',
      value: stats?.avgAttendance || 0,
      icon: TrendingUp,
      gradient: 'from-brand-blue via-brand-cyan to-brand-blue',
      bgColor: 'bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost',
      iconColor: 'text-brand-blue',
      isNumber: false,
      trend: '+5%',
      link: '/dashboard/attendance'
    },
    {
      title: 'Inscriptions',
      value: stats?.totalEnrollments || 0,
      icon: UserPlus,
      gradient: 'from-brand-cyan to-brand-blue',
      bgColor: 'bg-brand-cyan-ghost',
      iconColor: 'text-brand-cyan',
      isNumber: true,
      trend: '+15%',
      link: '/dashboard/students'
    }
  ], [vocab.students, stats?.studentsCount, stats?.monthlyRevenue, stats?.avgAttendance, stats?.totalEnrollments])

  // ✅ OPTIMISATION TBT: Mémoriser les variants d'animation (objets constants)
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }), [])

  const itemVariants = useMemo(() => ({
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
    }
  }), [])

  // ✅ OPTIMISATION TBT: Mémoriser l'animation flottante
  const floatingAnimation = useMemo(() => prefersReducedMotion 
    ? {} 
    : {
        y: [-10, 10, -10],
        transition: {
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut" as const
        }
      }, [prefersReducedMotion])

  return (
    <ErrorBoundary>
      <motion.div
        className="space-y-8 pb-8 max-w-[1600px] mx-auto relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
      {/* Animated background particles - effet subtil (optimisé pour performance) */}
      <ParticlesBackground />

      {/* Hero Header Ultra-Premium avec gradient animé et glassmorphism */}
      <motion.div
        variants={prefersReducedMotion ? {} : itemVariants}
        className="relative overflow-hidden rounded-[2rem] mb-8 shadow-[0_20px_80px_-20px_rgba(51,90,207,0.4)]"
      >
        {/* Gradient de fond animé avec shimmer et effet mesh - Optimisé pour performance */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-cyan"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{ 
            backgroundSize: '200% 200%',
            willChange: prefersReducedMotion ? 'auto' : 'background-position'
          }}
        />

        {/* Mesh gradient overlay pour plus de profondeur */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'radial-gradient(at 40% 20%, rgba(255, 255, 255, 0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(52, 185, 238, 0.4) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(39, 68, 114, 0.3) 0px, transparent 50%)',
        }} />

        {/* Radial overlay avec effet de profondeur amélioré */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-brand-cyan/30 via-transparent to-transparent" />

        {/* Floating orbs avec effet de profondeur - Optimisé pour performance (réduit si prefersReducedMotion) */}
        {!prefersReducedMotion && (
          <>
            <motion.div
              animate={floatingAnimation}
              className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"
              style={{
                boxShadow: '0 0 80px 40px rgba(255, 255, 255, 0.1)',
                willChange: 'transform',
              }}
            />
            <motion.div
              animate={{
                ...floatingAnimation,
                transition: { ...floatingAnimation.transition, delay: 0.5 }
              }}
              className="absolute bottom-10 left-10 w-40 h-40 bg-brand-cyan/10 rounded-full blur-3xl"
              style={{
                boxShadow: '0 0 80px 40px rgba(52, 185, 238, 0.15)',
                willChange: 'transform',
              }}
            />

            {/* Orbs additionnels pour plus de profondeur */}
            <motion.div
              animate={{
                y: [15, -15, 15],
                x: [10, -10, 10],
                transition: {
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full blur-3xl"
              style={{
                willChange: 'transform',
              }}
            />
          </>
        )}

        {/* Contenu */}
        <div className="relative z-10 p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex-1">
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, transform: 'translateY(20px)' }}
                animate={prefersReducedMotion ? {} : { opacity: 1, transform: 'translateY(0)' }}
                transition={prefersReducedMotion ? {} : { delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="flex items-center gap-4 mb-3"
                style={{ willChange: prefersReducedMotion ? 'auto' : 'transform, opacity' }}
              >
                <motion.div
                  className="p-3 bg-white/15 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(255,255,255,0.1)] border border-white/20"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.15, rotate: 10 }}
                  transition={prefersReducedMotion ? {} : { type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Sparkles className="h-7 w-7 text-white drop-shadow-lg" />
                </motion.div>
                <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tighter leading-none drop-shadow-2xl">
                  Bonjour, {user?.full_name?.split(' ')[0] || 'Admin'} 👋
                </h1>
              </motion.div>

              <motion.p
                initial={prefersReducedMotion ? {} : { opacity: 0, transform: 'translateY(20px)' }}
                animate={prefersReducedMotion ? {} : { opacity: 1, transform: 'translateY(0)' }}
                transition={prefersReducedMotion ? {} : { delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="text-white/95 capitalize flex items-center gap-2.5 text-xl font-medium tracking-tight drop-shadow-lg"
                style={{ willChange: prefersReducedMotion ? 'auto' : 'transform, opacity' }}
              >
                <Calendar className="h-5 w-5 drop-shadow-md" />
                {currentDate}
              </motion.p>

              {/* Stats rapides dans le hero avec effets premium - ✅ OPTIMISATION TBT */}
              <motion.div
                initial={prefersReducedMotion ? {} : { opacity: 0, transform: 'translateY(20px)' }}
                animate={prefersReducedMotion ? {} : { opacity: 1, transform: 'translateY(0)' }}
                transition={prefersReducedMotion ? {} : { delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="flex flex-wrap items-center gap-4 mt-8"
                style={{ willChange: prefersReducedMotion ? 'auto' : 'transform, opacity' }}
              >
                <motion.div
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-xl rounded-full px-5 py-3 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.2)]"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.08, transform: 'translateY(-3px)' }}
                  transition={prefersReducedMotion ? {} : { type: "spring", stiffness: 500, damping: 15 }}
                  style={{ willChange: prefersReducedMotion ? 'auto' : 'transform' }}
                >
                  <motion.div
                    className="p-1.5 bg-white/20 rounded-full"
                    whileHover={prefersReducedMotion ? {} : { rotate: 360 }}
                    transition={prefersReducedMotion ? {} : { duration: 0.6 }}
                  >
                    <Users className="h-5 w-5 text-white drop-shadow-md" />
                  </motion.div>
                  <span className="text-white font-bold text-lg tracking-tight drop-shadow-md">{stats?.studentsCount || 0}</span>
                  <span className="text-white/90 text-sm font-semibold">apprenants</span>
                </motion.div>
                <motion.div
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-xl rounded-full px-5 py-3 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.2)]"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.08, transform: 'translateY(-3px)' }}
                  transition={prefersReducedMotion ? {} : { type: "spring", stiffness: 500, damping: 15 }}
                  style={{ willChange: prefersReducedMotion ? 'auto' : 'transform' }}
                >
                  <motion.div
                    className="p-1.5 bg-white/20 rounded-full"
                    whileHover={prefersReducedMotion ? {} : { rotate: 360 }}
                    transition={prefersReducedMotion ? {} : { duration: 0.6 }}
                  >
                    <GraduationCap className="h-5 w-5 text-white drop-shadow-md" />
                  </motion.div>
                  <span className="text-white font-bold text-lg tracking-tight drop-shadow-md">{stats?.activeFormationsCount || 0}</span>
                  <span className="text-white/90 text-sm font-semibold">formations</span>
                </motion.div>
                <motion.div
                  className="group flex items-center gap-3 bg-white/15 backdrop-blur-xl rounded-full px-5 py-3 border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.2)]"
                  whileHover={prefersReducedMotion ? {} : { scale: 1.08, transform: 'translateY(-3px)' }}
                  transition={prefersReducedMotion ? {} : { type: "spring", stiffness: 500, damping: 15 }}
                  style={{ willChange: prefersReducedMotion ? 'auto' : 'transform' }}
                >
                  <motion.div
                    className="p-1.5 bg-white/20 rounded-full"
                    whileHover={prefersReducedMotion ? {} : { rotate: 360 }}
                    transition={prefersReducedMotion ? {} : { duration: 0.6 }}
                  >
                    <Target className="h-5 w-5 text-white drop-shadow-md" />
                  </motion.div>
                  <span className="text-white font-bold text-lg tracking-tight drop-shadow-md">{stats?.activeSessionsCount || 0}</span>
                  <span className="text-white/90 text-sm font-semibold">sessions</span>
                </motion.div>
              </motion.div>
            </div>

            {/* Actions rapides dans le hero avec effets premium */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              className="flex items-center gap-4"
            >
              <Link href="/dashboard/students/new">
                <motion.div
                  whileHover={{ scale: 1.08, y: -5 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Button className="group relative overflow-hidden bg-white text-brand-blue hover:bg-white shadow-[0_20px_60px_-15px_rgba(255,255,255,0.4)] hover:shadow-[0_25px_70px_-15px_rgba(255,255,255,0.6)] transition-all duration-500 font-bold tracking-tight px-7 py-7 text-base border-2 border-white/50">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                    <Plus className="h-5 w-5 mr-2 relative z-10" />
                    <span className="relative z-10">Nouvel apprenant</span>
                  </Button>
                </motion.div>
              </Link>
              <Link href="/dashboard/payments/new">
                <motion.div
                  whileHover={{ scale: 1.08, y: -5 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                >
                  <Button className="group relative overflow-hidden bg-white/15 backdrop-blur-xl text-white border-2 border-white/40 hover:bg-white/25 hover:border-white/60 transition-all duration-500 font-bold tracking-tight px-7 py-7 text-base shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)]">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                    />
                    <FileText className="h-5 w-5 mr-2 relative z-10" />
                    <span className="relative z-10">Facture</span>
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Bento Grid Layout Principal avec animations améliorées */}
      <BentoGrid columns={4} gap="lg">
        {isLoadingStats ? (
          // Skeleton loaders pendant le chargement - ✅ FIX CLS: min-height fixe
          Array.from({ length: 4 }).map((_, i) => (
            <BentoCard key={`skeleton-${i}`} span={1}>
              <div style={{ minHeight: '200px' }}>
                <StatsCardSkeleton />
              </div>
            </BentoCard>
          ))
        ) : (
          statCards.map((stat, index) => (
          <BentoCard key={stat.title} span={1}>
            <Link href={stat.link}>
              <motion.div
                initial={{ opacity: 0, transform: 'translateY(20px)' }}
                animate={{ opacity: 1, transform: 'translateY(0)' }}
                transition={{ delay: prefersReducedMotion ? 0 : 0.1 * index, duration: prefersReducedMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                whileHover={prefersReducedMotion ? {} : { transform: 'translateY(-8px) scale(1.03)' }}
                className="h-full"
                style={{ willChange: prefersReducedMotion ? 'auto' : 'transform, opacity' }}
              >
                <GlassCard
                  variant="premium"
                  hoverable
                  glow={index < 2}
                  glowColor={index === 0 ? 'rgba(39, 68, 114, 0.4)' : 'rgba(52, 185, 238, 0.4)'}
                  className="h-full p-8 group cursor-pointer relative overflow-hidden border-2 border-gray-100/50 hover:border-brand-blue/30 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_60px_-15px_rgba(51,90,207,0.3)]"
                >
                  {/* Gradient animé en background au survol */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(135deg, ${index === 0 ? 'rgba(39, 68, 114, 0.03)' : index === 1 ? 'rgba(52, 185, 238, 0.03)' : index === 2 ? 'rgba(39, 68, 114, 0.02)' : 'rgba(52, 185, 238, 0.02)'} 0%, transparent 100%)`
                    }}
                  />

                  {/* Shine effect on hover - ✅ OPTIMISATION TBT: Utiliser transform au lieu de x/y */}
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100"
                    initial={{ transform: 'translate(-100%, -100%)' }}
                    whileHover={{ transform: 'translate(100%, 100%)' }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    style={{
                      background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
                      willChange: prefersReducedMotion ? 'auto' : 'transform, opacity',
                    }}
                  />

                  <div className="relative z-10">
                    <div className="flex flex-row items-center justify-between mb-6">
                      <CardTitle className="text-sm font-bold text-gray-500 group-hover:text-brand-blue transition-colors tracking-tight uppercase">
                        {stat.title}
                      </CardTitle>
                      <motion.div
                        className={cn("p-4 rounded-2xl transition-all duration-500 shadow-lg group-hover:shadow-xl", stat.bgColor)}
                        whileHover={{ rotate: 15, scale: 1.2 }}
                        transition={{ type: "spring", stiffness: 600, damping: 15 }}
                      >
                        <stat.icon className={cn("h-6 w-6", stat.iconColor)} />
                      </motion.div>
                    </div>
                    <div className="space-y-4">
                      <motion.div
                        className={cn("text-5xl font-bold tracking-tighter text-gray-900 font-display")}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        {stat.isNumber ? (
                          <AnimatedCounter value={typeof stat.value === 'number' ? stat.value : 0} />
                        ) : stat.title === 'Revenus du mois' ? (
                          formatCurrency(stat.value as number, stats?.currency || 'EUR')
                        ) : (
                          `${stat.value}%`
                        )}
                      </motion.div>
                      {stat.trend && (
                        <motion.div
                          className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-gradient-to-r from-emerald-50 to-emerald-100 w-fit px-4 py-2 rounded-full shadow-md border border-emerald-200/50"
                          whileHover={{ scale: 1.08, x: 3 }}
                          transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        >
                          <motion.div
                            animate={prefersReducedMotion ? {} : { y: [-2, 2, -2] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <ArrowUpRight className="h-4 w-4" />
                          </motion.div>
                          <span className="tracking-tight">{stat.trend}</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </Link>
          </BentoCard>
          ))
        )}

        {/* Section Alertes avec effets premium */}
        {(stats?.overdueAmount || 0) > 0 && (
          <BentoCard span={4}>
            <motion.div
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <GlassCard
                variant="premium"
                hoverable
                glow
                glowColor="rgba(239, 68, 68, 0.25)"
                className="relative p-8 border-2 border-red-100 bg-gradient-to-br from-red-50/60 to-orange-50/40 overflow-hidden shadow-[0_10px_40px_-15px_rgba(239,68,68,0.2)]"
              >
                {/* Animated background pattern */}
                <motion.div
                  className="absolute inset-0 opacity-5"
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.4) 10px, rgba(239, 68, 68, 0.4) 20px)',
                    backgroundSize: '200% 200%'
                  }}
                />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <motion.div
                      className="relative p-5 rounded-2xl bg-white shadow-lg border-2 border-red-100"
                    >
                      <div className="relative">
                        <motion.div
                          className="absolute inset-0 bg-red-400 rounded-full opacity-30"
                          animate={{
                            scale: [1, 1.5, 1],
                            opacity: [0.3, 0, 0.3],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                        <AlertCircle className="h-7 w-7 text-red-500 relative z-10" />
                      </div>
                    </motion.div>
                    <div>
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <span>Attention requise</span>
                        <motion.span
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                        >
                          ⚠️
                        </motion.span>
                      </CardTitle>
                      <p className="text-gray-700 text-base">
                        Vous avez <span className="font-bold text-red-600 text-lg">{formatCurrency(stats?.overdueAmount || 0, stats?.currency || 'EUR')}</span> d'impayés en attente de régularisation.
                      </p>
                    </div>
                  </div>
                  <Link href="/dashboard/payments">
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Button
                        className="group relative overflow-hidden bg-white text-red-600 border-2 border-red-200 hover:bg-red-50 hover:border-red-300 shadow-lg hover:shadow-xl transition-all duration-300 font-bold px-6 py-6"
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-red-100/50 to-transparent"
                          initial={{ x: '-100%' }}
                          whileHover={{ x: '100%' }}
                          transition={{ duration: 0.5 }}
                        />
                        <span className="relative z-10">Gérer les impayés</span>
                        <ArrowUpRight className="h-4 w-4 ml-2 relative z-10 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          </BentoCard>
        )}

        {/* Quick Actions Section avec effets premium */}
        <BentoCard span={4}>
          <motion.div
            whileHover={{ scale: 1.005 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <GlassCard
              variant="premium"
              className="relative overflow-hidden p-8 md:p-10 border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]"
            >
              {/* Subtle animated gradient background */}
              <motion.div
                className="absolute inset-0 opacity-30"
                animate={{
                  background: [
                    'radial-gradient(circle at 0% 0%, rgba(39, 68, 114, 0.05) 0%, transparent 50%)',
                    'radial-gradient(circle at 100% 100%, rgba(52, 185, 238, 0.05) 0%, transparent 50%)',
                    'radial-gradient(circle at 0% 0%, rgba(39, 68, 114, 0.05) 0%, transparent 50%)',
                  ],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <motion.div
                      className="relative p-4 bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-cyan rounded-2xl shadow-xl"
                      whileHover={{ rotate: 10, scale: 1.15 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap className="h-6 w-6 text-white drop-shadow-lg" />
                      </motion.div>
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Actions rapides</h2>
                      <p className="text-sm text-gray-600 font-semibold tracking-tight">Accédez rapidement à vos tâches courantes</p>
                    </div>
                  </div>
                </div>
                <AdminQuickActions />
              </div>
            </GlassCard>
          </motion.div>
        </BentoCard>

        {/* Analytics Section: Stats Rings avec effets premium */}
        <BentoCard span={2}>
          <motion.div
            whileHover={{ scale: 1.005 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="h-full"
          >
            <GlassCard
              variant="premium"
              className="relative overflow-hidden p-8 md:p-10 h-full border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]"
            >
              {/* Animated gradient overlay */}
              <motion.div
                className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-blue/5 to-transparent rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <motion.div
                    className="p-3 bg-gradient-to-br from-brand-blue-light to-brand-cyan rounded-2xl shadow-xl"
                    whileHover={{ rotate: 10, scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <Target className="h-6 w-6 text-white drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Objectifs</h2>
                    <p className="text-sm text-gray-600 font-semibold tracking-tight">Progression mensuelle</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 mt-8">
                  <AdminStatsRing
                    value={stats?.completedSessions || 0}
                    max={stats?.activeSessionsCount || 1}
                    label="Sessions"
                    sublabel="complétées"
                    color="#274472"
                  />
                  <AdminStatsRing
                    value={stats?.totalEnrollments || 0}
                    max={(stats?.totalEnrollments || 0) + 20}
                    label="Inscriptions"
                    sublabel="ce mois"
                    color="#34B9EE"
                  />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </BentoCard>

        {/* Activity Heatmap avec effets premium */}
        <BentoCard span={2}>
          <motion.div
            whileHover={{ scale: 1.005 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="h-full"
          >
            <GlassCard
              variant="premium"
              className="relative overflow-hidden p-8 md:p-10 h-full border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]"
            >
              {/* Animated gradient overlay */}
              <motion.div
                className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-brand-cyan/5 to-transparent rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1
                }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <motion.div
                    className="p-3 bg-gradient-to-br from-brand-cyan-dark to-brand-blue-darker rounded-2xl shadow-xl"
                    whileHover={{ rotate: 10, scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <Activity className="h-6 w-6 text-white drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Activité de l'organisme</h2>
                    <p className="text-sm text-gray-600 font-semibold tracking-tight">12 dernières semaines</p>
                  </div>
                </div>
                <AdminActivityHeatmap weeks={12} />
              </div>
            </GlassCard>
          </motion.div>
        </BentoCard>

        {/* Graphique Revenus */}
        <BentoCard span={3} rowSpan={1}>
          <motion.div
            whileHover={{ scale: 1.005 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="h-full"
          >
            <GlassCard
              variant="premium"
              className="relative overflow-hidden p-8 md:p-10 h-full border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]"
            >
              {/* Animated gradient overlay */}
              <motion.div
                className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-blue/5 to-transparent rounded-full blur-3xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                  <motion.div
                    className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-xl"
                    whileHover={{ rotate: 10, scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <TrendingUp className="h-6 w-6 text-white drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-gray-900 tracking-tight">Évolution des revenus</h2>
                    <p className="text-sm text-gray-600 font-semibold tracking-tight">Performance financière sur les 6 derniers mois</p>
                  </div>
                </div>

                {revenueData && revenueData.length > 0 ? (
                  <div style={{ minHeight: '300px', width: '100%' }}>
                    <PremiumLineChart
                      key={`revenue-${revenueData.map(d => d.revenue).join('-')}`}
                      data={revenueData}
                      dataKey="revenue"
                      xAxisKey="month"
                      showArea
                      gradientColors={{ from: '#335ACF', to: '#34B9EE' }}
                    />
                  </div>
                ) : (
                  <div style={{ minHeight: '300px', width: '100%' }}>
                    <ChartSkeleton />
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </BentoCard>

        {/* Graphique Répartition Factures */}
        <BentoCard span={1} rowSpan={1}>
          <div style={{ minHeight: '300px', width: '100%' }}>
            {isLoadingInvoices ? (
              <div className="flex items-center justify-center h-full">
                <ChartSkeleton />
              </div>
            ) : (invoiceStatus && invoiceStatus.length > 0) ? (
              <PremiumPieChart
                title="Statut des factures"
                subtitle="Vue d'ensemble"
                data={invoiceStatus}
                colors={['#10B981', '#3B82F6', '#6366F1', '#EF4444', '#94A3B8']}
                className="h-full"
                innerRadius={60}
                outerRadius={80}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <p className="text-2xl font-bold text-gray-900 mb-2">Statut des factures</p>
                <p className="text-sm text-gray-500 mb-4">Vue d'ensemble</p>
                <p className="text-gray-400">Aucune facture disponible</p>
              </div>
            )}
          </div>
        </BentoCard>

        {/* Graphique Apprenants par session */}
        <BentoCard span={2}>
          {studentsBySession && studentsBySession.length > 0 ? (
            <PremiumBarChart
              title={`Répartition des ${vocab.students.toLowerCase()}`}
              subtitle="Nombre d'inscrits par session active"
              data={studentsBySession}
              dataKey="students"
              xAxisKey="name"
              className="h-full"
              colors={['#335ACF', '#34B9EE']}
            />
          ) : (
            <ChartSkeleton />
          )}
        </BentoCard>

        {/* Top Programmes avec effets premium */}
        <BentoCard span={2}>
          <motion.div
            whileHover={{ scale: 1.005 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="h-full"
          >
            <GlassCard
              variant="premium"
              className="h-full flex flex-col border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]"
            >
              <div className="p-6 pb-4 border-b border-gray-100/80">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-display font-bold text-gray-900 tracking-tight">Top Programmes</h3>
                    <p className="text-sm text-gray-600 font-semibold">Les plus populaires ce mois-ci</p>
                  </div>
                  <motion.div
                    className="p-3 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-xl shadow-md"
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <Award className="h-5 w-5 text-yellow-600" />
                  </motion.div>
                </div>
              </div>
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[300px] smooth-scroll">
                {topPrograms && topPrograms.map((program: any, index: number) => (
                  <motion.div
                    key={program.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 5, scale: 1.02 }}
                    className="group"
                  >
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white hover:bg-gradient-to-r hover:from-brand-blue-ghost hover:to-transparent transition-all duration-300 border border-transparent hover:border-brand-blue/20 shadow-sm hover:shadow-md">
                      <div className="flex items-center gap-4">
                        <motion.div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-md",
                            index === 0 ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-white" :
                            index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white" :
                            index === 2 ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white" :
                            "bg-white border-2 border-gray-200 text-gray-600"
                          )}
                          whileHover={{ scale: 1.15, rotate: 360 }}
                          transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        >
                          {index + 1}
                        </motion.div>
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-brand-blue transition-colors">
                            {program.name}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">{program.code}</p>
                        </div>
                      </div>
                      <motion.div
                        className="text-right bg-brand-blue-ghost px-3 py-1.5 rounded-full"
                        whileHover={{ scale: 1.05 }}
                      >
                        <span className="font-bold text-brand-blue">{program.enrollments}</span>
                        <span className="text-xs text-gray-600 ml-1">inscrits</span>
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
                {(!topPrograms || topPrograms.length === 0) && (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    Aucune donnée disponible
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        </BentoCard>

        {/* Activité récente avec effets premium */}
        <BentoCard span={4}>
          <motion.div
            whileHover={{ scale: 1.002 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <GlassCard
              variant="premium"
              className="h-full flex flex-col border-2 border-gray-100/50 hover:border-brand-blue/20 transition-all duration-500 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)]"
            >
              <div className="p-6 pb-4 border-b border-gray-100/80 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <motion.div
                    className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-md"
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <Activity className="h-5 w-5 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-gray-900 tracking-tight">Inscriptions récentes</h3>
                    <p className="text-sm text-gray-600 font-semibold">Derniers mouvements dans l'établissement</p>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-brand-blue hover:text-brand-blue-dark hover:bg-brand-blue-ghost font-bold transition-all"
                  >
                    Tout voir
                    <ArrowUpRight className="h-4 w-4 ml-1" />
                  </Button>
                </motion.div>
              </div>
              <div className="p-0">
                <div className="divide-y divide-gray-100/50">
                  {recentEnrollments && recentEnrollments.map((enrollment: any, index: number) => (
                    <motion.div
                      key={enrollment.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 5, backgroundColor: 'rgba(39, 68, 114, 0.02)' }}
                      className="group flex items-center justify-between p-5 transition-all duration-300 border-l-4 border-transparent hover:border-brand-blue cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        {enrollment.students?.photo_url ? (
                          <motion.img
                            src={enrollment.students.photo_url}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover shadow-md ring-2 ring-gray-100 group-hover:ring-brand-blue/30"
                            whileHover={{ scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          />
                        ) : (
                          <motion.div
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-cyan flex items-center justify-center text-white text-sm font-bold shadow-md ring-2 ring-gray-100 group-hover:ring-brand-blue/30"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            {enrollment.students?.first_name?.[0]}{enrollment.students?.last_name?.[0]}
                          </motion.div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 group-hover:text-brand-blue transition-colors">
                            {enrollment.students?.first_name} {enrollment.students?.last_name}
                          </p>
                          <p className="text-sm text-gray-600 font-medium">
                            {enrollment.sessions?.formations?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                            <Clock className="h-4 w-4" />
                            {formatDate(enrollment.created_at)}
                          </div>
                        </div>
                        <motion.span
                          whileHover={{ scale: 1.05 }}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold border-2 shadow-sm",
                            enrollment.status === 'confirmed' ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200" :
                            enrollment.status === 'pending' ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200" :
                            "bg-gray-50 text-gray-700 border-gray-200"
                          )}
                        >
                          {enrollment.status === 'confirmed' ? 'Inscrit' :
                           enrollment.status === 'pending' ? 'En attente' : enrollment.status}
                        </motion.span>
                      </div>
                    </motion.div>
                  ))}
                  {(!recentEnrollments || recentEnrollments.length === 0) && (
                    <div className="text-center py-16 text-gray-400">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="font-medium">Aucune activité récente</p>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </BentoCard>

      </BentoGrid>

      {/* Score de Conformité Qualiopi - Toujours visible pour la rétention */}
      {user?.role !== 'teacher' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8"
        >
          <QualiopiComplianceScore />
        </motion.div>
      )}
      </motion.div>
      <OnboardingChecklist />
    </ErrorBoundary>
  )
}
