'use client'

import { useState, useRef } from 'react'
import { Paperclip, X, File, Image as ImageIcon, FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface AttachmentFile {
  file: File
  id: string
  preview?: string
}

interface MessageAttachmentsProps {
  attachments: AttachmentFile[]
  onAttachmentsChange: (attachments: AttachmentFile[]) => void
  onRemove: (id: string) => void
  disabled?: boolean
}

export function MessageAttachments({
  attachments,
  onAttachmentsChange,
  onRemove,
  disabled = false,
}: MessageAttachmentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newAttachments: AttachmentFile[] = Array.from(files).map((file) => {
      const id = Math.random().toString(36).substring(7)
      let preview: string | undefined

      // Créer une preview pour les images
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      return {
        file,
        id,
        preview,
      }
    })

    onAttachmentsChange([...attachments, ...newAttachments])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    }
    if (file.type === 'application/pdf') {
      return <FileText className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-2">
      {/* Zone de drop et bouton d'ajout */}
      {attachments.length === 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={disabled}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="mx-auto"
          >
            <Paperclip className="h-4 w-4 mr-2" />
            Joindre des fichiers
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Glissez-déposez des fichiers ici ou cliquez pour sélectionner
          </p>
        </div>
      )}

      {/* Liste des fichiers attachés */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              {attachments.length} fichier{attachments.length > 1 ? 's' : ''} attaché{attachments.length > 1 ? 's' : ''}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
            >
              <Paperclip className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
            disabled={disabled}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          />

          <div className="grid grid-cols-1 gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-2 border rounded-lg bg-muted/50"
              >
                {/* Preview pour les images */}
                {attachment.preview && (
                  <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border">
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Icône pour les autres fichiers */}
                {!attachment.preview && (
                  <div className="flex-shrink-0 w-12 h-12 rounded border flex items-center justify-center bg-background">
                    {getFileIcon(attachment.file)}
                  </div>
                )}

                {/* Informations du fichier */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file.size)}</p>
                </div>

                {/* Bouton de suppression */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-8 w-8"
                  onClick={() => {
                    if (attachment.preview) {
                      URL.revokeObjectURL(attachment.preview)
                    }
                    onRemove(attachment.id)
                  }}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



