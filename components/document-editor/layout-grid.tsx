'use client'

import { useState, useEffect, useRef } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Grid3x3, 
  X, 
  CheckCircle,
  Ruler,
  Move,
  AlignCenter,
  Square
} from 'lucide-react'
import { motion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

interface LayoutGridProps {
  enabled: boolean
  gridSize: number
  snapToGrid: boolean
  showRulers: boolean
  onSettingsChange: (settings: GridSettings) => void
  onClose: () => void
}

export interface GridSettings {
  enabled: boolean
  gridSize: number
  snapToGrid: boolean
  showRulers: boolean
  showGuides: boolean
  guideColor: string
  gridColor: string
}

export function LayoutGrid({ 
  enabled, 
  gridSize, 
  snapToGrid, 
  showRulers,
  onSettingsChange,
  onClose 
}: LayoutGridProps) {
  const [localGridSize, setLocalGridSize] = useState(gridSize)
  const [localSnapToGrid, setLocalSnapToGrid] = useState(snapToGrid)
  const [localShowRulers, setLocalShowRulers] = useState(showRulers)
  const [showGuides, setShowGuides] = useState(false)
  const [guideColor, setGuideColor] = useState('#335ACF')
  const [gridColor, setGridColor] = useState('#e5e7eb')

  const handleApply = () => {
    onSettingsChange({
      enabled,
      gridSize: localGridSize,
      snapToGrid: localSnapToGrid,
      showRulers: localShowRulers,
      showGuides,
      guideColor,
      gridColor,
    })
    onClose()
  }

  return (
    <GlassCard variant="premium" className="p-6 max-w-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-brand-blue" />
          <h2 className="text-xl font-semibold">Grille et règles</h2>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-6">
        {/* Taille de la grille */}
        <div>
          <Label htmlFor="gridSize">Taille de la grille (px)</Label>
          <Input
            id="gridSize"
            type="number"
            min="5"
            max="100"
            value={localGridSize}
            onChange={(e) => setLocalGridSize(parseInt(e.target.value) || 10)}
            className="mt-1"
          />
          <div className="mt-2 flex gap-2">
            {[5, 10, 20, 50].map((size) => (
              <Button
                key={size}
                variant={localGridSize === size ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLocalGridSize(size)}
              >
                {size}px
              </Button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="snapToGrid"
              checked={localSnapToGrid}
              onChange={(e) => setLocalSnapToGrid(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="snapToGrid" className="cursor-pointer flex items-center gap-2">
              <Move className="h-4 w-4" />
              Snap to grid (alignement automatique)
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showRulers"
              checked={localShowRulers}
              onChange={(e) => setLocalShowRulers(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="showRulers" className="cursor-pointer flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Afficher les règles
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showGuides"
              checked={showGuides}
              onChange={(e) => setShowGuides(e.target.checked)}
              className="w-4 h-4"
            />
            <Label htmlFor="showGuides" className="cursor-pointer flex items-center gap-2">
              <AlignCenter className="h-4 w-4" />
              Afficher les guides visuels
            </Label>
          </div>
        </div>

        {/* Couleurs */}
        {showGuides && (
          <div>
            <Label htmlFor="guideColor">Couleur des guides</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                id="guideColor"
                type="color"
                value={guideColor}
                onChange={(e) => setGuideColor(e.target.value)}
                className="h-10"
              />
              <Input
                type="text"
                value={guideColor}
                onChange={(e) => setGuideColor(e.target.value)}
                className="flex-1 font-mono"
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="gridColor">Couleur de la grille</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              id="gridColor"
              type="color"
              value={gridColor}
              onChange={(e) => setGridColor(e.target.value)}
              className="h-10"
            />
            <Input
              type="text"
              value={gridColor}
              onChange={(e) => setGridColor(e.target.value)}
              className="flex-1 font-mono"
            />
          </div>
        </div>

        {/* Aperçu */}
        <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-sm text-gray-600 mb-2">Aperçu de la grille:</div>
          <div 
            className="relative w-full h-32 bg-white"
            style={{
              backgroundImage: `
                linear-gradient(${gridColor} 1px, transparent 1px),
                linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
              `,
              backgroundSize: `${localGridSize}px ${localGridSize}px`,
            }}
          >
            {showGuides && (
              <>
                <div 
                  className="absolute top-0 bottom-0 w-px"
                  style={{ 
                    left: '50%', 
                    backgroundColor: guideColor,
                    transform: 'translateX(-50%)'
                  }}
                />
                <div 
                  className="absolute left-0 right-0 h-px"
                  style={{ 
                    top: '50%', 
                    backgroundColor: guideColor,
                    transform: 'translateY(-50%)'
                  }}
                />
              </>
            )}
            <div className="absolute top-2 left-2 bg-brand-blue text-white text-xs px-2 py-1 rounded">
              Élément
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleApply}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Appliquer
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}

// Composant pour afficher la grille en overlay
export function GridOverlay({ 
  enabled, 
  gridSize, 
  gridColor 
}: { 
  enabled: boolean
  gridSize: number
  gridColor: string 
}) {
  if (!enabled) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        backgroundImage: `
          linear-gradient(${gridColor} 1px, transparent 1px),
          linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        opacity: 0.3,
      }}
    />
  )
}

// Composant pour afficher les règles
export function Rulers({ 
  enabled 
}: { 
  enabled: boolean 
}) {
  if (!enabled) return null

  return (
    <>
      {/* Règle horizontale */}
      <div className="fixed top-0 left-0 right-0 h-6 bg-gray-100 border-b border-gray-300 z-20 flex items-center px-2 text-xs text-gray-600">
        <div className="flex-1 flex items-center gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex-1 h-full border-r border-gray-300 relative">
              <span className="absolute top-0 left-0 text-[10px]">{i * 50}px</span>
            </div>
          ))}
        </div>
      </div>
      {/* Règle verticale */}
      <div className="fixed top-0 left-0 bottom-0 w-6 bg-gray-100 border-r border-gray-300 z-20 flex flex-col items-center py-2 text-xs text-gray-600">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-1 w-full border-b border-gray-300 relative">
            <span className="absolute left-0 top-0 text-[10px] rotate-90 origin-left">{i * 50}px</span>
          </div>
        ))}
      </div>
    </>
  )
}

// Hook pour le snap to grid
export function useSnapToGrid(gridSize: number, enabled: boolean) {
  return (position: { x: number; y: number }) => {
    if (!enabled) return position
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    }
  }
}
