'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectRoot, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { RichTextEditorRef } from './rich-text-editor'
import type { TableProperties } from '@/lib/types/table-properties'

export type { TableProperties }

interface TablePropertiesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editorRef: React.RefObject<RichTextEditorRef>
  onInsert: (properties: TableProperties) => void
}

export function TablePropertiesModal({
  open,
  onOpenChange,
  editorRef,
  onInsert,
}: TablePropertiesModalProps) {
  const [properties, setProperties] = useState<TableProperties>({
    rows: 3,
    cols: 3,
    width: 100, // Pourcentage par défaut
    height: undefined,
    headers: 'first-row',
    cellSpacing: 1,
    borderSize: 1,
    cellPadding: 8,
    alignment: 'undefined',
    title: '',
    summary: '',
  })

  const handleInsert = () => {
    onInsert(properties)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Propriétés du tableau</DialogTitle>
          <DialogDescription>
            Configurez les propriétés du tableau avant de l'insérer dans le document.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Lignes et Colonnes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rows">Lignes</Label>
              <Input
                id="rows"
                type="number"
                min="1"
                max="20"
                value={properties.rows}
                onChange={(e) =>
                  setProperties({ ...properties, rows: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cols">Colonnes</Label>
              <Input
                id="cols"
                type="number"
                min="1"
                max="10"
                value={properties.cols}
                onChange={(e) =>
                  setProperties({ ...properties, cols: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          {/* Largeur et Hauteur */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">Largeur</Label>
              <Input
                id="width"
                type="number"
                min="0"
                max="100"
                value={properties.width || ''}
                onChange={(e) =>
                  setProperties({
                    ...properties,
                    width: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="100"
              />
              <p className="text-xs text-text-tertiary">% (0-100)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Hauteur</Label>
              <Input
                id="height"
                type="number"
                min="0"
                value={properties.height || ''}
                onChange={(e) =>
                  setProperties({
                    ...properties,
                    height: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Auto"
              />
              <p className="text-xs text-text-tertiary">px (optionnel)</p>
            </div>
          </div>

          {/* En-têtes */}
          <div className="space-y-2">
            <Label htmlFor="headers">En-têtes</Label>
            <SelectRoot
              value={properties.headers}
              onValueChange={(value: string) =>
                setProperties({ ...properties, headers: value as TableProperties['headers'] })
              }
            >
              <SelectTrigger id="headers">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                <SelectItem value="first-row">Première ligne</SelectItem>
                <SelectItem value="first-col">Première colonne</SelectItem>
                <SelectItem value="both">Première ligne et colonne</SelectItem>
              </SelectContent>
            </SelectRoot>
          </div>

          {/* Espacement et Bordures */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cellSpacing">Espacement entre les cellules</Label>
              <Input
                id="cellSpacing"
                type="number"
                min="0"
                max="10"
                value={properties.cellSpacing}
                onChange={(e) =>
                  setProperties({ ...properties, cellSpacing: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-text-tertiary">px (0-10)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="borderSize">Taille de la bordure</Label>
              <Input
                id="borderSize"
                type="number"
                min="0"
                max="5"
                value={properties.borderSize}
                onChange={(e) =>
                  setProperties({ ...properties, borderSize: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-text-tertiary">px (0-5)</p>
            </div>
          </div>

          {/* Padding et Alignement */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cellPadding">Marge interne des cellules</Label>
              <Input
                id="cellPadding"
                type="number"
                min="0"
                max="20"
                value={properties.cellPadding}
                onChange={(e) =>
                  setProperties({ ...properties, cellPadding: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-text-tertiary">px (0-20)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alignment">Alignement</Label>
              <SelectRoot
                value={properties.alignment}
                onValueChange={(value: string) =>
                  setProperties({ ...properties, alignment: value as TableProperties['alignment'] })
                }
              >
                <SelectTrigger id="alignment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undefined">Indéfini</SelectItem>
                  <SelectItem value="left">Gauche</SelectItem>
                  <SelectItem value="center">Centre</SelectItem>
                  <SelectItem value="right">Droite</SelectItem>
                </SelectContent>
              </SelectRoot>
            </div>
          </div>

          {/* Titre et Résumé */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre du tableau</Label>
            <Input
              id="title"
              type="text"
              value={properties.title || ''}
              onChange={(e) => setProperties({ ...properties, title: e.target.value })}
              placeholder="Titre du tableau (optionnel)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Résumé (description)</Label>
            <Input
              id="summary"
              type="text"
              value={properties.summary || ''}
              onChange={(e) => setProperties({ ...properties, summary: e.target.value })}
              placeholder="Description du tableau (optionnel)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleInsert}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

