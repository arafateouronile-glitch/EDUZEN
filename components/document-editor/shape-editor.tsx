'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GlassCard } from '@/components/ui/glass-card'
import { 
  Square, 
  Circle, 
  Minus, 
  Triangle,
  X,
  Palette,
  Move,
  RotateCw
} from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

type ShapeType = 'rectangle' | 'circle' | 'line' | 'triangle'

interface ShapeStyle {
  fillColor: string
  strokeColor: string
  strokeWidth: number
  opacity: number
  width: number
  height: number
}

interface ShapeEditorProps {
  onInsert: (shapeHTML: string) => void
  onClose: () => void
}

export function ShapeEditor({ onInsert, onClose }: ShapeEditorProps) {
  const [shapeType, setShapeType] = useState<ShapeType>('rectangle')
  const [style, setStyle] = useState<ShapeStyle>({
    fillColor: '#335ACF',
    strokeColor: '#1e3a8a',
    strokeWidth: 2,
    opacity: 1,
    width: 200,
    height: 100,
  })

  const generateShapeHTML = () => {
    // Tiptap peut avoir des problèmes avec les styles inline complexes
    // Utiliser une approche avec une image base64 ou un div avec data-attribute
    if (shapeType === 'line') {
      // Pour une ligne, utiliser un hr stylisé
      return `<hr style="width: ${style.width}px; height: ${style.strokeWidth}px; background-color: ${style.strokeColor}; margin: 16px 0; padding: 0; border: none; opacity: ${style.opacity};" />`
    }
    
    // Pour les autres formes, créer une image SVG en base64 ou utiliser un div avec classe
    const borderRadius = shapeType === 'circle' ? '50%' : shapeType === 'triangle' ? '0' : '0'
    const clipPath = shapeType === 'triangle' 
      ? `clip-path: polygon(50% 0%, 0% 100%, 100% 100%);` 
      : ''
    
    // Créer un SVG en base64 pour une meilleure compatibilité
    let svgContent = ''
    if (shapeType === 'circle') {
      const radius = Math.min(style.width, style.height) / 2
      svgContent = `<circle cx="${style.width/2}" cy="${style.height/2}" r="${radius}" fill="${style.fillColor}" stroke="${style.strokeColor}" stroke-width="${style.strokeWidth}" opacity="${style.opacity}" />`
    } else if (shapeType === 'triangle') {
      svgContent = `<polygon points="${style.width/2},0 ${style.width},${style.height} 0,${style.height}" fill="${style.fillColor}" stroke="${style.strokeColor}" stroke-width="${style.strokeWidth}" opacity="${style.opacity}" />`
    } else {
      svgContent = `<rect width="${style.width}" height="${style.height}" fill="${style.fillColor}" stroke="${style.strokeColor}" stroke-width="${style.strokeWidth}" rx="${borderRadius === '50%' ? style.width/2 : 0}" opacity="${style.opacity}" />`
    }
    
    const svg = `<svg width="${style.width}" height="${style.height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${style.width} ${style.height}">${svgContent}</svg>`
    
    // Convertir le SVG en data URL (utiliser encodeURIComponent pour éviter les problèmes)
    const svgEncoded = encodeURIComponent(svg)
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${svgEncoded}`
    
    // Utiliser une image au lieu d'un paragraphe pour une meilleure compatibilité
    // Tiptap Image extension devrait accepter les images avec data URLs
    return `<p><img src="${svgDataUrl}" alt="Shape" width="${style.width}" height="${style.height}" /></p>`
  }

  const handleInsert = () => {
    const html = generateShapeHTML()
    console.log('Shape HTML généré:', html, 'Type:', shapeType)
    if (html && html.trim()) {
      try {
        onInsert(html)
        // Attendre un peu avant de fermer pour s'assurer que l'insertion est terminée
        setTimeout(() => {
          onClose()
        }, 100)
      } catch (error) {
        console.error('Erreur lors de l\'insertion de la forme:', error)
        alert('Erreur lors de l\'insertion de la forme. Veuillez réessayer.')
      }
    } else {
      console.error('Aucun HTML généré pour la forme')
      alert('Impossible de générer la forme. Veuillez vérifier les paramètres.')
    }
  }

  const shapeIcons = {
    rectangle: Square,
    circle: Circle,
    line: Minus,
    triangle: Triangle,
  }

  return (
    <GlassCard variant="premium" className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <CardTitle className="flex items-center gap-2">
          <Square className="h-5 w-5 text-brand-blue" />
          Éditeur de forme
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Shape Type Selection */}
        <div>
          <Label className="mb-3 block">Type de forme</Label>
          <div className="grid grid-cols-4 gap-3">
            {(['rectangle', 'circle', 'line', 'triangle'] as ShapeType[]).map((type) => {
              const Icon = shapeIcons[type]
              return (
                <motion.button
                  key={type}
                  onClick={() => setShapeType(type)}
                  className={cn(
                    'p-4 border-2 rounded-lg transition-all',
                    shapeType === type
                      ? 'border-brand-blue bg-brand-blue-ghost'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2" />
                  <span className="text-xs capitalize">{type}</span>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="width">Largeur (px)</Label>
            <Input
              id="width"
              type="number"
              min="10"
              max="1000"
              value={style.width}
              onChange={(e) => setStyle({ ...style, width: parseInt(e.target.value) || 100 })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="height">Hauteur (px)</Label>
            <Input
              id="height"
              type="number"
              min="10"
              max="1000"
              value={style.height}
              onChange={(e) => setStyle({ ...style, height: parseInt(e.target.value) || 100 })}
              className="mt-1"
            />
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fillColor">Couleur de remplissage</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="fillColor"
                type="color"
                value={style.fillColor}
                onChange={(e) => setStyle({ ...style, fillColor: e.target.value })}
                className="h-10 w-20"
              />
              <Input
                type="text"
                value={style.fillColor}
                onChange={(e) => setStyle({ ...style, fillColor: e.target.value })}
                className="flex-1"
                placeholder="#335ACF"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="strokeColor">Couleur du contour</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="strokeColor"
                type="color"
                value={style.strokeColor}
                onChange={(e) => setStyle({ ...style, strokeColor: e.target.value })}
                className="h-10 w-20"
              />
              <Input
                type="text"
                value={style.strokeColor}
                onChange={(e) => setStyle({ ...style, strokeColor: e.target.value })}
                className="flex-1"
                placeholder="#1e3a8a"
              />
            </div>
          </div>
        </div>

        {/* Stroke Width & Opacity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="strokeWidth">Épaisseur du contour</Label>
            <Input
              id="strokeWidth"
              type="number"
              min="0"
              max="20"
              value={style.strokeWidth}
              onChange={(e) => setStyle({ ...style, strokeWidth: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="opacity">Opacité (0-1)</Label>
            <Input
              id="opacity"
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={style.opacity}
              onChange={(e) => setStyle({ ...style, opacity: parseFloat(e.target.value) || 1 })}
              className="mt-1"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center min-h-[200px]">
          <div dangerouslySetInnerHTML={{ __html: generateShapeHTML() }} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleInsert}>
            Insérer la forme
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}
