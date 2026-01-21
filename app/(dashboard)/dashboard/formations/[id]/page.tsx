'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { formationService } from '@/lib/services/formation.service'
import { sessionService } from '@/lib/services/session.service'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Calendar, Clock, DollarSign, Users, BookOpen, GraduationCap, TrendingUp, CheckCircle, Plus, MapPin, Sparkles, FileText, Target, Award, List } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatCurrency, cn } from '@/lib/utils'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import type { TableRow } from '@/lib/types/supabase-helpers'
import type { FormationWithRelations, SessionWithRelations } from '@/lib/types/query-types'
import { motion } from 'framer-motion'

type Session = TableRow<'sessions'>
type Enrollment = TableRow<'enrollments'>

export default function FormationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const formationId = params.id as string
  const { user } = useAuth()
  const supabase = createClient()

  const { data: formation, isLoading } = useQuery({
    queryKey: ['formation', formationId],
    queryFn: () => formationService.getFormationById(formationId),
    enabled: !!formationId,
  })

  // Récupérer les sessions de la formation
  const { data: sessions } = useQuery({
    queryKey: ['formation-sessions', formationId, user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return sessionService.getAllSessions(user.organization_id, { formationId })
    },
    enabled: !!formationId && !!user?.organization_id,
  })

  // Statistiques détaillées de la formation
  const { data: formationStats } = useQuery({
    queryKey: ['formation-detail-stats', formationId, user?.organization_id],
    queryFn: async () => {
      if (!formationId || !user?.organization_id) return null

      // Récupérer toutes les sessions de la formation
      const { data: allSessions } = await supabase
        .from('sessions')
        .select('id, status, start_date, end_date')
        .eq('formation_id', formationId)

      const sessionsArray = (allSessions as Session[]) || []
      const sessionIds = sessionsArray.map((s) => s.id).filter((id): id is string => !!id)

      // Compter les inscriptions
      let totalEnrollments = 0
      let activeEnrollments = 0
      let completedEnrollments = 0
      if (sessionIds && sessionIds.length > 0) {
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('status')
          .in('session_id', sessionIds)
        if (enrollmentsError) throw enrollmentsError
        
        const enrollmentsArray = (enrollments as Enrollment[]) || []
        totalEnrollments = enrollmentsArray.length
        activeEnrollments = enrollmentsArray.filter((e: any) => e.status && ['confirmed', 'active'].includes(e.status)).length
        completedEnrollments = enrollmentsArray.filter((e: any) => e.status === 'completed').length
      }

      // Compter les sessions par statut
      const totalSessions = sessionsArray.length
      const plannedSessions = sessionsArray.filter((s) => s.status === 'planned').length
      const ongoingSessions = sessionsArray.filter((s) => s.status === 'ongoing').length
      const completedSessions = sessionsArray.filter((s) => s.status === 'completed').length
      const cancelledSessions = sessionsArray.filter((s) => s.status === 'cancelled').length

      // Calculer le revenu estimé
      const formationData = formation as any as (FormationWithRelations & { price?: number; cpf_eligible?: boolean; version?: string })
      const totalRevenue = formationData?.price ? Number(formationData.price) * totalEnrollments : 0

      // Répartition des sessions par statut
      const sessionStatusData = [
        { name: 'Planifiées', value: plannedSessions, color: '#3B82F6' },
        { name: 'En cours', value: ongoingSessions, color: '#335ACF' },
        { name: 'Terminées', value: completedSessions, color: '#6B7280' },
        { name: 'Annulées', value: cancelledSessions, color: '#EF4444' },
      ].filter(item => item.value > 0)

      // Répartition des inscriptions par statut
      if (sessionIds && sessionIds.length > 0) {
        const { data: enrollments, error: enrollmentsError2 } = await supabase
          .from('enrollments')
          .select('status')
          .in('session_id', sessionIds)
        if (enrollmentsError2) throw enrollmentsError2
        
        const enrollmentsArray = (enrollments as Enrollment[]) || []
        const confirmedEnrollments = enrollmentsArray.filter((e) => e.status === 'confirmed').length
        const activeEnrollmentsCount = enrollmentsArray.filter((e) => e.status === 'active').length
        const completedEnrollmentsCount = enrollmentsArray.filter((e) => e.status === 'completed').length
        const cancelledEnrollments = enrollmentsArray.filter((e) => e.status === 'cancelled').length

        const enrollmentStatusData = [
          { name: 'Confirmées', value: confirmedEnrollments, color: '#3B82F6' },
          { name: 'Actives', value: activeEnrollmentsCount, color: '#335ACF' },
          { name: 'Complétées', value: completedEnrollmentsCount, color: '#6B7280' },
          { name: 'Annulées', value: cancelledEnrollments, color: '#EF4444' },
        ].filter(item => item.value > 0)

        return {
          totalSessions,
          plannedSessions,
          ongoingSessions,
          completedSessions,
          cancelledSessions,
          totalEnrollments,
          activeEnrollments,
          completedEnrollments,
          totalRevenue,
          sessionStatusData,
          enrollmentStatusData,
        }
      }

      return {
        totalSessions,
        plannedSessions,
        ongoingSessions,
        completedSessions,
        cancelledSessions,
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        totalRevenue,
        sessionStatusData,
        enrollmentStatusData: [],
      }
    },
    enabled: !!formationId && !!user?.organization_id && !!formation,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    )
  }

  if (!formation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="text-xl font-semibold text-gray-900">Formation introuvable</div>
        <Link href="/dashboard/formations">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la liste
          </Button>
        </Link>
      </div>
    )
  }

  const formationData = formation as FormationWithRelations & { price?: number; currency?: string }
  const program = formationData?.programs
  const sessionsList = (sessions as SessionWithRelations[]) || []

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
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/formations">
            <Button variant="ghost" size="icon" className="mt-1 rounded-xl hover:bg-gray-100">
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-lg shadow-brand-blue/20">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-900 tracking-tight">
                {formationData.name}
              </h1>
              <Badge variant={formationData.is_active ? 'default' : 'secondary'} className={cn(
                "ml-2",
                formationData.is_active ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" : "bg-gray-100 text-gray-600 border-gray-200"
              )}>
                {formationData.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md border border-gray-100">
                <span className="font-mono font-medium text-xs text-gray-500">CODE:</span>
                <span className="font-semibold text-gray-900">{formationData.code}</span>
              </div>
              {program && (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">•</span>
                  <Link href={`/dashboard/programs/${program.id}`} className="group flex items-center gap-1.5 hover:text-brand-blue transition-colors">
                    <BookOpen className="h-4 w-4 text-gray-400 group-hover:text-brand-blue" />
                    <span className="font-medium">{program.name}</span>
                  </Link>
                </div>
              )}
              {formationData.category && (
                <>
                  <span className="text-gray-400">•</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {formationData.category}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/formations/${formationId}/edit`}>
            <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-200 shadow-sm transition-all">
              <Edit className="mr-2 h-4 w-4 text-gray-500" />
              Modifier
            </Button>
          </Link>
          <Link href={`/dashboard/formations/${formationId}/sessions`}>
            <Button className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-lg shadow-brand-blue/20 transition-all hover:scale-105">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle session
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Statistiques détaillées */}
      {formationStats && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Sessions', value: formationStats.totalSessions, sub: `${formationStats.ongoingSessions} en cours`, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Inscriptions', value: formationStats.totalEnrollments, sub: `${formationStats.activeEnrollments} actives`, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
            { label: 'Terminées', value: formationStats.completedSessions, sub: 'Sessions', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Complétées', value: formationStats.completedEnrollments, sub: 'Inscriptions', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Planifiées', value: formationStats.plannedSessions, sub: 'Sessions', icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'Revenu estimé', value: formatCurrency(formationStats.totalRevenue, formationData?.currency || 'XOF'), sub: 'Total', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', isCurrency: true },
          ].map((stat, i) => (
            <GlassCard key={i} variant="subtle" className="p-4 flex flex-col justify-between hover:border-brand-blue/30 transition-all duration-300">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{stat.label}</span>
                <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <div>
                <div className={cn("font-bold text-gray-900", stat.isCurrency ? "text-lg" : "text-2xl")}>
                  {stat.value}
                </div>
                <p className="text-xs text-gray-500 font-medium mt-1">{stat.sub}</p>
              </div>
            </GlassCard>
          ))}
        </motion.div>
      )}

      {/* Graphiques */}
      {formationStats && (formationStats.sessionStatusData.length > 0 || formationStats.enrollmentStatusData.length > 0) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {formationStats.sessionStatusData.length > 0 && (
            <GlassCard variant="premium" className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">Répartition des sessions</CardTitle>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formationStats.sessionStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {formationStats.sessionStatusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}

          {formationStats.enrollmentStatusData.length > 0 && (
            <GlassCard variant="premium" className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-cyan-50 rounded-lg">
                  <Users className="h-5 w-5 text-cyan-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900">Répartition des inscriptions</CardTitle>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formationStats.enrollmentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {formationStats.enrollmentStatusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#1f2937', fontWeight: 600 }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-8">
          {/* Informations générales */}
          <motion.div variants={itemVariants}>
            <GlassCard variant="default" className="p-8 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <FileText className="h-5 w-5 text-brand-blue" />
                <h2 className="text-xl font-bold text-gray-900">Informations générales</h2>
              </div>

              <div className="space-y-6">
                {formationData.description && (
                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <p className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Description</p>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{formationData.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(formationData.duration_hours || formationData.duration_days) && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50/30 border border-blue-100">
                      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-blue-900 mb-1">Durée</p>
                        <div className="flex items-center gap-3 text-blue-800 font-medium">
                          {formationData.duration_hours && <span>{formationData.duration_hours} heures</span>}
                          {formationData.duration_hours && formationData.duration_days && <span className="text-blue-300">•</span>}
                          {formationData.duration_days && <span>{formationData.duration_days} jours</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {formationData.price && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50/30 border border-green-100">
                      <div className="p-2 bg-green-100 rounded-lg text-green-600">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-green-900 mb-1">Prix de la formation</p>
                        <p className="text-lg font-bold text-green-700">
                          {formatCurrency(Number(formationData.price), formationData.currency || 'XOF')}
                        </p>
                      </div>
                    </div>
                  )}

                  {formationData.capacity_max && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50/30 border border-purple-100">
                      <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-purple-900 mb-1">Capacité</p>
                        <p className="font-medium text-purple-800">{formationData.capacity_max} apprenants max</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Objectifs pédagogiques */}
          {formationData.pedagogical_objectives && (
            <motion.div variants={itemVariants}>
              <GlassCard variant="default" className="p-8">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
                  <Target className="h-5 w-5 text-brand-cyan" />
                  <h2 className="text-xl font-bold text-gray-900">Objectifs pédagogiques</h2>
                </div>
                <div className="prose prose-blue max-w-none text-gray-600">
                  <p className="whitespace-pre-wrap">{formationData.pedagogical_objectives}</p>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Profil des apprenants */}
          {formationData.learner_profile && (
            <motion.div variants={itemVariants}>
              <GlassCard variant="default" className="p-8">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
                  <Users className="h-5 w-5 text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-900">Profil des apprenants</h2>
                </div>
                <div className="prose prose-purple max-w-none text-gray-600">
                  <p className="whitespace-pre-wrap">{formationData.learner_profile}</p>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Contenu de la formation */}
          {formationData.training_content && (
            <motion.div variants={itemVariants}>
              <GlassCard variant="default" className="p-8">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
                  <List className="h-5 w-5 text-orange-600" />
                  <h2 className="text-xl font-bold text-gray-900">Contenu de la formation</h2>
                </div>
                <div className="prose prose-orange max-w-none text-gray-600">
                  <p className="whitespace-pre-wrap">{formationData.training_content}</p>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Programme associé */}
          {program && (
            <motion.div variants={itemVariants}>
              <GlassCard variant="premium" className="p-6 border-l-4 border-l-brand-blue">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-gray-900">Programme associé</h3>
                </div>
                <div className="space-y-2">
                  <Link href={`/dashboard/programs/${program.id}`} className="block group">
                    <p className="font-bold text-lg text-gray-900 group-hover:text-brand-blue transition-colors">
                      {program.name}
                    </p>
                    {program.code && (
                      <Badge variant="secondary" className="mt-2 bg-gray-100 text-gray-600 font-mono text-xs">
                        {program.code}
                      </Badge>
                    )}
                  </Link>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Informations supplémentaires */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-gray-900">Détails</h3>
              </div>
              
              <div className="space-y-4 divide-y divide-gray-100">
                {(formationData as any).cpf_eligible && (
                  <div className="pt-3 first:pt-0">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Éligibilité CPF</p>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Oui</Badge>
                      {formationData.cpf_code && (
                        <span className="font-mono text-sm font-medium text-gray-600">{formationData.cpf_code}</span>
                      )}
                    </div>
                  </div>
                )}

                {formationData.modalities && (
                  <div className="pt-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Modalités</p>
                    <p className="font-medium text-gray-900">{formationData.modalities}</p>
                  </div>
                )}

                {(formationData as any).version && (
                  <div className="pt-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Version</p>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono">{(formationData as any).version}</Badge>
                      {formationData.version_date && (
                        <span className="text-xs text-gray-500">{formatDate(formationData.version_date)}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Dates</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Création</span>
                      <span className="font-medium text-gray-900">{formatDate(formationData.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Mise à jour</span>
                      <span className="font-medium text-gray-900">{formatDate(formationData.updated_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* Liste des sessions */}
      <motion.div variants={itemVariants}>
        <GlassCard variant="premium" className="p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-cyan/5 rounded-full blur-3xl -z-10" />
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-brand-cyan to-brand-blue rounded-xl shadow-lg shadow-brand-cyan/20">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Sessions de formation</CardTitle>
                <p className="text-sm text-gray-500 font-medium">Historique et planification ({sessionsList.length})</p>
              </div>
            </div>
            <Link href={`/dashboard/formations/${formationId}/sessions`}>
              <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-200">
                Voir tout
              </Button>
            </Link>
          </div>

          {sessionsList.length > 0 ? (
            <div className="space-y-3">
              {sessionsList.slice(0, 5).map((session: any, index: number) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/dashboard/sessions/${session.id}`}>
                    <div className="group p-5 bg-white border border-gray-100 rounded-xl hover:border-brand-blue/30 hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-brand-blue transition-colors">
                            {session.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-2">
                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              <span className="font-medium text-gray-700">
                                {formatDate(session.start_date)}
                                {session.end_date && ` - ${formatDate(session.end_date)}`}
                              </span>
                            </div>
                            {session.location && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                                <span>{session.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={
                          session.status === 'planned' ? 'secondary' :
                          session.status === 'ongoing' ? 'default' :
                          session.status === 'completed' ? 'outline' : 'destructive'
                        } className={cn(
                          "px-3 py-1.5 text-xs font-semibold uppercase tracking-wide w-fit",
                          session.status === 'planned' ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200" :
                          session.status === 'ongoing' ? "bg-brand-blue text-white hover:bg-brand-blue shadow-md shadow-brand-blue/20" :
                          session.status === 'completed' ? "bg-gray-100 text-gray-600 border-gray-200" :
                          "bg-red-100 text-red-700 border-red-200"
                        )}>
                          {session.status === 'planned' ? 'Planifiée' :
                           session.status === 'ongoing' ? 'En cours' :
                           session.status === 'completed' ? 'Terminée' : 'Annulée'}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
              {sessionsList.length > 5 && (
                <div className="text-center pt-4">
                  <Link href={`/dashboard/formations/${formationId}/sessions`}>
                    <Button variant="ghost" className="text-brand-blue hover:text-brand-blue-dark hover:bg-brand-blue/5">
                      Voir les {sessionsList.length - 5} autres sessions
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 text-center">
              <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Aucune session programmée
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Commencez par planifier une session pour cette formation.
              </p>
              <Link href={`/dashboard/formations/${formationId}/sessions`}>
                <Button className="bg-brand-blue hover:bg-brand-blue-dark text-white shadow-lg shadow-brand-blue/20 transition-all hover:scale-105">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer une session
                </Button>
              </Link>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}
