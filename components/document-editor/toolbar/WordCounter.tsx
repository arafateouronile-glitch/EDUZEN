'use client'

import { useEffect, useState } from 'react'
import { FileText, Type, Hash } from 'lucide-react'
import type { Editor } from '@tiptap/react'

export interface WordCounterProps {
  editor: Editor | null
  className?: string
}

interface WordStats {
  characters: number
  charactersWithSpaces: number
  words: number
  paragraphs: number
}

export function WordCounter({ editor, className }: WordCounterProps) {
  const [stats, setStats] = useState<WordStats>({
    characters: 0,
    charactersWithSpaces: 0,
    words: 0,
    paragraphs: 0,
  })

  useEffect(() => {
    if (!editor) return

    const updateStats = () => {
      const text = editor.getText()
      const html = editor.getHTML()

      // Caractères sans espaces
      const charactersWithoutSpaces = text.replace(/\s/g, '').length

      // Caractères avec espaces
      const charactersWithSpaces = text.length

      // Mots (séparés par espaces, ponctuation, etc.)
      const words = text.trim().split(/\s+/).filter(word => word.length > 0).length

      // Paragraphes (compter les balises <p> dans le HTML)
      const paragraphMatches = html.match(/<p[^>]*>/g)
      const paragraphs = paragraphMatches ? paragraphMatches.length : 1

      setStats({
        characters: charactersWithoutSpaces,
        charactersWithSpaces,
        words,
        paragraphs,
      })
    }

    // Mettre à jour les stats initialement
    updateStats()

    // Écouter les changements
    editor.on('update', updateStats)
    editor.on('selectionUpdate', updateStats)

    return () => {
      editor.off('update', updateStats)
      editor.off('selectionUpdate', updateStats)
    }
  }, [editor])

  if (!editor) return null

  return (
    <div className={`flex items-center gap-4 text-xs text-gray-500 ${className || ''}`}>
      <div className="flex items-center gap-1" title="Mots">
        <FileText className="h-3.5 w-3.5" />
        <span>{stats.words} mot{stats.words > 1 ? 's' : ''}</span>
      </div>
      <div className="flex items-center gap-1" title="Caractères (sans espaces)">
        <Type className="h-3.5 w-3.5" />
        <span>{stats.characters} car.</span>
      </div>
      <div className="flex items-center gap-1" title="Caractères (avec espaces)">
        <Hash className="h-3.5 w-3.5" />
        <span>{stats.charactersWithSpaces}</span>
      </div>
    </div>
  )
}

export default WordCounter
