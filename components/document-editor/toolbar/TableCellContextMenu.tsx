'use client'

import { useEffect, useRef, useState } from 'react'
import { ColorPickerPopover } from './ColorPickerPopover'
import { BorderSelector } from './BorderSelector'
import {
  Plus,
  Minus,
  Trash2,
  Merge,
  SplitSquareHorizontal,
  Palette,
  Square,
  X,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  TableProperties,
  Rows as Rows3,
} from 'lucide-react'
import type { Editor } from '@tiptap/react'

export interface TableCellContextMenuProps {
  editor: Editor
  position: { x: number; y: number } | null
  onClose: () => void
}

export function TableCellContextMenu({ editor, position, onClose }: TableCellContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [rowHeightInput, setRowHeightInput] = useState('')

  // Fermer sur clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose()
    }
    if (position) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [position, onClose])

  // Fermer sur Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (position) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [position, onClose])

  if (!position) return null

  // ─── Helpers cellule ──────────────────────────────────────────────
  const updateCellAttrs = (attrs: Record<string, unknown>) =>
    editor.chain().focus()
      .updateAttributes('tableCell', attrs)
      .updateAttributes('tableHeader', attrs)
      .run()

  const setCellBg = (color: string) => updateCellAttrs({ backgroundColor: color })
  const removeCellBg = () => updateCellAttrs({ backgroundColor: null })
  const setVerticalAlign = (align: 'top' | 'middle' | 'bottom') => updateCellAttrs({ verticalAlign: align })
  const setPadding = (padding: string) => updateCellAttrs({ padding })
  const setRowHeight = (px: string) => updateCellAttrs({ minHeight: px ? `${px}px` : null })

  // ─── Appliquer à TOUTES les cellules du tableau actuel ────────────
  const applyToAllCells = (attrs: Record<string, unknown>) => {
    try {
      const { state } = editor
      const { $head } = state.selection
      let tableStart = -1
      let tableEnd = -1
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

  // ─── Lecture des attributs courants ──────────────────────────────
  const currentBg =
    editor.getAttributes('tableCell').backgroundColor ||
    editor.getAttributes('tableHeader').backgroundColor
  const currentVAlign =
    editor.getAttributes('tableCell').verticalAlign ||
    editor.getAttributes('tableHeader').verticalAlign ||
    'top'

  // ─── Position sécurisée dans l'écran ────────────────────────────
  const menuWidth = 230
  const x = Math.min(position.x, window.innerWidth - menuWidth - 10)
  const y = Math.min(position.y, window.innerHeight - 620 - 10)

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] uppercase tracking-wider text-[#9aa0a6] px-2 pt-1 pb-0.5">{children}</p>
  )

  const MenuItem = ({
    onClick, icon: Icon, label, danger = false, disabled = false,
  }: { onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string; danger?: boolean; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        danger ? 'hover:bg-red-50 text-red-600' : 'hover:bg-[#f1f3f4] text-[#202124]'
      }`}
    >
      <Icon className="h-[14px] w-[14px] flex-shrink-0 text-[#5f6368]" />
      {label}
    </button>
  )

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-[#dadce0] rounded-lg shadow-xl py-1 overflow-y-auto"
      style={{ left: x, top: Math.max(8, y), minWidth: menuWidth, maxHeight: 'calc(100vh - 20px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#f1f3f4]">
        <span className="text-xs font-medium text-[#5f6368]">Options du tableau</span>
        <button type="button" onClick={onClose} className="h-5 w-5 flex items-center justify-center rounded hover:bg-[#f1f3f4]">
          <X className="h-3 w-3 text-[#5f6368]" />
        </button>
      </div>

      {/* ── Couleur de fond ───────────────────────────────────────── */}
      <div className="px-1 py-1 border-b border-[#f1f3f4]">
        <SectionTitle>Remplissage</SectionTitle>
        <ColorPickerPopover
          type="background"
          currentColor={currentBg}
          onColorChange={setCellBg}
          onRemove={removeCellBg}
          trigger={
            <button type="button" className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[#f1f3f4] text-[#202124]">
              <Palette className="h-[14px] w-[14px] text-[#5f6368]" />
              <span>Couleur de fond</span>
              <div
                className="ml-auto w-4 h-4 rounded border border-[#dadce0]"
                style={{ backgroundColor: currentBg || 'transparent' }}
              />
            </button>
          }
        />
      </div>

      {/* ── Bordures ─────────────────────────────────────────────── */}
      <div className="px-1 py-1 border-b border-[#f1f3f4]">
        <SectionTitle>Bordures</SectionTitle>
        <BorderSelector
          editor={editor}
          trigger={
            <button type="button" className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[#f1f3f4] text-[#202124]">
              <Square className="h-[14px] w-[14px] text-[#5f6368]" />
              <span>Style de bordure…</span>
            </button>
          }
        />
      </div>

      {/* ── Alignement vertical ──────────────────────────────────── */}
      <div className="px-1 py-1 border-b border-[#f1f3f4]">
        <SectionTitle>Alignement vertical</SectionTitle>
        <div className="flex gap-1 px-2">
          {([
            { align: 'top', Icon: AlignVerticalJustifyStart, label: 'Haut' },
            { align: 'middle', Icon: AlignVerticalJustifyCenter, label: 'Milieu' },
            { align: 'bottom', Icon: AlignVerticalJustifyEnd, label: 'Bas' },
          ] as const).map(({ align, Icon, label }) => (
            <button
              key={align}
              type="button"
              onClick={() => setVerticalAlign(align)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded text-xs transition-colors ${
                currentVAlign === align ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#f1f3f4] text-[#444746]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Espacement ───────────────────────────────────────────── */}
      <div className="px-1 py-1 border-b border-[#f1f3f4]">
        <SectionTitle>Espacement interne</SectionTitle>
        <div className="flex gap-1 px-2">
          {([
            { label: 'Compact', value: '2pt 4pt' },
            { label: 'Normal', value: '4pt 8pt' },
            { label: 'Large', value: '8pt 16pt' },
          ]).map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPadding(value)}
              className="flex-1 py-1.5 rounded text-xs hover:bg-[#f1f3f4] text-[#444746] transition-colors border border-[#dadce0]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Hauteur de ligne ─────────────────────────────────────── */}
      <div className="px-1 py-1 border-b border-[#f1f3f4]">
        <SectionTitle>Hauteur de ligne</SectionTitle>
        {/* Préréglages */}
        <div className="flex gap-1 px-2 mb-1.5">
          {([
            { label: 'Auto', value: '' },
            { label: '24px', value: '24' },
            { label: '40px', value: '40' },
            { label: '60px', value: '60' },
          ]).map(({ label, value }) => (
            <button
              key={label}
              type="button"
              onClick={() => { setRowHeight(value); setRowHeightInput(value) }}
              className="flex-1 py-1 rounded text-xs hover:bg-[#f1f3f4] text-[#444746] border border-[#dadce0] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
        {/* Input personnalisé */}
        <div className="flex items-center gap-1.5 px-2">
          <Rows3 className="h-3.5 w-3.5 text-[#9aa0a6] flex-shrink-0" />
          <input
            type="number"
            min={0}
            max={500}
            placeholder="Hauteur (px)"
            value={rowHeightInput}
            onChange={(e) => setRowHeightInput(e.target.value)}
            onBlur={(e) => setRowHeight(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setRowHeight(rowHeightInput) }}
            className="w-full h-6 px-2 text-xs border border-[#dadce0] rounded focus:border-[#1a73e8] focus:outline-none"
          />
          <span className="text-xs text-[#9aa0a6] flex-shrink-0">px</span>
        </div>
      </div>

      {/* ── Appliquer à tout le tableau ──────────────────────────── */}
      <div className="px-1 py-1 border-b border-[#f1f3f4]">
        <SectionTitle>Tout le tableau</SectionTitle>
        <button
          type="button"
          onClick={() => currentBg && applyToAllCells({ backgroundColor: currentBg })}
          disabled={!currentBg}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[#f1f3f4] text-[#202124] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <TableProperties className="h-[14px] w-[14px] text-[#5f6368]" />
          Couleur de fond → tout le tableau
        </button>
        <button
          type="button"
          onClick={() => applyToAllCells({
            borderTop: '1px solid #000000',
            borderBottom: '1px solid #000000',
            borderLeft: '1px solid #000000',
            borderRight: '1px solid #000000',
          })}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[#f1f3f4] text-[#202124]"
        >
          <Square className="h-[14px] w-[14px] text-[#5f6368]" />
          Bordures noires → tout le tableau
        </button>
        <button
          type="button"
          onClick={() => applyToAllCells({
            backgroundColor: null,
            borderTop: null, borderBottom: null,
            borderLeft: null, borderRight: null,
            padding: null, minHeight: null,
          })}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[#f1f3f4] text-[#202124]"
        >
          <X className="h-[14px] w-[14px] text-[#5f6368]" />
          Effacer le formatage → tout le tableau
        </button>
      </div>

      {/* ── Lignes ──────────────────────────────────────────────── */}
      <div className="px-1 py-1 border-b border-[#f1f3f4]">
        <SectionTitle>Lignes</SectionTitle>
        <MenuItem onClick={() => { editor.chain().focus().addRowBefore().run(); onClose() }} icon={Plus} label="Insérer au-dessus" />
        <MenuItem onClick={() => { editor.chain().focus().addRowAfter().run(); onClose() }} icon={Plus} label="Insérer en-dessous" />
        <MenuItem onClick={() => { editor.chain().focus().deleteRow().run(); onClose() }} icon={Minus} label="Supprimer la ligne" danger />
      </div>

      {/* ── Colonnes ────────────────────────────────────────────── */}
      <div className="px-1 py-1 border-b border-[#f1f3f4]">
        <SectionTitle>Colonnes</SectionTitle>
        <MenuItem onClick={() => { editor.chain().focus().addColumnBefore().run(); onClose() }} icon={Plus} label="Insérer à gauche" />
        <MenuItem onClick={() => { editor.chain().focus().addColumnAfter().run(); onClose() }} icon={Plus} label="Insérer à droite" />
        <MenuItem onClick={() => { editor.chain().focus().deleteColumn().run(); onClose() }} icon={Minus} label="Supprimer la colonne" danger />
      </div>

      {/* ── Fusion / Division ────────────────────────────────────── */}
      <div className="px-1 py-1 border-b border-[#f1f3f4]">
        <SectionTitle>Cellules</SectionTitle>
        <MenuItem
          onClick={() => { editor.chain().focus().mergeCells().run(); onClose() }}
          icon={Merge} label="Fusionner les cellules"
          disabled={!editor.can().mergeCells()}
        />
        <MenuItem
          onClick={() => { editor.chain().focus().splitCell().run(); onClose() }}
          icon={SplitSquareHorizontal} label="Diviser la cellule"
          disabled={!editor.can().splitCell()}
        />
      </div>

      {/* ── Supprimer le tableau ─────────────────────────────────── */}
      <div className="px-1 py-1">
        <MenuItem onClick={() => { editor.chain().focus().deleteTable().run(); onClose() }} icon={Trash2} label="Supprimer le tableau" danger />
      </div>
    </div>
  )
}

export default TableCellContextMenu
