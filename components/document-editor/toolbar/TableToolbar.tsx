'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Rows as Rows3,
  Columns,
  PaintBucket,
  Square,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  LayoutGrid,
  TableProperties,
  Sparkles,
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

// Sélecteur de taille de tableau (grille visuelle)
function TableGridSelector({ onSelect, maxRows = 10, maxCols = 10 }: TableGridSelectorProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null)

  return (
    <div className="p-3">
      <div className="mb-2 text-sm font-medium text-center text-[#202124]">
        {hoveredCell ? `${hoveredCell.row} × ${hoveredCell.col}` : 'Insérer un tableau'}
      </div>
      <div
        className="grid gap-0.5 mx-auto"
        style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)`, width: 'fit-content' }}
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
                  isSelected ? 'bg-[#e8f0fe] border-[#1a73e8]' : 'bg-white border-[#dadce0] hover:border-[#1a73e8]'
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

// Styles de tableau prédéfinis
interface TablePreset {
  label: string
  preview: React.ReactNode
  headerAttrs: Record<string, unknown>
  cellAttrs: Record<string, unknown>
}

const TABLE_PRESETS: Record<string, TablePreset> = {
  professional: {
    label: 'Professionnel',
    preview: (
      <div className="border border-[#1e3a5f] rounded overflow-hidden w-full">
        <div style={{ backgroundColor: '#274472', height: '7px' }} />
        <div style={{ backgroundColor: '#fff', borderTop: '1px solid #b8cce4', height: '5px' }} />
        <div style={{ backgroundColor: '#fff', borderTop: '1px solid #b8cce4', height: '5px' }} />
      </div>
    ),
    headerAttrs: {
      backgroundColor: '#274472',
      borderTop: '1px solid #1e3a5f', borderBottom: '1px solid #1e3a5f',
      borderLeft: '1px solid #1e3a5f', borderRight: '1px solid #1e3a5f',
      padding: '6px 10px',
    },
    cellAttrs: {
      borderTop: '1px solid #b8cce4', borderBottom: '1px solid #b8cce4',
      borderLeft: '1px solid #b8cce4', borderRight: '1px solid #b8cce4',
      padding: '6px 10px',
    },
  },
  classic: {
    label: 'Classique',
    preview: (
      <div className="border border-black rounded overflow-hidden w-full">
        <div style={{ backgroundColor: '#f2f2f2', height: '7px', borderBottom: '2px solid #333' }} />
        <div style={{ backgroundColor: '#fff', borderTop: '1px solid #ccc', height: '5px' }} />
        <div style={{ backgroundColor: '#fff', borderTop: '1px solid #ccc', height: '5px' }} />
      </div>
    ),
    headerAttrs: {
      backgroundColor: '#f2f2f2',
      borderTop: '1px solid #000', borderBottom: '2px solid #333',
      borderLeft: '1px solid #000', borderRight: '1px solid #000',
      padding: '5px 8px',
    },
    cellAttrs: {
      borderTop: '1px solid #cccccc', borderBottom: '1px solid #cccccc',
      borderLeft: '1px solid #cccccc', borderRight: '1px solid #cccccc',
      padding: '5px 8px',
    },
  },
  minimal: {
    label: 'Minimal',
    preview: (
      <div className="w-full">
        <div style={{ borderBottom: '2px solid #333', height: '7px' }} />
        <div style={{ borderBottom: '1px solid #e0e0e0', height: '5px' }} />
        <div style={{ borderBottom: '1px solid #e0e0e0', height: '5px' }} />
      </div>
    ),
    headerAttrs: {
      borderBottom: '2px solid #333333',
      padding: '4px 8px',
    },
    cellAttrs: {
      borderBottom: '1px solid #e0e0e0',
      padding: '4px 8px',
    },
  },
  gray: {
    label: 'Gris clair',
    preview: (
      <div className="border border-[#9aa0a6] rounded overflow-hidden w-full">
        <div style={{ backgroundColor: '#e8eaed', height: '7px' }} />
        <div style={{ backgroundColor: '#fff', borderTop: '1px solid #dadce0', height: '5px' }} />
        <div style={{ backgroundColor: '#f8f9fa', borderTop: '1px solid #dadce0', height: '5px' }} />
      </div>
    ),
    headerAttrs: {
      backgroundColor: '#e8eaed',
      borderTop: '1px solid #9aa0a6', borderBottom: '1px solid #9aa0a6',
      borderLeft: '1px solid #9aa0a6', borderRight: '1px solid #9aa0a6',
      padding: '5px 8px',
    },
    cellAttrs: {
      borderTop: '1px solid #dadce0', borderBottom: '1px solid #dadce0',
      borderLeft: '1px solid #dadce0', borderRight: '1px solid #dadce0',
      padding: '5px 8px',
    },
  },
}

// TableToolbar principal
export function TableToolbar({ editor, className }: TableToolbarProps) {
  const [isInTable, setIsInTable] = useState(false)
  const [showTableMenu, setShowTableMenu] = useState(false)

  useEffect(() => {
    if (!editor) return
    const update = () => setIsInTable(editor.isActive('table'))
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    update()
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  const insertStyledTable = useCallback((presetKey: keyof typeof TABLE_PRESETS, rows = 3, cols = 3) => {
    const preset = TABLE_PRESETS[presetKey]
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
    // After insertTable, state is updated synchronously — apply styles immediately
    try {
      const { state } = editor
      const { $head } = state.selection
      let tableStart = -1, tableEnd = -1
      for (let depth = $head.depth; depth >= 0; depth--) {
        if ($head.node(depth).type.name === 'table') {
          tableStart = $head.before(depth)
          tableEnd = tableStart + $head.node(depth).nodeSize
          break
        }
      }
      if (tableStart === -1) return
      let tr = state.tr
      state.doc.nodesBetween(tableStart, tableEnd, (node, pos) => {
        if (node.type.name === 'tableHeader') {
          tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...preset.headerAttrs })
        } else if (node.type.name === 'tableCell') {
          tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...preset.cellAttrs })
        }
      })
      editor.view.dispatch(tr)
    } catch (_) {}
    setShowTableMenu(false)
  }, [editor])

  // Par défaut : style classique
  const insertTable = useCallback((rows: number, cols: number) => {
    insertStyledTable('classic', rows, cols)
  }, [insertStyledTable])

  // Helper — applique à tableCell ET tableHeader (les deux types de cellules)
  const updateCellAttrs = (attrs: Record<string, unknown>) =>
    editor.chain().focus()
      .updateAttributes('tableCell', attrs)
      .updateAttributes('tableHeader', attrs)
      .run()

  const setCellBackground = (color: string) => updateCellAttrs({ backgroundColor: color })
  const removeCellBackground = () => updateCellAttrs({ backgroundColor: null })
  const setVerticalAlign = (align: 'top' | 'middle' | 'bottom') => updateCellAttrs({ verticalAlign: align })
  const setPadding = (padding: string) => updateCellAttrs({ padding })
  const setRowHeight = (px: string) => updateCellAttrs({ minHeight: px ? `${px}px` : null })

  // Appliquer à TOUTES les cellules du tableau sous le curseur
  const applyToAllCells = (attrs: Record<string, unknown>) => {
    try {
      const { state } = editor
      const { $head } = state.selection
      let tableStart = -1, tableEnd = -1
      for (let depth = $head.depth; depth >= 0; depth--) {
        if ($head.node(depth).type.name === 'table') {
          tableStart = $head.before(depth)
          tableEnd = tableStart + $head.node(depth).nodeSize
          break
        }
      }
      if (tableStart === -1) return
      let tr = state.tr
      state.doc.nodesBetween(tableStart, tableEnd, (node, pos) => {
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs })
        }
      })
      editor.view.dispatch(tr)
    } catch (_) {}
  }

  const currentVAlign =
    editor.getAttributes('tableCell').verticalAlign ||
    editor.getAttributes('tableHeader').verticalAlign ||
    'top'

  if (!editor) return null

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Bouton insertion tableau */}
      <Popover open={showTableMenu} onOpenChange={setShowTableMenu}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('h-7 w-7 p-0 transition-all', isInTable && 'bg-[#e8f0fe] text-[#1a73e8]')}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent><p>Insérer un tableau</p></TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto p-0" align="start">
          <TableGridSelector onSelect={insertTable} />
          <div className="px-3 pb-3 border-t pt-2">
            <div className="flex gap-2 items-center">
              <Input type="number" placeholder="Lignes" min={1} max={50} defaultValue={3} className="w-16 h-7 text-xs" id="custom-rows" />
              <span className="text-[#9aa0a6]">×</span>
              <Input type="number" placeholder="Colonnes" min={1} max={20} defaultValue={3} className="w-16 h-7 text-xs" id="custom-cols" />
              <Button
                size="sm"
                className="h-7 px-3 bg-[#1a73e8] hover:bg-[#1557b0]"
                onClick={() => {
                  const rowsInput = document.getElementById('custom-rows') as HTMLInputElement
                  const colsInput = document.getElementById('custom-cols') as HTMLInputElement
                  const rows = parseInt(rowsInput?.value || '3')
                  const cols = parseInt(colsInput?.value || '3')
                  if (rows > 0 && cols > 0) insertTable(rows, cols)
                }}
                type="button"
              >
                OK
              </Button>
            </div>
          </div>
          {/* Styles de tableau prédéfinis */}
          <div className="px-3 pb-3 border-t pt-2">
            <div className="flex items-center gap-1 mb-2">
              <Sparkles className="h-3 w-3 text-[#5f6368]" />
              <p className="text-xs text-[#5f6368] font-medium">Styles prédéfinis</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TABLE_PRESETS) as [keyof typeof TABLE_PRESETS, TablePreset][]).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => insertStyledTable(key)}
                  className="flex flex-col gap-1 p-1.5 rounded border border-[#dadce0] hover:border-[#1a73e8] hover:bg-[#f0f6ff] transition-colors text-left"
                >
                  {preset.preview}
                  <span className="text-[10px] text-[#444746] font-medium">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Outils tableau — visibles uniquement si curseur dans un tableau */}
      {isInTable && (
        <>
          <div className="w-px h-5 bg-[#dadce0] mx-1" />

          {/* Lignes */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" type="button">
                    <Rows3 className="h-4 w-4" />
                    <span className="text-xs hidden lg:inline">Lignes</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Gestion des lignes</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()}>
                <ArrowUp className="h-4 w-4 mr-2" />Insérer au-dessus
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()}>
                <ArrowDown className="h-4 w-4 mr-2" />Insérer en-dessous
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} className="text-red-600">
                <Minus className="h-4 w-4 mr-2" />Supprimer la ligne
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Colonnes */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" type="button">
                    <Columns className="h-4 w-4" />
                    <span className="text-xs hidden lg:inline">Colonnes</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Gestion des colonnes</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()}>
                <ArrowLeft className="h-4 w-4 mr-2" />Insérer à gauche
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()}>
                <ArrowRight className="h-4 w-4 mr-2" />Insérer à droite
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} className="text-red-600">
                <Minus className="h-4 w-4 mr-2" />Supprimer la colonne
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Cellules (Fusion/Division + en-têtes) */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" type="button">
                    <Grid3X3 className="h-4 w-4" />
                    <span className="text-xs hidden lg:inline">Cellules</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Fusion et division</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => editor.chain().focus().mergeCells().run()} disabled={!editor.can().mergeCells()}>
                <Merge className="h-4 w-4 mr-2" />Fusionner les cellules
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().splitCell().run()} disabled={!editor.can().splitCell()}>
                <SplitSquareHorizontal className="h-4 w-4 mr-2" />Fractionner la cellule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderRow().run()}>
                Ligne d'en-tête
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderColumn().run()}>
                Colonne d'en-tête
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-[#dadce0] mx-1" />

          {/* Alignement vertical */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('h-7 w-7 p-0', currentVAlign === 'top' && 'bg-[#e8f0fe] text-[#1a73e8]')}
                onClick={() => setVerticalAlign('top')}
              >
                <AlignVerticalJustifyStart className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Aligner en haut</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('h-7 w-7 p-0', currentVAlign === 'middle' && 'bg-[#e8f0fe] text-[#1a73e8]')}
                onClick={() => setVerticalAlign('middle')}
              >
                <AlignVerticalJustifyCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Centrer verticalement</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn('h-7 w-7 p-0', currentVAlign === 'bottom' && 'bg-[#e8f0fe] text-[#1a73e8]')}
                onClick={() => setVerticalAlign('bottom')}
              >
                <AlignVerticalJustifyEnd className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Aligner en bas</TooltipContent>
          </Tooltip>

          <div className="w-px h-5 bg-[#dadce0] mx-1" />

          {/* Espacement (padding) */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" type="button">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="text-xs hidden lg:inline">Espac.</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Espacement des cellules</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel className="text-xs text-[#5f6368] font-normal">Padding cellule</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setPadding('2pt 4pt')}>Compact (2pt 4pt)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPadding('4pt 8pt')}>Normal (4pt 8pt)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPadding('8pt 16pt')}>Large (8pt 16pt)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hauteur de ligne */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" type="button">
                    <Rows3 className="h-4 w-4" />
                    <span className="text-xs hidden lg:inline">Haut.</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Hauteur de ligne</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel className="text-xs text-[#5f6368] font-normal">Hauteur min de ligne</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRowHeight('')}>Auto</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRowHeight('24')}>Petite — 24 px</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRowHeight('40')}>Normale — 40 px</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRowHeight('60')}>Grande — 60 px</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRowHeight('80')}>Très grande — 80 px</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-[#dadce0] mx-1" />

          {/* Tout le tableau */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" type="button">
                    <TableProperties className="h-4 w-4" />
                    <span className="text-xs hidden lg:inline">Tout</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Appliquer à tout le tableau</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel className="text-xs text-[#5f6368] font-normal">Tout le tableau</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                const bg = editor.getAttributes('tableCell').backgroundColor || editor.getAttributes('tableHeader').backgroundColor
                if (bg) applyToAllCells({ backgroundColor: bg })
              }}>
                Couleur de fond → toutes les cellules
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyToAllCells({
                borderTop: '1px solid #000000',
                borderBottom: '1px solid #000000',
                borderLeft: '1px solid #000000',
                borderRight: '1px solid #000000',
              })}>
                Bordures noires → toutes les cellules
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => applyToAllCells({ padding: '4pt 8pt' })}>
                Espacement normal → toutes les cellules
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => applyToAllCells({ padding: '2pt 4pt' })}>
                Espacement compact → toutes les cellules
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => applyToAllCells({
                  backgroundColor: null,
                  borderTop: null, borderBottom: null, borderLeft: null, borderRight: null,
                  padding: null, minHeight: null,
                })}
                className="text-red-600"
              >
                Effacer tout le formatage
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-5 bg-[#dadce0] mx-1" />

          {/* Couleur de remplissage */}
          {(() => {
            const bg = editor.getAttributes('tableCell').backgroundColor || editor.getAttributes('tableHeader').backgroundColor
            return (
              <ColorPickerPopover
                type="background"
                currentColor={bg}
                onColorChange={setCellBackground}
                onRemove={removeCellBackground}
                trigger={
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2" title="Couleur de remplissage">
                    <PaintBucket className="h-4 w-4" />
                    <div
                      className="w-3 h-3 rounded border border-[#dadce0]"
                      style={{ backgroundColor: bg || '#FFFFFF' }}
                    />
                  </Button>
                }
              />
            )
          })()}

          {/* Bordures */}
          <BorderSelector
            editor={editor}
            trigger={
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2" title="Bordures">
                <Square className="h-4 w-4" />
                <span className="text-xs hidden lg:inline">Bordures</span>
              </Button>
            }
          />

          <div className="w-px h-5 bg-[#dadce0] mx-1" />

          {/* Supprimer le tableau */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => editor.chain().focus().deleteTable().run()}
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
