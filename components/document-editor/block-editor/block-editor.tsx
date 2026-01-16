'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TiptapImage from '@tiptap/extension-image'
// Note: TaskList et TaskItem sont inclus dans StarterKit par défaut
import { Link } from '@tiptap/extension-link'
import { CodeBlock } from '@tiptap/extension-code-block'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { SlashMenu, type SlashCommand } from './slash-menu'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

export interface BlockEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
}

/**
 * Composant de bloc sortable pour le drag & drop
 */
function SortableBlock({ id, children, editor }: { id: string; children: React.ReactNode; editor: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}

/**
 * Éditeur de blocs style Notion
 */
export function BlockEditor({
  value,
  onChange,
  placeholder = 'Tapez "/" pour les commandes...',
  className,
  readOnly = false,
}: BlockEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuQuery, setSlashMenuQuery] = useState('')
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const slashMenuRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // TaskList et TaskItem sont activés par défaut dans StarterKit
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Underline,
      TiptapImage.configure({
        inline: true,
        allowBase64: true,
      }),
      // TaskList et TaskItem sont déjà inclus dans StarterKit
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 dark:bg-gray-800 rounded p-4 font-mono text-sm',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4',
          'prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
          'prose-p:text-gray-700 dark:prose-p:text-gray-300',
          'prose-strong:text-gray-900 dark:prose-strong:text-gray-100',
          'prose-code:text-gray-800 dark:prose-code:text-gray-200',
          'prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800',
          'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600',
          'prose-ul:list-disc prose-ol:list-decimal',
          'prose-img:rounded-lg prose-img:shadow-md',
          className
        ),
      },
      handleKeyDown: (view, event) => {
        // Détecter "/" pour ouvrir le menu slash
        if (event.key === '/' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          const { state, dispatch } = view
          const { selection } = state
          const { $from } = selection

          // Vérifier si on est au début d'un bloc
          if ($from.parentOffset === 0 || $from.parent.textContent.trim() === '') {
            event.preventDefault()
            
            // Calculer la position du menu
            const coords = view.coordsAtPos($from.pos)
            setSlashMenuPosition({
              top: coords.top + 20,
              left: coords.left,
            })
            
            setShowSlashMenu(true)
            setSlashMenuQuery('')
            return true
          }
        }

        // Fermer le menu avec Escape
        if (event.key === 'Escape' && showSlashMenu) {
          setShowSlashMenu(false)
          return true
        }

        return false
      },
    },
  })

  // Gérer la sélection d'une commande
  const handleSlashCommand = useCallback(
    (command: SlashCommand) => {
      if (editor) {
        // Supprimer le "/" et la requête
        const { state, dispatch } = editor.view
        const { $from } = state.selection
        const text = $from.parent.textContent
        const slashIndex = text.lastIndexOf('/')
        
        if (slashIndex !== -1) {
          const tr = state.tr
          tr.delete($from.start() + slashIndex, $from.pos)
          dispatch(tr)
        }

        // Exécuter la commande
        command.command(editor)
        setShowSlashMenu(false)
        editor.commands.focus()
      }
    },
    [editor]
  )

  // Mettre à jour la requête du menu slash
  useEffect(() => {
    if (!editor || !showSlashMenu) return

    const updateSlashQuery = () => {
      const { state } = editor.view
      const { $from } = state.selection
      const text = $from.parent.textContent
      const slashIndex = text.lastIndexOf('/')
      
      if (slashIndex !== -1) {
        const query = text.substring(slashIndex + 1).trim()
        setSlashMenuQuery(query)
      } else {
        setShowSlashMenu(false)
      }
    }

    editor.on('selectionUpdate', updateSlashQuery)
    editor.on('update', updateSlashQuery)

    return () => {
      editor.off('selectionUpdate', updateSlashQuery)
      editor.off('update', updateSlashQuery)
    }
  }, [editor, showSlashMenu])

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    if (!showSlashMenu) return

    const handleClickOutside = (event: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(event.target as Node)) {
        setShowSlashMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSlashMenu])

  if (!editor) {
    return null
  }

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      
      {showSlashMenu && (
        <div
          ref={slashMenuRef}
          style={{
            position: 'absolute',
            top: `${slashMenuPosition.top}px`,
            left: `${slashMenuPosition.left}px`,
          }}
        >
          <SlashMenu editor={editor} query={slashMenuQuery} onSelect={handleSlashCommand} />
        </div>
      )}
    </div>
  )
}


import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TiptapImage from '@tiptap/extension-image'
// Note: TaskList et TaskItem sont inclus dans StarterKit par défaut
import { Link } from '@tiptap/extension-link'
import { CodeBlock } from '@tiptap/extension-code-block'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { SlashMenu, type SlashCommand } from './slash-menu'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

export interface BlockEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
}

/**
 * Composant de bloc sortable pour le drag & drop
 */
function SortableBlock({ id, children, editor }: { id: string; children: React.ReactNode; editor: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}

/**
 * Éditeur de blocs style Notion
 */
export function BlockEditor({
  value,
  onChange,
  placeholder = 'Tapez "/" pour les commandes...',
  className,
  readOnly = false,
}: BlockEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuQuery, setSlashMenuQuery] = useState('')
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const slashMenuRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // TaskList et TaskItem sont activés par défaut dans StarterKit
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Underline,
      TiptapImage.configure({
        inline: true,
        allowBase64: true,
      }),
      // TaskList et TaskItem sont déjà inclus dans StarterKit
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 dark:bg-gray-800 rounded p-4 font-mono text-sm',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4',
          'prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
          'prose-p:text-gray-700 dark:prose-p:text-gray-300',
          'prose-strong:text-gray-900 dark:prose-strong:text-gray-100',
          'prose-code:text-gray-800 dark:prose-code:text-gray-200',
          'prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800',
          'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600',
          'prose-ul:list-disc prose-ol:list-decimal',
          'prose-img:rounded-lg prose-img:shadow-md',
          className
        ),
      },
      handleKeyDown: (view, event) => {
        // Détecter "/" pour ouvrir le menu slash
        if (event.key === '/' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          const { state, dispatch } = view
          const { selection } = state
          const { $from } = selection

          // Vérifier si on est au début d'un bloc
          if ($from.parentOffset === 0 || $from.parent.textContent.trim() === '') {
            event.preventDefault()
            
            // Calculer la position du menu
            const coords = view.coordsAtPos($from.pos)
            setSlashMenuPosition({
              top: coords.top + 20,
              left: coords.left,
            })
            
            setShowSlashMenu(true)
            setSlashMenuQuery('')
            return true
          }
        }

        // Fermer le menu avec Escape
        if (event.key === 'Escape' && showSlashMenu) {
          setShowSlashMenu(false)
          return true
        }

        return false
      },
    },
  })

  // Gérer la sélection d'une commande
  const handleSlashCommand = useCallback(
    (command: SlashCommand) => {
      if (editor) {
        // Supprimer le "/" et la requête
        const { state, dispatch } = editor.view
        const { $from } = state.selection
        const text = $from.parent.textContent
        const slashIndex = text.lastIndexOf('/')
        
        if (slashIndex !== -1) {
          const tr = state.tr
          tr.delete($from.start() + slashIndex, $from.pos)
          dispatch(tr)
        }

        // Exécuter la commande
        command.command(editor)
        setShowSlashMenu(false)
        editor.commands.focus()
      }
    },
    [editor]
  )

  // Mettre à jour la requête du menu slash
  useEffect(() => {
    if (!editor || !showSlashMenu) return

    const updateSlashQuery = () => {
      const { state } = editor.view
      const { $from } = state.selection
      const text = $from.parent.textContent
      const slashIndex = text.lastIndexOf('/')
      
      if (slashIndex !== -1) {
        const query = text.substring(slashIndex + 1).trim()
        setSlashMenuQuery(query)
      } else {
        setShowSlashMenu(false)
      }
    }

    editor.on('selectionUpdate', updateSlashQuery)
    editor.on('update', updateSlashQuery)

    return () => {
      editor.off('selectionUpdate', updateSlashQuery)
      editor.off('update', updateSlashQuery)
    }
  }, [editor, showSlashMenu])

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    if (!showSlashMenu) return

    const handleClickOutside = (event: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(event.target as Node)) {
        setShowSlashMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSlashMenu])

  if (!editor) {
    return null
  }

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      
      {showSlashMenu && (
        <div
          ref={slashMenuRef}
          style={{
            position: 'absolute',
            top: `${slashMenuPosition.top}px`,
            left: `${slashMenuPosition.left}px`,
          }}
        >
          <SlashMenu editor={editor} query={slashMenuQuery} onSelect={handleSlashCommand} />
        </div>
      )}
    </div>
  )
}


import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TiptapImage from '@tiptap/extension-image'
// Note: TaskList et TaskItem sont inclus dans StarterKit par défaut
import { Link } from '@tiptap/extension-link'
import { CodeBlock } from '@tiptap/extension-code-block'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { SlashMenu, type SlashCommand } from './slash-menu'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

export interface BlockEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  readOnly?: boolean
}

/**
 * Composant de bloc sortable pour le drag & drop
 */
function SortableBlock({ id, children, editor }: { id: string; children: React.ReactNode; editor: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}

/**
 * Éditeur de blocs style Notion
 */
export function BlockEditor({
  value,
  onChange,
  placeholder = 'Tapez "/" pour les commandes...',
  className,
  readOnly = false,
}: BlockEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuQuery, setSlashMenuQuery] = useState('')
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const slashMenuRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // TaskList et TaskItem sont activés par défaut dans StarterKit
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      Underline,
      TiptapImage.configure({
        inline: true,
        allowBase64: true,
      }),
      // TaskList et TaskItem sont déjà inclus dans StarterKit
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 dark:bg-gray-800 rounded p-4 font-mono text-sm',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] p-4',
          'prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100',
          'prose-p:text-gray-700 dark:prose-p:text-gray-300',
          'prose-strong:text-gray-900 dark:prose-strong:text-gray-100',
          'prose-code:text-gray-800 dark:prose-code:text-gray-200',
          'prose-pre:bg-gray-100 dark:prose-pre:bg-gray-800',
          'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600',
          'prose-ul:list-disc prose-ol:list-decimal',
          'prose-img:rounded-lg prose-img:shadow-md',
          className
        ),
      },
      handleKeyDown: (view, event) => {
        // Détecter "/" pour ouvrir le menu slash
        if (event.key === '/' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          const { state, dispatch } = view
          const { selection } = state
          const { $from } = selection

          // Vérifier si on est au début d'un bloc
          if ($from.parentOffset === 0 || $from.parent.textContent.trim() === '') {
            event.preventDefault()
            
            // Calculer la position du menu
            const coords = view.coordsAtPos($from.pos)
            setSlashMenuPosition({
              top: coords.top + 20,
              left: coords.left,
            })
            
            setShowSlashMenu(true)
            setSlashMenuQuery('')
            return true
          }
        }

        // Fermer le menu avec Escape
        if (event.key === 'Escape' && showSlashMenu) {
          setShowSlashMenu(false)
          return true
        }

        return false
      },
    },
  })

  // Gérer la sélection d'une commande
  const handleSlashCommand = useCallback(
    (command: SlashCommand) => {
      if (editor) {
        // Supprimer le "/" et la requête
        const { state, dispatch } = editor.view
        const { $from } = state.selection
        const text = $from.parent.textContent
        const slashIndex = text.lastIndexOf('/')
        
        if (slashIndex !== -1) {
          const tr = state.tr
          tr.delete($from.start() + slashIndex, $from.pos)
          dispatch(tr)
        }

        // Exécuter la commande
        command.command(editor)
        setShowSlashMenu(false)
        editor.commands.focus()
      }
    },
    [editor]
  )

  // Mettre à jour la requête du menu slash
  useEffect(() => {
    if (!editor || !showSlashMenu) return

    const updateSlashQuery = () => {
      const { state } = editor.view
      const { $from } = state.selection
      const text = $from.parent.textContent
      const slashIndex = text.lastIndexOf('/')
      
      if (slashIndex !== -1) {
        const query = text.substring(slashIndex + 1).trim()
        setSlashMenuQuery(query)
      } else {
        setShowSlashMenu(false)
      }
    }

    editor.on('selectionUpdate', updateSlashQuery)
    editor.on('update', updateSlashQuery)

    return () => {
      editor.off('selectionUpdate', updateSlashQuery)
      editor.off('update', updateSlashQuery)
    }
  }, [editor, showSlashMenu])

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    if (!showSlashMenu) return

    const handleClickOutside = (event: MouseEvent) => {
      if (slashMenuRef.current && !slashMenuRef.current.contains(event.target as Node)) {
        setShowSlashMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSlashMenu])

  if (!editor) {
    return null
  }

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      
      {showSlashMenu && (
        <div
          ref={slashMenuRef}
          style={{
            position: 'absolute',
            top: `${slashMenuPosition.top}px`,
            left: `${slashMenuPosition.left}px`,
          }}
        >
          <SlashMenu editor={editor} query={slashMenuQuery} onSelect={handleSlashCommand} />
        </div>
      )}
    </div>
  )
}





