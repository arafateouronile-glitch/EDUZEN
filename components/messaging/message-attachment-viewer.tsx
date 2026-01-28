'use client'

import { File, Image as ImageIcon, FileText, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logger, sanitizeError } from '@/lib/utils/logger'

interface Attachment {
  url?: string // URL signée (pour compatibilité avec anciens messages)
  path?: string // Chemin du fichier dans le bucket (nouveau format)
  filename: string
  type: string
  size?: number
}

interface MessageAttachmentViewerProps {
  attachments: Attachment[]
  className?: string
}

export function MessageAttachmentViewer({ attachments, className }: MessageAttachmentViewerProps) {
  const [attachmentUrls, setAttachmentUrls] = useState<Record<number, string>>({})

  // Générer les URLs signées pour les pièces jointes qui ont un path
  useEffect(() => {
    const generateUrls = async () => {
      const supabase = createClient()
      const urlPromises = attachments.map(async (attachment, index) => {
        // Si on a déjà une URL (ancien format), l'utiliser
        if (attachment.url) {
          return { index, url: attachment.url }
        }
        
        // Sinon, générer une URL signée à partir du path
        if (attachment.path) {
          try {
            const { data, error } = await supabase.storage
              .from('messages')
              .createSignedUrl(attachment.path, 3600)
            
            if (error) {
              logger.error('Erreur génération URL pièce jointe:', error)
              return { index, url: null }
            }
            
            return { index, url: data.signedUrl }
          } catch (error) {
            logger.error('Exception génération URL pièce jointe:', error)
            return { index, url: null }
          }
        }
        
        return { index, url: null }
      })

      const results = await Promise.all(urlPromises)
      const urls: Record<number, string> = {}
      results.forEach(({ index, url }) => {
        if (url) urls[index] = url
      })
      setAttachmentUrls(urls)
    }

    if (attachments && attachments.length > 0) {
      generateUrls()
    }
  }, [attachments])

  if (!attachments || attachments.length === 0) return null

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />
    }
    if (type === 'application/pdf') {
      return <FileText className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownload = (attachment: Attachment, index: number) => {
    // Utiliser l'URL générée si disponible, sinon l'URL stockée (ancien format)
    const url = attachmentUrls[index] || attachment.url
    if (url) {
      window.open(url, '_blank')
    } else {
      logger.error('URL non disponible pour la pièce jointe:', attachment)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {attachments.map((attachment, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
        >
          {/* Icône */}
          <div className="flex-shrink-0 w-10 h-10 rounded border flex items-center justify-center bg-muted">
            {getFileIcon(attachment.type)}
          </div>

          {/* Informations du fichier */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.filename}</p>
            {attachment.size && (
              <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
            )}
          </div>

          {/* Bouton de téléchargement */}
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8"
            onClick={() => handleDownload(attachment, index)}
            title="Télécharger"
            disabled={!attachmentUrls[index] && !attachment.url}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}

