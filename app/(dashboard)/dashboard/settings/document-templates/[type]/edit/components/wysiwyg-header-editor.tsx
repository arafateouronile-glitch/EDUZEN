'use client'

import { useRef, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { RichTextEditor, type RichTextEditorRef } from '@/components/ui/rich-text-editor'
import { TableFrameToolbar } from '@/components/ui/table-frame-toolbar'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import { convertTagsToVariableNodes, convertVariableNodesToTags } from '@/lib/utils/document-generation/template-converter'

interface WysiwygHeaderEditorProps {
  template: DocumentTemplate
  onTemplateChange: (updates: Partial<DocumentTemplate>) => void
  onEditorRefReady?: (ref: { insertVariable: (variable: string) => void }) => void
  isActive?: boolean
}

export function WysiwygHeaderEditor({ template, onTemplateChange, onEditorRefReady, isActive }: WysiwygHeaderEditorProps) {
  const editorRef = useRef<RichTextEditorRef>(null)
  const isSyncingFromTemplateRef = useRef(false)
  const [headerContent, setHeaderContent] = useState(() => {
    const content = (template.header as any)?.content
    const rawContent = content || ''
    // Convertir les balises {variable} en nodes TipTap lors du chargement initial
    return convertTagsToVariableNodes(rawContent)
  })

  // Exposer la référence de l'éditeur quand il est actif
  const lastActiveRef = useRef(false)
  useEffect(() => {
    // Ne mettre à jour que si l'état actif change
    if (isActive && !lastActiveRef.current && editorRef.current && onEditorRefReady) {
      lastActiveRef.current = true
      onEditorRefReady({
        insertVariable: (variable: string) => {
          editorRef.current?.insertVariable(variable)
        }
      })
    } else if (!isActive) {
      lastActiveRef.current = false
    }
  }, [isActive, onEditorRefReady])

  const header = template.header || {
    enabled: true,
    height: 100,
    elements: [],
    repeatOnAllPages: true,
    content: '',
  }

  const handleUpdateHeader = (updates: Partial<typeof header>) => {
    onTemplateChange({
      header: { ...header, ...updates },
      header_enabled: updates.enabled !== undefined ? updates.enabled : template.header_enabled,
      header_height: updates.height !== undefined ? updates.height : template.header_height,
    })
  }

  const handleContentChange = (content: string) => {
    // Ne pas déclencher onTemplateChange si on est en train de synchroniser depuis le template
    if (isSyncingFromTemplateRef.current) {
      return
    }
    
    setHeaderContent(content)
    // Convertir les nodes TipTap <span data-type="variable"> en balises {variable} pour la sauvegarde
    const convertedContent = convertVariableNodesToTags(content)
    handleUpdateHeader({ content: convertedContent })
  }

  // Synchroniser le contenu quand le template change
  useEffect(() => {
    if (isSyncingFromTemplateRef.current) {
      return
    }
    
    const content = (template.header as any)?.content || ''
    // Convertir le contenu du template en nodes TipTap pour la comparaison
    const convertedTemplateContent = convertTagsToVariableNodes(content)
    
    // Synchroniser seulement si le contenu est vraiment différent
    if (convertedTemplateContent !== headerContent) {
      isSyncingFromTemplateRef.current = true
      setHeaderContent(convertedTemplateContent)
      // Réinitialiser le flag après un court délai
      setTimeout(() => {
        isSyncingFromTemplateRef.current = false
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.header])

  return (
    <div className="space-y-4">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration de l'en-tête</CardTitle>
            <CardDescription>Personnalisez l'apparence et le contenu de l'en-tête</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Activer/Désactiver */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Afficher l'en-tête</Label>
                <p className="text-sm text-text-tertiary">Afficher l'en-tête sur toutes les pages</p>
              </div>
              <Switch
                checked={template.header_enabled}
                onCheckedChange={(checked) => {
                  onTemplateChange({ header_enabled: checked })
                }}
              />
            </div>

            {/* Hauteur */}
            <div className="space-y-2">
              <Label>Hauteur : {header.height}px</Label>
              <Slider
                value={[header.height]}
                onValueChange={([value]) => handleUpdateHeader({ height: value })}
                min={50}
                max={250}
                step={5}
                className="w-full"
                disabled={!template.header_enabled}
              />
              <div className="flex justify-between text-xs text-text-tertiary">
                <span>Min: 50px</span>
                <span>Max: 250px</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>Contenu de l'en-tête</CardTitle>
            <CardDescription>
              Éditez le contenu de l'en-tête. Utilisez la barre latérale pour insérer des variables, 
              tableaux et cadres.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-[400px]">
            <TableFrameToolbar editorRef={editorRef} />
            <div
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                e.dataTransfer.dropEffect = 'copy'
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                
                // Récupérer la variable depuis le drag
                const variable = e.dataTransfer.getData('text/plain') || 
                                e.dataTransfer.getData('text/html')?.replace(/[{}]/g, '')
                
                if (variable && editorRef.current) {
                  // Insérer la variable à la position du curseur
                  editorRef.current.insertVariable(variable)
                }
              }}
              className="flex-1"
            >
              <RichTextEditor
                ref={editorRef}
                value={headerContent}
                onChange={handleContentChange}
                placeholder="Saisissez le contenu de l'en-tête..."
                className="flex-1"
                toolbar="full"
              />
            </div>
          </CardContent>
        </Card>
    </div>
  )
}

