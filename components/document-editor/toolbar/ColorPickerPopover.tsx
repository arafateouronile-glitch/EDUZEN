'use client'

import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

// Couleurs prédéfinies pour le texte
const TEXT_COLORS = [
  // Ligne 1: Niveaux de gris
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#FFFFFF',
  // Ligne 2: Couleurs vives
  '#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#1ABC9C', '#3498DB', '#9B59B6', '#34495E',
  // Ligne 3: Couleurs pastel
  '#FADBD8', '#FAE5D3', '#FCF3CF', '#D5F5E3', '#D1F2EB', '#D6EAF8', '#EBDEF0', '#F2F3F4',
  // Ligne 4: Couleurs professionnelles
  '#1E40AF', '#335ACF', '#3B82F6', '#60A5FA', '#14B8A6', '#10B981', '#F59E0B', '#EF4444',
]

// Couleurs prédéfinies pour le surlignage
const HIGHLIGHT_COLORS = [
  '#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FFCCCC', '#CCFFCC',
  '#FFEB3B', '#8BC34A', '#03A9F4', '#E91E63', '#FF9800', '#9C27B0',
]

// Couleurs prédéfinies pour les fonds de cellule
const BACKGROUND_COLORS = [
  '#FFFFFF', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280',
  '#FEE2E2', '#FED7AA', '#FEF3C7', '#D1FAE5', '#CFFAFE', '#DBEAFE',
  '#E0E7FF', '#EDE9FE', '#FCE7F3', '#FFE4E6', '#ECFDF5', '#F0F9FF',
]

export interface ColorPickerPopoverProps {
  currentColor?: string | null
  onColorChange: (color: string) => void
  onRemove?: () => void
  type: 'text' | 'highlight' | 'background'
  trigger: React.ReactNode
  disabled?: boolean
}

export function ColorPickerPopover({
  currentColor,
  onColorChange,
  onRemove,
  type,
  trigger,
  disabled = false,
}: ColorPickerPopoverProps) {
  const [customColor, setCustomColor] = useState(currentColor || '#000000')
  const [isOpen, setIsOpen] = useState(false)

  // Sélectionner la palette appropriée
  const colors = type === 'highlight'
    ? HIGHLIGHT_COLORS
    : type === 'background'
      ? BACKGROUND_COLORS
      : TEXT_COLORS

  const title = type === 'text'
    ? 'Couleur du texte'
    : type === 'highlight'
      ? 'Surlignage'
      : 'Arrière-plan'

  const handleColorSelect = (color: string) => {
    onColorChange(color)
    setIsOpen(false)
  }

  const handleCustomColorApply = () => {
    onColorChange(customColor)
    setIsOpen(false)
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove()
      setIsOpen(false)
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-3">
          {/* Titre */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{title}</span>
            {currentColor && (
              <div
                className="w-5 h-5 rounded border border-gray-300"
                style={{ backgroundColor: currentColor }}
                title={`Couleur actuelle: ${currentColor}`}
              />
            )}
          </div>

          {/* Grille de couleurs */}
          <div className="grid grid-cols-8 gap-1">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`
                  w-6 h-6 rounded border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${currentColor === color ? 'ring-2 ring-blue-500 ring-offset-1' : 'border-gray-200'}
                  ${color === '#FFFFFF' ? 'border-gray-300' : ''}
                `}
                style={{ backgroundColor: color }}
                title={color}
                type="button"
              />
            ))}
          </div>

          {/* Séparateur */}
          <div className="border-t border-gray-200" />

          {/* Couleur personnalisée */}
          <div className="space-y-2">
            <span className="text-xs text-gray-500">Couleur personnalisée</span>
            <div className="flex gap-2">
              <div className="relative">
                <Input
                  type="color"
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  className="w-10 h-8 p-0 border-0 cursor-pointer"
                />
              </div>
              <Input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="#000000"
                className="flex-1 h-8 text-xs font-mono"
                maxLength={7}
              />
              <Button
                size="sm"
                onClick={handleCustomColorApply}
                className="h-8 px-3"
                type="button"
              >
                OK
              </Button>
            </div>
          </div>

          {/* Bouton supprimer la couleur */}
          {onRemove && (
            <>
              <div className="border-t border-gray-200" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="w-full text-gray-600 hover:text-red-600"
                type="button"
              >
                <X className="h-4 w-4 mr-2" />
                Supprimer la couleur
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ColorPickerPopover
