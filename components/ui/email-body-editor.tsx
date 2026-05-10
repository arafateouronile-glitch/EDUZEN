'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useCallback } from 'react'
import { VariableExtension } from '@/components/document-editor/extensions/VariableExtension'
import { convertTagsToVariableNodes, convertVariableNodesToTags } from '@/lib/utils/document-generation/template-converter'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Undo,
  Redo,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import '@/components/document-editor/editor-styles.css'

interface EmailBodyEditorProps {
  value: string
  onChange: (html: string) => void
  availableVariables: string[]
  placeholder?: string
  className?: string
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded text-sm transition-colors',
        active
          ? 'bg-[#e8f0fe] text-[#1a73e8]'
          : 'text-gray-700 hover:bg-[#f1f3f4]',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

export function EmailBodyEditor({
  value,
  onChange,
  availableVariables,
  placeholder,
  className,
}: EmailBodyEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      VariableExtension,
    ],
    content: convertTagsToVariableNodes(value || ''),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(convertVariableNodesToTags(html))
    },
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[180px] px-3 py-2 text-sm text-gray-800 leading-relaxed',
      },
    },
  })

  // Sync external value changes into the editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const current = convertVariableNodesToTags(editor.getHTML())
    if (current !== value) {
      editor.commands.setContent(convertTagsToVariableNodes(value || ''), { emitUpdate: false })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const insertVariable = useCallback(
    (varName: string) => {
      if (!editor) return
      editor.chain().focus().insertVariable({
        id: varName,
        label: varName,
        value: `{${varName}}`,
      }).run()
    },
    [editor]
  )

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL du lien :', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  return (
    <div className={cn('border rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-400 transition-shadow', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-[#f8f9fa]">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annuler">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rétablir">
          <Redo className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Gras">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italique">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Souligné">
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Liste à puces">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Liste numérotée">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Aligner à gauche">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Centrer">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Aligner à droite">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Insérer un lien">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editable area */}
      <div className="bg-white relative">
        {!editor.getText() && placeholder && (
          <p className="absolute top-2 left-3 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <EditorContent editor={editor} />
      </div>

      {/* Variable insertion panel */}
      {availableVariables.length > 0 && (
        <div className="border-t px-3 py-2 bg-[#f8f9fa]">
          <p className="text-xs text-gray-500 mb-1.5 font-medium">Cliquer pour insérer une variable :</p>
          <div className="flex flex-wrap gap-1">
            {availableVariables.map((varName) => (
              <button
                key={varName}
                type="button"
                onClick={() => insertVariable(varName)}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors"
                title={`Insérer {${varName}}`}
              >
                <span className="text-blue-500">{'{'}</span>
                {varName}
                <span className="text-blue-500">{'}'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
