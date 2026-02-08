'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Replace, ChevronUp, ChevronDown, X } from 'lucide-react'
import type { Editor } from '@tiptap/react'

export interface FindReplaceDialogProps {
  editor: Editor
  trigger?: React.ReactNode
}

export function FindReplaceDialog({ editor, trigger }: FindReplaceDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatch, setCurrentMatch] = useState(0)

  // Fonction pour rechercher et surligner les occurrences
  const findMatches = useCallback(() => {
    if (!editor || !searchTerm) {
      setMatchCount(0)
      setCurrentMatch(0)
      return
    }

    const content = editor.getText()
    const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase()
    const textToSearch = caseSensitive ? content : content.toLowerCase()

    let count = 0
    let pos = 0
    while ((pos = textToSearch.indexOf(searchText, pos)) !== -1) {
      count++
      pos += searchText.length
    }

    setMatchCount(count)
    if (count > 0 && currentMatch === 0) {
      setCurrentMatch(1)
    } else if (count === 0) {
      setCurrentMatch(0)
    }
  }, [editor, searchTerm, caseSensitive, currentMatch])

  useEffect(() => {
    findMatches()
  }, [searchTerm, caseSensitive, findMatches])

  // Aller à l'occurrence suivante
  const findNext = () => {
    if (!editor || !searchTerm || matchCount === 0) return

    const content = editor.getText()
    const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase()
    const textToSearch = caseSensitive ? content : content.toLowerCase()

    // Trouver toutes les positions
    const positions: number[] = []
    let pos = 0
    while ((pos = textToSearch.indexOf(searchText, pos)) !== -1) {
      positions.push(pos)
      pos += searchText.length
    }

    if (positions.length > 0) {
      const nextIndex = currentMatch >= positions.length ? 0 : currentMatch
      const targetPos = positions[nextIndex]

      // Sélectionner le texte trouvé
      editor.chain().focus().setTextSelection({
        from: targetPos + 1,
        to: targetPos + 1 + searchTerm.length
      }).run()

      setCurrentMatch(nextIndex + 1)
    }
  }

  // Aller à l'occurrence précédente
  const findPrevious = () => {
    if (!editor || !searchTerm || matchCount === 0) return

    const content = editor.getText()
    const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase()
    const textToSearch = caseSensitive ? content : content.toLowerCase()

    // Trouver toutes les positions
    const positions: number[] = []
    let pos = 0
    while ((pos = textToSearch.indexOf(searchText, pos)) !== -1) {
      positions.push(pos)
      pos += searchText.length
    }

    if (positions.length > 0) {
      const prevIndex = currentMatch <= 1 ? positions.length - 1 : currentMatch - 2
      const targetPos = positions[prevIndex]

      // Sélectionner le texte trouvé
      editor.chain().focus().setTextSelection({
        from: targetPos + 1,
        to: targetPos + 1 + searchTerm.length
      }).run()

      setCurrentMatch(prevIndex + 1)
    }
  }

  // Remplacer l'occurrence actuelle
  const replaceOne = () => {
    if (!editor || !searchTerm) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)

    const compareText = caseSensitive ? selectedText : selectedText.toLowerCase()
    const searchText = caseSensitive ? searchTerm : searchTerm.toLowerCase()

    if (compareText === searchText) {
      editor.chain().focus().deleteSelection().insertContent(replaceTerm).run()
      findMatches()
      findNext()
    } else {
      findNext()
    }
  }

  // Remplacer toutes les occurrences
  const replaceAll = () => {
    if (!editor || !searchTerm) return

    const content = editor.getHTML()
    const regex = new RegExp(
      searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      caseSensitive ? 'g' : 'gi'
    )
    const newContent = content.replace(regex, replaceTerm)

    editor.commands.setContent(newContent)
    setMatchCount(0)
    setCurrentMatch(0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Search className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rechercher et remplacer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rechercher */}
          <div className="space-y-2">
            <Label htmlFor="search">Rechercher</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Texte à rechercher..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    findNext()
                  }
                }}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={findPrevious}
                disabled={matchCount === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={findNext}
                disabled={matchCount === 0}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {matchCount > 0
                ? `${currentMatch} sur ${matchCount} résultat${matchCount > 1 ? 's' : ''}`
                : searchTerm ? 'Aucun résultat' : ''}
            </p>
          </div>

          {/* Remplacer */}
          <div className="space-y-2">
            <Label htmlFor="replace">Remplacer par</Label>
            <div className="flex gap-2">
              <Input
                id="replace"
                value={replaceTerm}
                onChange={(e) => setReplaceTerm(e.target.value)}
                placeholder="Texte de remplacement..."
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={replaceOne}
                disabled={matchCount === 0}
              >
                <Replace className="h-4 w-4 mr-1" />
                1
              </Button>
              <Button
                variant="outline"
                onClick={replaceAll}
                disabled={matchCount === 0}
              >
                Tous
              </Button>
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="case-sensitive"
              checked={caseSensitive}
              onCheckedChange={(checked) => setCaseSensitive(checked === true)}
            />
            <Label htmlFor="case-sensitive" className="text-sm font-normal">
              Respecter la casse
            </Label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FindReplaceDialog
