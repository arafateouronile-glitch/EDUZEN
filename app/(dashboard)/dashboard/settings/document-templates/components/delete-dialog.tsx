'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { documentTemplateService } from '@/lib/services/document-template.service.client'
import { useAuth } from '@/lib/hooks/use-auth'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { logger, sanitizeError } from '@/lib/utils/logger'

interface DeleteDialogProps {
  template: DocumentTemplate
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteDialog({ template, open, onOpenChange }: DeleteDialogProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return documentTemplateService.deleteTemplate(template.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates', user?.organization_id] })
      queryClient.invalidateQueries({ queryKey: ['document-templates-by-type', user?.organization_id] })
      onOpenChange(false)
    },
    onError: (error) => {
      logger.error('Erreur lors de la suppression:', error)
      alert('Erreur lors de la suppression du modèle')
    },
  })

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync()
    } catch (error) {
      // L'erreur est déjà gérée dans onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Supprimer le modèle
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer le modèle "{template.name}" ?
            Cette action est irréversible.
            {template.is_default && (
              <span className="block mt-2 text-amber-600 font-medium">
                ⚠️ Ce modèle est actuellement défini comme modèle par défaut. 
                La suppression supprimera cette configuration.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteMutation.isPending}>
            Annuler
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



