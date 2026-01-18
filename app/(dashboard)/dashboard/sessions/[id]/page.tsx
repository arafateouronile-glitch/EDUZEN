'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Suspense, lazy } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlassCard } from '@/components/ui/glass-card'
import { ArrowLeft, Save, Copy, Archive, Trash2, Calendar, BookOpen, Sparkles } from 'lucide-react'
import { useSessionDetail } from './hooks/use-session-detail'
import { WorkflowProgress } from './components/workflow-progress'
import { ConfigTabs } from './components/config-tabs'
import { GestionTabs } from './components/gestion-tabs'
import { SkeletonLoader } from './components/skeleton-loader'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
  }

  if (isLoading) {
    return (
      <motion.div
        className="space-y-8 pb-8 max-w-[1600px] mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Breadcrumbs skeleton */}
        <div className="flex items-center space-x-2">
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32 animate-pulse" />
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-4 animate-pulse" />
          <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-24 animate-pulse" />
        </div>

        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-blue/20 to-brand-cyan/20 rounded-2xl animate-pulse" />
            <div className="space-y-3">
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-64 animate-pulse" />
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse" />
            </div>
          </div>
          <div className="h-12 w-36 bg-gradient-to-br from-brand-blue/20 to-brand-cyan/20 rounded-xl animate-pulse" />
        </div>

        {/* Workflow skeleton */}
        <div className="h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl animate-pulse" />

        {/* Content skeleton */}
        <SkeletonLoader />
      </motion.div>
    )
  }

  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center justify-center min-h-screen"
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
            Session non trouvée
          </motion.h3>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-gray-600 mb-8 font-medium tracking-tight"
          >
            Cette session n'existe pas ou a été supprimée.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href="/dashboard/sessions">
              <Button className="bg-gradient-to-br from-brand-blue to-brand-cyan text-white hover:from-brand-blue-dark hover:to-brand-cyan-dark shadow-xl shadow-brand-blue/20 hover:shadow-2xl hover:shadow-brand-cyan/30 transition-all duration-500 font-semibold tracking-tight px-6 py-6 text-base">
                <ArrowLeft className="mr-2 h-5 w-5" />
                Retour à la liste
              </Button>
            </Link>
          </motion.div>
        </GlassCard>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="space-y-8 pb-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Breadcrumbs Ultra-Premium */}
      <motion.div variants={itemVariants} className="flex items-center space-x-2 text-sm">
        <Link href="/dashboard/sessions" className="text-gray-500 hover:text-brand-blue transition-colors font-medium tracking-tight">
          Toutes mes sessions
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-semibold tracking-tight">{formData.name || sessionData?.name}</span>
        {activeStep !== 'configuration' && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-brand-blue font-bold tracking-tight">
              {activeStep === 'gestion' ? 'Gestion' :
               activeStep === 'espace_apprenant' ? 'Espace Apprenant' :
               activeStep === 'suivi' ? 'Suivi' : ''}
            </span>
          </>
        )}
      </motion.div>

      {/* Header Ultra-Premium */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/sessions">
            <motion.div
              whileHover={{ scale: 1.1, x: -3 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-2xl hover:bg-gradient-to-br hover:from-brand-blue/10 hover:to-brand-cyan/10 transition-all"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </motion.div>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                className="p-2.5 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-2xl shadow-lg shadow-brand-blue/20"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Calendar className="h-6 w-6 text-white" />
              </motion.div>
              <h1 className="text-3xl md:text-5xl font-display font-bold text-gray-900 tracking-tighter leading-none">
                {formData.name || sessionData?.name}
              </h1>
              <motion.div
                className="px-3 py-1.5 bg-gradient-to-br from-brand-blue-ghost to-brand-cyan-ghost border-2 border-brand-blue/20 rounded-xl flex items-center gap-2 shadow-sm"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Sparkles className="h-4 w-4 text-brand-blue" />
                <span className="text-xs font-bold text-brand-blue uppercase tracking-wide">Session active</span>
              </motion.div>
            </div>
            {formation && (
              <div className="flex items-center gap-2 text-gray-600">
                <BookOpen className="h-4 w-4 text-brand-cyan" />
                <p className="text-base font-medium tracking-tight">
                  {formation.name}
                  {program && (
                    <>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="text-brand-blue font-semibold">{program.name}</span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
        <motion.div
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center space-x-3"
        >
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-gradient-to-br from-brand-blue to-brand-cyan text-white hover:from-brand-blue-dark hover:to-brand-cyan-dark shadow-xl shadow-brand-blue/20 hover:shadow-2xl hover:shadow-brand-cyan/30 transition-all duration-500 font-semibold tracking-tight px-6 py-6 text-base"
          >
            <Save className="mr-2 h-5 w-5" />
            {updateMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
          </Button>
        </motion.div>
      </motion.div>

      {/* Workflow Progress */}
      <motion.div variants={itemVariants}>
        <WorkflowProgress activeStep={activeStep} onStepChange={setActiveStep} />
      </motion.div>

      {/* Tabs */}
      <div>
        {activeStep === 'configuration' && (
          <motion.div 
            key="config-tabs"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ConfigTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </motion.div>
        )}

        {activeStep === 'gestion' && (
          <motion.div 
            key="gestion-tabs"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <GestionTabs activeTab={activeGestionTab} onTabChange={setActiveGestionTab} />
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
            {/* Configuration Tabs */}
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
                    // Convertir status et payment_status null en valeurs par défaut
                    setEnrollmentForm({
                      ...form,
                      status: (form.status || 'pending') as 'pending' | 'completed' | 'cancelled' | 'confirmed' | 'failed',
                      payment_status: (form.payment_status || 'pending') as 'pending' | 'partial' | 'paid' | 'overdue',
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

          {/* Gestion Tabs */}
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
                  status: (form.status || 'pending') as 'pending' | 'completed' | 'cancelled' | 'confirmed' | 'failed',
                  payment_status: (form.payment_status || 'pending') as 'pending' | 'partial' | 'paid' | 'overdue',
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

          {/* Espace Apprenant */}
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

          {/* Suivi */}
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
        </div>

        {/* Sidebar Ultra-Premium */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard variant="premium" className="overflow-hidden border-2 border-transparent hover:border-brand-blue/20 transition-all duration-500">
            <div className="p-6 border-b-2 border-gray-100">
              <div className="flex items-center gap-3">
                <motion.div
                  className="p-2 bg-gradient-to-br from-brand-blue to-brand-cyan rounded-xl shadow-md"
                  whileHover={{ rotate: 5, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Sparkles className="h-5 w-5 text-white" />
                </motion.div>
                <h3 className="text-lg font-display font-bold text-gray-900 tracking-tight">Actions rapides</h3>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <motion.div whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 rounded-xl border-2 border-gray-200 hover:border-brand-blue/30 hover:bg-brand-blue-ghost transition-all font-semibold tracking-tight"
                  size="sm"
                >
                  <div className="p-1.5 bg-brand-blue/10 rounded-lg">
                    <Copy className="h-4 w-4 text-brand-blue" />
                  </div>
                  <span>Cloner la session</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 rounded-xl border-2 border-gray-200 hover:border-brand-cyan/30 hover:bg-brand-cyan-ghost transition-all font-semibold tracking-tight"
                  size="sm"
                >
                  <div className="p-1.5 bg-brand-cyan/10 rounded-lg">
                    <Archive className="h-4 w-4 text-brand-cyan" />
                  </div>
                  <span>Archiver</span>
                </Button>
              </motion.div>
              <motion.div whileHover={{ x: 4, scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3 h-12 rounded-xl border-2 border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 hover:text-red-700 transition-all font-semibold tracking-tight"
                  size="sm"
                >
                  <div className="p-1.5 bg-red-100 rounded-lg">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </div>
                  <span>Supprimer</span>
                </Button>
              </motion.div>
            </div>
          </GlassCard>
        </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
