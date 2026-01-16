'use client'

import { useState } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Droplet, 
  X, 
  CheckCircle,
  Upload,
  Type,
  Layers
} from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

interface WatermarkOptions {
  text?: string
  imageUrl?: string
  opacity: number
  rotation: number
  fontSize?: string
  color: string
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  repeat: boolean
}

interface WatermarkEditorProps {
  onInsert: (watermarkHTML: string) => void
  onClose: () => void
}

export function WatermarkEditor({ onInsert, onClose }: WatermarkEditorProps) {
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text')
  const [options, setOptions] = useState<WatermarkOptions>({
    text: 'CONFIDENTIEL',
    opacity: 0.1,
    rotation: -45,
    fontSize: '48pt',
    color: '#000000',
    position: 'center',
    repeat: false,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string)
        setOptions({ ...options, imageUrl: event.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const generateWatermarkHTML = (): string => {
    if (watermarkType === 'text' && options.text) {
      const positionStyles: Record<string, string> = {
        'center': 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(' + options.rotation + 'deg);',
        'top-left': 'position: fixed; top: 20%; left: 20%; transform: rotate(' + options.rotation + 'deg);',
        'top-right': 'position: fixed; top: 20%; right: 20%; transform: rotate(' + options.rotation + 'deg);',
        'bottom-left': 'position: fixed; bottom: 20%; left: 20%; transform: rotate(' + options.rotation + 'deg);',
        'bottom-right': 'position: fixed; bottom: 20%; right: 20%; transform: rotate(' + options.rotation + 'deg);',
      }

      const style = [
        positionStyles[options.position],
        `opacity: ${options.opacity}`,
        `font-size: ${options.fontSize || '48pt'}`,
        `color: ${options.color}`,
        'font-weight: bold',
        'pointer-events: none',
        'z-index: 1000',
        'user-select: none',
        options.repeat ? 'background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px);' : '',
      ].filter(Boolean).join('; ')

      if (options.repeat) {
        // Filigrane répété sur toute la page
        return `
          <div class="watermark" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1000; overflow: hidden;">
            <div style="position: absolute; top: 0; left: 0; width: 200%; height: 200%; transform: rotate(${options.rotation}deg); transform-origin: center;">
              ${Array.from({ length: 20 }, (_, i) => 
                Array.from({ length: 10 }, (_, j) => 
                  `<div style="position: absolute; top: ${i * 15}%; left: ${j * 10}%; opacity: ${options.opacity}; font-size: ${options.fontSize || '48pt'}; color: ${options.color}; font-weight: bold; white-space: nowrap;">${options.text}</div>`
                ).join('')
              ).join('')}
            </div>
          </div>
        `
      } else {
        // Filigrane unique
        return `<div class="watermark" style="${style}">${options.text}</div>`
      }
    } else if (watermarkType === 'image' && options.imageUrl) {
      const positionStyles: Record<string, string> = {
        'center': 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(' + options.rotation + 'deg);',
        'top-left': 'position: fixed; top: 20%; left: 20%; transform: rotate(' + options.rotation + 'deg);',
        'top-right': 'position: fixed; top: 20%; right: 20%; transform: rotate(' + options.rotation + 'deg);',
        'bottom-left': 'position: fixed; bottom: 20%; left: 20%; transform: rotate(' + options.rotation + 'deg);',
        'bottom-right': 'position: fixed; bottom: 20%; right: 20%; transform: rotate(' + options.rotation + 'deg);',
      }

      const style = [
        positionStyles[options.position],
        `opacity: ${options.opacity}`,
        'pointer-events: none',
        'z-index: 1000',
        'user-select: none',
        'max-width: 300px',
        'max-height: 300px',
      ].filter(Boolean).join('; ')

      return `<img class="watermark" src="${options.imageUrl}" style="${style}" alt="Watermark" />`
    }
    return ''
  }

  const handleInsert = () => {
    const html = generateWatermarkHTML()
    if (html) {
      onInsert(html)
      onClose()
    }
  }

  return (
    <GlassCard variant="premium" className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Droplet className="h-5 w-5 text-brand-blue" />
          <h2 className="text-xl font-semibold">Filigrane (Watermark)</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Type de filigrane */}
        <div>
          <Label className="mb-3 block">Type de filigrane</Label>
          <div className="flex gap-2">
            <Button
              variant={watermarkType === 'text' ? 'default' : 'outline'}
              onClick={() => setWatermarkType('text')}
              className="flex-1"
            >
              <Type className="h-4 w-4 mr-2" />
              Texte
            </Button>
            <Button
              variant={watermarkType === 'image' ? 'default' : 'outline'}
              onClick={() => setWatermarkType('image')}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Image
            </Button>
          </div>
        </div>

        {/* Configuration texte */}
        {watermarkType === 'text' && (
          <div className="space-y-4">
            <div>
              <Label>Texte du filigrane</Label>
              <Input
                value={options.text}
                onChange={(e) => setOptions({ ...options, text: e.target.value })}
                placeholder="Ex: CONFIDENTIEL, DRAFT, etc."
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Taille de police</Label>
                <Input
                  value={options.fontSize}
                  onChange={(e) => setOptions({ ...options, fontSize: e.target.value })}
                  placeholder="48pt"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Couleur</Label>
                <Input
                  type="color"
                  value={options.color}
                  onChange={(e) => setOptions({ ...options, color: e.target.value })}
                  className="mt-1 h-10"
                />
              </div>
            </div>
          </div>
        )}

        {/* Configuration image */}
        {watermarkType === 'image' && (
          <div className="space-y-4">
            <div>
              <Label>Image du filigrane</Label>
              <div className="mt-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="watermark-image-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('watermark-image-upload')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {imagePreview ? 'Changer l\'image' : 'Choisir une image'}
                </Button>
              </div>
              {imagePreview && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full max-h-48 mx-auto rounded"
                    style={{ opacity: options.opacity }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Options communes */}
        <div className="space-y-4">
          <div>
            <Label className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Opacité: {Math.round(options.opacity * 100)}%
            </Label>
            <Input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={options.opacity}
              onChange={(e) => setOptions({ ...options, opacity: parseFloat(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Rotation: {options.rotation}°</Label>
            <Input
              type="range"
              min="-180"
              max="180"
              step="15"
              value={options.rotation}
              onChange={(e) => setOptions({ ...options, rotation: parseInt(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Position</Label>
            <select
              value={options.position}
              onChange={(e) => setOptions({ ...options, position: e.target.value as any })}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            >
              <option value="center">Centre</option>
              <option value="top-left">Haut gauche</option>
              <option value="top-right">Haut droite</option>
              <option value="bottom-left">Bas gauche</option>
              <option value="bottom-right">Bas droite</option>
            </select>
          </div>
          {watermarkType === 'text' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="repeat-watermark"
                checked={options.repeat}
                onChange={(e) => setOptions({ ...options, repeat: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="repeat-watermark" className="cursor-pointer">
                Répéter le filigrane sur toute la page
              </Label>
            </div>
          )}
        </div>

        {/* Aperçu */}
        <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 relative" style={{ minHeight: '200px' }}>
          <div className="text-sm text-gray-600 mb-2">Aperçu:</div>
          <div dangerouslySetInnerHTML={{ __html: generateWatermarkHTML() }} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleInsert}
            disabled={watermarkType === 'text' && !options.text || watermarkType === 'image' && !options.imageUrl}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Insérer le filigrane
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}
