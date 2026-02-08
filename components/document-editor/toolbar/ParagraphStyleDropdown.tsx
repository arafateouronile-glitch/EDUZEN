'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Type, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6, Quote, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Editor } from '@tiptap/react'

export interface ParagraphStyleDropdownProps {
  editor: Editor
  className?: string
}

interface StyleOption {
  id: string
  label: string
  icon: React.ReactNode
  description: string
  action: (editor: Editor) => void
  isActive: (editor: Editor) => boolean
}

const styleOptions: StyleOption[] = [
  {
    id: 'paragraph',
    label: 'Normal',
    icon: <Type className="h-4 w-4" />,
    description: 'Texte normal',
    action: (editor) => editor.chain().focus().setParagraph().run(),
    isActive: (editor) => editor.isActive('paragraph') && !editor.isActive('heading'),
  },
  {
    id: 'heading1',
    label: 'Titre 1',
    icon: <Heading1 className="h-4 w-4" />,
    description: 'Grand titre principal',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
  },
  {
    id: 'heading2',
    label: 'Titre 2',
    icon: <Heading2 className="h-4 w-4" />,
    description: 'Section principale',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
  },
  {
    id: 'heading3',
    label: 'Titre 3',
    icon: <Heading3 className="h-4 w-4" />,
    description: 'Sous-section',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
  },
  {
    id: 'heading4',
    label: 'Titre 4',
    icon: <Heading4 className="h-4 w-4" />,
    description: 'Petit titre',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 4 }),
  },
  {
    id: 'heading5',
    label: 'Titre 5',
    icon: <Heading5 className="h-4 w-4" />,
    description: 'Très petit titre',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 5 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 5 }),
  },
  {
    id: 'heading6',
    label: 'Titre 6',
    icon: <Heading6 className="h-4 w-4" />,
    description: 'Le plus petit titre',
    action: (editor) => editor.chain().focus().toggleHeading({ level: 6 }).run(),
    isActive: (editor) => editor.isActive('heading', { level: 6 }),
  },
  {
    id: 'blockquote',
    label: 'Citation',
    icon: <Quote className="h-4 w-4" />,
    description: 'Bloc de citation',
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    isActive: (editor) => editor.isActive('blockquote'),
  },
  {
    id: 'codeblock',
    label: 'Code',
    icon: <Code className="h-4 w-4" />,
    description: 'Bloc de code',
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    isActive: (editor) => editor.isActive('codeBlock'),
  },
]

export function ParagraphStyleDropdown({ editor, className }: ParagraphStyleDropdownProps) {
  const [currentStyle, setCurrentStyle] = useState<StyleOption>(styleOptions[0])

  useEffect(() => {
    if (!editor) return

    const updateCurrentStyle = () => {
      const activeStyle = styleOptions.find(style => style.isActive(editor))
      setCurrentStyle(activeStyle || styleOptions[0])
    }

    updateCurrentStyle()
    editor.on('selectionUpdate', updateCurrentStyle)
    editor.on('transaction', updateCurrentStyle)

    return () => {
      editor.off('selectionUpdate', updateCurrentStyle)
      editor.off('transaction', updateCurrentStyle)
    }
  }, [editor])

  if (!editor) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 gap-1 px-2 min-w-[120px] justify-between', className)}
        >
          <span className="flex items-center gap-1.5">
            {currentStyle.icon}
            <span className="text-xs font-medium">{currentStyle.label}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {styleOptions.slice(0, 7).map((style) => (
          <DropdownMenuItem
            key={style.id}
            onClick={() => style.action(editor)}
            className={cn(
              'flex items-center gap-3 cursor-pointer',
              style.isActive(editor) && 'bg-blue-50 text-blue-600'
            )}
          >
            {style.icon}
            <div className="flex flex-col">
              <span className="font-medium">{style.label}</span>
              <span className="text-xs text-muted-foreground">{style.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {styleOptions.slice(7).map((style) => (
          <DropdownMenuItem
            key={style.id}
            onClick={() => style.action(editor)}
            className={cn(
              'flex items-center gap-3 cursor-pointer',
              style.isActive(editor) && 'bg-blue-50 text-blue-600'
            )}
          >
            {style.icon}
            <div className="flex flex-col">
              <span className="font-medium">{style.label}</span>
              <span className="text-xs text-muted-foreground">{style.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ParagraphStyleDropdown
