'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { sessionService } from '@/lib/services/session.service'
import { formationService } from '@/lib/services/formation.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Plus, Search, Calendar, Clock, MapPin, Users, Filter, TrendingUp, BookOpen, CheckCircle, XCircle, Activity, SlidersHorizontal, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { formatDate, cn } from '@/lib/utils'
import { motion, AnimatePresence } from '@/components/ui/motion'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { PremiumBarChart } from '@/components/charts/premium-bar-chart'
import { PremiumPieChart } from '@/components/charts/premium-pie-chart'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'
import { differenceInDays, isAfter, isBefore, formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

type Session = TableRow<'sessions'>

function SessionTimelineSummary({ startDate, endDate }: { startDate: string, endDate: string | null }) {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null
  const now = new Date()
  
  let progress = 0
  let label = ''
  let subLabel = ''

  if (end) {
    const totalDays = differenceInDays(end, start) + 1
    const elapsedDays = differenceInDays(now, start) + 1

    if (isBefore(now, start)) {
      progress = 0
      label = 'À venir'
      subLabel = `Dans ${formatDistanceToNow(start, { locale: fr })}`
    } else if (isAfter(now, end)) {
      progress = 100
      label = 'Terminée'
      subLabel = `Il y a ${formatDistanceToNow(end, { locale: fr })}`
    } else {
      progress = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100))
      label = 'En cours'
      subLabel = `Jour ${elapsedDays} / ${totalDays}`
    }
  } else {
    // Cas sans date de fin (rare pour une session)
    if (isBefore(now, start)) {
      label = 'À venir'
      subLabel = `Dans ${formatDistanceToNow(start, { locale: fr })}`
    } else {
      label = 'En cours'
      subLabel = `Depuis ${formatDistanceToNow(start, { locale: fr })}`
    }
  }

  // Déterminer l'étape active pour le stepper
  const steps = ['Préparation', 'Inscriptions', 'Déroulement', 'Clôture']
  let activeStepIndex = 0
  
  if (progress === 0 && label === 'À venir') activeStepIndex = 0 // Préparation
  else if (progress > 0 && progress < 100) activeStepIndex = 2 // Déroulement (approx)
  else if (progress === 100) activeStepIndex = 3 // Clôture

  // Ajustement fin pour "Inscriptions" vs "Déroulement"
  // Si c'est "À venir" mais proche (ex: < 2 semaines), on peut être en inscriptions
  if (label === 'À venir' && differenceInDays(start, now) < 14) activeStepIndex = 1

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="text-xs font-bold text-gray-800 block">Timeline de la Session</span>
          <span className="text-[10px] text-gray-500">Suivi des étapes et tâches</span>
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-brand-blue block">{label}</span>
          <span className="text-[10px] text-gray-500">{subLabel}</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-3">
        <div 
          className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Mini Stepper */}
      <div className="flex justify-between items-center relative">
        {/* Ligne de fond du stepper */}
        <div className="absolute top-1.5 left-0 w-full h-0.5 bg-gray-200 -z-10" />
        
        {steps.map((step, index) => {
          const isActive = index <= activeStepIndex
          const isCurrent = index === activeStepIndex
          return (
            <div key={step} className="flex flex-col items-center">
              <div 
                className={cn(
                  "w-3 h-3 rounded-full border-2 transition-colors duration-300",
                  isActive ? "bg-brand-blue border-brand-blue" : "bg-white border-gray-300",
                  isCurrent && "ring-2 ring-brand-blue/30"
                )}
              />
              <span className={cn(
                "text-[9px] mt-1 font-medium transition-colors duration-300",
                isActive ? "text-brand-blue" : "text-gray-400"
              )}>
                {step}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SessionsPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <SessionsPageContent />
    </RoleGuard>
  )
}

function SessionsPageContent() {
  const { user } = useAuth()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [selectedFormationId, setSelectedFormationId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Récupérer les formations pour le filtre
  const { data: formations } = useQuery({
    queryKey: ['formations', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return formationService.getAllFormations(user.organization_id, { isActive: true })
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', user?.organization_id, search, selectedFormationId, statusFilter],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return sessionService.getAllSessions(user.organization_id, {
        formationId: selectedFormationId || undefined,
        status: statusFilter ? (statusFilter as Session['status']) : undefined,
        search,
      })
    },
    enabled: !!user?.organization_id,
  })

  // Statistiques des sessions
  const { data: sessionStats } = useQuery({
    queryKey: ['session-stats', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null

      const { data: allSessions, error } = await supabase
        .from('sessions')
        .select('status, start_date, end_date, formations!inner(organization_id)')
        .eq('formations.organization_id', user.organization_id)

      if (error) throw error

      const sessionsArray = (allSessions as unknown as Session[]) || []
      const total = sessionsArray.length
      const planned = sessionsArray.filter((s) => s.status === 'planned').length
      const ongoing = sessionsArray.filter((s) => s.status === 'ongoing').length
      const completed = sessionsArray.filter((s) => s.status === 'completed').length
      const cancelled = sessionsArray.filter((s) => s.status === 'cancelled').length

      // Compter les inscriptions
      let totalEnrollments = 0
      const sessionIds = sessionsArray.map((s) => s.id).filter((id): id is string => !!id)
      if (sessionIds && sessionIds.length > 0) {
        const { count, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
        if (enrollmentsError) throw enrollmentsError
        totalEnrollments = count || 0
      }

      // Compter les sessions à venir (dans les 30 prochains jours)
      const now = new Date()
      const in30Days = new Date(now)
      in30Days.setDate(now.getDate() + 30)
      const upcoming = sessionsArray.filter((s) => {
        const startDate = new Date(s.start_date)
        return startDate >= now && startDate <= in30Days && s.status !== 'completed' && s.status !== 'cancelled'
      }).length

      // Grouper par statut pour le graphique
      const statusData = [
        { name: 'Planifiées', value: planned },
        { name: 'En cours', value: ongoing },
        { name: 'Terminées', value: completed },
        { name: 'Annulées', value: cancelled },
      ].filter(item => item.value > 0)

      // Grouper par mois pour le graphique d'évolution
      const byMonth: Record<string, number> = {}
      sessionsArray.forEach((s) => {
        const month = new Date(s.start_date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
        byMonth[month] = (byMonth[month] || 0) + 1
      })
      const evolutionData = Object.entries(byMonth)
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .slice(-6)
        .map(([month, count]) => ({ month, count }))

      return {
        total,
        planned,
        ongoing,
        completed,
        cancelled,
        upcoming,
        totalEnrollments,
        statusData,
        evolutionData,
      }
    },
    enabled: !!user?.organization_id,
  })

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'planned':
        return 'bg-blue-50 text-blue-600 border-blue-100'
      case 'ongoing':
        return 'bg-brand-blue-ghost text-brand-blue border-brand-blue/20'
      case 'completed':
        return 'bg-gray-50 text-gray-600 border-gray-200'
      case 'cancelled':
        return 'bg-red-50 text-red-600 border-red-100'
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200'
    }
  }

  const getStatusIcon = (status: Session['status']) => {
    switch (status) {
      case 'planned': return Calendar
      case 'ongoing': return Activity
      case 'completed': return CheckCircle
      case 'cancelled': return XCircle
      default: return Calendar
    }
  }

  const getStatusLabel = (status: Session['status']) => {
    switch (status) {
      case 'planned': return 'Planifiée'
      case 'ongoing': return 'En cours'
      case 'completed': return 'Terminée'
      case 'cancelled': return 'Annulée'
      default: return status
    }
  }

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
      className="space-y-8 pb-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Ultra-Premium */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <motion.div
              className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-lg shadow-brand-blue/20"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <Calendar className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-gray-900 tracking-tighter leading-none">
              Sessions
            </h1>
            {(sessions as Session[])?.length > 0 && (
              <motion.span
                className="px-3 py-1.5 bg-brand-blue-ghost text-brand-blue rounded-full text-sm font-bold flex items-center gap-2 shadow-sm"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {(sessions as Session[])?.length || 0}
              </motion.span>
            )}
          </div>
          <p className="text-gray-600 font-medium text-lg tracking-tight">
            Gérez toutes vos sessions de formation et leur planification
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.98 }}>
          <Link href="/dashboard/sessions/new">
            <Button className="bg-gradient-to-br from-brand-blue to-brand-cyan text-white hover:from-brand-blue-dark hover:to-brand-cyan-dark shadow-xl shadow-brand-blue/20 hover:shadow-2xl hover:shadow-brand-cyan/30 transition-all duration-500 font-semibold tracking-tight px-6 py-6 text-base">
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle session
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Statistiques Ultra-Premium - 2 lignes de 3 carreaux */}
      {sessionStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Total sessions',
              value: sessionStats.total,
              icon: Calendar,
              iconBg: 'bg-gradient-to-br from-brand-blue to-brand-blue-dark',
              cardBg: 'bg-gradient-to-br from-brand-blue/5 via-brand-blue/10 to-brand-cyan/5',
              borderColor: 'border-brand-blue/20',
              glowColor: 'rgba(39, 68, 114, 0.15)',
            },
            {
              title: 'À venir',
              value: sessionStats.upcoming,
              icon: Clock,
              iconBg: 'bg-gradient-to-br from-brand-cyan to-brand-cyan-dark',
              cardBg: 'bg-gradient-to-br from-brand-cyan/5 via-brand-cyan/10 to-brand-blue/5',
              borderColor: 'border-brand-cyan/20',
              glowColor: 'rgba(52, 185, 238, 0.15)',
            },
            {
              title: 'En cours',
              value: sessionStats.ongoing,
              icon: Activity,
              iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
              cardBg: 'bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-teal-50',
              borderColor: 'border-emerald-200',
              glowColor: 'rgba(16, 185, 129, 0.15)',
              highlight: sessionStats.ongoing > 0,
            },
            {
              title: 'Terminées',
              value: sessionStats.completed,
              icon: CheckCircle,
              iconBg: 'bg-gradient-to-br from-gray-400 to-gray-500',
              cardBg: 'bg-gradient-to-br from-gray-50 via-gray-100/50 to-gray-50',
              borderColor: 'border-gray-200',
              glowColor: 'rgba(107, 114, 128, 0.1)',
            },
            {
              title: 'Annulées',
              value: sessionStats.cancelled,
              icon: XCircle,
              iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
              cardBg: 'bg-gradient-to-br from-red-50 via-red-100/50 to-pink-50',
              borderColor: 'border-red-200',
              glowColor: 'rgba(239, 68, 68, 0.15)',
            },
            {
              title: 'Inscriptions',
              value: sessionStats.totalEnrollments,
              icon: Users,
              iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
              cardBg: 'bg-gradient-to-br from-purple-50 via-purple-100/50 to-pink-50',
              borderColor: 'border-purple-200',
              glowColor: 'rgba(168, 85, 247, 0.15)',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.05,
                ease: [0.16, 1, 0.3, 1]
              }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="group relative"
            >
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl p-6 border-2 transition-all duration-500 shadow-lg hover:shadow-2xl",
                  stat.cardBg,
                  stat.borderColor,
                  stat.highlight && "ring-2 ring-emerald-500/20 animate-pulse-premium"
                )}
                style={{
                  boxShadow: `0 10px 40px -10px ${stat.glowColor}, 0 0 0 1px rgba(255, 255, 255, 0.1)`
                }}
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <motion.div
                      className={cn('p-3.5 rounded-2xl shadow-xl', stat.iconBg)}
                      whileHover={{ rotate: 12, scale: 1.15 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                    >
                      <stat.icon className="h-6 w-6 text-white" />
                    </motion.div>
                    <motion.div
                      className="text-right"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                    >
                      <div className="text-4xl font-display font-bold tracking-tighter text-gray-900 leading-none mb-1">
                        {stat.value}
                      </div>
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                        {stat.title}
                      </p>
                    </motion.div>
                  </div>

                  {/* Bottom accent bar */}
                  <motion.div
                    className="h-1.5 rounded-full mt-4"
                    style={{
                      background: stat.iconBg.replace('bg-gradient-to-br', 'linear-gradient(to right,')
                    }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.05 + 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>

                {/* Glow effect on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${stat.glowColor} 0%, transparent 70%)`
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filtres et Recherche Ultra-Premium */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-4 border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
              <input
                type="text"
                placeholder="Rechercher une session..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-brand-blue/30 focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm font-medium tracking-tight shadow-sm"
              />
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "gap-2 transition-all px-6 py-3 rounded-xl font-semibold tracking-tight shadow-sm",
                  showFilters ? "bg-brand-blue text-white hover:bg-brand-blue-dark" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtres
                {(selectedFormationId || statusFilter) && (
                  <motion.span
                    className="w-5 h-5 bg-brand-cyan text-white text-[10px] flex items-center justify-center rounded-full ml-1 font-bold shadow-md"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    !
                  </motion.span>
                )}
              </Button>
            </motion.div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 mt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Formation</label>
                    <select
                      value={selectedFormationId}
                      onChange={(e) => setSelectedFormationId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-2 focus:ring-brand-blue/10 outline-none text-sm transition-all"
                    >
                      <option value="">Toutes les formations</option>
                      {(formations as any[])?.map((formation) => (
                        <option key={formation.id} value={formation.id}>
                          {formation.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-2 focus:ring-brand-blue/10 outline-none text-sm transition-all"
                    >
                      <option value="">Tous les statuts</option>
                      <option value="planned">Planifiées</option>
                      <option value="ongoing">En cours</option>
                      <option value="completed">Terminées</option>
                      <option value="cancelled">Annulées</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* Graphiques Premium */}
      {sessionStats && (sessionStats.statusData.length > 0 || sessionStats.evolutionData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {sessionStats.statusData.length > 0 && (
            <motion.div variants={itemVariants} className="h-full">
              <PremiumPieChart
                title="Répartition par statut"
                subtitle="Vue d'ensemble des sessions"
                data={sessionStats.statusData}
                colors={['#3B82F6', '#335ACF', '#6B7280', '#EF4444']}
                className="h-full"
                innerRadius={70}
              />
            </motion.div>
          )}

          {sessionStats.evolutionData.length > 0 && (
            <motion.div variants={itemVariants} className="h-full">
              <PremiumBarChart
                title="Évolution des sessions"
                subtitle="Nombre de sessions par mois"
                data={sessionStats.evolutionData}
                dataKey="count"
                xAxisKey="month"
                className="h-full"
                color="#3B82F6"
              />
            </motion.div>
          )}
        </div>
      )}

      {/* Liste des sessions */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : !sessions || (sessions as Session[]).length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <GlassCard variant="premium" className="p-16 text-center border-2 border-dashed border-gray-200">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-20 h-20 bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <Calendar className="h-10 w-10 text-brand-blue" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-2xl font-display font-bold text-gray-900 mb-2 tracking-tight"
              >
                Aucune session trouvée
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-gray-600 mb-8 font-medium tracking-tight"
              >
                {search || selectedFormationId || statusFilter
                  ? 'Essayez de modifier vos filtres de recherche.'
                  : 'Commencez par créer votre première session.'}
              </motion.p>
              {!search && !selectedFormationId && !statusFilter && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href="/dashboard/sessions/new">
                    <Button className="bg-gradient-to-br from-brand-blue to-brand-cyan text-white hover:from-brand-blue-dark hover:to-brand-cyan-dark shadow-xl shadow-brand-blue/20 hover:shadow-2xl hover:shadow-brand-cyan/30 transition-all duration-500 font-semibold tracking-tight px-6 py-6 text-base">
                      <Plus className="mr-2 h-5 w-5" />
                      Nouvelle session
                    </Button>
                  </Link>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {((sessions as Session[]) || []).map((session, index) => {
                const StatusIcon = getStatusIcon(session.status)
                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{
                      delay: index * 0.05,
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1]
                    }}
                    whileHover={{ y: -8, scale: 1.02 }}
                  >
                    <Link href={`/dashboard/sessions/${session.id}`}>
                      <GlassCard
                        variant="premium"
                        hoverable
                        className="h-full p-6 group flex flex-col justify-between border-2 border-transparent hover:border-brand-blue/20 transition-all duration-500 shadow-lg hover:shadow-2xl"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-5">
                            <motion.div
                              whileHover={{ scale: 1.15, rotate: 8 }}
                              transition={{ type: "spring", stiffness: 500, damping: 15 }}
                              className={cn(
                                'h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg',
                                getStatusColor(session.status)
                              )}
                            >
                              <StatusIcon className="h-6 w-6" />
                            </motion.div>
                            <motion.span
                              className={cn(
                                'px-3 py-1.5 rounded-xl text-xs font-bold border-2 shadow-sm uppercase tracking-wide',
                                getStatusColor(session.status)
                              )}
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            >
                              {getStatusLabel(session.status)}
                            </motion.span>
                          </div>

                          <div className="mb-5">
                            <h3 className="text-lg font-display font-bold text-gray-900 line-clamp-2 group-hover:text-brand-blue transition-colors tracking-tight leading-tight">
                              {session.name}
                            </h3>
                          </div>

                          <div className="space-y-2.5 text-sm">
                            <div className="flex items-center gap-2.5 text-gray-600 group-hover:text-gray-700 transition-colors">
                              <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-brand-blue-ghost transition-colors">
                                <Calendar className="h-4 w-4 flex-shrink-0 text-gray-500 group-hover:text-brand-blue transition-colors" />
                              </div>
                              <span className="font-medium tracking-tight">{formatDate(session.start_date)}</span>
                            </div>
                            {session.end_date && (
                              <div className="flex items-center gap-2.5 text-gray-600 group-hover:text-gray-700 transition-colors">
                                <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-brand-cyan-ghost transition-colors">
                                  <Clock className="h-4 w-4 flex-shrink-0 text-gray-500 group-hover:text-brand-cyan transition-colors" />
                                </div>
                                <span className="font-medium tracking-tight">{formatDate(session.end_date)}</span>
                              </div>
                            )}
                            {session.location && (
                              <div className="flex items-center gap-2.5 text-gray-600 group-hover:text-gray-700 transition-colors">
                                <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-emerald-50 transition-colors">
                                  <MapPin className="h-4 w-4 flex-shrink-0 text-gray-500 group-hover:text-emerald-600 transition-colors" />
                                </div>
                                <span className="truncate font-medium tracking-tight">{session.location}</span>
                              </div>
                            )}
                          </div>

                          <SessionTimelineSummary startDate={session.start_date} endDate={session.end_date} />
                        </div>

                        <motion.div
                          className="mt-6 pt-5 border-t-2 border-gray-100 group-hover:border-brand-blue/20 flex items-center justify-between transition-colors"
                          whileHover={{ x: 2 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        >
                          <span className="text-sm font-bold text-gray-500 group-hover:text-brand-blue transition-colors tracking-tight">
                            Gérer la session
                          </span>
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 5 }}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                          >
                            <ArrowUpRight className="h-5 w-5 text-gray-400 group-hover:text-brand-cyan transition-colors" />
                          </motion.div>
                        </motion.div>
                      </GlassCard>
                    </Link>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
