'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Settings } from 'lucide-react'
import type { DocumentTemplate } from '@/lib/types/document-templates'

interface DocumentSettingsProps {
  template: DocumentTemplate
  onTemplateChange: (updates: Partial<DocumentTemplate>) => void
}

export function DocumentSettings({ template, onTemplateChange }: DocumentSettingsProps) {
  const [fontSize, setFontSize] = useState(template.font_size || 10)

  const handleFontSizeChange = (value: number[]) => {
    const newSize = value[0]
    setFontSize(newSize)
    onTemplateChange({ font_size: newSize })
  }

  const handleFontSizeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value) && value >= 6 && value <= 24) {
      setFontSize(value)
      onTemplateChange({ font_size: value })
    }
  }

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Paramètres du document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="font-size" className="text-sm font-medium">
              Taille de police par défaut
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="font-size"
                type="number"
                min="6"
                max="24"
                step="0.5"
                value={fontSize}
                onChange={handleFontSizeInputChange}
                className="w-16 h-8 text-sm text-center"
              />
              <span className="text-sm text-gray-500">pt</span>
            </div>
          </div>
          <Slider
            value={[fontSize]}
            onValueChange={handleFontSizeChange}
            min={6}
            max={24}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>6pt</span>
            <span>12pt</span>
            <span>18pt</span>
            <span>24pt</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Cette taille sera appliquée à tout le contenu du document par défaut.
            Vous pouvez toujours modifier la taille de police individuellement dans l'éditeur.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}




