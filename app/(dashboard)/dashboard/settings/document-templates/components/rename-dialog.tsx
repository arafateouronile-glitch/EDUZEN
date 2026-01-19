'use client'

import { useState, useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit } from 'lucide-react'

interface RenameDialogProps {
  template: DocumentTemplate
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RenameDialog({ template, open, onOpenChange }: RenameDialogProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState(template.name)

  // Réinitialiser le nom quand le dialog s'ouvre ou que le template change
  useEffect(() => {
    if (open) {
      setNewName(template.name)
    }
  }, [open, template.name])

  const renameMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')
      return documentTemplateService.updateTemplate({
        id: template.id,
        name: name,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates', user?.organization_id] })
      queryClient.invalidateQueries({ queryKey: ['document-templates-by-type', user?.organization_id] })
      onOpenChange(false)
    },
    onError: (error) => {
      console.error('Erreur lors du renommage:', error)
      alert('Erreur lors du renommage du modèle')
    },
  })

  const handleRename = async () => {
    if (!newName.trim()) {
      alert('Veuillez entrer un nom pour le modèle')
      return
    }

    if (newName.trim() === template.name) {
      onOpenChange(false)
      return
    }

    try {
      await renameMutation.mutateAsync(newName.trim())
    } catch (error) {
      // L'erreur est déjà gérée dans onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Renommer le modèle
          </DialogTitle>
          <DialogDescription>
            Modifiez le nom du modèle "{template.name}".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="template-name">Nouveau nom du modèle</Label>
            <Input
              id="template-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du modèle"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename()
                }
              }}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={renameMutation.isPending}>
            Annuler
          </Button>
          <Button onClick={handleRename} disabled={renameMutation.isPending || !newName.trim()}>
            {renameMutation.isPending ? 'Renommage...' : 'Renommer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



