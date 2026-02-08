'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'

// Types de bordures
export type BorderSide = 'top' | 'bottom' | 'left' | 'right' | 'horizontal' | 'vertical'
export type BorderPreset = 'none' | 'box' | 'all' | 'grid'

// Couleurs prédéfinies pour les bordures
const BORDER_COLORS = [
  { value: '#000000', label: 'Noir' },
  { value: '#374151', label: 'Gris foncé' },
  { value: '#6B7280', label: 'Gris' },
  { value: '#9CA3AF', label: 'Gris clair' },
  { value: '#D1D5DB', label: 'Gris très clair' },
  { value: '#EF4444', label: 'Rouge' },
  { value: '#F97316', label: 'Orange' },
  { value: '#EAB308', label: 'Jaune' },
  { value: '#22C55E', label: 'Vert' },
  { value: '#3B82F6', label: 'Bleu' },
  { value: '#8B5CF6', label: 'Violet' },
  { value: '#EC4899', label: 'Rose' },
]

// Épaisseurs de bordure
const BORDER_WIDTHS = [
  { value: '0.5px', label: '½ pt' },
  { value: '1px', label: '1 pt' },
  { value: '1.5px', label: '1½ pt' },
  { value: '2px', label: '2 pt' },
  { value: '2.5px', label: '2½ pt' },
  { value: '3px', label: '3 pt' },
  { value: '4px', label: '4 pt' },
  { value: '5px', label: '5 pt' },
]

// Styles de bordure
const BORDER_STYLES = [
  { value: 'solid', label: 'Plein', preview: '─────' },
  { value: 'dashed', label: 'Tirets', preview: '- - - -' },
  { value: 'dotted', label: 'Pointillés', preview: '· · · · ·' },
  { value: 'double', label: 'Double', preview: '═════' },
]

interface BorderSelectorProps {
  editor: Editor
  trigger: React.ReactNode
}

interface BorderState {
  color: string
  width: string
  style: string
}

export function BorderSelector({ editor, trigger }: BorderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [borderState, setBorderState] = useState<BorderState>({
    color: '#000000',
    width: '1px',
    style: 'solid',
  })
  const [selectedSides, setSelectedSides] = useState<Set<BorderSide>>(new Set())

  // Appliquer un préréglage
  const applyPreset = (preset: BorderPreset) => {
    const border = `${borderState.width} ${borderState.style} ${borderState.color}`

    switch (preset) {
      case 'none':
        editor.chain().focus().updateAttributes('tableCell', {
          borderTop: 'none',
          borderBottom: 'none',
          borderLeft: 'none',
          borderRight: 'none',
        }).run()
        break
      case 'box':
        // Bordures extérieures seulement
        editor.chain().focus().updateAttributes('tableCell', {
          borderTop: border,
          borderBottom: border,
          borderLeft: border,
          borderRight: border,
        }).run()
        break
      case 'all':
      case 'grid':
        // Toutes les bordures
        editor.chain().focus().updateAttributes('tableCell', {
          borderTop: border,
          borderBottom: border,
          borderLeft: border,
          borderRight: border,
        }).run()
        break
    }
    setIsOpen(false)
  }

  // Appliquer une bordure individuelle
  const applyBorder = (side: BorderSide) => {
    const border = `${borderState.width} ${borderState.style} ${borderState.color}`

    switch (side) {
      case 'top':
        editor.chain().focus().updateAttributes('tableCell', { borderTop: border }).run()
        break
      case 'bottom':
        editor.chain().focus().updateAttributes('tableCell', { borderBottom: border }).run()
        break
      case 'left':
        editor.chain().focus().updateAttributes('tableCell', { borderLeft: border }).run()
        break
      case 'right':
        editor.chain().focus().updateAttributes('tableCell', { borderRight: border }).run()
        break
      case 'horizontal':
        editor.chain().focus().updateAttributes('tableCell', {
          borderTop: border,
          borderBottom: border,
        }).run()
        break
      case 'vertical':
        editor.chain().focus().updateAttributes('tableCell', {
          borderLeft: border,
          borderRight: border,
        }).run()
        break
    }
  }

  // Supprimer une bordure individuelle
  const removeBorder = (side: BorderSide) => {
    switch (side) {
      case 'top':
        editor.chain().focus().updateAttributes('tableCell', { borderTop: 'none' }).run()
        break
      case 'bottom':
        editor.chain().focus().updateAttributes('tableCell', { borderBottom: 'none' }).run()
        break
      case 'left':
        editor.chain().focus().updateAttributes('tableCell', { borderLeft: 'none' }).run()
        break
      case 'right':
        editor.chain().focus().updateAttributes('tableCell', { borderRight: 'none' }).run()
        break
      case 'horizontal':
        editor.chain().focus().updateAttributes('tableCell', {
          borderTop: 'none',
          borderBottom: 'none',
        }).run()
        break
      case 'vertical':
        editor.chain().focus().updateAttributes('tableCell', {
          borderLeft: 'none',
          borderRight: 'none',
        }).run()
        break
    }
  }

  // Toggle bordure
  const toggleBorder = (side: BorderSide) => {
    const newSelected = new Set(selectedSides)
    if (newSelected.has(side)) {
      newSelected.delete(side)
      removeBorder(side)
    } else {
      newSelected.add(side)
      applyBorder(side)
    }
    setSelectedSides(newSelected)
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Bordures et trame</h4>

          {/* Préréglages */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Préréglages</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-12 flex-col gap-1"
                onClick={() => applyPreset('none')}
                type="button"
              >
                <div className="w-6 h-6 border border-dashed border-gray-300" />
                <span className="text-xs">Aucune</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-12 flex-col gap-1"
                onClick={() => applyPreset('box')}
                type="button"
              >
                <div className="w-6 h-6 border-2 border-gray-800" />
                <span className="text-xs">Encadrement</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-12 flex-col gap-1"
                onClick={() => applyPreset('all')}
                type="button"
              >
                <div className="w-6 h-6 border-2 border-gray-800 grid grid-cols-2 grid-rows-2">
                  <div className="border-r border-b border-gray-800" />
                  <div className="border-b border-gray-800" />
                  <div className="border-r border-gray-800" />
                  <div />
                </div>
                <span className="text-xs">Toutes</span>
              </Button>
            </div>
          </div>

          {/* Sélection de bordures individuelles */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Bordures individuelles</Label>
            <div className="flex justify-center">
              <div className="relative w-24 h-24 border border-gray-200 bg-gray-50">
                {/* Bordure haut */}
                <button
                  className={cn(
                    "absolute -top-1 left-2 right-2 h-2 hover:bg-blue-200 transition-colors",
                    selectedSides.has('top') && "bg-blue-500"
                  )}
                  onClick={() => toggleBorder('top')}
                  title="Bordure haut"
                  type="button"
                />
                {/* Bordure bas */}
                <button
                  className={cn(
                    "absolute -bottom-1 left-2 right-2 h-2 hover:bg-blue-200 transition-colors",
                    selectedSides.has('bottom') && "bg-blue-500"
                  )}
                  onClick={() => toggleBorder('bottom')}
                  title="Bordure bas"
                  type="button"
                />
                {/* Bordure gauche */}
                <button
                  className={cn(
                    "absolute -left-1 top-2 bottom-2 w-2 hover:bg-blue-200 transition-colors",
                    selectedSides.has('left') && "bg-blue-500"
                  )}
                  onClick={() => toggleBorder('left')}
                  title="Bordure gauche"
                  type="button"
                />
                {/* Bordure droite */}
                <button
                  className={cn(
                    "absolute -right-1 top-2 bottom-2 w-2 hover:bg-blue-200 transition-colors",
                    selectedSides.has('right') && "bg-blue-500"
                  )}
                  onClick={() => toggleBorder('right')}
                  title="Bordure droite"
                  type="button"
                />
                {/* Ligne horizontale intérieure */}
                <button
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 left-4 right-4 h-1.5 hover:bg-blue-200 transition-colors",
                    selectedSides.has('horizontal') && "bg-blue-500"
                  )}
                  onClick={() => toggleBorder('horizontal')}
                  title="Bordures horizontales"
                  type="button"
                />
                {/* Ligne verticale intérieure */}
                <button
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-1.5 hover:bg-blue-200 transition-colors",
                    selectedSides.has('vertical') && "bg-blue-500"
                  )}
                  onClick={() => toggleBorder('vertical')}
                  title="Bordures verticales"
                  type="button"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Cliquez sur les bords pour activer/désactiver
            </p>
          </div>

          {/* Couleur */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-500">Couleur</Label>
            <div className="grid grid-cols-6 gap-1">
              {BORDER_COLORS.map(({ value, label }) => (
                <button
                  key={value}
                  className={cn(
                    "w-8 h-8 rounded border transition-transform hover:scale-110",
                    borderState.color === value ? "ring-2 ring-blue-500 ring-offset-1" : "border-gray-200"
                  )}
                  style={{ backgroundColor: value }}
                  onClick={() => setBorderState({ ...borderState, color: value })}
                  title={label}
                  type="button"
                />
              ))}
            </div>
          </div>

          {/* Épaisseur et style */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Épaisseur</Label>
              <select
                value={borderState.width}
                onChange={(e) => setBorderState({ ...borderState, width: e.target.value })}
                className="w-full h-8 px-2 text-sm border rounded-md bg-white"
              >
                {BORDER_WIDTHS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Style</Label>
              <select
                value={borderState.style}
                onChange={(e) => setBorderState({ ...borderState, style: e.target.value })}
                className="w-full h-8 px-2 text-sm border rounded-md bg-white"
              >
                {BORDER_STYLES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Aperçu */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Aperçu</Label>
            <div
              className="h-4 w-full"
              style={{
                borderBottom: `${borderState.width} ${borderState.style} ${borderState.color}`,
              }}
            />
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Fermer
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                applyPreset('all')
              }}
              type="button"
            >
              Appliquer à toutes
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default BorderSelector
