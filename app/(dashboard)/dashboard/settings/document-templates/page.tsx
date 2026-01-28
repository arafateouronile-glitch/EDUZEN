'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/hooks/use-auth'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import type { DocumentType, DocumentTemplate } from '@/lib/types/document-templates'
import { DuplicateDialog } from './components/duplicate-dialog'
import { RenameDialog } from './components/rename-dialog'
import { DeleteDialog } from './components/delete-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FileText,
  Receipt,
  FileCheck,
  Calendar,
  ClipboardList,
  Award,
  GraduationCap,
  BookOpen,
  UserCheck,
  Shield,
  Scale,
  Book,
  CheckCircle,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Copy,
  Eye,
  Settings,
  CheckCircle2,
  XCircle,
  BarChart3,
  Trash2,
  Star,
  Pencil,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { logger, sanitizeError } from '@/lib/utils/logger'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

// Configuration des 13 types de documents
const DOCUMENT_TYPES: Array<{
  type: DocumentType
  name: string
  description: string
  icon: React.ElementType
  color: string
}> = [
  {
    type: 'convention',
    name: 'Convention de formation',
    description: 'Contrat entre l\'établissement et l\'apprenant',
    icon: FileText,
    color: '#335ACF',
  },
  {
    type: 'facture',
    name: 'Facture',
    description: 'Document comptable de facturation',
    icon: Receipt,
    color: '#335ACF',
  },
  {
    type: 'devis',
    name: 'Devis',
    description: 'Estimation de prix avant formation',
    icon: FileCheck,
    color: '#34B9EE',
  },
  {
    type: 'convocation',
    name: 'Convocation',
    description: 'Invitation à une session ou examen',
    icon: Calendar,
    color: '#335ACF',
  },
  {
    type: 'contrat',
    name: 'Contrat de scolarité',
    description: 'Accord de scolarisation officiel',
    icon: ClipboardList,
    color: '#335ACF',
  },
  {
    type: 'attestation_reussite',
    name: 'Attestation de réussite',
    description: 'Certificat de réussite à une formation',
    icon: Award,
    color: '#335ACF',
  },
  {
    type: 'certificat_scolarite',
    name: 'Certificat de scolarité',
    description: 'Justificatif d\'inscription dans l\'établissement',
    icon: GraduationCap,
    color: '#335ACF',
  },
  {
    type: 'releve_notes',
    name: 'Relevé de notes',
    description: 'Bulletin de notes et appréciations',
    icon: BookOpen,
    color: '#34B9EE',
  },
  {
    type: 'attestation_entree',
    name: 'Attestation d\'entrée en formation',
    description: 'Certificat d\'inscription à une formation',
    icon: UserCheck,
    color: '#335ACF',
  },
  {
    type: 'reglement_interieur',
    name: 'Règlement intérieur',
    description: 'Règles et procédures de l\'établissement',
    icon: Shield,
    color: '#335ACF',
  },
  {
    type: 'cgv',
    name: 'Conditions Générales de Vente',
    description: 'CGV et conditions d\'utilisation',
    icon: Scale,
    color: '#34B9EE',
  },
  {
    type: 'programme',
    name: 'Programme de formation',
    description: 'Détails du contenu pédagogique',
    icon: Book,
    color: '#335ACF',
  },
  {
    type: 'certificat_realisation',
    name: 'Certificat de réalisation',
    description: 'Certificat de réalisation de formation (OF obligatoire)',
    icon: CheckCircle,
    color: '#335ACF',
  },
  {
    type: 'livret_accueil',
    name: 'Livret d\'accueil',
    description: 'Livret d\'accueil stagiaire (OF obligatoire)',
    icon: BookOpen,
    color: '#335ACF',
  },
  {
    type: 'emargement',
    name: 'Feuille d\'émargement',
    description: 'Feuille d\'émargement formation (OF obligatoire)',
    icon: CheckCircle2,
    color: '#335ACF',
  },
  {
    type: 'attestation_assiduite',
    name: 'Attestation d\'assiduité',
    description: 'Justificatif de présence aux cours',
    icon: CheckCircle,
    color: '#335ACF',
  },
]

export default function DocumentTemplatesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'configured' | 'not_configured'>('all')
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)

  // Récupérer tous les templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['document-templates', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return []
      return documentTemplateService.getAllTemplates(user.organization_id, { isActive: true })
    },
    enabled: !!user?.organization_id,
  })

  // Grouper les templates par type (tous les templates, pas seulement un par type)
  const templatesByType = useMemo(() => {
    if (!templates) return {} as Record<DocumentType, DocumentTemplate[]>
    
    return templates.reduce((acc, template) => {
      if (!acc[template.type]) {
        acc[template.type] = []
      }
      acc[template.type].push(template)
      return acc
    }, {} as Record<DocumentType, DocumentTemplate[]>)
  }, [templates])

  // Trier les templates dans chaque type : défaut en premier, puis par date de création
  const sortedTemplatesByType = useMemo(() => {
    const sorted: Record<DocumentType, DocumentTemplate[]> = {} as Record<DocumentType, DocumentTemplate[]>
    
    Object.entries(templatesByType).forEach(([type, templatesList]) => {
      sorted[type as DocumentType] = [...(templatesList as DocumentTemplate[])].sort((a, b) => {
        // Modèle par défaut en premier
        if (a.is_default && !b.is_default) return -1
        if (!a.is_default && b.is_default) return 1
        // Sinon par date de création (plus récent en premier)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    })
    
    return sorted
  }, [templatesByType])

  // Mutation pour définir comme défaut
  const setAsDefaultMutation = useMutation({
    mutationFn: async (template: DocumentTemplate) => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')
      return documentTemplateService.setAsDefault(template.id, user.organization_id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates', user?.organization_id] })
      queryClient.invalidateQueries({ queryKey: ['document-templates-by-type', user?.organization_id] })
    },
    onError: (error) => {
      logger.error('Erreur lors de la définition du modèle par défaut:', error)
      alert('Erreur lors de la définition du modèle par défaut')
    },
  })

  // Filtrer les types selon la recherche et le statut
  const filteredTypes = DOCUMENT_TYPES.filter((docType) => {
    const matchesSearch =
      docType.name.toLowerCase().includes(search.toLowerCase()) ||
      docType.description.toLowerCase().includes(search.toLowerCase())

    const typeTemplates = sortedTemplatesByType[docType.type] || []
    const isConfigured = typeTemplates.length > 0

    if (statusFilter === 'configured' && !isConfigured) return false
    if (statusFilter === 'not_configured' && isConfigured) return false

    return matchesSearch
  })

  const handleDuplicate = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setDuplicateDialogOpen(true)
  }

  const handleRename = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setRenameDialogOpen(true)
  }

  const handleDelete = (template: DocumentTemplate) => {
    setSelectedTemplate(template)
    setDeleteDialogOpen(true)
  }

  const handleSetAsDefault = (template: DocumentTemplate) => {
    setAsDefaultMutation.mutate(template)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Modèles de Documents</h1>
            <p className="text-text-tertiary mt-1">Gérez vos modèles de documents administratifs</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-3 bg-gray-200 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
            <Settings className="h-8 w-8 text-brand-blue" />
            Modèles de Documents
          </h1>
          <p className="text-text-tertiary mt-1">Gérez vos modèles de documents avec header et footer personnalisables</p>
        </div>
      </div>

      {/* Analytics Link */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Analytics & Reporting</h3>
              <p className="text-sm text-gray-600">Consultez les métriques d'utilisation de vos templates</p>
            </div>
            <Link href="/dashboard/settings/document-templates/analytics">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Voir les analytics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary h-4 w-4" />
              <Input
                placeholder="Rechercher un modèle..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('all')}
              >
                <Filter className="h-4 w-4 mr-2" />
                Tous
              </Button>
              <Button
                variant={statusFilter === 'configured' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('configured')}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Configurés
              </Button>
              <Button
                variant={statusFilter === 'not_configured' ? 'default' : 'outline'}
                onClick={() => setStatusFilter('not_configured')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Non configurés
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates avec Accordéons */}
      <Card>
        <CardContent className="p-0">
          <Accordion type="multiple" defaultValue={[]}>
            {filteredTypes.map((docType) => {
              const typeTemplates = sortedTemplatesByType[docType.type] || []
              const Icon = docType.icon
              const isConfigured = typeTemplates.length > 0
              const defaultTemplate = typeTemplates.find(t => t.is_default)

              return (
                <AccordionItem key={docType.type} value={docType.type}>
                  <AccordionTrigger className="px-6 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${docType.color}15` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: docType.color }} />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-lg">{docType.name}</div>
                          <div className="text-sm text-text-tertiary">{docType.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={isConfigured ? 'success' : 'secondary'}
                        >
                          {isConfigured ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {typeTemplates.length} modèle{typeTemplates.length > 1 ? 's' : ''}
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Aucun modèle
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="px-6 pb-4 space-y-3">
                      {typeTemplates.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-text-tertiary mb-4">Aucun modèle configuré pour ce type de document</p>
                          <Link href={`/dashboard/settings/document-templates/${docType.type}/edit`}>
                            <Button>
                              <Plus className="h-4 w-4 mr-2" />
                              Créer un modèle
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <>
                          {typeTemplates.map((template) => (
                            <Card key={template.id} className="border-l-4" style={{ borderLeftColor: docType.color }}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold">{template.name}</h4>
                                      {template.is_default && (
                                        <Badge variant="default" className="text-xs">
                                          <Star className="h-3 w-3 mr-1 fill-current" />
                                          Par défaut
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-text-tertiary space-y-1">
                                      <div>
                                        <span className="font-medium">Modifié:</span>{' '}
                                        {formatDate(template.updated_at)}
                                      </div>
                                      <div>
                                        <span className="font-medium">Créé:</span>{' '}
                                        {formatDate(template.created_at)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Link href={`/dashboard/settings/document-templates/${docType.type}/edit?template_id=${template.id}`} className="no-underline">
                                      <Button variant="default" size="sm">
                                        <Edit className="h-4 w-4 mr-2" />
                                        Modifier
                                      </Button>
                                    </Link>
                                    <Link href={`/dashboard/settings/document-templates/${docType.type}/preview?template_id=${template.id}`} className="no-underline">
                                      <Button variant="outline" size="sm">
                                        <Eye className="h-4 w-4 mr-2" />
                                        Aperçu
                                      </Button>
                                    </Link>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleRename(template)}>
                                          <Pencil className="h-4 w-4 mr-2" />
                                          Renommer
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                                          <Copy className="h-4 w-4 mr-2" />
                                          Dupliquer
                                        </DropdownMenuItem>
                                        {!template.is_default && (
                                          <DropdownMenuItem 
                                            onClick={() => handleSetAsDefault(template)}
                                            disabled={setAsDefaultMutation.isPending}
                                          >
                                            <Star className="h-4 w-4 mr-2" />
                                            Définir par défaut
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem>
                                          <Link 
                                            href={`/dashboard/settings/document-templates/${docType.type}/analytics?template_id=${template.id}`}
                                            className="flex items-center"
                                          >
                                            <BarChart3 className="h-4 w-4 mr-2" />
                                            Analytics
                                          </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                          onClick={() => handleDelete(template)}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Supprimer
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                          <div className="pt-2">
                            <Link href={`/dashboard/settings/document-templates/${docType.type}/edit`}>
                              <Button variant="outline" className="w-full">
                                <Plus className="h-4 w-4 mr-2" />
                                Créer un nouveau modèle
                              </Button>
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      {filteredTypes.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Aucun modèle trouvé
            </h3>
            <p className="text-text-tertiary">
              Essayez de modifier vos critères de recherche ou de filtre
            </p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {selectedTemplate && (
        <>
          <DuplicateDialog
            template={selectedTemplate}
            open={duplicateDialogOpen}
            onOpenChange={setDuplicateDialogOpen}
          />
          <RenameDialog
            template={selectedTemplate}
            open={renameDialogOpen}
            onOpenChange={setRenameDialogOpen}
          />
          <DeleteDialog
            template={selectedTemplate}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
          />
        </>
      )}
    </div>
  )
}

