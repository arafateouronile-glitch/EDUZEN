'use client'

import { useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { FooterConfig, TemplateElement } from '@/lib/types/document-templates'
import { Plus, Trash2, Edit2, Type, Minus, QrCode } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FooterCanvasProps {
  footer: FooterConfig
  footerEnabled: boolean
  footerHeight: number
  onFooterChange: (updates: Partial<FooterConfig>) => void
}

export function FooterCanvas({
  footer,
  footerEnabled,
  footerHeight,
  onFooterChange,
}: FooterCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)

  const handleAddElement = (type: TemplateElement['type']) => {
    const newElement: TemplateElement = {
      id: `element_${Date.now()}`,
      type,
      position: { x: 50, y: 10 },
      size: type === 'qrcode' ? { width: 40, height: 40 } : undefined,
      content: type === 'text' ? 'Nouveau texte' : undefined,
      style: {
        fontSize: 9,
        color: '#4D4D4D',
      },
    }

    onFooterChange({
      elements: [...(footer.elements || []), newElement],
    })
  }

  const handleDeleteElement = (elementId: string) => {
    onFooterChange({
      elements: (footer.elements || []).filter((el) => el.id !== elementId),
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
      case 'line':
        return Minus
      case 'qrcode':
        return QrCode
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
              'absolute cursor-move p-1 rounded border-2',
              isSelected
                ? 'border-brand-blue bg-brand-blue-ghost'
                : 'border-transparent hover:border-gray-300'
            )}
            style={{
              left: `${element.position.x}px`,
              top: `${element.position.y}px`,
              fontSize: `${element.style?.fontSize || 9}px`,
              color: element.style?.color || '#4D4D4D',
              fontWeight: element.style?.fontWeight === 'bold' ? 'bold' : 'normal',
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
              backgroundColor: element.style?.color || '#E5E7EB',
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

      case 'qrcode':
        return (
          <div
            key={element.id}
            className={cn(
              'absolute cursor-move border-2 bg-white flex items-center justify-center',
              isSelected
                ? 'border-brand-blue bg-brand-blue-ghost'
                : 'border-gray-300 hover:border-gray-400'
            )}
            style={{
              left: `${element.position.x}px`,
              top: `${element.position.y}px`,
              width: `${element.size?.width || 40}px`,
              height: `${element.size?.height || 40}px`,
            }}
            onClick={() => handleElementClick(element.id!)}
          >
            <QrCode className="h-6 w-6 text-gray-400" />
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

  const backgroundColor = footer.backgroundColor || '#F9FAFB'
  const borderTop = footer.border?.top?.enabled
    ? `${footer.border.top.width}px ${footer.border.top.style || 'solid'} ${footer.border.top.color}`
    : 'none'

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
            onClick={() => handleAddElement('line')}
          >
            <Minus className="h-4 w-4 mr-2" />
            Ligne
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddElement('qrcode')}
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </Button>
        </div>
        <div className="text-xs text-text-tertiary">
          {footer.elements?.length || 0} élément(s)
          {footer.pagination?.enabled && ' + Pagination'}
        </div>
      </div>

      {/* Canvas */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-0 h-full">
          <div
            ref={canvasRef}
            className="relative w-full overflow-auto"
            style={{
              height: `${footerHeight + 40}px`,
              backgroundColor,
              borderTop,
            }}
          >
            {!footerEnabled ? (
              <div className="flex items-center justify-center h-full text-text-tertiary">
                Pied de page désactivé
              </div>
            ) : (
              <>
                {/* Grille de référence */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                  backgroundImage: 'linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }} />

                {/* Pagination (si activée) */}
                {footer.pagination?.enabled && (
                  <div
                    className="absolute text-xs text-gray-600"
                    style={{
                      left: footer.pagination.position === 'left' ? '20px' : footer.pagination.position === 'right' ? 'auto' : '50%',
                      right: footer.pagination.position === 'right' ? '20px' : 'auto',
                      top: '50%',
                      transform: footer.pagination.position === 'center' ? 'translateX(-50%) translateY(-50%)' : 'translateY(-50%)',
                    }}
                  >
                    {footer.pagination.format || 'Page {numero_page} / {total_pages}'}
                  </div>
                )}

                {/* Éléments */}
                {footer.elements?.map((element) => renderElement(element))}

                {/* Zone vide */}
                {(!footer.elements || footer.elements.length === 0) && !footer.pagination?.enabled && (
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
