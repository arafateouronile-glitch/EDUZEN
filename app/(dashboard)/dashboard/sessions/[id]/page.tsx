'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Suspense, lazy, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import {
  ArrowLeft, Save, Copy, Archive, Trash2, Calendar, BookOpen, Sparkles,
  LayoutDashboard, Users, Clock, CheckCircle2, TrendingUp, Zap,
  MoreHorizontal, ExternalLink, ChevronRight
} from 'lucide-react'
import { useSessionDetail } from './hooks/use-session-detail'
import { SessionSidebar } from './components/session-sidebar'
import { SkeletonLoader } from './components/skeleton-loader'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

// Lazy loading des sections de configuration
const ConfigInitialisation = lazy(() => import('./sections/config-initialisation').then(m => ({ default: m.ConfigInitialisation })))
const ConfigDatesPrix = lazy(() => import('./sections/config-dates-prix').then(m => ({ default: m.ConfigDatesPrix })))
const ConfigProgramme = lazy(() => import('./sections/config-programme').then(m => ({ default: m.ConfigProgramme })))
const ConfigIntervenants = lazy(() => import('./sections/config-intervenants').then(m => ({ default: m.ConfigIntervenants })))
const ConfigApprenants = lazy(() => import('./sections/config-apprenants').then(m => ({ default: m.ConfigApprenants })))

// Lazy loading des sections de gestion
const GestionConventions = lazy(() => import('./sections/gestion-conventions').then(m => ({ default: m.GestionConventions })))
const GestionConvocations = lazy(() => import('./sections/gestion-convocations').then(m => ({ default: m.GestionConvocations })))
const GestionEvaluations = lazy(() => import('./sections/gestion-evaluations').then(m => ({ default: m.GestionEvaluations })))
const GestionFinances = lazy(() => import('./sections/gestion-finances').then(m => ({ default: m.GestionFinances })))
const GestionEspaceEntreprise = lazy(() => import('./sections/gestion-espace-entreprise').then(m => ({ default: m.GestionEspaceEntreprise })))
const GestionAutomatisation = lazy(() => import('./sections/gestion-automatisation').then(m => ({ default: m.GestionAutomatisation })))

// Lazy loading des sections principales
const EspaceApprenant = lazy(() => import('./sections/espace-apprenant').then(m => ({ default: m.EspaceApprenant })))
const Suivi = lazy(() => import('./sections/suivi').then(m => ({ default: m.Suivi })))

export default function SessionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.id as string

  const {
    // Navigation
    activeStep,
    setActiveStep,
    activeTab,
    setActiveTab,
    activeGestionTab,
    setActiveGestionTab,

    // Formulaires
    formData,
    setFormData,
    slotConfig,
    setSlotConfig,
    showEnrollmentForm,
    setShowEnrollmentForm,

    // Données
    session,
    isLoading,
    sessionData,
    formation,
    program,
    programs,
    formations,
    sessionPrograms,
    users,
    sessionSlots,
    refetchSlots,
    sessionModules,
    refetchSessionModules,
    enrollments,
    organization,
    students,
    payments,
    grades,
    gradesStats,
    attendanceStats,
    enrollmentForm,
    setEnrollmentForm,
    evaluationForm,
    setEvaluationForm,
    showEvaluationForm,
    setShowEvaluationForm,
    isGeneratingZip,
    zipGenerationProgress,
    lastZipGeneration,

    // Mutations
    updateMutation,
    createEnrollmentMutation,
    cancelEnrollmentMutation,
    createEvaluationMutation,

    // Actions
    handleSave,

    // Utilitaires
    user,
  } = useSessionDetail(sessionId)

  // Calculate session metrics
  const sessionMetrics = useMemo(() => {
    const enrollmentsCount = enrollments?.length || 0
    const maxCapacity = (sessionData as any)?.max_participants || 20
    const fillRate = Math.round((enrollmentsCount / maxCapacity) * 100)

    const startDate = sessionData?.start_date ? parseISO(sessionData.start_date) : null
    const endDate = sessionData?.end_date ? parseISO(sessionData.end_date) : null
    const now = new Date()

    let status: 'upcoming' | 'in_progress' | 'completed' = 'upcoming'
    let daysInfo = ''
    let progressPercent = 0

    if (startDate && endDate) {
      if (isBefore(now, startDate)) {
        status = 'upcoming'
        const daysUntil = differenceInDays(startDate, now)
        daysInfo = daysUntil === 0 ? "Démarre aujourd'hui" : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`
      } else if (isAfter(now, endDate)) {
        status = 'completed'
        daysInfo = 'Terminée'
        progressPercent = 100
      } else {
        status = 'in_progress'
        const totalDays = differenceInDays(endDate, startDate) || 1
        const elapsedDays = differenceInDays(now, startDate)
        progressPercent = Math.round((elapsedDays / totalDays) * 100)
        const daysLeft = differenceInDays(endDate, now)
        daysInfo = `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`
      }
    }

    return { enrollmentsCount, maxCapacity, fillRate, status, daysInfo, progressPercent, startDate, endDate }
  }, [enrollments, sessionData])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-blue/5">
        <div className="space-y-8 pb-8 max-w-[1800px] mx-auto p-8">
          <SkeletonLoader />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-blue/5 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        >
          <GlassCard variant="premium" className="p-16 text-center max-w-lg relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 via-transparent to-brand-cyan/5" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-brand-blue/10 to-transparent rounded-full blur-3xl -mr-32 -mt-32" />

            <div className="relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-cyan rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-blue/30"
              >
                <Calendar className="h-12 w-12 text-white" />
              </motion.div>
              <h3 className="text-3xl font-display font-bold text-gray-900 mb-3 tracking-tight">Session introuvable</h3>
              <p className="text-gray-500 mb-10 text-lg">Cette session n'existe pas ou a été supprimée de votre espace.</p>
              <Link href="/dashboard/sessions">
                <Button size="lg" className="bg-gradient-to-r from-brand-blue to-brand-blue-dark hover:from-brand-blue-dark hover:to-brand-blue text-white shadow-xl shadow-brand-blue/25 px-8">
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Retour aux sessions
                </Button>
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    )
  }

  // Status badge config
  const statusConfig = {
    upcoming: { label: 'À venir', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    in_progress: { label: 'En cours', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    completed: { label: 'Terminée', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-brand-blue/[0.02] flex">
      {/* Premium Session Sidebar */}
      <aside className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-80 relative">
          {/* Sidebar Background with premium effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/80 to-white" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent" />
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-brand-blue/[0.03] to-transparent" />

          <div className="relative flex flex-col h-full pt-6 pb-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {/* Back Button */}
            <div className="px-5 mb-6">
              <Link href="/dashboard/sessions">
                <motion.div
                  whileHover={{ x: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-blue transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>Sessions</span>
                </motion.div>
              </Link>
            </div>

            {/* Session Identity Card */}
            <div className="px-5 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative p-5 rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-blue overflow-hidden"
              >
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand-cyan/20 rounded-full blur-xl -ml-12 -mb-12" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                      "bg-white/20 text-white border-white/30 backdrop-blur-sm"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", statusConfig[sessionMetrics.status].dot)} />
                      {statusConfig[sessionMetrics.status].label}
                    </div>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-white/70 hover:text-white hover:bg-white/10 rounded-lg">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>

                  <h2 className="text-lg font-bold text-white mb-1 line-clamp-2 leading-snug">
                    {formData.name || sessionData?.name || 'Session'}
                  </h2>

                  {formation && (
                    <p className="text-white/70 text-xs font-medium flex items-center gap-1.5 mt-2">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="truncate">{formation.name}</span>
                    </p>
                  )}

                  {/* Session Progress */}
                  {sessionMetrics.status === 'in_progress' && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="flex items-center justify-between text-xs text-white/80 mb-2">
                        <span>Progression</span>
                        <span className="font-semibold">{sessionMetrics.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${sessionMetrics.progressPercent}%` }}
                          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                          className="h-full bg-gradient-to-r from-brand-cyan to-white rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Date Info */}
                  <div className="mt-4 flex items-center gap-2 text-white/80 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{sessionMetrics.daysInfo || 'Dates non définies'}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Quick Stats */}
            <div className="px-5 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-default"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-brand-blue" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{sessionMetrics.enrollmentsCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Inscrits</p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-default"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-brand-cyan" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{sessionMetrics.fillRate}%</p>
                  <p className="text-xs text-gray-500 mt-0.5">Taux remplissage</p>
                </motion.div>
              </div>
            </div>

            {/* Section Label */}
            <div className="px-5 mb-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Navigation</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 px-4">
              <SessionSidebar
                activeStep={activeStep}
                setActiveStep={setActiveStep}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                activeGestionTab={activeGestionTab}
                setActiveGestionTab={setActiveGestionTab}
              />
            </div>

            {/* Quick Actions */}
            <div className="px-5 mt-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-gray-100"
              >
                <h4 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <Zap className="w-3.5 h-3.5 text-brand-cyan" />
                  Actions rapides
                </h4>
                <div className="space-y-1.5">
                  <Button variant="ghost" size="sm" className="w-full justify-start h-9 text-gray-600 hover:bg-white hover:text-brand-blue hover:shadow-sm rounded-xl text-xs font-medium">
                    <Copy className="w-3.5 h-3.5 mr-2" /> Dupliquer la session
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start h-9 text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm rounded-xl text-xs font-medium">
                    <ExternalLink className="w-3.5 h-3.5 mr-2" /> Voir sur le portail
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start h-9 text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm rounded-xl text-xs font-medium">
                    <Archive className="w-3.5 h-3.5 mr-2" /> Archiver
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden w-0 min-w-0">
        {/* Premium Sticky Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-40"
        >
          <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100/80 shadow-sm shadow-gray-100/50">
            <div className="px-6 lg:px-8 h-[72px] flex items-center justify-between">
              {/* Left Section */}
              <div className="flex items-center gap-4">
                {/* Mobile back button */}
                <Link href="/dashboard/sessions" className="lg:hidden">
                  <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-gray-100 -ml-2">
                    <ArrowLeft className="w-5 h-5 text-gray-500" />
                  </Button>
                </Link>

                {/* Breadcrumb-style title */}
                <div className="hidden lg:flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-bold text-gray-900 tracking-tight line-clamp-1 max-w-md">
                        {formData.name || sessionData?.name}
                      </h1>
                      <div className={cn(
                        "hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                        statusConfig[sessionMetrics.status].color
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig[sessionMetrics.status].dot)} />
                        {statusConfig[sessionMetrics.status].label}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                        {formData.code || (sessionData as any)?.internal_code || (sessionData as any)?.code || "SANS-CODE"}
                      </span>
                      {formation && (
                        <>
                          <ChevronRight className="w-3 h-3 text-gray-300" />
                          <span className="text-xs text-gray-500 truncate max-w-[200px]">
                            {formation.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile title */}
                <div className="lg:hidden flex flex-col">
                  <h1 className="text-base font-bold text-gray-900 tracking-tight line-clamp-1">
                    {formData.name || sessionData?.name}
                  </h1>
                  <span className="text-[10px] text-gray-500">
                    {formData.code || "Session"}
                  </span>
                </div>
              </div>

              {/* Right Section - Actions */}
              <div className="flex items-center gap-2">
                {/* Last saved indicator */}
                {updateMutation.isSuccess && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="hidden md:flex items-center gap-1.5 text-xs text-emerald-600 mr-2"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sauvegardé</span>
                  </motion.div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:flex gap-2 h-9 rounded-xl border-gray-200 hover:border-gray-300 text-gray-600"
                >
                  <Archive className="w-4 h-4" />
                  <span className="hidden lg:inline">Archiver</span>
                </Button>

                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  size="sm"
                  className={cn(
                    "h-9 px-4 rounded-xl font-semibold transition-all duration-200",
                    "bg-gradient-to-r from-brand-blue to-brand-blue-dark",
                    "hover:from-brand-blue-dark hover:to-brand-blue",
                    "text-white shadow-lg shadow-brand-blue/25",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {updateMutation.isPending ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                      />
                      <span className="hidden sm:inline">Sauvegarde...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      <span className="hidden sm:inline">Enregistrer</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8">
          {/* Mobile Session Card + Menu */}
          <div className="lg:hidden mb-6 space-y-4">
            {/* Mobile Session Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative p-5 rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue-dark to-brand-blue overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border mb-2",
                    "bg-white/20 text-white border-white/30"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig[sessionMetrics.status].dot)} />
                    {statusConfig[sessionMetrics.status].label}
                  </div>
                  <p className="text-white/80 text-xs">{sessionMetrics.daysInfo}</p>
                </div>
                <div className="flex gap-4 text-white">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{sessionMetrics.enrollmentsCount}</p>
                    <p className="text-[10px] text-white/70">Inscrits</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{sessionMetrics.fillRate}%</p>
                    <p className="text-[10px] text-white/70">Rempli</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mobile Navigation */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <SessionSidebar
                activeStep={activeStep}
                setActiveStep={setActiveStep}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                activeGestionTab={activeGestionTab}
                setActiveGestionTab={setActiveGestionTab}
              />
            </div>
          </div>

          {/* Content Area with premium background */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeStep}-${activeTab}-${activeGestionTab}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
              >
              {/* Configuration Content */}
              {activeStep === 'configuration' && activeTab === 'initialisation' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <ConfigInitialisation
                    formData={formData}
                    onFormDataChange={setFormData}
                    users={users}
                  />
                </Suspense>
              )}

              {activeStep === 'configuration' && activeTab === 'dates_prix' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <ConfigDatesPrix
                    sessionId={sessionId}
                    formData={formData}
                    onFormDataChange={setFormData}
                    slotConfig={slotConfig}
                    onSlotConfigChange={setSlotConfig}
                    sessionSlots={sessionSlots}
                    onSlotsRefetch={refetchSlots}
                    formation={formation || undefined}
                    program={program || undefined}
                    sessionModules={sessionModules || []}
                    onModulesRefetch={refetchSessionModules}
                  />
                </Suspense>
              )}

              {activeStep === 'configuration' && activeTab === 'programme' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <ConfigProgramme
                    formData={formData}
                    onFormDataChange={setFormData}
                    programs={programs}
                    formations={formations}
                    sessionPrograms={sessionPrograms}
                    formation={formation || undefined}
                    program={program || undefined}
                  />
                </Suspense>
              )}

              {activeStep === 'configuration' && activeTab === 'intervenants' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <ConfigIntervenants
                    formData={formData}
                    onFormDataChange={setFormData}
                    users={users}
                  />
                </Suspense>
              )}

              {activeStep === 'configuration' && activeTab === 'apprenants' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <ConfigApprenants
                    sessionId={sessionId}
                    formationId={formData.formation_id}
                    enrollments={enrollments}
                    students={students}
                    enrollmentForm={enrollmentForm}
                    onEnrollmentFormChange={(form) => {
                      setEnrollmentForm({
                        ...form,
                        status: (form.status || 'pending') as any,
                        payment_status: (form.payment_status || 'pending') as any,
                        funding_type_id: form.funding_type_id || '',
                      })
                    }}
                    onCreateEnrollment={() => createEnrollmentMutation.mutate()}
                    createEnrollmentMutation={createEnrollmentMutation}
                    formationPrice={
                      formation?.price
                        ? typeof formation.price === 'number'
                          ? formation.price
                          : typeof formation.price === 'string'
                          ? parseFloat(formation.price) || undefined
                          : undefined
                        : undefined
                    }
                  />
                </Suspense>
              )}

              {/* Gestion Content */}
              {activeStep === 'gestion' && activeGestionTab === 'conventions' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <GestionConventions
                    sessionData={sessionData}
                    formation={formation || undefined}
                    program={program || undefined}
                    organization={organization}
                    enrollments={enrollments}
                    isLoading={!enrollments}
                    onShowEnrollmentForm={() => {
                      setActiveGestionTab('convocations')
                      setShowEnrollmentForm(true)
                    }}
                    onSwitchTab={(tab) => setActiveGestionTab(tab)}
                  />
                </Suspense>
              )}

              {activeStep === 'gestion' && activeGestionTab === 'convocations' && (
                <Suspense fallback={<SkeletonLoader />}>
                <GestionConvocations
                  sessionId={sessionId}
                  sessionData={sessionData}
                  formation={formation || undefined}
                  program={program || undefined}
                  organization={organization}
                  enrollments={enrollments}
                  students={students}
                  showEnrollmentForm={showEnrollmentForm}
                  enrollmentForm={enrollmentForm}
                  onEnrollmentFormChange={(form) => {
                    setEnrollmentForm({
                      ...form,
                      status: (form.status || 'pending') as any,
                      payment_status: (form.payment_status || 'pending') as any,
                      funding_type_id: (form as any).funding_type_id || '',
                    })
                  }}
                  onCreateEnrollment={() => createEnrollmentMutation.mutate()}
                  createEnrollmentMutation={createEnrollmentMutation}
                  cancelEnrollmentMutation={cancelEnrollmentMutation}
                  onCloseEnrollmentForm={() => setShowEnrollmentForm(false)}
                  onShowEnrollmentForm={() => setShowEnrollmentForm(true)}
                  isGeneratingZip={isGeneratingZip}
                  zipGenerationProgress={zipGenerationProgress}
                  lastZipGeneration={lastZipGeneration}
                />
                </Suspense>
              )}

              {activeStep === 'gestion' && activeGestionTab === 'evaluations' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <GestionEvaluations
                  grades={grades}
                  gradesStats={gradesStats}
                  students={students}
                  showEvaluationForm={showEvaluationForm}
                  evaluationForm={evaluationForm}
                  onEvaluationFormChange={setEvaluationForm}
                  onCreateEvaluation={() => createEvaluationMutation.mutate()}
                  createEvaluationMutation={createEvaluationMutation}
                  onCloseEvaluationForm={() => setShowEvaluationForm(false)}
                  onShowEvaluationForm={(type, subject) => {
                    setEvaluationForm({
                      ...evaluationForm,
                      assessment_type: type || 'evaluation_generale',
                      subject: subject || 'Évaluation générale',
                    })
                    setShowEvaluationForm(true)
                  }}
                  />
                </Suspense>
              )}

              {activeStep === 'gestion' && activeGestionTab === 'finances' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <GestionFinances
                    enrollments={enrollments}
                    payments={payments}
                    sessionId={sessionId}
                    sessionData={sessionData}
                    organization={organization}
                  />
                </Suspense>
              )}

              {activeStep === 'gestion' && activeGestionTab === 'espace_entreprise' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <GestionEspaceEntreprise
                    sessionData={sessionData}
                    formation={formation || undefined}
                    program={program || undefined}
                    organization={organization}
                    enrollments={enrollments}
                    grades={grades}
                    attendanceStats={attendanceStats}
                  />
                </Suspense>
              )}

              {activeStep === 'gestion' && activeGestionTab === 'automatisation' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <GestionAutomatisation
                    sessionId={sessionId}
                    sessionData={sessionData}
                  />
                </Suspense>
              )}

              {/* Other Steps */}
              {activeStep === 'espace_apprenant' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <EspaceApprenant
                    sessionId={sessionId}
                    sessionData={sessionData}
                    formation={formation || undefined}
                    program={program || undefined}
                    organization={organization}
                    enrollments={enrollments}
                    grades={grades}
                    attendanceStats={attendanceStats}
                    organizationId={user?.organization_id || undefined}
                    onShowEnrollmentForm={() => {
                      setActiveStep('gestion')
                      setActiveGestionTab('convocations')
                      setShowEnrollmentForm(true)
                    }}
                    onSwitchToGestion={() => {
                      setActiveStep('gestion')
                      setActiveGestionTab('convocations')
                    }}
                  />
                </Suspense>
              )}

              {activeStep === 'suivi' && (
                <Suspense fallback={<SkeletonLoader />}>
                  <Suivi
                    sessionData={sessionData}
                    formation={formation || undefined}
                    program={program || undefined}
                    organization={organization}
                    enrollments={enrollments}
                    grades={grades}
                    gradesStats={gradesStats}
                    attendanceStats={attendanceStats}
                  />
                </Suspense>
              )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
