'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X } from 'lucide-react'

interface QuickTemplatesProps {
  onInsert: (html: string) => void
  onClose: () => void
}

export function QuickTemplates({ onInsert, onClose }: QuickTemplatesProps) {
  const templates = [
    {
      name: 'Section simple',
      html: '<div style="padding: 20px; margin-bottom: 20px;"><h2>Titre de section</h2><p>Contenu de la section...</p></div>',
    },
    {
      name: 'Tableau',
      html: '<table style="width: 100%; border-collapse: collapse;"><tr><th style="border: 1px solid #ddd; padding: 8px;">Colonne 1</th><th style="border: 1px solid #ddd; padding: 8px;">Colonne 2</th></tr><tr><td style="border: 1px solid #ddd; padding: 8px;">Donnée 1</td><td style="border: 1px solid #ddd; padding: 8px;">Donnée 2</td></tr></table>',
    },
    {
      name: 'Liste à puces',
      html: '<ul style="margin-left: 20px;"><li>Élément 1</li><li>Élément 2</li><li>Élément 3</li></ul>',
    },
    {
      name: 'Liste numérotée',
      html: '<ol style="margin-left: 20px;"><li>Premier élément</li><li>Deuxième élément</li><li>Troisième élément</li></ol>',
    },
  ]

  return (
    <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Modèles rapides</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((template, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start text-left"
              onClick={() => {
                onInsert(template.html)
                onClose()
              }}
            >
              <div className="font-semibold mb-2">{template.name}</div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {template.html.replace(/<[^>]*>/g, '').substring(0, 50)}...
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
