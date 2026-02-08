'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ColorPickerPopover } from './ColorPickerPopover'
import { BorderSelector } from './BorderSelector'
import {
  Table as TableIcon,
  Plus,
  Minus,
  Trash2,
  Merge,
  SplitSquareHorizontal,
  Grid3X3,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Rows,
  Columns,
  PaintBucket,
  Square,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'

interface TableToolbarProps {
  editor: Editor
  className?: string
}

interface TableGridSelectorProps {
  onSelect: (rows: number, cols: number) => void
  maxRows?: number
  maxCols?: number
}

// Composant pour sélectionner la taille du tableau
function TableGridSelector({ onSelect, maxRows = 10, maxCols = 10 }: TableGridSelectorProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  return (
    <div className="p-3">
      <div className="mb-2 text-sm font-medium text-center">
        {hoveredCell ? `${hoveredCell.row} × ${hoveredCell.col}` : 'Insérer un tableau'}
      </div>
      <div
        className="grid gap-0.5 mx-auto"
        style={{
          gridTemplateColumns: `repeat(${maxCols}, 1fr)`,
          width: 'fit-content',
        }}
      >
        {Array.from({ length: maxRows }).map((_, rowIndex) =>
          Array.from({ length: maxCols }).map((_, colIndex) => {
            const isSelected = hoveredCell
              ? rowIndex < hoveredCell.row && colIndex < hoveredCell.col
              : false
            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                className={cn(
                  'w-4 h-4 border transition-colors',
                  isSelected
                    ? 'bg-blue-500 border-blue-600'
                    : 'bg-white border-gray-300 hover:border-blue-400'
                )}
                onMouseEnter={() => setHoveredCell({ row: rowIndex + 1, col: colIndex + 1 })}
                onMouseLeave={() => setHoveredCell(null)}
                onClick={() => onSelect(rowIndex + 1, colIndex + 1)}
                type="button"
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// Composant principal TableToolbar
export function TableToolbar({ editor, className }: TableToolbarProps) {
  const [isInTable, setIsInTable] = useState(false)
  const [showTableMenu, setShowTableMenu] = useState(false)

  // Vérifier si le curseur est dans un tableau
  useEffect(() => {
    if (!editor) return

    const updateTableState = () => {
      setIsInTable(editor.isActive('table'))
    }

    editor.on('selectionUpdate', updateTableState)
    editor.on('transaction', updateTableState)
    updateTableState()

    return () => {
      editor.off('selectionUpdate', updateTableState)
      editor.off('transaction', updateTableState)
    }
  }, [editor])

  // Insérer un tableau (sans style prédéfini)
  const insertTable = useCallback((rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run()
    setShowTableMenu(false)
  }, [editor])

  // Actions sur les lignes
  const addRowBefore = () => editor.chain().focus().addRowBefore().run()
  const addRowAfter = () => editor.chain().focus().addRowAfter().run()
  const deleteRow = () => editor.chain().focus().deleteRow().run()

  // Actions sur les colonnes
  const addColumnBefore = () => editor.chain().focus().addColumnBefore().run()
  const addColumnAfter = () => editor.chain().focus().addColumnAfter().run()
  const deleteColumn = () => editor.chain().focus().deleteColumn().run()

  // Fusion/Division
  const mergeCells = () => editor.chain().focus().mergeCells().run()
  const splitCell = () => editor.chain().focus().splitCell().run()

  // Supprimer le tableau
  const deleteTable = () => editor.chain().focus().deleteTable().run()

  // Basculer l'en-tête
  const toggleHeaderRow = () => editor.chain().focus().toggleHeaderRow().run()
  const toggleHeaderColumn = () => editor.chain().focus().toggleHeaderColumn().run()

  // Couleur de fond de cellule
  const setCellBackground = (color: string) => {
    editor.chain().focus().updateAttributes('tableCell', { backgroundColor: color }).run()
  }

  const removeCellBackground = () => {
    editor.chain().focus().updateAttributes('tableCell', { backgroundColor: null }).run()
  }

  if (!editor) return null

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Bouton d'insertion de tableau */}
      <Popover open={showTableMenu} onOpenChange={setShowTableMenu}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 w-8 p-0 transition-all',
                  isInTable && 'bg-blue-50 text-blue-600'
                )}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Insérer un tableau</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto p-0" align="start">
          <TableGridSelector onSelect={insertTable} />
          <div className="px-3 pb-3 border-t pt-2">
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Lignes"
                min={1}
                max={50}
                defaultValue={3}
                className="w-16 h-7 text-xs"
                id="custom-rows"
              />
              <span className="text-gray-400">×</span>
              <Input
                type="number"
                placeholder="Colonnes"
                min={1}
                max={20}
                defaultValue={3}
                className="w-16 h-7 text-xs"
                id="custom-cols"
              />
              <Button
                size="sm"
                className="h-7 px-3"
                onClick={() => {
                  const rowsInput = document.getElementById('custom-rows') as HTMLInputElement
                  const colsInput = document.getElementById('custom-cols') as HTMLInputElement
                  const rows = parseInt(rowsInput?.value || '3')
                  const cols = parseInt(colsInput?.value || '3')
                  if (rows > 0 && cols > 0) {
                    insertTable(rows, cols)
                  }
                }}
                type="button"
              >
                OK
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Menu tableau (visible uniquement quand dans un tableau) */}
      {isInTable && (
        <>
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Lignes */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" type="button">
                    <Rows className="h-4 w-4" />
                    <span className="text-xs hidden lg:inline">Lignes</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Gestion des lignes</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={addRowBefore}>
                <ArrowUp className="h-4 w-4 mr-2" />
                Insérer au-dessus
              </DropdownMenuItem>
              <DropdownMenuItem onClick={addRowAfter}>
                <ArrowDown className="h-4 w-4 mr-2" />
                Insérer en-dessous
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={deleteRow} className="text-red-600">
                <Minus className="h-4 w-4 mr-2" />
                Supprimer la ligne
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Colonnes */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" type="button">
                    <Columns className="h-4 w-4" />
                    <span className="text-xs hidden lg:inline">Colonnes</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Gestion des colonnes</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={addColumnBefore}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Insérer à gauche
              </DropdownMenuItem>
              <DropdownMenuItem onClick={addColumnAfter}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Insérer à droite
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={deleteColumn} className="text-red-600">
                <Minus className="h-4 w-4 mr-2" />
                Supprimer la colonne
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cellules (Fusion/Division) */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" type="button">
                    <Grid3X3 className="h-4 w-4" />
                    <span className="text-xs hidden lg:inline">Cellules</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Fusion et division</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={mergeCells}
                disabled={!editor.can().mergeCells()}
              >
                <Merge className="h-4 w-4 mr-2" />
                Fusionner les cellules
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={splitCell}
                disabled={!editor.can().splitCell()}
              >
                <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                Fractionner la cellule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleHeaderRow}>
                Ligne d'en-tête
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleHeaderColumn}>
                Colonne d'en-tête
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Couleur de remplissage */}
          <ColorPickerPopover
            type="background"
            currentColor={editor.getAttributes('tableCell').backgroundColor}
            onColorChange={setCellBackground}
            onRemove={removeCellBackground}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                title="Couleur de remplissage"
              >
                <PaintBucket className="h-4 w-4" />
                <div
                  className="w-3 h-3 rounded border border-gray-300"
                  style={{
                    backgroundColor: editor.getAttributes('tableCell').backgroundColor || '#FFFFFF'
                  }}
                />
              </Button>
            }
          />

          {/* Bordures */}
          <BorderSelector
            editor={editor}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2"
                title="Bordures"
              >
                <Square className="h-4 w-4" />
                <span className="text-xs hidden lg:inline">Bordures</span>
              </Button>
            }
          />

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Supprimer le tableau */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={deleteTable}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Supprimer le tableau</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  )
}

export default TableToolbar
