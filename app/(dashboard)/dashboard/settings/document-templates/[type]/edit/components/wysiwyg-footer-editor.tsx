'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { RichTextEditor, type RichTextEditorRef } from '@/components/ui/rich-text-editor'
import { TableFrameToolbar } from '@/components/ui/table-frame-toolbar'
import type { DocumentTemplate, FooterConfig } from '@/lib/types/document-templates'
import { LayoutSelector } from './layout-selector'
import { generateFooterLayout } from '../utils/layout-generator'
import { useEffect } from 'react'
import { convertTagsToVariableNodes, convertVariableNodesToTags } from '@/lib/utils/document-generation/template-converter'

interface WysiwygFooterEditorProps {
  template: DocumentTemplate
  onTemplateChange: (updates: Partial<DocumentTemplate>) => void
  onEditorRefReady?: (ref: { insertVariable: (variable: string) => void }) => void
  isActive?: boolean
}

export function WysiwygFooterEditor({ template, onTemplateChange, onEditorRefReady, isActive }: WysiwygFooterEditorProps) {
  const editorRef = useRef<RichTextEditorRef>(null)
  const isSyncingFromTemplateRef = useRef(false)
  const [footerContent, setFooterContent] = useState(() => {
    const content = (template.footer as any)?.content
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

  const footer = template.footer || {
    enabled: true,
    height: 60,
    layout: 'complete' as const,
    elements: [],
    repeatOnAllPages: true,
    pagination: {
      enabled: true,
      format: 'Page {numero_page} / {total_pages}',
      position: 'center',
    },
    content: '',
  }

  const handleUpdateFooter = (updates: Partial<FooterConfig> & { content?: string; pagination?: Partial<FooterConfig['pagination']> }) => {
    onTemplateChange({
      footer: { ...footer, ...updates },
      footer_enabled: updates.enabled !== undefined ? updates.enabled : template.footer_enabled,
      footer_height: updates.height !== undefined ? updates.height : template.footer_height,
    })
  }

  const handleContentChange = (content: string) => {
    // Ne pas déclencher onTemplateChange si on est en train de synchroniser depuis le template
    if (isSyncingFromTemplateRef.current) {
      return
    }
    
    setFooterContent(content)
    // Convertir les nodes TipTap <span data-type="variable"> en balises {variable} pour la sauvegarde
    const convertedContent = convertVariableNodesToTags(content)
    handleUpdateFooter({ content: convertedContent })
  }

  // Synchroniser le contenu quand le template change
  useEffect(() => {
    if (isSyncingFromTemplateRef.current) {
      return
    }
    
    const content = (template.footer as any)?.content || ''
    // Convertir le contenu du template en nodes TipTap pour la comparaison
    const convertedTemplateContent = convertTagsToVariableNodes(content)
    
    // Synchroniser seulement si le contenu est vraiment différent
    if (convertedTemplateContent !== footerContent) {
      isSyncingFromTemplateRef.current = true
      setFooterContent(convertedTemplateContent)
      // Réinitialiser le flag après un court délai
      setTimeout(() => {
        isSyncingFromTemplateRef.current = false
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.footer])

  return (
    <div className="space-y-4">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration du pied de page</CardTitle>
            <CardDescription>Personnalisez l'apparence et le contenu du pied de page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Activer/Désactiver */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Afficher le pied de page</Label>
                <p className="text-sm text-text-tertiary">Afficher le pied de page sur toutes les pages</p>
              </div>
              <Switch
                checked={template.footer_enabled}
                onCheckedChange={(checked) => {
                  onTemplateChange({ footer_enabled: checked })
                }}
              />
            </div>

            {/* Hauteur */}
            <div className="space-y-2">
              <Label>Hauteur : {footer.height}px</Label>
              <Slider
                value={[footer.height]}
                onValueChange={([value]) => handleUpdateFooter({ height: value })}
                min={30}
                max={150}
                step={5}
                className="w-full"
                disabled={!template.footer_enabled}
              />
              <div className="flex justify-between text-xs text-text-tertiary">
                <span>Min: 30px</span>
                <span>Max: 150px</span>
              </div>
            </div>

            {/* Layout prédéfini */}
            <div className="space-y-2">
              <Label>Layout prédéfini</Label>
              <LayoutSelector
                type="footer"
                value={footer.layout || 'complete'}
                onChange={(layout) => {
                  const layoutConfig = generateFooterLayout(layout as any)
                  handleUpdateFooter({
                    layout: layout as any,
                    ...layoutConfig,
                  })
                }}
              />
            </div>

            {/* Pagination */}
            {footer.pagination && (
              <div className="space-y-4 border-t border-bg-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Afficher la numérotation</Label>
                    <p className="text-sm text-text-tertiary">Numérotation automatique des pages</p>
                  </div>
                  <Switch
                    checked={footer.pagination.enabled}
                    onCheckedChange={(checked) => {
                      handleUpdateFooter({
                        pagination: { ...footer.pagination, enabled: checked },
                      })
                    }}
                  />
                </div>

                {footer.pagination.enabled && (
                  <div className="space-y-2 pl-4">
                    <Label>Format</Label>
                    <select
                      value={footer.pagination.format}
                      onChange={(e) => {
                        handleUpdateFooter({
                          pagination: { ...footer.pagination, format: e.target.value },
                        })
                      }}
                      className="w-full border border-bg-gray-200 rounded px-3 py-2 text-sm"
                    >
                      <option value="Page {numero_page}">Page X</option>
                      <option value="{numero_page} / {total_pages}">X / Y</option>
                      <option value="Page {numero_page} / {total_pages}">Page X / Y</option>
                      <option value="Page {numero_page} sur {total_pages}">Page X sur Y</option>
                    </select>

                    <Label>Position</Label>
                    <select
                      value={footer.pagination.position}
                      onChange={(e) => {
                        handleUpdateFooter({
                          pagination: {
                            ...footer.pagination,
                            position: e.target.value as 'left' | 'center' | 'right',
                          },
                        })
                      }}
                      className="w-full border border-bg-gray-200 rounded px-3 py-2 text-sm"
                    >
                      <option value="left">Gauche</option>
                      <option value="center">Centre</option>
                      <option value="right">Droite</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle>Contenu du pied de page</CardTitle>
            <CardDescription>
              Éditez le contenu du pied de page. Utilisez la barre latérale pour insérer des variables, 
              tableaux et cadres.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-[300px]">
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
                value={footerContent}
                onChange={handleContentChange}
                placeholder="Saisissez le contenu du pied de page..."
                className="flex-1"
                toolbar="minimal"
              />
            </div>
          </CardContent>
        </Card>
    </div>
  )
}

