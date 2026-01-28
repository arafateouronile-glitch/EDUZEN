'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { formationService } from '@/lib/services/formation.service'
import { programService } from '@/lib/services/program.service'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Plus, Search, BookMarked, Calendar, Users, DollarSign, Filter, TrendingUp, CheckCircle, XCircle, BookOpen, Activity, ArrowRight, SlidersHorizontal, ArrowUpRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, cn } from '@/lib/utils'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { PremiumPieChart } from '@/components/charts/premium-pie-chart'
import { PremiumBarChart } from '@/components/charts/premium-bar-chart'
import type { TableRow } from '@/lib/types/supabase-helpers'
import { RoleGuard, FORMATION_MANAGEMENT_ROLES } from '@/components/auth/role-guard'

type Formation = TableRow<'formations'>
type Session = TableRow<'sessions'>

export default function FormationsPage() {
  return (
    <RoleGuard allowedRoles={FORMATION_MANAGEMENT_ROLES}>
      <FormationsPageContent />
    </RoleGuard>
  )
}

function FormationsPageContent() {
  const { user } = useAuth()
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [selectedProgramId, setSelectedProgramId] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Récupérer les programmes pour le filtre
  const { data: programs } = useQuery({
    queryKey: ['programs', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return programService.getAllPrograms(user.organization_id, { isActive: true })
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les formations
  const { data: formations, isLoading } = useQuery({
    queryKey: ['formations', user?.organization_id, search, showActiveOnly, selectedProgramId],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return formationService.getAllFormations(user.organization_id, {
        programId: selectedProgramId || undefined,
        search,
        isActive: showActiveOnly || undefined,
      })
    },
    enabled: !!user?.organization_id,
  })

  // Statistiques des formations
  const { data: formationStats } = useQuery({
    queryKey: ['formation-stats', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return null

      const { data: allFormations, error } = await supabase
        .from('formations')
        .select('is_active, created_at, program_id')
        .eq('organization_id', user.organization_id)

      if (error) throw error

      const formationsArray = (allFormations as Formation[]) || []
      const total = formationsArray.length
      const active = formationsArray.filter((f) => f.is_active).length
      const inactive = formationsArray.filter((f) => !f.is_active).length

      // Compter les sessions
      let totalSessions = 0
      const formationIds = formationsArray.map((f) => f.id).filter((id): id is string => !!id)
      if (formationIds && formationIds.length > 0) {
        const { count } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .in('formation_id', formationIds)
        totalSessions = count || 0
      }

      // Compter les inscriptions via les sessions
      let totalEnrollments = 0
      if (formationIds && formationIds.length > 0) {
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessions')
          .select('id')
          .in('formation_id', formationIds)
        if (sessionsError) throw sessionsError
        const sessionIds = (sessions as Session[])?.map((s) => s.id).filter((id): id is string => !!id) || []
        if (sessionIds && sessionIds.length > 0) {
          const { count } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .in('session_id', sessionIds)
          totalEnrollments = count || 0
        }
      }

      // Calculer les créations ce mois
      const thisMonthCount = formationsArray.filter((f) => {
        if (!f.created_at) return false
        const date = new Date(f.created_at)
        const now = new Date()
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      }).length

      // Grouper par statut pour le graphique
      const statusData = [
        { name: 'Actives', value: active, color: '#335ACF' },
        { name: 'Inactives', value: inactive, color: '#6B7280' },
      ].filter(item => item.value > 0)

      // Grouper par mois pour le graphique d'évolution
      const byMonth: Record<string, number> = {}
      formationsArray.forEach((f) => {
        if (f.created_at) {
          const date = new Date(f.created_at)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          byMonth[monthKey] = (byMonth[monthKey] || 0) + 1
        }
      })

      const monthlyData = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6) // Derniers 6 mois
        .map(([month, count]) => ({
          month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
          formations: count,
        }))

      return {
        total,
        active,
        inactive,
        totalSessions,
        totalEnrollments,
        thisMonthCount,
        statusData,
        monthlyData,
      }
    },
    enabled: !!user?.organization_id,
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  } as const

  return (
    <motion.div 
      className="space-y-8 pb-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Ultra-Premium */}
      <motion.div variants={itemVariants as any} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <motion.div
              className="p-3 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-lg shadow-brand-blue/20"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <BookMarked className="h-8 w-8 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-gray-900 tracking-tighter leading-none">
              Formations
            </h1>
            {formations && formations.length > 0 && (
              <motion.span
                className="px-3 py-1.5 bg-brand-blue-ghost text-brand-blue rounded-full text-sm font-bold flex items-center gap-2 shadow-sm"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {formations.length}
              </motion.span>
            )}
          </div>
          <p className="text-gray-600 font-medium text-lg tracking-tight">
            Gérez vos formations et leurs sessions associées
          </p>
        </div>

        <motion.div whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.98 }}>
          <Link href="/dashboard/formations/new">
            <Button className="bg-gradient-to-br from-brand-blue to-brand-cyan text-white hover:from-brand-blue-dark hover:to-brand-cyan-dark shadow-xl shadow-brand-blue/20 hover:shadow-2xl hover:shadow-brand-cyan/30 transition-all duration-500 font-semibold tracking-tight px-6 py-6 text-base">
              <Plus className="h-5 w-5 mr-2" />
              Nouvelle formation
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Statistiques Ultra-Premium - 2 lignes de 3 carreaux */}
      {formationStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Total formations',
              value: formationStats.total,
              icon: BookMarked,
              iconBg: 'bg-gradient-to-br from-brand-blue to-brand-blue-dark',
              cardBg: 'bg-gradient-to-br from-brand-blue/5 via-brand-blue/10 to-brand-cyan/5',
              borderColor: 'border-brand-blue/20',
              glowColor: 'rgba(39, 68, 114, 0.15)',
            },
            {
              title: 'Actives',
              value: formationStats.active,
              icon: CheckCircle,
              iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
              cardBg: 'bg-gradient-to-br from-emerald-50 via-emerald-100/50 to-teal-50',
              borderColor: 'border-emerald-200',
              glowColor: 'rgba(16, 185, 129, 0.15)',
              highlight: formationStats.active > 0,
            },
            {
              title: 'Inactives',
              value: formationStats.inactive,
              icon: XCircle,
              iconBg: 'bg-gradient-to-br from-gray-400 to-gray-500',
              cardBg: 'bg-gradient-to-br from-gray-50 via-gray-100/50 to-gray-50',
              borderColor: 'border-gray-200',
              glowColor: 'rgba(107, 114, 128, 0.1)',
            },
            {
              title: 'Sessions planifiées',
              value: formationStats.totalSessions,
              icon: Calendar,
              iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
              cardBg: 'bg-gradient-to-br from-purple-50 via-purple-100/50 to-pink-50',
              borderColor: 'border-purple-200',
              glowColor: 'rgba(168, 85, 247, 0.15)',
            },
            {
              title: 'Inscriptions',
              value: formationStats.totalEnrollments,
              icon: Users,
              iconBg: 'bg-gradient-to-br from-brand-cyan to-brand-cyan-dark',
              cardBg: 'bg-gradient-to-br from-brand-cyan/5 via-brand-cyan/10 to-brand-blue/5',
              borderColor: 'border-brand-cyan/20',
              glowColor: 'rgba(52, 185, 238, 0.15)',
            },
            {
              title: 'Créées ce mois',
              value: formationStats.thisMonthCount,
              icon: Clock,
              iconBg: 'bg-gradient-to-br from-brand-blue-light to-brand-cyan',
              cardBg: 'bg-gradient-to-br from-brand-blue-pale/30 via-brand-blue-pale/50 to-brand-cyan-pale/30',
              borderColor: 'border-brand-blue-light/20',
              glowColor: 'rgba(75, 116, 157, 0.15)',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.05,
                ease: 'easeOut'
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
                    transition={{ delay: index * 0.05 + 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
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

      {/* Graphiques Premium */}
      {formationStats && (formationStats.statusData.length > 0 || formationStats.monthlyData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {formationStats.statusData.length > 0 && (
            <motion.div variants={itemVariants as any} className="h-full">
              <GlassCard variant="default" className="p-6 h-full">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-brand-blue" />
                    Répartition par statut
                  </h3>
                </div>
                <div className="h-[300px]">
                  <PremiumPieChart
                    data={formationStats.statusData}
                    colors={formationStats.statusData.map(d => d.color)}
                    variant="default"
                    className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                    innerRadius={70}
                  />
                </div>
              </GlassCard>
            </motion.div>
          )}

          {formationStats.monthlyData.length > 0 && (
            <motion.div variants={itemVariants as any} className="h-full">
              <GlassCard variant="default" className="p-6 h-full">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-brand-cyan" />
                    Évolution des formations
                  </h3>
                </div>
                <div className="h-[300px]">
                  <PremiumBarChart
                    data={formationStats.monthlyData}
                    dataKey="formations"
                    xAxisKey="month"
                    color="#8B5CF6"
                    variant="default"
                    className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                  />
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      )}

      {/* Filtres et Recherche Ultra-Premium */}
      <motion.div variants={itemVariants as any}>
        <GlassCard variant="premium" className="p-4 border-2 border-transparent hover:border-brand-blue/10 transition-all duration-500">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-brand-blue transition-colors" />
              <input
                type="text"
                placeholder="Rechercher une formation..."
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
                {(selectedProgramId || !showActiveOnly) && (
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
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={showActiveOnly}
                          onChange={(e) => setShowActiveOnly(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Actives uniquement</span>
                    </label>
                  </div>
                  {programs && programs.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Programme</label>
                      <select
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 border-transparent focus:bg-white focus:border-brand-blue/20 focus:ring-2 focus:ring-brand-blue/10 outline-none text-sm transition-all"
                      >
                        <option value="">Tous les programmes</option>
                        {(programs as any[])?.map((program) => (
                          <option key={program.id} value={program.id}>
                            {program.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>

      {/* Formations List Ultra-Premium */}
      <motion.div variants={itemVariants as any}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : formations && formations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {(formations as Formation[])?.map((formation, index) => (
                <motion.div
                  key={formation.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.5,
                    ease: 'easeOut'
                  }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  <Link href={`/dashboard/formations/${formation.id}`}>
                    <GlassCard
                      variant="premium"
                      hoverable
                      className="h-full p-0 group cursor-pointer flex flex-col overflow-hidden border-2 border-transparent hover:border-brand-blue/20 transition-all duration-500 shadow-lg hover:shadow-2xl"
                    >
                      <div className="p-6 flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <motion.div
                            whileHover={{ scale: 1.15, rotate: 8 }}
                            transition={{ type: "spring", stiffness: 500, damping: 15 }}
                            className={cn(
                              'h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg',
                              formation.is_active
                                ? 'bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-brand-blue/20'
                                : 'bg-gray-100 text-gray-400'
                            )}
                          >
                            <BookMarked className="h-6 w-6" />
                          </motion.div>

                          <motion.span
                            className={cn(
                              'px-3 py-1.5 rounded-xl text-xs font-bold border-2 shadow-sm uppercase tracking-wide',
                              formation.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            )}
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            {formation.is_active ? 'Active' : 'Inactive'}
                          </motion.span>
                        </div>

                        <h3 className="text-xl font-display font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-brand-blue transition-colors tracking-tight leading-tight">
                          {formation.name}
                        </h3>
                        
                        {(formation as any).programs && (
                          <div className="mb-3">
                            <span className="text-xs font-bold bg-brand-blue-pale/50 text-brand-blue px-2.5 py-1 rounded-lg border border-brand-blue/20 tracking-tight">
                              {(formation as any).programs.name}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2.5 text-sm text-gray-600 mb-4">
                          {formation.duration_hours && (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg group-hover:bg-gray-100 transition-colors">
                              <div className="p-1 bg-gray-100 rounded-md group-hover:bg-brand-blue-ghost transition-colors">
                                <Calendar className="h-3.5 w-3.5 text-gray-500 group-hover:text-brand-blue transition-colors" />
                              </div>
                              <span className="font-medium tracking-tight">{formation.duration_hours}h</span>
                            </div>
                          )}
                          {formation.price && (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg group-hover:bg-gray-100 transition-colors">
                              <div className="p-1 bg-gray-100 rounded-md group-hover:bg-emerald-50 transition-colors">
                                <DollarSign className="h-3.5 w-3.5 text-gray-500 group-hover:text-emerald-600 transition-colors" />
                              </div>
                              <span className="font-medium tracking-tight">{formatCurrency(Number(formation.price), formation.currency)}</span>
                            </div>
                          )}
                          {formation.capacity_max && (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg group-hover:bg-gray-100 transition-colors">
                              <div className="p-1 bg-gray-100 rounded-md group-hover:bg-brand-cyan-ghost transition-colors">
                                <Users className="h-3.5 w-3.5 text-gray-500 group-hover:text-brand-cyan transition-colors" />
                              </div>
                              <span className="font-medium tracking-tight">{formation.capacity_max}</span>
                            </div>
                          )}
                        </div>

                        {formation.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 font-medium tracking-tight leading-relaxed">
                            {formation.description}
                          </p>
                        )}
                      </div>

                      <motion.div
                        className="px-6 py-4 bg-gray-50/50 border-t-2 border-gray-100 group-hover:border-brand-blue/20 flex items-center justify-between transition-colors"
                        whileHover={{ x: 2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      >
                        <span className="text-sm font-bold text-gray-500 group-hover:text-brand-blue transition-colors tracking-tight">
                          Gérer la formation
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
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          >
            <GlassCard variant="premium" className="p-16 text-center border-2 border-dashed border-gray-200">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                className="w-20 h-20 bg-gradient-to-br from-brand-blue/10 to-brand-cyan/10 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
              >
                <BookMarked className="h-10 w-10 text-brand-blue" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-2xl font-display font-bold text-gray-900 mb-2 tracking-tight"
              >
                Aucune formation trouvée
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-gray-600 mb-8 font-medium tracking-tight"
              >
                {search || selectedProgramId || !showActiveOnly
                  ? 'Essayez de modifier vos filtres de recherche.'
                  : 'Commencez par créer votre première formation.'}
              </motion.p>
              {!search && !selectedProgramId && showActiveOnly && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href="/dashboard/formations/new">
                    <Button className="bg-gradient-to-br from-brand-blue to-brand-cyan text-white hover:from-brand-blue-dark hover:to-brand-cyan-dark shadow-xl shadow-brand-blue/20 hover:shadow-2xl hover:shadow-brand-cyan/30 transition-all duration-500 font-semibold tracking-tight px-6 py-6 text-base">
                      <Plus className="mr-2 h-5 w-5" />
                      Créer une formation
                    </Button>
                  </Link>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
