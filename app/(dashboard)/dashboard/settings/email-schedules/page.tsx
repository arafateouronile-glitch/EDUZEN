'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { emailScheduleService } from '@/lib/services/email-schedule.service'
import { emailTemplateService } from '@/lib/services/email-template.service'
import { documentTemplateService } from '@/lib/services/document-template.service'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import {
  Mail,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Clock,
  Calendar,
  Users,
  Settings,
  History,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { cn } from '@/lib/utils'
import type {
  EmailScheduleTriggerType,
  EmailScheduleTargetType,
  CreateEmailScheduleInput,
  DocumentType,
} from '@/lib/services/email-schedule.service'

export default function EmailSchedulesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<'schedules' | 'history'>('schedules')
  const [editingSchedule, setEditingSchedule] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Récupérer les règles de planification
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['email-schedules', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      return emailScheduleService.getAllSchedules(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les templates d'emails
  const { data: emailTemplates } = useQuery({
    queryKey: ['email-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      return emailTemplateService.getAll(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  // Récupérer les templates de documents
  const { data: documentTemplates } = useQuery({
    queryKey: ['document-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      return documentTemplateService.getAllTemplates(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  // Mutation pour créer une règle
  const createMutation = useMutation({
    mutationFn: async (input: CreateEmailScheduleInput) => {
      if (!user?.organization_id) throw new Error('Organization ID manquant')
      return emailScheduleService.createSchedule(user.organization_id, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-schedules'] })
      setShowCreateForm(false)
      addToast({
        title: 'Règle créée',
        description: 'La règle de planification a été créée avec succès.',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la création de la règle.',
        type: 'error',
      })
    },
  })

  // Mutation pour mettre à jour une règle
  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<CreateEmailScheduleInput> }) => {
      return emailScheduleService.updateSchedule(id, input)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-schedules'] })
      setEditingSchedule(null)
      addToast({
        title: 'Règle mise à jour',
        description: 'La règle de planification a été mise à jour avec succès.',
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

  // Mutation pour supprimer une règle
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return emailScheduleService.deleteSchedule(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-schedules'] })
      addToast({
        title: 'Règle supprimée',
        description: 'La règle de planification a été supprimée avec succès.',
        type: 'success',
      })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la suppression de la règle.',
        type: 'error',
      })
    },
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
        description: `La règle a été ${editingSchedule ? 'activée' : 'désactivée'}.`,
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Mail className="h-8 w-8 text-brand-blue" />
              Planification d'emails automatiques
            </h1>
            <p className="text-gray-600 mt-2">
              Configurez et gérez les règles d'envoi automatique d'emails (convocation, rappels, etc.)
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-brand-blue hover:bg-brand-blue/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle règle
          </Button>
        </div>

        {/* Onglets */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('schedules')}
            className={cn(
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'schedules'
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Règles de planification ({schedules?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
              activeTab === 'history'
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            )}
          >
            <History className="h-4 w-4 inline mr-2" />
            Historique
          </button>
        </div>
      </div>

      {/* Formulaire de création */}
      <AnimatePresence>
        {showCreateForm && (
          <CreateScheduleForm
            emailTemplates={emailTemplates || []}
            documentTemplates={documentTemplates || []}
            onCreate={(input) => {
              createMutation.mutate(input)
            }}
            onCancel={() => setShowCreateForm(false)}
            isLoading={createMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Liste des règles */}
      {activeTab === 'schedules' && (
        <div className="space-y-6">
          {schedulesLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Chargement des règles...</p>
            </div>
          ) : schedules && schedules.length > 0 ? (
            <>
              {activeSchedules.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Play className="h-5 w-5 text-green-600" />
                    Règles actives ({activeSchedules.length})
                  </h2>
                  <div className="grid gap-4">
                    {activeSchedules.map((schedule) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        emailTemplates={emailTemplates || []}
                        documentTemplates={documentTemplates || []}
                        onEdit={() => setEditingSchedule(schedule.id)}
                        onDelete={(id) => {
                          if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
                            deleteMutation.mutate(id)
                          }
                        }}
                        onToggleActive={(id, isActive) => {
                          toggleActiveMutation.mutate({ id, isActive })
                        }}
                        isEditing={editingSchedule === schedule.id}
                        onCancelEdit={() => setEditingSchedule(null)}
                        onUpdate={(input) => {
                          updateMutation.mutate({ id: schedule.id, input })
                        }}
                        isUpdating={updateMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {inactiveSchedules.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Pause className="h-5 w-5 text-gray-400" />
                    Règles inactives ({inactiveSchedules.length})
                  </h2>
                  <div className="grid gap-4">
                    {inactiveSchedules.map((schedule) => (
                      <ScheduleCard
                        key={schedule.id}
                        schedule={schedule}
                        emailTemplates={emailTemplates || []}
                        documentTemplates={documentTemplates || []}
                        onEdit={() => setEditingSchedule(schedule.id)}
                        onDelete={(id) => {
                          if (confirm('Êtes-vous sûr de vouloir supprimer cette règle ?')) {
                            deleteMutation.mutate(id)
                          }
                        }}
                        onToggleActive={(id, isActive) => {
                          toggleActiveMutation.mutate({ id, isActive })
                        }}
                        isEditing={editingSchedule === schedule.id}
                        onCancelEdit={() => setEditingSchedule(null)}
                        onUpdate={(input) => {
                          updateMutation.mutate({ id: schedule.id, input })
                        }}
                        isUpdating={updateMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucune règle de planification
                </h3>
                <p className="text-gray-600 mb-6">
                  Créez votre première règle pour automatiser l'envoi d'emails.
                </p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-brand-blue hover:bg-brand-blue/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une règle
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Historique */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique d'exécution</CardTitle>
              <CardDescription>
                Consultez l'historique des envois automatiques d'emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">
                L'historique sera disponible une fois que les règles commenceront à s'exécuter.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// Composant pour le formulaire de création
function CreateScheduleForm({
  emailTemplates,
  documentTemplates,
  onCreate,
  onCancel,
  isLoading,
}: {
  emailTemplates: any[]
  documentTemplates: any[]
  onCreate: (input: CreateEmailScheduleInput) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<CreateEmailScheduleInput>({
    name: '',
    description: '',
    email_type: 'session_reminder',
    template_id: undefined,
    trigger_type: 'before_session_start',
    trigger_days: 1,
    trigger_time: '09:00',
    target_type: 'session',
    is_active: true,
    send_to_students: true,
    send_to_teachers: false,
    send_to_coordinators: false,
    send_document: false,
    document_type: undefined,
    document_template_id: undefined,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(formData)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Nouvelle règle de planification</CardTitle>
          <CardDescription>
            Configurez une nouvelle règle pour l'envoi automatique d'emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Nom de la règle *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Ex: Rappel session 24h avant"
                />
              </div>

              <div>
                <Label htmlFor="email_type">Type d'email *</Label>
                <select
                  id="email_type"
                  value={formData.email_type}
                  onChange={(e) => setFormData({ ...formData, email_type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  required
                >
                  <option value="session_reminder">Rappel de session</option>
                  <option value="evaluation_reminder">Rappel d'évaluation</option>
                  <option value="session_cancellation">Annulation de session</option>
                  <option value="evaluation_available">Évaluation disponible</option>
                  <option value="certificate_issued">Certificat délivré</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>

              <div>
                <Label htmlFor="template_id">Modèle de mail d'accompagnement</Label>
                <select
                  id="template_id"
                  value={formData.template_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      template_id: e.target.value || undefined,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                >
                  <option value="">Template par défaut</option>
                  {emailTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.email_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="trigger_type">Type de déclencheur *</Label>
                <select
                  id="trigger_type"
                  value={formData.trigger_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trigger_type: e.target.value as EmailScheduleTriggerType,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  required
                >
                  <option value="before_session_start">Avant le début de session</option>
                  <option value="after_session_end">Après la fin de session</option>
                  <option value="before_evaluation_start">Avant le début d'évaluation</option>
                  <option value="after_evaluation_end">Après la fin d'évaluation</option>
                  <option value="fixed_date">Date/heure fixe</option>
                </select>
              </div>

              {formData.trigger_type !== 'fixed_date' && (
                <>
                  <div>
                    <Label htmlFor="trigger_days">Jours avant/après *</Label>
                    <Input
                      id="trigger_days"
                      type="number"
                      value={formData.trigger_days || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trigger_days: parseInt(e.target.value) || undefined,
                        })
                      }
                      placeholder="Ex: 1 (pour 1 jour avant)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="trigger_time">Heure d'envoi *</Label>
                    <Input
                      id="trigger_time"
                      type="time"
                      value={formData.trigger_time || ''}
                      onChange={(e) => setFormData({ ...formData, trigger_time: e.target.value })}
                    />
                  </div>
                </>
              )}

              {formData.trigger_type === 'fixed_date' && (
                <div>
                  <Label htmlFor="trigger_datetime">Date/heure d'envoi *</Label>
                  <Input
                    id="trigger_datetime"
                    type="datetime-local"
                    value={formData.trigger_datetime || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, trigger_datetime: e.target.value })
                    }
                  />
                </div>
              )}

              <div>
                <Label htmlFor="target_type">Type de cible *</Label>
                <select
                  id="target_type"
                  value={formData.target_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      target_type: e.target.value as EmailScheduleTargetType,
                    })
                  }
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  required
                >
                  <option value="session">Session</option>
                  <option value="evaluation">Évaluation</option>
                  <option value="student">Étudiant</option>
                  <option value="teacher">Enseignant</option>
                  <option value="all">Tous</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Description de la règle..."
              />
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-gray-900">Document à joindre</h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="send_document" className="cursor-pointer">
                    Joindre un document à l'email
                  </Label>
                  <Switch
                    checked={formData.send_document ?? false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, send_document: checked })
                    }
                  />
                </div>
                {formData.send_document && (
                  <>
                    <div>
                      <Label htmlFor="document_type">Type de document *</Label>
                      <select
                        id="document_type"
                        value={formData.document_type || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            document_type: (e.target.value || undefined) as DocumentType | undefined,
                          })
                        }
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                        required={formData.send_document}
                      >
                        <option value="">Sélectionner un type</option>
                        <option value="convocation">Convocation</option>
                        <option value="certificat_realisation">Certificat de réalisation</option>
                        <option value="evaluation_pre_formation">Évaluation pré-formation</option>
                        <option value="evaluation_post_formation">Évaluation post-formation</option>
                        <option value="attestation">Attestation</option>
                        <option value="bulletin">Bulletin</option>
                        <option value="releve_notes">Relevé de notes</option>
                        <option value="certificat_presence">Certificat de présence</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="document_template_id">Modèle de document</Label>
                      <select
                        id="document_template_id"
                        value={formData.document_template_id || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            document_template_id: e.target.value || undefined,
                          })
                        }
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                      >
                        <option value="">Modèle par défaut</option>
                        {documentTemplates
                          .filter((template) => {
                            // Filtrer par type de document si sélectionné
                            if (formData.document_type) {
                              return template.type === formData.document_type
                            }
                            return true
                          })
                          .map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} ({template.type})
                            </option>
                          ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Sélectionnez un modèle personnalisé ou laissez vide pour utiliser le modèle par défaut
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-gray-900">Destinataires</h3>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="send_to_students" className="cursor-pointer">
                    Envoyer aux étudiants
                  </Label>
                  <Switch
                    checked={formData.send_to_students ?? true}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, send_to_students: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="send_to_teachers" className="cursor-pointer">
                    Envoyer aux enseignants
                  </Label>
                  <Switch
                    checked={formData.send_to_teachers ?? false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, send_to_teachers: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="send_to_coordinators" className="cursor-pointer">
                    Envoyer aux coordinateurs
                  </Label>
                  <Switch
                    checked={formData.send_to_coordinators ?? false}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, send_to_coordinators: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Activer la règle
                </Label>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-brand-blue hover:bg-brand-blue/90">
                  {isLoading ? 'Création...' : 'Créer la règle'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Composant pour afficher une carte de règle
function ScheduleCard({
  schedule,
  emailTemplates,
  documentTemplates,
  onEdit,
  onDelete,
  onToggleActive,
  isEditing,
  onCancelEdit,
  onUpdate,
  isUpdating,
}: {
  schedule: any
  emailTemplates: any[]
  documentTemplates: any[]
  onEdit: () => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, isActive: boolean) => void
  isEditing: boolean
  onCancelEdit: () => void
  onUpdate: (input: Partial<CreateEmailScheduleInput>) => void
  isUpdating: boolean
}) {
  const template = emailTemplates.find((t) => t.id === schedule.template_id)

  if (isEditing) {
    return (
      <EditScheduleForm
        schedule={schedule}
        emailTemplates={emailTemplates}
        documentTemplates={documentTemplates}
        onUpdate={onUpdate}
        onCancel={onCancelEdit}
        isLoading={isUpdating}
      />
    )
  }

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
              {schedule.trigger_days && (
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
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span>
                  Cible: <span className="font-medium text-gray-900">{schedule.target_type}</span>
                </span>
              </div>
              {schedule.total_sent > 0 && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  <span>{schedule.total_sent} email(s) envoyé(s)</span>
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
            >
              {schedule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(schedule.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Composant pour le formulaire d'édition
function EditScheduleForm({
  schedule,
  emailTemplates,
  documentTemplates,
  onUpdate,
  onCancel,
  isLoading,
}: {
  schedule: any
  emailTemplates: any[]
  documentTemplates: any[]
  onUpdate: (input: Partial<CreateEmailScheduleInput>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState<Partial<CreateEmailScheduleInput>>({
    name: schedule.name,
    description: schedule.description || '',
    email_type: schedule.email_type,
    template_id: schedule.template_id || undefined,
    trigger_type: schedule.trigger_type,
    trigger_days: schedule.trigger_days || undefined,
    trigger_time: schedule.trigger_time || undefined,
    trigger_datetime: schedule.trigger_datetime || undefined,
    target_type: schedule.target_type,
    is_active: schedule.is_active,
    send_to_students: schedule.send_to_students,
    send_to_teachers: schedule.send_to_teachers,
    send_to_coordinators: schedule.send_to_coordinators,
    send_document: schedule.send_document ?? false,
    document_type: schedule.document_type || undefined,
    document_template_id: schedule.document_template_id || undefined,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdate(formData)
  }

  return (
    <Card className="border-brand-blue">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="edit-name">Nom de la règle *</Label>
              <Input
                id="edit-name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-email_type">Type d'email *</Label>
              <select
                id="edit-email_type"
                value={formData.email_type || ''}
                onChange={(e) => setFormData({ ...formData, email_type: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                required
              >
                <option value="session_reminder">Rappel de session</option>
                <option value="evaluation_reminder">Rappel d'évaluation</option>
                <option value="session_cancellation">Annulation de session</option>
                <option value="evaluation_available">Évaluation disponible</option>
                <option value="certificate_issued">Certificat délivré</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>

            <div>
              <Label htmlFor="edit-template_id">Modèle de mail d'accompagnement</Label>
              <select
                id="edit-template_id"
                value={formData.template_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    template_id: e.target.value || undefined,
                  })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              >
                <option value="">Template par défaut</option>
                {emailTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.email_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="edit-trigger_type">Type de déclencheur *</Label>
              <select
                id="edit-trigger_type"
                value={formData.trigger_type || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    trigger_type: e.target.value as EmailScheduleTriggerType,
                  })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                required
              >
                <option value="before_session_start">Avant le début de session</option>
                <option value="after_session_end">Après la fin de session</option>
                <option value="before_evaluation_start">Avant le début d'évaluation</option>
                <option value="after_evaluation_end">Après la fin d'évaluation</option>
                <option value="fixed_date">Date/heure fixe</option>
              </select>
            </div>

            {formData.trigger_type !== 'fixed_date' && (
              <>
                <div>
                  <Label htmlFor="edit-trigger_days">Jours avant/après</Label>
                  <Input
                    id="edit-trigger_days"
                    type="number"
                    value={formData.trigger_days || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        trigger_days: parseInt(e.target.value) || undefined,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="edit-trigger_time">Heure d'envoi</Label>
                  <Input
                    id="edit-trigger_time"
                    type="time"
                    value={formData.trigger_time || ''}
                    onChange={(e) => setFormData({ ...formData, trigger_time: e.target.value })}
                  />
                </div>
              </>
            )}

            {formData.trigger_type === 'fixed_date' && (
              <div>
                <Label htmlFor="edit-trigger_datetime">Date/heure d'envoi</Label>
                <Input
                  id="edit-trigger_datetime"
                  type="datetime-local"
                  value={formData.trigger_datetime || ''}
                  onChange={(e) => setFormData({ ...formData, trigger_datetime: e.target.value })}
                />
              </div>
            )}

            <div>
              <Label htmlFor="edit-target_type">Type de cible *</Label>
              <select
                id="edit-target_type"
                value={formData.target_type || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    target_type: e.target.value as EmailScheduleTargetType,
                  })
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                required
              >
                <option value="session">Session</option>
                <option value="evaluation">Évaluation</option>
                <option value="student">Étudiant</option>
                <option value="teacher">Enseignant</option>
                <option value="all">Tous</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-gray-900">Document à joindre</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-send_document" className="cursor-pointer">
                  Joindre un document à l'email
                </Label>
                <Switch
                  checked={formData.send_document ?? false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, send_document: checked })
                  }
                />
              </div>
              {formData.send_document && (
                <>
                  <div>
                    <Label htmlFor="edit-document_type">Type de document *</Label>
                    <select
                      id="edit-document_type"
                      value={formData.document_type || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          document_type: (e.target.value || undefined) as DocumentType | undefined,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                      required={formData.send_document}
                    >
                      <option value="">Sélectionner un type</option>
                      <option value="convocation">Convocation</option>
                      <option value="certificat_realisation">Certificat de réalisation</option>
                      <option value="evaluation_pre_formation">Évaluation pré-formation</option>
                      <option value="evaluation_post_formation">Évaluation post-formation</option>
                      <option value="attestation">Attestation</option>
                      <option value="bulletin">Bulletin</option>
                      <option value="releve_notes">Relevé de notes</option>
                      <option value="certificat_presence">Certificat de présence</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="edit-document_template_id">Modèle de document</Label>
                    <select
                      id="edit-document_template_id"
                      value={formData.document_template_id || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          document_template_id: e.target.value || undefined,
                        })
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                    >
                      <option value="">Modèle par défaut</option>
                      {documentTemplates
                        .filter((template) => {
                          // Filtrer par type de document si sélectionné
                          if (formData.document_type) {
                            return template.type === formData.document_type
                          }
                          return true
                        })
                        .map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} ({template.type})
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Sélectionnez un modèle personnalisé ou laissez vide pour utiliser le modèle par défaut
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold text-gray-900">Destinataires</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-send_to_students" className="cursor-pointer">
                  Envoyer aux étudiants
                </Label>
                <Switch
                  checked={formData.send_to_students ?? false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, send_to_students: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-send_to_teachers" className="cursor-pointer">
                  Envoyer aux enseignants
                </Label>
                <Switch
                  checked={formData.send_to_teachers ?? false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, send_to_teachers: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-send_to_coordinators" className="cursor-pointer">
                  Envoyer aux coordinateurs
                </Label>
                <Switch
                  checked={formData.send_to_coordinators ?? false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, send_to_coordinators: checked })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active ?? false}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-is_active" className="cursor-pointer">
                Activer la règle
              </Label>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-brand-blue hover:bg-brand-blue/90">
                {isLoading ? 'Mise à jour...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
