'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Save, Copy, Archive, Trash2 } from 'lucide-react'
import { useSessionDetail } from './hooks/use-session-detail'
import { WorkflowProgress } from './components/workflow-progress'
import { ConfigTabs } from './components/config-tabs'
import { GestionTabs } from './components/gestion-tabs'
import { ConfigInitialisation } from './sections/config-initialisation'
import { ConfigDatesPrix } from './sections/config-dates-prix'
import { ConfigProgramme } from './sections/config-programme'
import { ConfigIntervenants } from './sections/config-intervenants'
import { ConfigApprenants } from './sections/config-apprenants'
import { GestionConventions } from './sections/gestion-conventions'

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

    // Actions
    handleSave,
    updateMutation,
  } = useSessionDetail(sessionId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-muted-foreground">Session non trouvée</div>
          <Link href="/dashboard/sessions">
            <Button className="mt-4">Retour à la liste</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href="/dashboard/sessions" className="hover:text-primary">Toutes mes sessions</Link>
        <span>/</span>
        <span>{formData.name || sessionData?.name}</span>
        {activeStep !== 'configuration' && (
          <>
            <span>/</span>
            <span className="text-foreground">
              {activeStep === 'gestion' ? 'Gestion' : 
               activeStep === 'espace_apprenant' ? 'Espace Apprenant' : 
               activeStep === 'suivi' ? 'Suivi' : ''}
            </span>
          </>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/sessions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{formData.name || sessionData?.name}</h1>
            {formation && (
              <p className="text-sm text-gray-600 mt-1">
                {formation.name}
                {program && ` • ${program.name}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Sauvegarde...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      {/* Workflow Progress */}
      <WorkflowProgress activeStep={activeStep} onStepChange={setActiveStep} />

      {/* Tabs */}
      {activeStep === 'configuration' && (
        <ConfigTabs activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {activeStep === 'gestion' && (
        <GestionTabs activeTab={activeGestionTab} onTabChange={setActiveGestionTab} />
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* Configuration Tabs */}
          {activeStep === 'configuration' && activeTab === 'initialisation' && (
            <ConfigInitialisation
              formData={formData}
              onFormDataChange={setFormData}
              users={users}
            />
          )}

          {activeStep === 'configuration' && activeTab === 'dates_prix' && (
            <ConfigDatesPrix
              sessionId={sessionId}
              formData={formData}
              onFormDataChange={setFormData}
              slotConfig={slotConfig}
              onSlotConfigChange={setSlotConfig}
              sessionSlots={sessionSlots}
              onSlotsRefetch={refetchSlots}
            />
          )}

          {activeStep === 'configuration' && activeTab === 'programme' && (
            <ConfigProgramme
              formData={formData}
              onFormDataChange={setFormData}
              programs={programs}
              formations={formations}
              sessionPrograms={sessionPrograms}
              formation={formation || undefined}
              program={program || undefined}
            />
          )}

          {activeStep === 'configuration' && activeTab === 'intervenants' && (
            <ConfigIntervenants
              formData={formData}
              onFormDataChange={setFormData}
              users={users}
            />
          )}

          {activeStep === 'configuration' && activeTab === 'apprenants' && (
            <ConfigApprenants formationId={formData.formation_id} />
          )}

          {/* Gestion Tabs */}
          {activeStep === 'gestion' && activeGestionTab === 'conventions' && (
            <GestionConventions
              sessionData={sessionData}
              formation={formation || undefined}
              program={program || undefined}
              organization={organization}
              enrollments={enrollments}
              isLoading={!enrollments}
              onShowEnrollmentForm={() => {
                setActiveGestionTab('convocations')
                // TODO: Set show enrollment form
              }}
              onSwitchTab={(tab) => setActiveGestionTab(tab)}
            />
          )}

          {activeStep === 'gestion' && activeGestionTab !== 'conventions' && (
            <Card>
              <CardHeader>
                <CardTitle>Gestion - {activeGestionTab}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Les sections de gestion (convocations, évaluations, finances, espace entreprise) seront refactorisées dans les prochaines étapes.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Espace Apprenant - À implémenter dans des composants séparés */}
          {activeStep === 'espace_apprenant' && (
            <Card>
              <CardHeader>
                <CardTitle>Espace Apprenant</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  La section Espace Apprenant sera refactorisée dans les prochaines étapes.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Suivi - À implémenter dans des composants séparés */}
          {activeStep === 'suivi' && (
            <Card>
              <CardHeader>
                <CardTitle>Suivi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  La section Suivi sera refactorisée dans les prochaines étapes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - À implémenter dans un composant séparé */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" size="sm">
                <Copy className="mr-2 h-4 w-4" />
                Cloner
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Archive className="mr-2 h-4 w-4" />
                Archiver
              </Button>
              <Button variant="outline" className="w-full text-red-600" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

