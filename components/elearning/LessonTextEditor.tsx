'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Extension, posToDOMRect } from '@tiptap/core'
import { Bold, Italic, List, ListOrdered, Palette, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// @tiptap/react v3 n'a plus de composant BubbleMenu — on repositionne un
// portail sur la sélection courante (même approche que components/ui/tiptap-editor.tsx).

const FONT_FAMILIES = [
  { label: 'Par défaut', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
]

const TEXT_COLORS = ['#111827', '#dc2626', '#d97706', '#16a34a', '#2563eb', '#7c3aed', '#db2777']

const FontFamily = Extension.create({
  name: 'fontFamily',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontFamily: {
          default: null,
          parseHTML: (el: HTMLElement) => el.style.fontFamily || null,
          renderHTML: (attrs: { fontFamily?: string | null }) =>
            attrs.fontFamily ? { style: `font-family: ${attrs.fontFamily}` } : {},
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontFamily: (fontFamily: string) => ({ chain }: any) =>
        chain().setMark('textStyle', { fontFamily }).run(),
      unsetFontFamily: () => ({ chain }: any) =>
        chain().setMark('textStyle', { fontFamily: null }).removeEmptyTextStyle().run(),
    } as any
  },
})

function ToolbarButton({
  active, onClick, children, title,
}: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors',
        active && 'bg-white/20 text-white'
      )}
    >
      {children}
    </button>
  )
}

function SelectionToolbar({ editor }: { editor: Editor | null }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [openMenu, setOpenMenu] = useState<'font' | 'color' | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editor) return

    const update = () => {
      const { from, to, empty } = editor.state.selection
      if (empty) {
        setRect(null)
        setOpenMenu(null)
        return
      }
      try {
        setRect(posToDOMRect(editor.view, from, to))
      } catch {
        setRect(null)
      }
    }
    const onBlur = () => {
      // Laisse le temps à un clic sur la toolbar de s'exécuter avant de la masquer
      setTimeout(() => {
        if (!wrapperRef.current?.contains(document.activeElement)) {
          setRect(null)
          setOpenMenu(null)
        }
      }, 0)
    }

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

  const width = 260
  const left = Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8))
  const top = Math.max(8, rect.top - 44)

  return createPortal(
    <div
      ref={wrapperRef}
      style={{ position: 'fixed', top, left, zIndex: 9999, width }}
      className="relative flex items-center gap-0.5 px-1.5 py-1 bg-gray-900 rounded-lg shadow-xl"
    >
      <ToolbarButton title="Gras" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Italique" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Liste à puces" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Liste numérotée" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <div className="w-px h-4 bg-white/15 mx-0.5" />

      <div className="relative">
        <ToolbarButton title="Couleur du texte" onClick={() => setOpenMenu(m => (m === 'color' ? null : 'color'))}>
          <Palette className="h-3.5 w-3.5" />
        </ToolbarButton>
        {openMenu === 'color' && (
          <div
            onMouseDown={e => e.preventDefault()}
            className="absolute top-full left-0 mt-1.5 flex items-center gap-1 p-1.5 bg-gray-900 rounded-lg shadow-xl"
          >
            {TEXT_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { editor.chain().focus().setColor(c).run(); setOpenMenu(null) }}
                className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => setOpenMenu(m => (m === 'font' ? null : 'font'))}
          className="flex items-center gap-0.5 px-1.5 py-1 rounded hover:bg-white/10 text-white/80 hover:text-white text-[11px] font-medium transition-colors"
        >
          Police
          <ChevronDown className="h-3 w-3" />
        </button>
        {openMenu === 'font' && (
          <div
            onMouseDown={e => e.preventDefault()}
            className="absolute top-full right-0 mt-1.5 w-40 py-1 bg-gray-900 rounded-lg shadow-xl max-h-56 overflow-y-auto"
          >
            {FONT_FAMILIES.map(f => (
              <button
                key={f.label}
                type="button"
                onClick={() => {
                  if (f.value) editor.chain().focus().setFontFamily(f.value).run()
                  else editor.chain().focus().unsetFontFamily().run()
                  setOpenMenu(null)
                }}
                style={{ fontFamily: f.value || undefined }}
                className="w-full text-left px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export function LessonTextEditor({
  value, onChange, placeholder = 'Contenu du bloc...',
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      TextStyle,
      FontFamily,
      Color,
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: cn(
          'text-sm text-gray-600 leading-relaxed w-full focus:outline-none',
          '[&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:mb-3 [&_ul]:pl-5 [&_ul]:list-disc',
          '[&_ol]:mb-3 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:mb-1'
        ),
      },
    },
    immediatelyRender: false,
  })

  // Synchronise le contenu si la valeur change de l'extérieur (ex: reset de bloc)
  useEffect(() => {
    if (editor && !editor.isFocused && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  const isEmpty = !!editor && editor.isEmpty

  return (
    <div className="relative">
      <SelectionToolbar editor={editor} />
      {isEmpty && (
        <p className="absolute top-0 left-0 text-sm text-gray-400 pointer-events-none select-none">
          {placeholder}
        </p>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
