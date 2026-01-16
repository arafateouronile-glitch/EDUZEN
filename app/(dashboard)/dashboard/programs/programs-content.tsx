'use client'

import { Program } from './types'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { Plus, Search, BookOpen, Calendar, Users, BookMarked, TrendingUp, CheckCircle, XCircle, Activity, ArrowRight, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { PulseOnMount } from '@/components/ui/micro-interactions'
import { PremiumPieChart } from '@/components/charts/premium-pie-chart'
import { PremiumBarChart } from '@/components/charts/premium-bar-chart'
import { cn } from '@/lib/utils'

type GlobalStats = {
  total: number
  active: number
  inactive: number
  totalFormations: number
  totalSessions: number
  totalEnrollments: number
  statusData: Array<{ name: string; value: number; color: string }>
  monthlyData: Array<{ month: string; programmes: number }>
}

type ProgramsContentProps = {
  programs: Program[]
  isLoading: boolean
  globalStats: GlobalStats | null | undefined
  search: string
  setSearch: (value: string) => void
  showActiveOnly: boolean
  setShowActiveOnly: (value: boolean) => void
}

export function ProgramsContent({
  programs,
  isLoading,
  globalStats,
  search,
  setSearch,
  showActiveOnly,
  setShowActiveOnly,
}: ProgramsContentProps) {
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
      className="space-y-8 p-6 pb-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Premium */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-brand-blue to-brand-cyan bg-clip-text text-transparent">
                Programmes
              </h1>
              <span className="px-3 py-1 bg-gradient-to-r from-brand-blue-ghost to-brand-cyan-ghost text-brand-blue rounded-full text-sm font-medium border border-brand-blue/20">
                {programs.length} total
              </span>
            </div>
          </div>
          <p className="text-gray-600 text-sm lg:text-base ml-1">
            Gérez vos programmes de formation, formations et sessions associées
          </p>
        </div>

        <Link href="/dashboard/programs/new">
          <Button className="bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau programme
          </Button>
        </Link>
      </motion.div>

      {/* Statistiques Premium */}
      {globalStats && (
        <BentoGrid columns={3} gap="md">
          {[
            {
              title: 'Total',
              value: globalStats.total,
              icon: BookOpen,
              color: 'text-brand-blue',
              bg: 'bg-gradient-to-br from-brand-blue-ghost to-brand-blue-ghost/50',
              borderColor: 'border-brand-blue/20',
              desc: 'Tous les programmes'
            },
            {
              title: 'Actifs',
              value: globalStats.active,
              icon: CheckCircle,
              color: 'text-brand-cyan',
              bg: 'bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50',
              borderColor: 'border-brand-cyan/20',
              desc: 'En cours'
            },
            {
              title: 'Inactifs',
              value: globalStats.inactive,
              icon: XCircle,
              color: 'text-gray-500',
              bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
              borderColor: 'border-gray-200',
              desc: 'Archivés'
            },
            {
              title: 'Formations',
              value: globalStats.totalFormations,
              icon: BookMarked,
              color: 'text-brand-blue',
              bg: 'bg-gradient-to-br from-brand-blue-ghost to-brand-blue-ghost/50',
              borderColor: 'border-brand-blue/20',
              desc: 'Modules de formation'
            },
            {
              title: 'Sessions',
              value: globalStats.totalSessions,
              icon: Calendar,
              color: 'text-brand-cyan',
              bg: 'bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50',
              borderColor: 'border-brand-cyan/20',
              desc: 'Sessions planifiées'
            },
            {
              title: 'Inscriptions',
              value: globalStats.totalEnrollments,
              icon: Users,
              color: 'text-brand-blue',
              bg: 'bg-gradient-to-br from-brand-blue-ghost to-brand-blue-ghost/50',
              borderColor: 'border-brand-blue/20',
              desc: 'Apprenants inscrits'
            },
          ].map((stat, index) => (
            <BentoCard key={stat.title} span={1}>
              <GlassCard
                variant="premium"
                hoverable
                className={cn("h-full p-5 border-2 transition-all duration-300", stat.borderColor)}
              >
                <div className="flex items-center justify-between mb-3">
                  <motion.div
                    className={cn("p-2.5 rounded-xl transition-all duration-300 border", stat.bg, stat.borderColor)}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                  </motion.div>
                  <span className={cn("text-2xl font-bold",
                    index === 0 || index === 3 || index === 5 ? "text-brand-blue" :
                    index === 1 || index === 4 ? "text-brand-cyan" :
                    "text-gray-600")}>
                    {stat.value}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{stat.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.desc}</p>
                </div>
              </GlassCard>
            </BentoCard>
          ))}
        </BentoGrid>
      )}

      {/* Graphiques Premium */}
      {globalStats && (globalStats.statusData.length > 0 || globalStats.monthlyData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {globalStats.statusData.length > 0 && (
            <motion.div variants={itemVariants} className="h-full">
              <GlassCard variant="default" className="p-6 h-full">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-brand-blue" />
                    Répartition par statut
                  </h3>
                </div>
                <div className="h-[300px]">
                  <PremiumPieChart
                    data={globalStats.statusData.map(item => ({ name: item.name, value: item.value }))}
                    colors={globalStats.statusData.map(item => item.color)}
                    variant="default"
                    className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                    innerRadius={70}
                  />
                </div>
              </GlassCard>
            </motion.div>
          )}

          {globalStats.monthlyData.length > 0 && (
            <motion.div variants={itemVariants} className="h-full">
              <GlassCard variant="default" className="p-6 h-full">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-brand-cyan" />
                    Évolution des programmes
                  </h3>
                </div>
                <div className="h-[300px]">
                  <PremiumBarChart
                    data={globalStats.monthlyData}
                    dataKey="programmes"
                    xAxisKey="month"
                    colors={['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE', '#EFF6FF']}
                    variant="default"
                    className="h-full !p-0 !bg-transparent !border-none !shadow-none"
                  />
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>
      )}

      {/* Search and Filters Premium */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="default" className="p-2 border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/20 to-brand-cyan-ghost/20">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-blue group-focus-within:text-brand-cyan transition-colors" />
              <input
                type="text"
                placeholder="Rechercher un programme..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border-2 border-brand-blue/20 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all outline-none text-sm"
              />
            </div>

            <div className="flex items-center gap-3 px-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-blue/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-brand-blue peer-checked:to-brand-cyan"></div>
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-blue transition-colors">Actifs uniquement</span>
              </label>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Programs List Premium */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : programs.length === 0 ? (
          <GlassCard variant="default" className="p-12 text-center border-2 border-brand-blue/20 bg-gradient-to-br from-brand-blue-ghost/30 to-brand-cyan-ghost/30">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-full opacity-50 blur-2xl"></div>
              </div>
              <div className="relative p-6 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost rounded-2xl inline-block">
                <BookOpen className="h-16 w-16 mx-auto text-brand-blue" />
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <h3 className="text-xl font-bold text-gray-900">Aucun programme trouvé</h3>
              <p className="text-gray-600">
                {search || showActiveOnly
                  ? 'Aucun programme ne correspond à vos critères de recherche.'
                  : 'Commencez par créer votre premier programme.'}
              </p>
            </div>
            {!search && (
              <Link href="/dashboard/programs/new">
                <Button className="bg-gradient-to-r from-brand-blue to-brand-cyan hover:from-brand-blue-dark hover:to-brand-cyan shadow-md hover:shadow-lg transition-all">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un programme
                </Button>
              </Link>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {programs.map((program, index) => (
                <motion.div
                  key={program.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/dashboard/programs/${program.id}`}>
                    <GlassCard
                      variant="default"
                      hoverable
                      className="h-full p-0 group cursor-pointer flex flex-col overflow-hidden border-2 border-brand-blue/10 hover:border-brand-blue/30 bg-gradient-to-br from-white to-brand-blue-ghost/10 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="p-6 flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-brand-cyan/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <motion.div
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className={cn(
                                'relative h-12 w-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300',
                                program.is_active
                                  ? 'bg-gradient-to-br from-brand-blue to-brand-cyan text-white shadow-brand-blue/20'
                                  : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400'
                              )}
                            >
                              <BookOpen className="h-6 w-6" />
                            </motion.div>
                          </div>

                          <span className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-semibold border-2',
                            program.is_active
                              ? 'bg-gradient-to-br from-brand-cyan-ghost to-brand-cyan-ghost/50 text-brand-cyan border-brand-cyan/30'
                              : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 border-gray-200'
                          )}>
                            {program.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-brand-blue transition-colors">
                          {program.name}
                        </h3>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {program.code && (
                            <span className="text-xs font-mono bg-gradient-to-br from-gray-100 to-gray-50 text-gray-600 px-2.5 py-1 rounded-lg border border-gray-200">
                              {program.code}
                            </span>
                          )}
                          {program.category && (
                            <span className="text-xs bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost text-brand-blue px-2.5 py-1 rounded-lg font-semibold border border-brand-blue/20">
                              {program.category}
                            </span>
                          )}
                        </div>

                        {program.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {program.description}
                          </p>
                        )}
                      </div>

                      <div className="px-6 py-4 bg-gradient-to-r from-gray-50/50 to-brand-blue-ghost/10 border-t border-brand-blue/10 flex items-center justify-between group-hover:from-brand-blue-ghost/20 group-hover:to-brand-cyan-ghost/20 transition-all">
                        <span className="text-xs font-semibold text-gray-600 group-hover:text-brand-blue transition-colors">
                          Voir les détails
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white border-2 border-brand-blue/20 flex items-center justify-center group-hover:border-brand-blue/40 group-hover:text-brand-blue group-hover:scale-110 transition-all">
                          <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
