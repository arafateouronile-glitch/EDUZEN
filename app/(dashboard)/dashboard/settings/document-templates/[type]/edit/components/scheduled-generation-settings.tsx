'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { DocumentTemplate } from '@/lib/types/document-templates'

interface ScheduledGenerationSettingsProps {
  template: DocumentTemplate
  onClose: () => void
}

export function ScheduledGenerationSettings({
  template,
  onClose,
}: ScheduledGenerationSettingsProps) {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Génération programmée</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">
          La fonctionnalité de génération programmée sera bientôt disponible.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </CardContent>
    </Card>
  )
}
