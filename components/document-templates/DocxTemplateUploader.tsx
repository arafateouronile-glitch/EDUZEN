'use client'

import React, { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileText, 
  Check, 
  X, 
  ExternalLink, 
  Trash2, 
  HelpCircle,
  Download 
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface DocxTemplateUploaderProps {
  templateId: string
  currentDocxUrl?: string | null
  onUploadSuccess?: (url: string) => void
  onRemoveSuccess?: () => void
}

/**
 * Composant pour uploader un template DOCX natif
 * Permet d'avoir une génération Word fidèle au template
 */
export function DocxTemplateUploader({
  templateId,
  currentDocxUrl,
  onUploadSuccess,
  onRemoveSuccess,
}: DocxTemplateUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0])
    }
  }

  const uploadFile = async (file: File) => {
    // Vérifier le type de fichier
    if (!file.name.endsWith('.docx')) {
      toast.error('Le fichier doit être un document Word (.docx)')
      return
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier est trop volumineux (max 10MB)')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('templateId', templateId)

      const response = await fetch('/api/documents/upload-docx-template', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de l\'upload')
      }

      toast.success('Template DOCX uploadé avec succès')
      onUploadSuccess?.(result.docxTemplateUrl)
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'upload')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer le template DOCX ?')) {
      return
    }

    setIsRemoving(true)

    try {
      // Mettre à jour le template pour supprimer l'URL
      const response = await fetch(`/api/document-templates/${templateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          docx_template_url: null,
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      toast.success('Template DOCX supprimé')
      onRemoveSuccess?.()
    } catch (error) {
      console.error('Erreur suppression:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <CardTitle className="text-lg">Template Word Natif (DOCX)</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Uploadez un template Word (.docx) pour une génération fidèle au design.
                  Utilisez des balises {'{variable}'} dans le document pour les variables dynamiques.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription>
          Pour une génération Word parfaite, uploadez un template DOCX avec des balises {'{variable}'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {currentDocxUrl ? (
          // Template DOCX existant
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Un template DOCX est configuré. Les documents Word seront générés avec une fidélité parfaite.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium">Template DOCX</p>
                  <p className="text-sm text-muted-foreground">
                    Fichier uploadé
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(currentDocxUrl, '_blank')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Remplacer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isRemoving}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Zone de drop pour uploader
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              ${isUploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-primary/50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="font-medium mb-1">
              {isUploading ? 'Upload en cours...' : 'Glissez-déposez votre template DOCX ici'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ou cliquez pour sélectionner un fichier
            </p>
            <p className="text-xs text-muted-foreground">
              Format accepté : .docx (max 10MB)
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Lien vers le guide */}
        <div className="mt-4 pt-4 border-t">
          <a
            href="/docs/DOCX_TEMPLATE_GUIDE.md"
            target="_blank"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Guide de création de templates DOCX
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
