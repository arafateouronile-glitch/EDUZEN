'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Copy, Plus, Check } from 'lucide-react'
import type { DocumentType } from '@/lib/types/document-templates'
import { logger, sanitizeError } from '@/lib/utils/logger'

interface TemplateSelectorProps {
  documentType: DocumentType | string
  selectedTemplateId?: string
  onTemplateSelect: (templateId: string) => void
  onCreateNew?: () => void
  onDuplicate?: (templateId: string) => void
}

export function TemplateSelector({
  documentType,
  selectedTemplateId,
  onTemplateSelect,
  onCreateNew,
  onDuplicate,
}: TemplateSelectorProps) {
  const { user } = useAuth()
  const [showAll, setShowAll] = useState(false)

  // Récupérer tous les templates du type sélectionné
  const { data: templates, isLoading } = useQuery({
    queryKey: ['document-templates-by-type', user?.organization_id, documentType],
    queryFn: async () => {
      if (!user?.organization_id || !documentType) return []
      try {
        return await documentTemplateService.getTemplatesByType(
          documentType as DocumentType,
          user.organization_id
        )
      } catch (error) {
        logger.error('Erreur lors de la récupération des templates:', error)
        return []
      }
    },
    enabled: !!user?.organization_id && !!documentType,
  })

  const activeTemplates = templates?.filter((t) => t.is_active) || []
  const defaultTemplate = activeTemplates.find((t) => t.is_default)
  const otherTemplates = activeTemplates.filter((t) => !t.is_default)

  const displayedTemplates = showAll ? activeTemplates : [defaultTemplate, ...otherTemplates.slice(0, 2)].filter(Boolean)

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-gray-500">Chargement des modèles...</div>
        </CardContent>
      </Card>
    )
  }

  if (!activeTemplates || activeTemplates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Modèle de document</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-500 mb-4">
            Aucun modèle disponible pour ce type de document.
          </div>
          {onCreateNew && (
            <Button onClick={onCreateNew} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Créer un modèle
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Modèle de document</CardTitle>
          {onCreateNew && (
            <Button onClick={onCreateNew} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="template-select">Sélectionner un modèle</Label>
          <Select
            value={selectedTemplateId || defaultTemplate?.id || ''}
            onValueChange={onTemplateSelect}
          >
            <SelectTrigger id="template-select" className="mt-2">
              <SelectValue placeholder="Choisir un modèle" />
            </SelectTrigger>
            <SelectContent>
              {activeTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{template.name}</span>
                      {template.is_default && (
                        <span className="text-xs text-primary font-medium">(Par défaut)</span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Liste des templates avec actions */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Modèles disponibles</div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {displayedTemplates.map((template) => (
              <div
                key={template.id}
                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                  selectedTemplateId === template.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{template.name}</span>
                      {template.is_default && (
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                          Par défaut
                        </span>
                      )}
                      {selectedTemplateId === template.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Modifié le {new Date(template.updated_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTemplateId !== template.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTemplateSelect(template.id)}
                    >
                      Sélectionner
                    </Button>
                  )}
                  {onDuplicate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDuplicate(template.id)}
                      title="Dupliquer ce modèle"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {activeTemplates.length > displayedTemplates.length && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="w-full"
            >
              {showAll
                ? `Afficher moins (${activeTemplates.length - 3} autres)`
                : `Afficher tous les modèles (${activeTemplates.length - displayedTemplates.length} autres)`}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

