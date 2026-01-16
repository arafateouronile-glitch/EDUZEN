'use client'

import { useRef, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { HeaderConfig, TemplateElement } from '@/lib/types/document-templates'
import { Plus, Trash2, Edit2, Move, Image as ImageIcon, Type, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderCanvasProps {
  header: HeaderConfig
  headerEnabled: boolean
  headerHeight: number
  onHeaderChange: (updates: Partial<HeaderConfig>) => void
}

export function HeaderCanvas({
  header,
  headerEnabled,
  headerHeight,
  onHeaderChange,
}: HeaderCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleAddElement = (type: TemplateElement['type']) => {
    const newElement: TemplateElement = {
      id: `element_${Date.now()}`,
      type,
      position: { x: 50, y: 20 },
      size: type === 'image' ? { width: 80, height: 80 } : undefined,
      content: type === 'text' ? 'Nouveau texte' : undefined,
      style: {
        fontSize: 12,
        color: '#000000',
      },
    }

    onHeaderChange({
      elements: [...(header.elements || []), newElement],
    })
  }

  const handleDeleteElement = (elementId: string) => {
    onHeaderChange({
      elements: (header.elements || []).filter((el) => el.id !== elementId),
    })
    if (selectedElementId === elementId) {
      setSelectedElementId(null)
    }
  }

  const handleElementClick = (elementId: string) => {
    setSelectedElementId(elementId)
  }

  const getElementIcon = (type: TemplateElement['type']) => {
    switch (type) {
      case 'text':
        return Type
      case 'image':
        return ImageIcon
      case 'line':
        return Minus
      default:
        return Edit2
    }
  }

  const renderElement = (element: TemplateElement) => {
    const isSelected = selectedElementId === element.id
    const Icon = getElementIcon(element.type)

    switch (element.type) {
      case 'text':
        return (
          <div
            key={element.id}
            className={cn(
              'absolute cursor-move p-2 rounded border-2',
              isSelected
                ? 'border-brand-blue bg-brand-blue-ghost'
                : 'border-transparent hover:border-gray-300'
            )}
            style={{
              left: `${element.position.x}px`,
              top: `${element.position.y}px`,
              fontSize: `${element.style?.fontSize || 12}px`,
              color: element.style?.color || '#000000',
              fontWeight: element.style?.fontWeight === 'bold' ? 'bold' : 'normal',
              fontStyle: element.style?.fontStyle === 'italic' ? 'italic' : 'normal',
              textAlign: element.style?.textAlign || 'left',
            }}
            onClick={() => handleElementClick(element.id!)}
          >
            {element.content || 'Texte'}
            {isSelected && (
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteElement(element.id!)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )

      case 'image':
        return (
          <div
            key={element.id}
            className={cn(
              'absolute cursor-move border-2 bg-gray-100 flex items-center justify-center',
              isSelected
                ? 'border-brand-blue bg-brand-blue-ghost'
                : 'border-transparent hover:border-gray-300'
            )}
            style={{
              left: `${element.position.x}px`,
              top: `${element.position.y}px`,
              width: `${element.size?.width || 80}px`,
              height: `${element.size?.height || 80}px`,
            }}
            onClick={() => handleElementClick(element.id!)}
          >
            <ImageIcon className="h-8 w-8 text-gray-400" />
            {isSelected && (
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteElement(element.id!)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )

      case 'line':
        return (
          <div
            key={element.id}
            className={cn(
              'absolute cursor-move',
              isSelected && 'border-brand-blue'
            )}
            style={{
              left: `${element.position.x}px`,
              top: `${element.position.y}px`,
              width: '400px',
              height: `${element.style?.border?.width || 1}px`,
              backgroundColor: element.style?.color || '#000000',
            }}
            onClick={() => handleElementClick(element.id!)}
          >
            {isSelected && (
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteElement(element.id!)
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const backgroundColor = header.backgroundColor?.type === 'solid'
    ? header.backgroundColor.color || '#FFFFFF'
    : header.backgroundColor?.type === 'gradient'
    ? `linear-gradient(${header.backgroundColor.direction === 'horizontal' ? 'to right' : 'to bottom'}, ${header.backgroundColor.from || '#FFFFFF'}, ${header.backgroundColor.to || '#FFFFFF'})`
    : '#FFFFFF'

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddElement('text')}
          >
            <Type className="h-4 w-4 mr-2" />
            Texte
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddElement('image')}
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            Image
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddElement('line')}
          >
            <Minus className="h-4 w-4 mr-2" />
            Ligne
          </Button>
        </div>
        <div className="text-xs text-text-tertiary">
          {header.elements?.length || 0} élément(s)
        </div>
      </div>

      {/* Canvas */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <div
            ref={canvasRef}
            className="relative w-full overflow-auto"
            style={{
              height: `${headerHeight + 40}px`,
              backgroundColor: typeof backgroundColor === 'string' ? backgroundColor : undefined,
              backgroundImage: typeof backgroundColor === 'string' ? undefined : backgroundColor,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {!headerEnabled ? (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                En-tête désactivé
              </div>
            ) : (
              <>
                {/* Grille de référence */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                  backgroundImage: 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }} />

                {/* Éléments */}
                {header.elements?.map((element) => renderElement(element))}

                {/* Zone vide */}
                {(!header.elements || header.elements.length === 0) && (
                  <div className="flex items-center justify-center h-full text-text-tertiary text-sm">
                    Cliquez sur les boutons ci-dessus pour ajouter des éléments
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
