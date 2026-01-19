'use client'

import React from 'react'
import { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'

export interface SlashCommand {
  name: string
  description: string
  icon?: React.ComponentType<{ className?: string }>
  command: (editor: Editor) => void
}

interface SlashMenuProps {
  editor: Editor
  query: string
  onSelect: (command: SlashCommand) => void
}

const defaultCommands: SlashCommand[] = [
  {
    name: 'Heading 1',
    description: 'Big section heading',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    name: 'Heading 2',
    description: 'Medium section heading',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    name: 'Heading 3',
    description: 'Small section heading',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    name: 'Bullet List',
    description: 'Create a bullet list',
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    name: 'Numbered List',
    description: 'Create a numbered list',
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    name: 'Quote',
    description: 'Create a quote block',
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    name: 'Code Block',
    description: 'Create a code block',
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
]

export function SlashMenu({ editor, query, onSelect }: SlashMenuProps) {
  const filteredCommands = React.useMemo(() => {
    if (!query) return defaultCommands
    const lowerQuery = query.toLowerCase()
    return defaultCommands.filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery)
    )
  }, [query])

  const [selectedIndex, setSelectedIndex] = React.useState(0)

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredCommands, selectedIndex, onSelect])

  if (filteredCommands.length === 0) {
    return null
  }

  return (
    <div className="absolute z-50 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="py-1">
        {filteredCommands.map((command, index) => (
          <button
            key={command.name}
            type="button"
            onClick={() => onSelect(command)}
            className={cn(
              'w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
              index === selectedIndex && 'bg-gray-100 dark:bg-gray-700'
            )}
          >
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {command.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {command.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
