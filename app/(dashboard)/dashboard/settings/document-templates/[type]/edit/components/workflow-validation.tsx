'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Plus,
  Trash2,
  ArrowRight,
  Users,
  User,
  AlertCircle,
  X,
} from 'lucide-react'
import { useToast } from '@/components/ui/toast'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workflowValidationService } from '@/lib/services/workflow-validation.service'
import { useAuth } from '@/lib/hooks/use-auth'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import { formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from '@/components/ui/motion'

interface WorkflowValidationProps {
  template: DocumentTemplate
  onClose?: () => void
}

export function WorkflowValidation({ template, onClose }: WorkflowValidationProps) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('workflows')
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false)
  const [newWorkflowName, setNewWorkflowName] = useState('')
  const [newWorkflowDescription, setNewWorkflowDescription] = useState('')
  const [workflowSteps, setWorkflowSteps] = useState<Array<{
    step_order: number
    name: string
    description?: string
    approver_role?: string
    approver_user_id?: string
    is_required?: boolean
    can_reject?: boolean
    can_comment?: boolean
    timeout_days?: number
  }>>([])

  // Récupérer les workflows
  const { data: workflows } = useQuery({
    queryKey: ['workflows', user?.organization_id],
    queryFn: () => workflowValidationService.getWorkflows(user?.organization_id || ''),
    enabled: !!user?.organization_id,
  })

  // Récupérer les instances de workflow pour ce template
  const { data: instances } = useQuery({
    queryKey: ['workflow-instances', template.id],
    queryFn: () => workflowValidationService.getTemplateInstances(template.id || ''),
    enabled: !!template.id,
  })

  // Récupérer les approbations en attente
  const { data: pendingApprovals } = useQuery({
    queryKey: ['pending-approvals', user?.id],
    queryFn: () => workflowValidationService.getPendingApprovals(user?.id || ''),
    enabled: !!user?.id,
  })

  // Mutation pour créer un workflow
  const createWorkflowMutation = useMutation({
    mutationFn: async () => {
      if (!user?.organization_id || !user?.id) throw new Error('Utilisateur non authentifié')
      return workflowValidationService.createWorkflow(
        {
          organization_id: user.organization_id,
          name: newWorkflowName,
          description: newWorkflowDescription,
          steps: workflowSteps,
        },
        user.id
      )
    },
    onSuccess: () => {
      addToast({
        title: 'Workflow créé',
        description: 'Le workflow de validation a été créé avec succès.',
        type: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      setShowCreateWorkflow(false)
      setNewWorkflowName('')
      setNewWorkflowDescription('')
      setWorkflowSteps([])
    },
    onError: (error: Error) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le workflow.',
        type: 'error',
      })
    },
  })

  // Mutation pour démarrer un workflow
  const startWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      if (!user?.id || !template.id) throw new Error('Données manquantes')
      return workflowValidationService.startWorkflow(template.id, workflowId, user.id)
    },
    onSuccess: () => {
      addToast({
        title: 'Workflow démarré',
        description: 'Le processus de validation a été démarré.',
        type: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Impossible de démarrer le workflow.',
        type: 'error',
      })
    },
  })

  // Mutation pour approuver/rejeter
  const approveMutation = useMutation({
    mutationFn: async ({ approvalId, status, comment }: { approvalId: string; status: 'approved' | 'rejected'; comment?: string }) => {
      return workflowValidationService.approveStep(approvalId, status, comment, user?.id)
    },
    onSuccess: () => {
      addToast({
        title: 'Décision enregistrée',
        description: 'Votre décision a été enregistrée.',
        type: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] })
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    },
    onError: (error: Error) => {
      addToast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'enregistrer la décision.',
        type: 'error',
      })
    },
  })

  const addStep = () => {
    setWorkflowSteps([
      ...workflowSteps,
      {
        step_order: workflowSteps.length + 1,
        name: `Étape ${workflowSteps.length + 1}`,
        is_required: true,
        can_reject: true,
        can_comment: true,
      },
    ])
  }

  const removeStep = (index: number) => {
    setWorkflowSteps(workflowSteps.filter((_, i) => i !== index).map((step, i) => ({ ...step, step_order: i + 1 })))
  }

  const updateStep = (index: number, updates: Partial<typeof workflowSteps[0]>) => {
    const newSteps = [...workflowSteps]
    newSteps[index] = { ...newSteps[index], ...updates }
    setWorkflowSteps(newSteps)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approuvé</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejeté</Badge>
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Workflow de validation</CardTitle>
            <CardDescription>
              Configurez et gérez les processus d'approbation multi-niveaux pour vos templates
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="instances">Instances</TabsTrigger>
            <TabsTrigger value="approvals">Mes approbations</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Workflows disponibles</h3>
              <Button onClick={() => setShowCreateWorkflow(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un workflow
              </Button>
            </div>

            {showCreateWorkflow && (
              <Card className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Nom du workflow *</Label>
                  <Input
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    placeholder="ex: Validation standard"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newWorkflowDescription}
                    onChange={(e) => setNewWorkflowDescription(e.target.value)}
                    placeholder="Description du workflow..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Étapes du workflow</Label>
                    <Button variant="outline" size="sm" onClick={addStep}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter une étape
                    </Button>
                  </div>

                  <AnimatePresence>
                    {workflowSteps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Étape {step.step_order}</h4>
                          <Button variant="ghost" size="icon" onClick={() => removeStep(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nom *</Label>
                            <Input
                              value={step.name}
                              onChange={(e) => updateStep(index, { name: e.target.value })}
                              placeholder="ex: Validation manager"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Rôle approbateur</Label>
                            <Select
                              value={step.approver_role || ''}
                              onValueChange={(value) => updateStep(index, { approver_role: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un rôle" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrateur</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="director">Directeur</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={step.description || ''}
                            onChange={(e) => updateStep(index, { description: e.target.value })}
                            placeholder="Description de l'étape..."
                          />
                        </div>
                        <div className="flex gap-4">
                          <Label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={step.is_required ?? true}
                              onChange={(e) => updateStep(index, { is_required: e.target.checked })}
                            />
                            Requis
                          </Label>
                          <Label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={step.can_reject ?? true}
                              onChange={(e) => updateStep(index, { can_reject: e.target.checked })}
                            />
                            Peut rejeter
                          </Label>
                          <Label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={step.can_comment ?? true}
                              onChange={(e) => updateStep(index, { can_comment: e.target.checked })}
                            />
                            Peut commenter
                          </Label>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateWorkflow(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={() => createWorkflowMutation.mutate()}
                    disabled={!newWorkflowName || workflowSteps.length === 0}
                  >
                    Créer le workflow
                  </Button>
                </div>
              </Card>
            )}

            <div className="space-y-2">
              {workflows?.map((workflow) => (
                <Card key={workflow.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{workflow.name}</h4>
                      {workflow.description && (
                        <p className="text-sm text-muted-foreground">{workflow.description}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startWorkflowMutation.mutate(workflow.id)}
                      disabled={startWorkflowMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Démarrer
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="instances" className="space-y-4">
            <h3 className="text-lg font-semibold">Workflows en cours</h3>
            <div className="space-y-2">
              {instances?.map((instance) => (
                <Card key={instance.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{(instance as any).workflow?.name || 'Workflow'}</h4>
                      <p className="text-sm text-muted-foreground">
                        Démarré le {formatDate(instance.started_at)}
                      </p>
                      {getStatusBadge(instance.status)}
                    </div>
                  </div>
                </Card>
              ))}
              {(!instances || instances.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun workflow en cours pour ce template
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
            <h3 className="text-lg font-semibold">Mes approbations en attente</h3>
            <div className="space-y-2">
              {pendingApprovals?.map((approval) => (
                <Card key={approval.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">
                          {(approval as any).instance?.template?.name || 'Template'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Étape: {(approval as any).step?.name || 'N/A'}
                        </p>
                      </div>
                      {getStatusBadge(approval.status)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate({ approvalId: approval.id, status: 'approved' })}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => approveMutation.mutate({ approvalId: approval.id, status: 'rejected' })}
                        disabled={approveMutation.isPending}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Rejeter
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {(!pendingApprovals || pendingApprovals.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune approbation en attente
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
