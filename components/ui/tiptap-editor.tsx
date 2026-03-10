'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { posToDOMRect } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { CellSelection } from 'prosemirror-tables'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Extension } from '@tiptap/core'
import Underline from '@tiptap/extension-underline'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import TiptapImage from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { useImperativeHandle, forwardRef, useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { VariableExtension } from '@/components/document-editor/extensions/VariableExtension'
import { ConditionalBlockExtension } from '@/components/document-editor/extensions/ConditionalBlockExtension'
import {
  HighlightExtension,
  LineHeightExtension,
  ParagraphStyleExtension,
  CustomTableCell,
  CustomTableHeader,
} from '@/components/document-editor/extensions'
import { ColorPickerPopover } from '@/components/document-editor/toolbar/ColorPickerPopover'
import { LineHeightDropdown } from '@/components/document-editor/toolbar/LineHeightDropdown'
import { TableToolbar } from '@/components/document-editor/toolbar/TableToolbar'
import { TableCellContextMenu } from '@/components/document-editor/toolbar/TableCellContextMenu'
import { FindReplaceDialog } from '@/components/document-editor/toolbar/FindReplaceDialog'
import { WordCounter } from '@/components/document-editor/toolbar/WordCounter'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Link as LinkIcon,
  Table as TableIcon,
  Type,
  Sparkles,
  Square,
  Image as ImageIcon,
  Zap,
  Droplet,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  RemoveFormatting,
  Minus,
  Indent,
  Outdent,
  Search,
  ChevronDown,
  Printer,
} from 'lucide-react'

import '@/components/document-editor/editor-styles.css'

// ============================================================
// Types
// ============================================================

export interface TiptapEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
  height?: number
  fontFamily?: string
  onFontFamilyChange?: (fontFamily: string) => void
  onTableEditorOpen?: () => void
  onShapeEditorOpen?: () => void
  onElementPaletteOpen?: () => void
  onQuickTemplatesOpen?: () => void
  onStylePaletteOpen?: () => void
  onWatermarkEditorOpen?: () => void
  onSignatureFieldOpen?: () => void
  onMapEmbedOpen?: () => void
  onAttachmentEmbedOpen?: () => void
  previewMode?: 'pdf' | 'screen'
}

export interface TiptapEditorRef {
  insertVariable: (variable: string) => void
  insertVariableNode: (id: string, label: string, value: string) => void
  insertConditionalBlock: (type?: 'if' | 'elseif' | 'else') => void
  insertTable: (rows?: number, cols?: number) => void
  insertBorderedFrame: (options?: {
    borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double'
    borderWidth?: number
    borderColor?: string
    backgroundColor?: string
    padding?: number
  }) => void
  insertFramedSection: (title?: string, borderColor?: string) => void
  insertAdminTable: (headers?: string[], rows?: number) => void
  insertHTML: (html: string) => void
  getEditor: () => any
}

// ============================================================
// Sub-components Google Docs style
// ============================================================

/** Bouton de toolbar Google Docs */
function GdBtn({
  onClick,
  active,
  disabled,
  title,
  children,
  className,
}: {
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center justify-center h-7 w-7 rounded transition-colors duration-100 flex-shrink-0',
        'text-[#444746] disabled:opacity-40 disabled:cursor-not-allowed',
        active ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#f1f3f4]',
        className
      )}
    >
      {children}
    </button>
  )
}

/** Wrapper transparent pour les boutons déjà personnalisés (ex: ColorPicker trigger) */
function GdBtnRaw({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <div
      title={title}
      className="flex items-center justify-center h-7 w-7 rounded hover:bg-[#f1f3f4] text-[#444746] cursor-pointer flex-shrink-0 transition-colors duration-100"
    >
      {children}
    </div>
  )
}

/** Séparateur de toolbar */
function GdSep() {
  return <div className="w-px h-5 bg-[#dadce0] mx-1 flex-shrink-0" />
}

// Polices disponibles
const FONTS = [
  'Arial', 'Calibri', 'Cambria', 'Comic Sans MS', 'Courier New',
  'Georgia', 'Helvetica', 'Impact', 'Inter', 'Lucida Sans',
  'Palatino', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana',
]

/** Dropdown de police Google Docs */
function FontFamilyDropdown({ value, onChange }: { value: string; onChange: (f: string) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 h-7 px-2 rounded hover:bg-[#f1f3f4] text-[#444746] text-sm min-w-[110px] max-w-[140px]"
          title="Police"
        >
          <span className="flex-1 text-left truncate text-[13px]" style={{ fontFamily: value }}>{value}</span>
          <ChevronDown className="h-3 w-3 flex-shrink-0 text-[#5f6368]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1 max-h-72 overflow-y-auto">
        {FONTS.map((font) => (
          <button
            key={font}
            type="button"
            onClick={() => { onChange(font); setOpen(false) }}
            className={cn(
              'w-full text-left px-3 py-1.5 rounded text-[13px] hover:bg-[#f1f3f4] transition-colors',
              font === value && 'bg-[#e8f0fe] text-[#1a73e8]'
            )}
            style={{ fontFamily: font }}
          >
            {font}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/** Contrôle de taille de police avec input éditable + boutons +/- */
function FontSizeControl({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const [inputVal, setInputVal] = useState(value)

  useEffect(() => { setInputVal(value) }, [value])

  const apply = (v: string) => {
    const num = parseFloat(v)
    if (!isNaN(num) && num >= 6 && num <= 400) {
      onChange(String(num))
    }
  }

  return (
    <div className="flex items-center h-7 border border-[#dadce0] rounded overflow-hidden hover:border-[#9aa0a6] focus-within:border-[#1a73e8] flex-shrink-0">
      <button
        type="button"
        onClick={() => {
          const v = String(Math.max(6, parseFloat(inputVal) - 1))
          setInputVal(v)
          onChange(v)
        }}
        className="px-1.5 h-full text-[#444746] hover:bg-[#f1f3f4] text-sm leading-none select-none"
      >
        −
      </button>
      <input
        type="text"
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onBlur={(e) => apply(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply(inputVal)
          if (e.key === 'ArrowUp') { const v = String(parseFloat(inputVal) + 1); setInputVal(v); onChange(v) }
          if (e.key === 'ArrowDown') { const v = String(Math.max(6, parseFloat(inputVal) - 1)); setInputVal(v); onChange(v) }
        }}
        className="w-9 text-center text-[13px] text-[#444746] border-none outline-none bg-transparent"
        title="Taille de police"
      />
      <button
        type="button"
        onClick={() => {
          const v = String(Math.min(400, parseFloat(inputVal) + 1))
          setInputVal(v)
          onChange(v)
        }}
        className="px-1.5 h-full text-[#444746] hover:bg-[#f1f3f4] text-sm leading-none select-none"
      >
        +
      </button>
    </div>
  )
}

/** Dropdown sélecteur de style (Normal text, Heading 1...) Google Docs */
function StyleDropdown({ editor }: { editor: ReturnType<typeof useEditor> }) {
  const [open, setOpen] = useState(false)

  if (!editor) return null

  const getActiveStyle = () => {
    if (editor.isActive('heading', { level: 1 })) return 'Titre'
    if (editor.isActive('heading', { level: 2 })) return 'En-tête 1'
    if (editor.isActive('heading', { level: 3 })) return 'En-tête 2'
    if (editor.isActive('heading', { level: 4 })) return 'En-tête 3'
    if (editor.isActive('heading', { level: 5 })) return 'En-tête 4'
    if (editor.isActive('heading', { level: 6 })) return 'En-tête 5'
    if (editor.isActive('blockquote')) return 'Citation'
    if (editor.isActive('codeBlock')) return 'Code'
    return 'Texte normal'
  }

  const styles = [
    {
      label: 'Texte normal',
      action: () => editor.chain().focus().setParagraph().run(),
      className: 'text-[13px] text-[#202124]',
    },
    {
      label: 'Titre',
      action: () => editor.chain().focus().setHeading({ level: 1 }).run(),
      className: 'text-2xl font-bold text-[#202124]',
    },
    {
      label: 'En-tête 1',
      action: () => editor.chain().focus().setHeading({ level: 2 }).run(),
      className: 'text-xl font-bold text-[#202124]',
    },
    {
      label: 'En-tête 2',
      action: () => editor.chain().focus().setHeading({ level: 3 }).run(),
      className: 'text-lg font-semibold text-[#202124]',
    },
    {
      label: 'En-tête 3',
      action: () => editor.chain().focus().setHeading({ level: 4 }).run(),
      className: 'text-base font-semibold text-[#444746]',
    },
    {
      label: 'En-tête 4',
      action: () => editor.chain().focus().setHeading({ level: 5 }).run(),
      className: 'text-sm font-medium text-[#444746]',
    },
    {
      label: 'En-tête 5',
      action: () => editor.chain().focus().setHeading({ level: 6 }).run(),
      className: 'text-xs font-medium text-[#5f6368]',
    },
  ]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 h-7 px-2 rounded hover:bg-[#f1f3f4] text-[#444746] min-w-[120px] max-w-[150px]"
          title="Style du texte"
        >
          <span className="flex-1 text-left truncate text-[13px]">{getActiveStyle()}</span>
          <ChevronDown className="h-3 w-3 flex-shrink-0 text-[#5f6368]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {styles.map((style) => (
          <button
            key={style.label}
            type="button"
            onClick={() => { style.action(); setOpen(false) }}
            className="w-full text-left px-3 py-2 rounded hover:bg-[#f1f3f4] transition-colors"
          >
            <span className={style.className}>{style.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}

/** Bouton d'insertion/édition de lien */
function LinkButton({ editor, compact }: { editor: ReturnType<typeof useEditor>; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  if (!editor) return null

  const isActive = editor.isActive('link')

  const openDialog = () => {
    const existing = editor.getAttributes('link').href || ''
    setUrl(existing || 'https://')
    setOpen(true)
    setTimeout(() => inputRef.current?.select(), 50)
  }

  const applyLink = () => {
    if (!url || url === 'https://') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run()
    }
    setOpen(false)
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    setOpen(false)
  }

  const trigger = compact ? (
    <button
      type="button"
      onClick={openDialog}
      className={cn('bubble-btn', isActive && 'bubble-btn-active')}
      title="Lien (Ctrl+K)"
    >
      <LinkIcon className="h-3.5 w-3.5" />
    </button>
  ) : (
    <GdBtn onClick={openDialog} active={isActive} title="Insérer un lien (Ctrl+K)">
      <LinkIcon className="h-[18px] w-[18px]" />
    </GdBtn>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <div className="space-y-3">
          <p className="text-sm font-medium text-[#202124]">Lien hypertexte</p>
          <div>
            <label className="text-xs text-[#5f6368] mb-1 block">URL</label>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') applyLink() }}
              placeholder="https://exemple.com"
              className="w-full h-8 px-3 text-sm border border-[#dadce0] rounded focus:border-[#1a73e8] focus:outline-none"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between">
            {isActive && (
              <button
                type="button"
                onClick={removeLink}
                className="text-xs text-red-500 hover:underline"
              >
                Supprimer le lien
              </button>
            )}
            <div className={cn('flex gap-2', !isActive && 'ml-auto')}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-7 px-3 text-xs rounded border border-[#dadce0] hover:bg-[#f1f3f4] text-[#444746]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={applyLink}
                className="h-7 px-3 text-xs rounded bg-[#1a73e8] text-white hover:bg-[#1557b0] transition-colors"
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================
// Bubble Menu — Flottant lors d'une sélection de texte (TipTap v3)
// ============================================================

function SelectionBubbleMenu({
  editor,
  children,
}: {
  editor: ReturnType<typeof useEditor>
  children: React.ReactNode
}) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editor) return

    const update = () => {
      const { from, to, empty } = editor.state.selection
      if (empty) {
        setRect(null)
        return
      }
      try {
        const domRect = posToDOMRect(editor.view, from, to)
        setRect(domRect)
      } catch {
        setRect(null)
      }
    }

    const onBlur = () => setRect(null)
    editor.on('selectionUpdate', update)
    editor.on('blur', onBlur)
    editor.on('focus', update)

    return () => {
      editor.off('selectionUpdate', update)
      editor.off('blur', onBlur)
      editor.off('focus', update)
    }
  }, [editor])

  if (!rect || !editor) return null

  const menuWidth = 280
  // Utiliser position: fixed (coordonnées viewport) pour fonctionner quel que soit le scroll
  const left = rect.left + rect.width / 2 - menuWidth / 2
  const top = rect.top - 46

  return createPortal(
    <div
      ref={menuRef}
      className="bubble-menu"
      style={{
        position: 'fixed',
        top: Math.max(8, top),
        left: Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8)),
        zIndex: 9999,
        width: menuWidth,
        justifyContent: 'center',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body
  )
}

// ============================================================
// Main TiptapEditor Component
// ============================================================

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  function TiptapEditor(
    {
      value,
      onChange,
      placeholder = 'Saisissez votre texte...',
      className,
      readOnly = false,
      height = 500,
      fontFamily: externalFontFamily,
      onFontFamilyChange,
      onTableEditorOpen,
      onShapeEditorOpen,
      onElementPaletteOpen,
      onQuickTemplatesOpen,
      onStylePaletteOpen,
      onWatermarkEditorOpen,
      onSignatureFieldOpen,
      onMapEmbedOpen,
      onAttachmentEmbedOpen,
      previewMode = 'screen',
    },
    ref
  ) {
    const [isMounted, setIsMounted] = useState(false)
    const [fontFamily, setFontFamily] = useState(externalFontFamily || 'Arial')
    const [fontSize, setFontSize] = useState<string>('11')
    const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

    useEffect(() => {
      setIsMounted(true)
    }, [])

    // Extension FontFamily
    const FontFamily = Extension.create({
      name: 'fontFamily',
      addOptions() {
        return { types: ['textStyle'] }
      },
      addGlobalAttributes() {
        return [
          {
            types: this.options.types,
            attributes: {
              fontFamily: {
                default: null,
                parseHTML: element => element.style.fontFamily?.replace(/['"]+/g, ''),
                renderHTML: attributes => {
                  if (!attributes.fontFamily) return {}
                  return { style: `font-family: ${attributes.fontFamily}` }
                },
              },
            },
          },
        ]
      },
      addCommands() {
        return {
          setFontFamily: (fontFamily: string) => ({ chain }) =>
            chain().setMark('textStyle', { fontFamily }).run(),
          unsetFontFamily: () => ({ chain }) =>
            chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run(),
        }
      },
    })

    // Extension FontSize
    const FontSizeExtension = Extension.create({
      name: 'fontSize',
      addOptions() {
        return { types: ['textStyle'] }
      },
      addGlobalAttributes() {
        return [
          {
            types: this.options.types,
            attributes: {
              fontSize: {
                default: null,
                parseHTML: element => element.style.fontSize?.replace(/px|pt|em|rem/g, ''),
                renderHTML: attributes => {
                  if (!attributes.fontSize) return {}
                  return { style: `font-size: ${attributes.fontSize}pt` }
                },
              },
            },
          },
        ]
      },
      addCommands() {
        return {
          setFontSize: (fontSize: string) => ({ chain }) =>
            chain().setMark('textStyle', { fontSize }).run(),
          unsetFontSize: () => ({ chain }) =>
            chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        }
      },
    })

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3, 4, 5, 6] },
          underline: false,
          link: false, // désactivé car on configure Link séparément
        }),
        Underline,
        Subscript,
        Superscript,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
          alignments: ['left', 'center', 'right', 'justify'],
        }),
        TextStyle,
        FontFamily,
        FontSizeExtension,
        Color,
        HighlightExtension.configure({ multicolor: true }),
        LineHeightExtension,
        ParagraphStyleExtension,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'tiptap-link',
            rel: 'noopener noreferrer',
          },
        }),
        Table.configure({
          resizable: true,
          allowTableNodeSelection: true,
          HTMLAttributes: { class: 'tiptap-table' },
        }),
        TableRow,
        CustomTableHeader,
        CustomTableCell,
        TiptapImage.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              'data-logo-var': {
                default: null,
                parseHTML: element => {
                  const logoVar = element.getAttribute('data-logo-var')
                  if (logoVar) {
                    return {
                      'data-logo-var': logoVar,
                      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='55'%3E%3Crect width='140' height='55' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial' font-size='10' fill='%23999'%3ELogo%3C/text%3E%3C/svg%3E",
                    }
                  }
                  return null
                },
                renderHTML: attributes => {
                  if (!attributes['data-logo-var']) return {}
                  return {
                    'data-logo-var': attributes['data-logo-var'],
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='55'%3E%3Crect width='140' height='55' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial' font-size='10' fill='%23999'%3ELogo%3C/text%3E%3C/svg%3E",
                  }
                },
              },
            }
          },
          parseHTML() {
            return [
              {
                tag: 'img[data-logo-var]',
                getAttrs: (node) => {
                  if (typeof node === 'string') return false
                  const element = node as HTMLElement
                  const logoVar = element.getAttribute('data-logo-var')
                  if (logoVar) {
                    return {
                      'data-logo-var': logoVar,
                      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2020/svg' width='140' height='55'%3E%3Crect width='140' height='55' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial' font-size='10' fill='%23999'%3ELogo%3C/text%3E%3C/svg%3E",
                    }
                  }
                  return false
                },
              },
              { tag: 'img' },
            ]
          },
        }).configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: { class: 'tiptap-image' },
        }),
        VariableExtension,
        ConditionalBlockExtension,
      ],
      content: value,
      editable: !readOnly,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class: 'document-editor focus:outline-none',
          style: `min-height: ${height}px;`,
          'data-placeholder': placeholder,
        },
        handleDrop: (view, event, _slice, moved) => {
          if (moved) return false
          const variableId = event.dataTransfer?.getData('application/x-variable-id')
          const variableLabel = event.dataTransfer?.getData('application/x-variable-label')
          const variableValue = event.dataTransfer?.getData('application/x-variable-value')
          if (variableId && variableLabel && variableValue) {
            event.preventDefault()
            const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY })
            if (coordinates) {
              const { schema } = view.state
              if (schema.nodes.variable) {
                const variableNode = schema.nodes.variable.create({ id: variableId, label: variableLabel, value: variableValue })
                const transaction = view.state.tr.insert(coordinates.pos, variableNode)
                view.dispatch(transaction)
              } else {
                const { tr } = view.state
                tr.insertText(variableValue, coordinates.pos)
                view.dispatch(tr)
              }
              return true
            }
          }
          return false
        },
        handleDOMEvents: {
          dragover: (_view, event) => {
            const hasVariable = event.dataTransfer?.types.includes('application/x-variable-id')
            if (hasVariable) { event.preventDefault(); event.dataTransfer!.dropEffect = 'copy'; return true }
            return false
          },
          dragenter: (_view, event) => {
            const hasVariable = event.dataTransfer?.types.includes('application/x-variable-id')
            if (hasVariable) { event.preventDefault(); return true }
            return false
          },
        },
      },
    })

    // Sync value
    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        Promise.resolve().then(() => {
          editor.commands.setContent(value)
        })
      }
    }, [value, editor])

    // Sync external font
    useEffect(() => {
      if (externalFontFamily && externalFontFamily !== fontFamily) {
        setFontFamily(externalFontFamily)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fontFamily is target state, omit to avoid loop
    }, [externalFontFamily])

    // Reflect font from selection
    useEffect(() => {
      if (!editor) return
      const updateFontFamily = () => {
        const { from, to } = editor.state.selection
        if (from === to) { setFontFamily(externalFontFamily || 'Arial'); return }
        const marks = editor.state.storedMarks || editor.state.selection.$from.marks()
        const fontFamilyMark = marks.find(mark => mark.type.name === 'textStyle' && mark.attrs.fontFamily)
        setFontFamily(fontFamilyMark ? fontFamilyMark.attrs.fontFamily : (externalFontFamily || 'Arial'))
      }
      editor.on('selectionUpdate', updateFontFamily)
      editor.on('transaction', updateFontFamily)
      return () => {
        editor.off('selectionUpdate', updateFontFamily)
        editor.off('transaction', updateFontFamily)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fontFamily is derived state from selection
    }, [editor, externalFontFamily])

    // Reflect fontSize from selection
    useEffect(() => {
      if (!editor) return
      const updateFontSize = () => {
        const marks = editor.state.storedMarks || editor.state.selection.$from.marks()
        const fontSizeMark = marks.find(mark => mark.type.name === 'textStyle' && mark.attrs.fontSize)
        setFontSize(fontSizeMark ? fontSizeMark.attrs.fontSize : '11')
      }
      editor.on('selectionUpdate', updateFontSize)
      return () => { editor.off('selectionUpdate', updateFontSize) }
    }, [editor])

    // Keyboard shortcut Ctrl+K for link
    useEffect(() => {
      if (!editor) return
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault()
          // The link button handles its own dialog
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [editor])

    // Sélection de ligne/colonne entière par clic sur la marge du tableau (12px gauche = ligne, 12px haut = colonne)
    useEffect(() => {
      if (!editor || readOnly) return
      const dom = editor.view.dom

      const onMouseDown = (e: MouseEvent) => {
        const cell = (e.target as HTMLElement).closest('td, th') as HTMLElement | null
        if (!cell) return
        const table = cell.closest('table')
        if (!table) return
        const tableRect = table.getBoundingClientRect()
        const isRowZone = e.clientX < tableRect.left + 12
        const isColZone = e.clientY < tableRect.top + 12
        if (!isRowZone && !isColZone) return
        e.preventDefault()
        try {
          const pos = editor.view.posAtDOM(cell, 0)
          const $cell = editor.state.doc.resolve(pos)
          const sel = isRowZone
            ? CellSelection.rowSelection($cell)
            : CellSelection.colSelection($cell)
          editor.view.dispatch(editor.state.tr.setSelection(sel))
        } catch (_) {}
      }

      dom.addEventListener('mousedown', onMouseDown)
      return () => dom.removeEventListener('mousedown', onMouseDown)
    }, [editor, readOnly])

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getEditor: () => editor,
      insertVariable: (variable: string) => {
        if (editor) {
          const cleanVariable = variable.replace(/[{}]/g, '')
          try {
            editor.chain().focus().insertVariable({ id: cleanVariable, label: cleanVariable, value: `{${cleanVariable}}` }).run()
          } catch {
            editor.chain().focus().insertContent(
              `<span data-type="variable" data-id="${cleanVariable}" data-label="${cleanVariable}" data-value="{${cleanVariable}}" style="background-color: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 4px; border: 1px solid #93C5FD; font-size: 0.875em; font-weight: 500;">{${cleanVariable}}</span>`
            ).run()
          }
        }
      },
      insertVariableNode: (id: string, label: string, value: string) => {
        if (editor) {
          try {
            editor.chain().focus().insertVariable({ id, label, value }).run()
          } catch {
            editor.chain().focus().insertContent(
              `<span data-type="variable" data-id="${id}" data-label="${label}" data-value="${value}" style="background-color: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 4px; border: 1px solid #93C5FD; font-size: 0.875em; font-weight: 500;">${label}</span>`
            ).run()
          }
        }
      },
      insertConditionalBlock: (type: 'if' | 'elseif' | 'else' = 'if') => {
        if (editor) {
          try {
            editor.chain().focus().insertConditionalBlock({ type }).run()
          } catch {
            const colors = {
              if: { border: '#14B8A6', bg: '#F0FDFA', label: 'SI' },
              elseif: { border: '#F59E0B', bg: '#FFFBEB', label: 'SINON SI' },
              else: { border: '#3B82F6', bg: '#EFF6FF', label: 'SINON' },
            }
            const c = colors[type]
            editor.chain().focus().insertContent(
              `<div style="border: 2px solid ${c.border}; background-color: ${c.bg}; padding: 16px; margin: 16px 0; border-radius: 8px;"><div style="font-size: 12px; font-weight: 600; color: ${c.border}; margin-bottom: 8px;">${c.label} : Condition...</div><p>Contenu conditionnel...</p></div>`
            ).run()
          }
        }
      },
      insertHTML: (html: string) => {
        if (editor) editor.chain().focus().insertContent(html).run()
      },
      insertTable: (rows: number = 3, cols: number = 3) => {
        if (editor) editor.chain().focus().insertTable({ rows, cols, withHeaderRow: false }).run()
      },
      insertBorderedFrame: (options?: {
        borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double'
        borderWidth?: number
        borderColor?: string
        backgroundColor?: string
        padding?: number
      }) => {
        if (editor) {
          const borderStyle = options?.borderStyle || 'solid'
          const borderWidth = options?.borderWidth || 2
          const borderColor = options?.borderColor || '#335ACF'
          const backgroundColor = options?.backgroundColor || '#F9FAFB'
          const padding = options?.padding || 15
          editor.chain().focus().insertContent(
            `<div style="border: ${borderWidth}px ${borderStyle} ${borderColor}; background-color: ${backgroundColor}; padding: ${padding}px; margin: 15px 0; border-radius: 6px; min-height: 80px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);"><p style="margin: 0; color: #4B5563; font-size: 14px; line-height: 1.6;">Contenu du cadre...</p></div>`
          ).run()
        }
      },
      insertFramedSection: (title: string = 'Titre de la section', borderColor: string = '#335ACF') => {
        if (editor) {
          editor.chain().focus().insertContent(
            `<div style="border: 2px solid ${borderColor}; background-color: #F9FAFB; margin: 15px 0; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);"><div style="background: linear-gradient(135deg, ${borderColor} 0%, ${borderColor}dd 100%); padding: 12px 15px; border-bottom: 2px solid ${borderColor};"><h3 style="margin: 0; color: white; font-size: 14px; font-weight: 600;">${title}</h3></div><div style="padding: 15px; min-height: 50px;"><p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">Contenu de la section...</p></div></div>`
          ).run()
        }
      },
      insertAdminTable: (headers: string[] = ['Champ', 'Valeur'], rows: number = 3) => {
        if (editor) {
          let tableHTML = '<table style="width: 100%; border-collapse: collapse; margin: 15px 0; border: 2px solid #335ACF; box-shadow: 0 2px 8px rgba(0,0,0,0.08); background-color: white;"><thead><tr style="background: linear-gradient(135deg, #335ACF 0%, #1E40AF 100%);">'
          headers.forEach(h => { tableHTML += `<th style="padding: 12px 15px; border: 1px solid rgba(255,255,255,0.3); text-align: left; font-weight: 600; color: white;">${h}</th>` })
          tableHTML += '</tr></thead><tbody>'
          for (let r = 0; r < rows; r++) {
            const bgColor = r % 2 === 0 ? '#FAFBFC' : '#FFFFFF'
            tableHTML += `<tr style="background-color: ${bgColor};">`
            headers.forEach((_, c) => {
              const content = c === 0 ? `Ligne ${r + 1}` : `Valeur ${r + 1}-${c + 1}`
              tableHTML += `<td style="padding: 10px 15px; border: 1px solid #E5E7EB; font-size: 13px; color: #374151;">${content}</td>`
            })
            tableHTML += '</tr>'
          }
          tableHTML += '</tbody></table>'
          editor.chain().focus().insertContent(tableHTML).run()
        }
      },
    }), [editor])

    if (!isMounted || !editor) {
      return (
        <div className={cn('h-[400px] border border-[#e0e0e0] rounded-sm bg-[#f8f9fa] animate-pulse', className)} />
      )
    }

    return (
      <TooltipProvider delayDuration={400}>
        <div className={cn('tiptap-editor flex flex-col border border-[#e0e0e0] rounded-sm overflow-hidden bg-white', className)}>

          {/* ============================================================
              TOOLBAR — Style Google Docs
              ============================================================ */}
          {!readOnly && (
            <div className="flex items-center gap-0.5 px-2 py-1 border-b border-[#e0e0e0] bg-[#f8f9fa] overflow-x-auto flex-nowrap min-h-[40px]">

              {/* Undo / Redo / Print / Recherche */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler (Ctrl+Z)">
                    <Undo className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Annuler</p><p className="text-xs text-gray-400">Ctrl+Z</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir (Ctrl+Y)">
                    <Redo className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Rétablir</p><p className="text-xs text-gray-400">Ctrl+Y</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => window.print()} title="Imprimer (Ctrl+P)">
                    <Printer className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Imprimer</p><p className="text-xs text-gray-400">Ctrl+P</p></TooltipContent>
              </Tooltip>
              <FindReplaceDialog
                editor={editor}
                trigger={
                  <GdBtnRaw title="Rechercher et remplacer (Ctrl+H)">
                    <Search className="h-[17px] w-[17px]" />
                  </GdBtnRaw>
                }
              />

              <GdSep />

              {/* Sélecteur de style */}
              <StyleDropdown editor={editor} />

              <GdSep />

              {/* Police */}
              <FontFamilyDropdown
                value={fontFamily}
                onChange={(f) => {
                  setFontFamily(f)
                  editor.chain().focus().setFontFamily(f).run()
                  if (onFontFamilyChange) setTimeout(() => onFontFamilyChange(f), 0)
                }}
              />

              <GdSep />

              {/* Taille de police */}
              <FontSizeControl
                value={fontSize}
                onChange={(s) => {
                  setFontSize(s)
                  editor.chain().focus().setFontSize(s).run()
                }}
              />

              <GdSep />

              {/* Gras / Italique / Souligné / Barré */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
                    <Bold className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Gras</p><p className="text-xs text-gray-400">Ctrl+B</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
                    <Italic className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Italique</p><p className="text-xs text-gray-400">Ctrl+I</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
                    <UnderlineIcon className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Souligné</p><p className="text-xs text-gray-400">Ctrl+U</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
                    <Strikethrough className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Barré</p><p className="text-xs text-gray-400">Ctrl+Shift+X</p></TooltipContent>
              </Tooltip>

              <GdSep />

              {/* Couleur du texte */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <ColorPickerPopover
                    type="text"
                    currentColor={editor.getAttributes('textStyle').color}
                    onColorChange={(c) => editor.chain().focus().setColor(c).run()}
                    onRemove={() => editor.chain().focus().unsetColor().run()}
                    trigger={
                      <GdBtnRaw title="Couleur du texte">
                        <div className="flex flex-col items-center gap-0">
                          <Type className="h-[15px] w-[15px]" />
                          <div
                            className="w-[15px] h-[3px] rounded-sm"
                            style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                          />
                        </div>
                      </GdBtnRaw>
                    }
                  />
                </TooltipTrigger>
                <TooltipContent><p>Couleur du texte</p></TooltipContent>
              </Tooltip>

              {/* Surlignage */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <ColorPickerPopover
                    type="highlight"
                    currentColor={editor.getAttributes('highlight').color}
                    onColorChange={(c) => editor.chain().focus().setHighlight({ color: c }).run()}
                    onRemove={() => editor.chain().focus().unsetHighlight().run()}
                    trigger={
                      <GdBtnRaw title="Couleur de surlignage">
                        <div className="flex flex-col items-center gap-0">
                          <Highlighter className="h-[15px] w-[15px]" />
                          <div
                            className="w-[15px] h-[3px] rounded-sm"
                            style={{ backgroundColor: editor.getAttributes('highlight').color || '#FFFF00' }}
                          />
                        </div>
                      </GdBtnRaw>
                    }
                  />
                </TooltipTrigger>
                <TooltipContent><p>Surlignage</p></TooltipContent>
              </Tooltip>

              <GdSep />

              {/* Lien */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <LinkButton editor={editor} />
                </TooltipTrigger>
                <TooltipContent><p>Lien</p><p className="text-xs text-gray-400">Ctrl+K</p></TooltipContent>
              </Tooltip>

              <GdSep />

              {/* Alignement */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}>
                    <AlignLeft className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Aligner à gauche</p><p className="text-xs text-gray-400">Ctrl+Shift+L</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}>
                    <AlignCenter className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Centrer</p><p className="text-xs text-gray-400">Ctrl+Shift+E</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}>
                    <AlignRight className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Aligner à droite</p><p className="text-xs text-gray-400">Ctrl+Shift+R</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })}>
                    <AlignJustify className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Justifier</p><p className="text-xs text-gray-400">Ctrl+Shift+J</p></TooltipContent>
              </Tooltip>

              <GdSep />

              {/* Interligne */}
              <LineHeightDropdown
                currentValue={editor.getAttributes('paragraph').lineHeight}
                onChange={(v) => editor.chain().focus().setLineHeight(v).run()}
                onReset={() => editor.chain().focus().unsetLineHeight().run()}
              />

              <GdSep />

              {/* Listes et retraits */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
                    <List className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Liste à puces</p><p className="text-xs text-gray-400">Ctrl+Shift+8</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
                    <ListOrdered className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Liste numérotée</p><p className="text-xs text-gray-400">Ctrl+Shift+7</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn
                    onClick={() => editor.chain().focus().liftListItem('listItem').run()}
                    disabled={!editor.can().liftListItem('listItem')}
                  >
                    <Outdent className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Diminuer le retrait</p><p className="text-xs text-gray-400">Shift+Tab</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn
                    onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
                    disabled={!editor.can().sinkListItem('listItem')}
                  >
                    <Indent className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Augmenter le retrait</p><p className="text-xs text-gray-400">Tab</p></TooltipContent>
              </Tooltip>

              <GdSep />

              {/* Tableau */}
              <TableToolbar editor={editor} />

              <GdSep />

              {/* Indice / Exposant */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')}>
                    <SubscriptIcon className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Indice</p><p className="text-xs text-gray-400">Ctrl+,</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')}>
                    <SuperscriptIcon className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Exposant</p><p className="text-xs text-gray-400">Ctrl+.</p></TooltipContent>
              </Tooltip>

              <GdSep />

              {/* Effacer formatage / Ligne horizontale */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
                    <RemoveFormatting className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Effacer le formatage</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <GdBtn onClick={() => editor.chain().focus().setHorizontalRule().run()}>
                    <Minus className="h-[17px] w-[17px]" />
                  </GdBtn>
                </TooltipTrigger>
                <TooltipContent><p>Ligne horizontale</p></TooltipContent>
              </Tooltip>

              {/* Boutons Premium */}
              {(onQuickTemplatesOpen || onTableEditorOpen || onShapeEditorOpen || onElementPaletteOpen || onStylePaletteOpen || onWatermarkEditorOpen) && (
                <>
                  <GdSep />
                  <div className="flex items-center gap-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#1a73e8] mx-1 flex-shrink-0" />
                    {onQuickTemplatesOpen && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <GdBtn onClick={onQuickTemplatesOpen}>
                            <Zap className="h-[17px] w-[17px]" />
                          </GdBtn>
                        </TooltipTrigger>
                        <TooltipContent><p>Templates rapides</p></TooltipContent>
                      </Tooltip>
                    )}
                    {onTableEditorOpen && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <GdBtn onClick={onTableEditorOpen}>
                            <TableIcon className="h-[17px] w-[17px]" />
                          </GdBtn>
                        </TooltipTrigger>
                        <TooltipContent><p>Tableau premium</p></TooltipContent>
                      </Tooltip>
                    )}
                    {onShapeEditorOpen && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <GdBtn onClick={onShapeEditorOpen}>
                            <Square className="h-[17px] w-[17px]" />
                          </GdBtn>
                        </TooltipTrigger>
                        <TooltipContent><p>Formes</p></TooltipContent>
                      </Tooltip>
                    )}
                    {onElementPaletteOpen && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <GdBtn onClick={onElementPaletteOpen}>
                            <ImageIcon className="h-[17px] w-[17px]" />
                          </GdBtn>
                        </TooltipTrigger>
                        <TooltipContent><p>Palette d'éléments</p></TooltipContent>
                      </Tooltip>
                    )}
                    {onStylePaletteOpen && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <GdBtn onClick={onStylePaletteOpen}>
                            <Type className="h-[17px] w-[17px]" />
                          </GdBtn>
                        </TooltipTrigger>
                        <TooltipContent><p>Styles prédéfinis</p></TooltipContent>
                      </Tooltip>
                    )}
                    {onWatermarkEditorOpen && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <GdBtn onClick={onWatermarkEditorOpen}>
                            <Droplet className="h-[17px] w-[17px]" />
                          </GdBtn>
                        </TooltipTrigger>
                        <TooltipContent><p>Filigrane</p></TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================
              BUBBLE MENU — Flottant lors d'une sélection de texte
              ============================================================ */}
          {!readOnly && (
            <SelectionBubbleMenu editor={editor}>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn('bubble-btn', editor.isActive('bold') && 'bubble-btn-active')}
                title="Gras"
              >
                <Bold className="h-[14px] w-[14px]" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn('bubble-btn', editor.isActive('italic') && 'bubble-btn-active')}
                title="Italique"
              >
                <Italic className="h-[14px] w-[14px]" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={cn('bubble-btn', editor.isActive('underline') && 'bubble-btn-active')}
                title="Souligné"
              >
                <UnderlineIcon className="h-[14px] w-[14px]" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={cn('bubble-btn', editor.isActive('strike') && 'bubble-btn-active')}
                title="Barré"
              >
                <Strikethrough className="h-[14px] w-[14px]" />
              </button>
              <div className="w-px h-4 bg-[#dadce0] mx-0.5" />
              <LinkButton editor={editor} compact />
              <div className="w-px h-4 bg-[#dadce0] mx-0.5" />
              <ColorPickerPopover
                type="text"
                currentColor={editor.getAttributes('textStyle').color}
                onColorChange={(c) => editor.chain().focus().setColor(c).run()}
                onRemove={() => editor.chain().focus().unsetColor().run()}
                trigger={
                  <button type="button" className="bubble-btn" title="Couleur du texte">
                    <div className="flex flex-col items-center">
                      <Type className="h-[13px] w-[13px]" />
                      <div
                        className="w-[13px] h-[2px] mt-0.5 rounded-sm"
                        style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                      />
                    </div>
                  </button>
                }
              />
              <ColorPickerPopover
                type="highlight"
                currentColor={editor.getAttributes('highlight').color}
                onColorChange={(c) => editor.chain().focus().setHighlight({ color: c }).run()}
                onRemove={() => editor.chain().focus().unsetHighlight().run()}
                trigger={
                  <button type="button" className={cn('bubble-btn', editor.isActive('highlight') && 'bubble-btn-active')} title="Surlignage">
                    <div className="flex flex-col items-center">
                      <Highlighter className="h-[13px] w-[13px]" />
                      <div
                        className="w-[13px] h-[2px] mt-0.5 rounded-sm"
                        style={{ backgroundColor: editor.getAttributes('highlight').color || '#FFFF00' }}
                      />
                    </div>
                  </button>
                }
              />
              <div className="w-px h-4 bg-[#dadce0] mx-0.5" />
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                className="bubble-btn"
                title="Effacer le formatage"
              >
                <RemoveFormatting className="h-[14px] w-[14px]" />
              </button>
            </SelectionBubbleMenu>
          )}

          {/* ============================================================
              EDITOR CONTENT
              ============================================================ */}
          <div
            onContextMenu={(e) => {
              const target = e.target as HTMLElement
              const cell = target.closest('td, th')
              if (cell && editor) {
                e.preventDefault()
                // Place le curseur dans la cellule cliquée pour que updateAttributes fonctionne
                const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY })
                if (pos) editor.commands.setTextSelection(pos.pos)
                setCtxMenu({ x: e.clientX, y: e.clientY })
              }
            }}
          >
            <EditorContent
              editor={editor}
              className={cn('prose-editor flex-1', previewMode === 'pdf' && 'pdf-preview-mode')}
            />
          </div>

          {/* Menu contextuel tableau (clic droit) */}
          {!readOnly && (
            <TableCellContextMenu
              editor={editor}
              position={ctxMenu}
              onClose={() => setCtxMenu(null)}
            />
          )}

          {/* ============================================================
              STATUS BAR
              ============================================================ */}
          {!readOnly && (
            <div className="flex items-center justify-between px-3 py-1 border-t border-[#e0e0e0] bg-[#f8f9fa] text-xs text-[#5f6368]">
              <WordCounter editor={editor} />
              <div className="flex items-center gap-2">
                {previewMode === 'pdf' && (
                  <span className="text-[#1a73e8] font-medium">● Mode aperçu PDF</span>
                )}
              </div>
            </div>
          )}

          {/* Styles globaux injectés */}
          <style jsx global>{`
            .tiptap-editor .ProseMirror {
              outline: none;
              min-height: ${height}px;
              caret-color: #1a73e8;
              font-family: Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              color: #000000;
            }

            .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              float: left;
              color: #9aa0a6;
              height: 0;
              pointer-events: none;
              font-style: italic;
            }

            .tiptap-editor .ProseMirror:focus { outline: none; }

            /* Sélection de texte */
            .tiptap-editor .ProseMirror ::selection {
              background: #b7d7f7;
            }

            /* Tables */
            .tiptap-editor .ProseMirror table {
              border-collapse: collapse;
              table-layout: fixed;
              width: 100%;
              margin: 12pt 0;
            }
            .tiptap-editor .ProseMirror table td,
            .tiptap-editor .ProseMirror table th {
              min-width: 1em;
              border: 1px solid #000000;
              padding: 8pt 10pt;
              vertical-align: top;
              box-sizing: border-box;
              position: relative;
            }
            .tiptap-editor .ProseMirror table th {
              font-weight: 600;
              text-align: left;
            }
            .tiptap-editor .ProseMirror table .selectedCell:after {
              z-index: 2;
              position: absolute;
              content: '';
              left: 0; right: 0; top: 0; bottom: 0;
              background: rgba(26, 115, 232, 0.15);
              pointer-events: none;
            }
            .tiptap-editor .ProseMirror table .column-resize-handle {
              position: absolute;
              right: -2px;
              top: 0; bottom: -2px;
              width: 4px;
              background-color: #1a73e8;
              cursor: col-resize;
              z-index: 10;
            }

            /* Liens */
            .tiptap-editor .ProseMirror a,
            .tiptap-editor .ProseMirror .tiptap-link {
              color: #1a73e8;
              text-decoration: underline;
              cursor: pointer;
            }
            .tiptap-editor .ProseMirror a:hover {
              color: #1557b0;
            }

            .tiptap-editor .ProseMirror div[style*="border"] {
              margin: 18pt 0;
              display: block;
            }

            .tiptap-editor .ProseMirror span[style*="background-color: #E0F2FE"] {
              display: inline-block;
            }

            /* Bubble menu */
            .bubble-menu {
              display: flex;
              align-items: center;
              gap: 2px;
              background: #ffffff;
              border: 1px solid #dadce0;
              border-radius: 4px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.08);
              padding: 3px 4px;
              z-index: 100;
            }
            .bubble-btn {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 26px;
              height: 26px;
              border: none;
              background: transparent;
              border-radius: 3px;
              cursor: pointer;
              color: #202124;
              transition: background-color 0.1s;
              flex-shrink: 0;
            }
            .bubble-btn:hover {
              background: #f1f3f4;
            }
            .bubble-btn-active {
              background: #e8f0fe;
              color: #1a73e8;
            }
          `}</style>
        </div>
      </TooltipProvider>
    )
  }
)

TiptapEditor.displayName = 'TiptapEditor'
