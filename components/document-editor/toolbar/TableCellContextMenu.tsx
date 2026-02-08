'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ColorPickerPopover } from './ColorPickerPopover'
import {
  Plus,
  Minus,
  Trash2,
  Merge,
  SplitSquareHorizontal,
  Palette,
  Square,
  X
} from 'lucide-react'
import type { Editor } from '@tiptap/react'

export interface TableCellContextMenuProps {
  editor: Editor
  position: { x: number; y: number } | null
  onClose: () => void
}

export function TableCellContextMenu({
  editor,
  position,
  onClose
}: TableCellContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (position) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [position, onClose])

  // Fermer le menu avec Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (position) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [position, onClose])

  if (!position) return null

  const setCellBackground = (color: string) => {
    editor.chain().focus().setCellAttribute('backgroundColor', color).run()
  }

  const removeCellBackground = () => {
    editor.chain().focus().setCellAttribute('backgroundColor', null).run()
  }

  const setCellBorder = (color: string) => {
    editor.chain().focus().setCellAttribute('borderColor', color).run()
  }

  const removeCellBorder = () => {
    editor.chain().focus().setCellAttribute('borderColor', null).run()
  }

  // Calculer la position pour ne pas dépasser l'écran
  const menuWidth = 200
  const menuHeight = 320
  const x = Math.min(position.x, window.innerWidth - menuWidth - 10)
  const y = Math.min(position.y, window.innerHeight - menuHeight - 10)

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 space-y-1"
      style={{ left: x, top: y, minWidth: menuWidth }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-2 pb-1 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500">Cellule</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0"
          onClick={onClose}
          type="button"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Couleurs */}
      <div className="space-y-1 py-1">
        <span className="text-xs text-gray-400 px-2">Couleurs</span>

        <ColorPickerPopover
          type="background"
          currentColor={editor.getAttributes('tableCell').backgroundColor}
          onColorChange={setCellBackground}
          onRemove={removeCellBackground}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-sm"
              type="button"
            >
              <Palette className="h-4 w-4 mr-2" />
              Couleur de fond
              {editor.getAttributes('tableCell').backgroundColor && (
                <div
                  className="ml-auto w-4 h-4 rounded border border-gray-300"
                  style={{ backgroundColor: editor.getAttributes('tableCell').backgroundColor }}
                />
              )}
            </Button>
          }
        />

        <ColorPickerPopover
          type="background"
          currentColor={editor.getAttributes('tableCell').borderColor}
          onColorChange={setCellBorder}
          onRemove={removeCellBorder}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-8 text-sm"
              type="button"
            >
              <Square className="h-4 w-4 mr-2" />
              Couleur bordure
              {editor.getAttributes('tableCell').borderColor && (
                <div
                  className="ml-auto w-4 h-4 rounded border-2"
                  style={{ borderColor: editor.getAttributes('tableCell').borderColor }}
                />
              )}
            </Button>
          }
        />
      </div>

      <div className="border-t border-gray-100 my-1" />

      {/* Lignes */}
      <div className="space-y-1 py-1">
        <span className="text-xs text-gray-400 px-2">Lignes</span>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-sm"
          onClick={() => { editor.chain().focus().addRowBefore().run(); onClose(); }}
          type="button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter ligne au-dessus
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-sm"
          onClick={() => { editor.chain().focus().addRowAfter().run(); onClose(); }}
          type="button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter ligne en-dessous
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => { editor.chain().focus().deleteRow().run(); onClose(); }}
          type="button"
        >
          <Minus className="h-4 w-4 mr-2" />
          Supprimer la ligne
        </Button>
      </div>

      <div className="border-t border-gray-100 my-1" />

      {/* Colonnes */}
      <div className="space-y-1 py-1">
        <span className="text-xs text-gray-400 px-2">Colonnes</span>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-sm"
          onClick={() => { editor.chain().focus().addColumnBefore().run(); onClose(); }}
          type="button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter colonne à gauche
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-sm"
          onClick={() => { editor.chain().focus().addColumnAfter().run(); onClose(); }}
          type="button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter colonne à droite
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => { editor.chain().focus().deleteColumn().run(); onClose(); }}
          type="button"
        >
          <Minus className="h-4 w-4 mr-2" />
          Supprimer la colonne
        </Button>
      </div>

      <div className="border-t border-gray-100 my-1" />

      {/* Fusion/Division */}
      <div className="space-y-1 py-1">
        <span className="text-xs text-gray-400 px-2">Cellules</span>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-sm"
          onClick={() => { editor.chain().focus().mergeCells().run(); onClose(); }}
          disabled={!editor.can().mergeCells()}
          type="button"
        >
          <Merge className="h-4 w-4 mr-2" />
          Fusionner les cellules
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-8 text-sm"
          onClick={() => { editor.chain().focus().splitCell().run(); onClose(); }}
          disabled={!editor.can().splitCell()}
          type="button"
        >
          <SplitSquareHorizontal className="h-4 w-4 mr-2" />
          Diviser la cellule
        </Button>
      </div>

      <div className="border-t border-gray-100 my-1" />

      {/* Supprimer le tableau */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start h-8 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
        onClick={() => { editor.chain().focus().deleteTable().run(); onClose(); }}
        type="button"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Supprimer le tableau
      </Button>
    </div>
  )
}

export default TableCellContextMenu
