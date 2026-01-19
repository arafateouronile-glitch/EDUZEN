'use client'

import { useState } from 'react'
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
import { Copy } from 'lucide-react'

interface DuplicateDialogProps {
  template: DocumentTemplate
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DuplicateDialog({ template, open, onOpenChange }: DuplicateDialogProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState(`${template.name} (copie)`)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const duplicateMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user?.organization_id) throw new Error('Organisation non trouvée')
      return documentTemplateService.duplicateTemplate(template.id, name)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates', user?.organization_id] })
      queryClient.invalidateQueries({ queryKey: ['document-templates-by-type', user?.organization_id] })
      onOpenChange(false)
      setNewName(`${template.name} (copie)`)
    },
    onError: (error) => {
      console.error('Erreur lors de la duplication:', error)
      alert('Erreur lors de la duplication du modèle')
    },
  })

  const handleDuplicate = async () => {
    if (!newName.trim()) {
      alert('Veuillez entrer un nom pour le modèle dupliqué')
      return
    }

    setIsDuplicating(true)
    try {
      await duplicateMutation.mutateAsync(newName.trim())
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Dupliquer le modèle
          </DialogTitle>
          <DialogDescription>
            Créez une copie du modèle "{template.name}" que vous pourrez modifier indépendamment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="template-name">Nom du nouveau modèle</Label>
            <Input
              id="template-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom du modèle"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleDuplicate()
                }
              }}
            />
          </div>
          <div className="text-sm text-gray-500">
            <p className="font-medium mb-1">Informations du modèle original :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Type : {template.type}</li>
              <li>Modifié le : {new Date(template.updated_at).toLocaleDateString('fr-FR')}</li>
              {template.is_default && <li className="text-primary font-medium">Modèle par défaut</li>}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDuplicating}>
            Annuler
          </Button>
          <Button onClick={handleDuplicate} disabled={isDuplicating || !newName.trim()}>
            {isDuplicating ? 'Duplication...' : 'Dupliquer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
