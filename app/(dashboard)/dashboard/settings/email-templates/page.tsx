'use client'

import { useState, useMemo, useTransition } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { emailTemplateService } from '@/lib/services/email-template.service.client'
import type { EmailType } from '@/lib/services/email-template.service'
import { seedDefaultEmailTemplates, DEFAULT_TEMPLATES } from '@/lib/actions/seed-email-templates'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { Mail, Plus, Edit, Trash2, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'

/** Retourne le contenu HTML en texte brut (pas de rendu HTML). Supprime style/script. */
function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') return ''
  const cleaned = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  const div = typeof document !== 'undefined' ? document.createElement('div') : null
  if (!div) {
    return cleaned.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  div.innerHTML = cleaned
  const raw = div.textContent || div.innerText || ''
  return raw.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n\n').trim()
}

/**
 * Convertit le texte simple (format lisible) en HTML pour l'email.
 * Règles : **gras** → <strong>, *italique* → <em>, double retour à la ligne = paragraphe.
 */
function simpleFormatToHtml(text: string): string {
  if (!text || typeof text !== 'string') return ''
  const paragraphs = text.split(/\n\s*\n/)
  const wrapped = paragraphs.map((block) => {
    const line = block
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>')
    return line.trim() ? `<p>${line}</p>` : ''
  }).filter(Boolean).join('\n')
  return `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${wrapped}</div>`
}

export default function EmailTemplatesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [selectedEmailType, setSelectedEmailType] = useState<EmailType | 'all'>('all')
  const [isSeeding, startSeeding] = useTransition()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [formData, setFormData] = useState({
    email_type: 'document_generated' as EmailType,
    name: '',
    subject: '',
    body_html: '',
    body_text: '',
    is_default: false,
    is_active: true,
    description: '',
  })

  const emailTypes = emailTemplateService.getEmailTypes()

  // Récupérer tous les modèles
  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return emailTemplateService.getAll(user.organization_id)
    },
    enabled: !!user?.organization_id,
  })

  // Filtrer les modèles par type
  const filteredTemplates = selectedEmailType === 'all' 
    ? templates || []
    : (templates || []).filter(t => t.email_type === selectedEmailType)

  // Mutation pour créer un modèle
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.organization_id || !user?.id) throw new Error('Non authentifié')
      return emailTemplateService.create(
        {
          organization_id: user.organization_id,
          ...data,
        },
        user.id
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      setShowCreateModal(false)
      resetForm()
      addToast({
        title: 'Modèle créé',
        description: 'Le modèle d\'email a été créé avec succès.',
        type: 'success',
      })
    },
    onError: (error: unknown) => {
      addToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la création du modèle.',
        type: 'error',
      })
    },
  })

  // Mutation pour mettre à jour un modèle
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: import('@/lib/services/email-template.service').UpdateEmailTemplateInput }) => {
      return emailTemplateService.update(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      setEditingTemplate(null)
      resetForm()
      addToast({
        title: 'Modèle mis à jour',
        description: 'Le modèle d\'email a été mis à jour avec succès.',
        type: 'success',
      })
    },
    onError: (error: unknown) => {
      addToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la mise à jour du modèle.',
        type: 'error',
      })
    },
  })

  // Mutation pour supprimer un modèle
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return emailTemplateService.delete(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      addToast({
        title: 'Modèle supprimé',
        description: 'Le modèle d\'email a été supprimé avec succès.',
        type: 'success',
      })
    },
    onError: (error: unknown) => {
      addToast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression du modèle.',
        type: 'error',
      })
    },
  })

  const resetForm = () => {
    setFormData({
      email_type: 'document_generated',
      name: '',
      subject: '',
      body_html: '',
      body_text: '',
      is_default: false,
      is_active: true,
      description: '',
    })
  }

  const handleCreate = () => {
    resetForm()
    setEditingTemplate(null)
    setShowCreateModal(true)
  }

  const handleEdit = (template: import('@/lib/services/email-template.service').EmailTemplate) => {
    const bodySource = template.body_text?.trim()
      ? template.body_text
      : htmlToPlainText(template.body_html || '')
    setFormData({
      email_type: template.email_type as import('@/lib/services/email-template.service').EmailType,
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      body_text: bodySource,
      is_default: template.is_default ?? false,
      is_active: template.is_active ?? false,
      description: template.description || '',
    })
    setEditingTemplate(template)
    setShowCreateModal(true)
  }

  const handleSubmit = () => {
    const payload = {
      ...formData,
      body_text: formData.body_text,
      body_html: simpleFormatToHtml(formData.body_text),
    }
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce modèle ?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSeedDefaults = () => {
    startSeeding(async () => {
      const result = await seedDefaultEmailTemplates()
      if (!result.success) {
        addToast({ title: 'Erreur', description: result.error, type: 'error' })
        return
      }
      queryClient.invalidateQueries({ queryKey: ['email-templates'] })
      if (result.created === 0) {
        addToast({
          title: 'Déjà configurés',
          description: `Tous les modèles existent déjà (${result.skipped} types couverts).`,
          type: 'info',
        })
      } else {
        addToast({
          title: 'Modèles créés',
          description: `${result.created} modèle${result.created > 1 ? 's' : ''} par défaut créé${result.created > 1 ? 's' : ''} avec succès.`,
          type: 'success',
        })
      }
    })
  }

  const selectedTypeInfo = emailTypes.find(t => t.value === formData.email_type)

  // Grouper les modèles par type
  const templatesByType = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.email_type]) {
      acc[template.email_type] = []
    }
    acc[template.email_type].push(template)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Modèles d'emails</h1>
          <p className="text-gray-600">
            Gérez les modèles d'emails pour chaque type d'envoi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="gap-2"
          >
            {isSeeding
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Sparkles className="w-4 h-4" />
            }
            Modèles par défaut
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau modèle
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label htmlFor="email-type-filter">Type d'email :</Label>
            <Select
              value={selectedEmailType}
              onValueChange={(value) => setSelectedEmailType(value as EmailType | 'all')}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {emailTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste des modèles */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Mail className="w-8 h-8 text-blue-500" />
            </div>
            {selectedEmailType === 'all' ? (
              <>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucun modèle configuré</h2>
                <p className="text-gray-500 mb-2 max-w-md mx-auto">
                  Initialisez en un clic les <strong>{DEFAULT_TEMPLATES.length} modèles par défaut</strong> couvrant tous les types d'envoi : confirmation d'inscription, rappels, factures, certificats…
                </p>
                <p className="text-sm text-gray-400 mb-8">Vous pourrez ensuite modifier chaque template à votre convenance.</p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={handleSeedDefaults}
                    disabled={isSeeding}
                    className="gap-2"
                  >
                    {isSeeding
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : <Sparkles className="w-4 h-4" />
                    }
                    {isSeeding ? 'Création en cours…' : 'Créer les modèles par défaut'}
                  </Button>
                  <Button onClick={handleCreate} variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Créer manuellement
                  </Button>
                </div>
                {/* Aperçu des types couverts */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-2 max-w-2xl mx-auto text-left">
                  {DEFAULT_TEMPLATES.map(t => (
                    <div key={t.email_type} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      <span className="text-xs text-gray-600">{emailTypes.find(e => e.value === t.email_type)?.label ?? t.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Aucun modèle pour le type &quot;{emailTypes.find(t => t.value === selectedEmailType)?.label}&quot;
                </p>
                <Button onClick={handleCreate} variant="outline">
                  Créer un modèle
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(Object.entries(templatesByType) as [string, any[]][]).map(([type, typeTemplates]) => {
            const typeInfo = emailTypes.find(t => t.value === type)
            return (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    {typeInfo?.label || type}
                  </CardTitle>
                  <CardDescription>{typeInfo?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {typeTemplates.map((template) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                            {template.is_default && (
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                Par défaut
                              </span>
                            )}
                            {!template.is_active && (
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                                Inactif
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Sujet :</strong> {template.subject}
                          </p>
                          {template.description && (
                            <p className="text-sm text-gray-500 mb-1">{template.description}</p>
                          )}
                          {(template.body_html || template.body_text) && (() => {
                            const plain = htmlToPlainText(template.body_html || template.body_text || '')
                            return (
                              <p className="text-sm text-gray-600 whitespace-pre-wrap break-words">
                                <strong>Aperçu :</strong> {plain.slice(0, 200)}{plain.length > 200 ? '…' : ''}
                              </p>
                            )
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de création/édition */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle d\'email'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? 'Modifiez les informations du modèle d\'email'
                : 'Créez un nouveau modèle d\'email pour un type d\'envoi spécifique'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Type d'email */}
            <div>
              <Label htmlFor="email_type">Type d'email *</Label>
              <Select
                value={formData.email_type}
                onValueChange={(value) => {
                  setFormData({ ...formData, email_type: value as EmailType })
                }}
              >
                <SelectTrigger id="email_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {emailTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTypeInfo && (
                <p className="text-sm text-gray-500 mt-1">
                  {selectedTypeInfo.description}
                </p>
              )}
            </div>

            {/* Nom */}
            <div>
              <Label htmlFor="name">Nom du modèle *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Document généré - Standard"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description du modèle..."
                rows={2}
              />
            </div>

            {/* Sujet */}
            <div>
              <Label htmlFor="subject">Sujet de l'email *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ex: Votre {document_title}"
              />
              {selectedTypeInfo && selectedTypeInfo.defaultVariables.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Variables disponibles : {selectedTypeInfo.defaultVariables.join(', ')}
                </p>
              )}
            </div>

            {/* Corps de l'email en texte simple (balises lisibles) */}
            <div>
              <Label htmlFor="body_text">Corps de l'email *</Label>
              <Textarea
                id="body_text"
                value={formData.body_text}
                onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                placeholder={`Félicitations {student_name} !

Votre certificat **{certificate_title}** a été délivré avec succès.

Cordialement,
L'équipe {organization_name}`}
                rows={14}
                className="font-sans text-sm whitespace-pre-wrap"
              />
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Format simple :</strong> <code className="bg-muted px-1 rounded">**gras**</code> <code className="bg-muted px-1 rounded">*italique*</code> — Retour à la ligne = nouveau paragraphe. Utilisez les variables indiquées pour ce type d'email.
              </p>
            </div>

            {/* Options */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <Label htmlFor="is_default">Modèle par défaut pour ce type</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Actif</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
                setEditingTemplate(null)
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.subject || !formData.body_text?.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editingTemplate ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
