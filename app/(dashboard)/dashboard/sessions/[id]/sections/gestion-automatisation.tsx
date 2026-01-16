'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  Mail,
  Play,
  Pause,
  Clock,
  Calendar,
  Users,
  Settings,
  Info,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { emailScheduleService } from '@/lib/services/email-schedule.service'
import { emailTemplateService } from '@/lib/services/email-template.service'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { SessionWithRelations } from '@/lib/types/query-types'

interface GestionAutomatisationProps {
  sessionId: string
  sessionData: SessionWithRelations | undefined
}

export function GestionAutomatisation({
  sessionId,
  sessionData,
}: GestionAutomatisationProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()

  // Récupérer les règles de planification pertinentes pour cette session
  // Affiche : règles liées à cette session OU règles générales (sans session_id spécifique)
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['email-schedules', user?.organization_id, sessionId],
    queryFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      const allSchedules = await emailScheduleService.getAllSchedules(user.organization_id)
      
      // Filtrer les règles pertinentes pour cette session
      return allSchedules.filter((schedule: any) => {
        // Règles liées directement à cette session
        if (schedule.session_id === sessionId) {
          return true
        }
        
        // Règles générales (sans session_id spécifique) qui peuvent s'appliquer à toutes les sessions
        // On affiche toutes les règles générales pour que l'utilisateur puisse les activer s'il le souhaite
        if (!schedule.session_id && (schedule.target_type === 'session' || schedule.target_type === 'all')) {
          return true
        }
        
        return false
      })
    },
    enabled: !!user?.organization_id && !!sessionId,
  })

  // Récupérer les templates d'emails pour afficher les noms
  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      return emailTemplateService.getAllTemplates(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  // Mutation pour activer/désactiver une règle
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return emailScheduleService.updateSchedule(id, { is_active: isActive })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-schedules'] })
      addToast({
        title: 'Règle mise à jour',
        description: 'Le statut de la règle a été mis à jour.',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la mise à jour de la règle.',
        type: 'error',
      })
    },
  })

  const activeSchedules = schedules?.filter((s) => s.is_active) || []
  const inactiveSchedules = schedules?.filter((s) => !s.is_active) || []

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">Chargement des règles...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Automatisation d'emails</h2>
          <p className="text-gray-600 mt-1">
            Activez ou désactivez les règles d'automatisation créées dans les paramètres
          </p>
        </div>
        <Link href="/dashboard/settings/email-schedules">
          <Button
            variant="outline"
            className="border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white"
          >
            <Settings className="h-4 w-4 mr-2" />
            Gérer les règles
          </Button>
        </Link>
      </div>

      {/* Message d'information */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">
                Gestion des règles d'automatisation
              </p>
              <p className="text-sm text-blue-800">
                Cette page affiche les règles d'automatisation pertinentes pour cette session (règles spécifiques à cette session et règles générales). 
                Les règles doivent être créées dans les paramètres de l'application. 
                Depuis cette page, vous pouvez uniquement activer ou désactiver les règles existantes.
                Pour créer, modifier ou supprimer une règle, utilisez le bouton "Gérer les règles" ci-dessus.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des règles actives */}
      {activeSchedules.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Play className="h-5 w-5 text-green-600" />
            Règles actives ({activeSchedules.length})
          </h3>
          <div className="grid gap-4">
            {activeSchedules.map((schedule: any) => {
              const template = emailTemplates?.find((t: any) => t.id === schedule.template_id)
              return (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  template={template}
                  onToggleActive={(id, isActive) => {
                    toggleActiveMutation.mutate({ id, isActive })
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Liste des règles inactives */}
      {inactiveSchedules.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Pause className="h-5 w-5 text-gray-400" />
            Règles inactives ({inactiveSchedules.length})
          </h3>
          <div className="grid gap-4">
            {inactiveSchedules.map((schedule: any) => {
              const template = emailTemplates?.find((t: any) => t.id === schedule.template_id)
              return (
                <ScheduleCard
                  key={schedule.id}
                  schedule={schedule}
                  template={template}
                  onToggleActive={(id, isActive) => {
                    toggleActiveMutation.mutate({ id, isActive })
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Message si aucune règle */}
      {(!schedules || schedules.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aucune règle d'automatisation
            </h3>
            <p className="text-gray-600 mb-6">
              Créez votre première règle dans les paramètres de l'application.
            </p>
            <Link href="/dashboard/settings/email-schedules">
              <Button className="bg-brand-blue hover:bg-brand-blue/90">
                <Settings className="h-4 w-4 mr-2" />
                Créer une règle
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Composant simplifié pour afficher une règle (sans édition ni suppression)
function ScheduleCard({
  schedule,
  template,
  onToggleActive,
}: {
  schedule: any
  template?: any
  onToggleActive: (id: string, isActive: boolean) => void
}) {
  return (
    <Card className={cn(!schedule.is_active && 'opacity-60')}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{schedule.name}</h3>
              {schedule.is_active ? (
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Active
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  Inactive
                </span>
              )}
            </div>

            {schedule.description && (
              <p className="text-gray-600 mb-4">{schedule.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4" />
                <span>
                  Type: <span className="font-medium text-gray-900">{schedule.email_type}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  Déclencheur: <span className="font-medium text-gray-900">{schedule.trigger_type}</span>
                </span>
              </div>
              {schedule.trigger_days !== null && schedule.trigger_days !== undefined && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {schedule.trigger_days > 0 ? '+' : ''}
                    {schedule.trigger_days} jour(s)
                    {schedule.trigger_time && ` à ${schedule.trigger_time}`}
                  </span>
                </div>
              )}
              {template && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Settings className="h-4 w-4" />
                  <span>Template: {template.name}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {schedule.send_to_students && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  Étudiants
                </span>
              )}
              {schedule.send_to_teachers && (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                  Enseignants
                </span>
              )}
              {schedule.send_to_coordinators && (
                <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                  Coordinateurs
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleActive(schedule.id, !schedule.is_active)}
              title={schedule.is_active ? 'Désactiver' : 'Activer'}
            >
              {schedule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
