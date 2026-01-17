'use client'

import { useRef, useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { RichTextEditor, type RichTextEditorRef } from '@/components/ui/rich-text-editor'
// Lazy load tous les composants document-editor pour réduire le bundle initial
import dynamic from 'next/dynamic'

const TableEditor = dynamic(() => import('@/components/document-editor/table-editor').then(mod => ({ default: mod.TableEditor })), { ssr: false })
const ShapeEditor = dynamic(() => import('@/components/document-editor/shape-editor').then(mod => ({ default: mod.ShapeEditor })), { ssr: false })
const ElementPalette = dynamic(() => import('@/components/document-editor/element-palette').then(mod => ({ default: mod.ElementPalette })), { ssr: false })
const MediaLibrary = dynamic(() => import('@/components/document-editor/media-library').then(mod => ({ default: mod.MediaLibrary })), { ssr: false })
const QuickTemplates = dynamic(() => import('@/components/document-editor/quick-templates').then(mod => ({ default: mod.QuickTemplates })), { ssr: false })
const StylePalette = dynamic(() => import('@/components/document-editor/style-palette').then(mod => ({ default: mod.StylePalette })), { ssr: false })
const WatermarkEditor = dynamic(() => import('@/components/document-editor/watermark-editor').then(mod => ({ default: mod.WatermarkEditor })), { ssr: false })
const ChartEditor = dynamic(() => import('@/components/document-editor/chart-editor').then(mod => ({ default: mod.ChartEditor })), { ssr: false })
const ColumnLayout = dynamic(() => import('@/components/document-editor/column-layout').then(mod => ({ default: mod.ColumnLayout })), { ssr: false })
const ColorPicker = dynamic(() => import('@/components/document-editor/color-picker').then(mod => ({ default: mod.ColorPicker })), { ssr: false })
const TextBox = dynamic(() => import('@/components/document-editor/text-box').then(mod => ({ default: mod.TextBox })), { ssr: false })
const ImageResizer = dynamic(() => import('@/components/document-editor/image-resizer').then(mod => ({ default: mod.ImageResizer })), { ssr: false })
const LayoutGrid = dynamic(() => import('@/components/document-editor/layout-grid').then(mod => ({ default: mod.LayoutGrid })), { ssr: false })
const GridOverlay = dynamic(() => import('@/components/document-editor/layout-grid').then(mod => ({ default: mod.GridOverlay })), { ssr: false })
const Rulers = dynamic(() => import('@/components/document-editor/layout-grid').then(mod => ({ default: mod.Rulers })), { ssr: false })
const SignatureField = dynamic(() => import('@/components/document-editor/signature-field').then(mod => ({ default: mod.SignatureField })), { ssr: false })
const MapEmbed = dynamic(() => import('@/components/document-editor/map-embed').then(mod => ({ default: mod.MapEmbed })), { ssr: false })
const AttachmentEmbed = dynamic(() => import('@/components/document-editor/attachment-embed').then(mod => ({ default: mod.AttachmentEmbed })), { ssr: false })
const FormFieldEditor = dynamic(() => import('@/components/document-editor/form-field-editor').then(mod => ({ default: mod.FormFieldEditor })), { ssr: false })
const CollaborationUsers = dynamic(() => import('@/components/document-editor/collaboration-users').then(mod => ({ default: mod.CollaborationUsers })), { ssr: false })

// Types et hooks (non-lazy car ce sont juste des types/fonctions)
import type { ImageConfig } from '@/components/document-editor/image-resizer'
import type { GridSettings } from '@/components/document-editor/layout-grid'
// useSnapToGrid est un hook, on le garde en import direct
import { useSnapToGrid } from '@/components/document-editor/layout-grid'
import { LivePreview } from './live-preview'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import { Info, Eye, EyeOff, FileText, Grid3x3, ZoomOut, ZoomIn, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks/use-auth'
import { realtimeCollaborationService } from '@/lib/services/realtime-collaboration.service'
import { getDefaultTemplateContent } from '@/lib/utils/document-template-defaults'
import { convertTagsToVariableNodes, convertVariableNodesToTags } from '@/lib/utils/document-generation/template-converter'

interface BodyEditorProps {
  template: DocumentTemplate
  onTemplateChange: (updates: Partial<DocumentTemplate>) => void
  onEditorRefReady?: (ref: { insertVariable: (variable: string) => void }) => void
  isActive?: boolean
}

export function BodyEditor({ template, onTemplateChange, onEditorRefReady, isActive }: BodyEditorProps) {
  const { user } = useAuth()
  const editorRef = useRef<RichTextEditorRef>(null)
  const isSyncingFromTemplateRef = useRef(false) // Pour éviter les boucles lors de la synchronisation
  const [bodyContent, setBodyContent] = useState(() => {
    const html = (template.content as any)?.html
    const elementsContent = template.content?.elements?.[0]?.content
    const rawContent = html || elementsContent || ''
    // Convertir les balises {variable} en nodes TipTap lors du chargement initial
    return convertTagsToVariableNodes(rawContent)
  })

  // Initialiser le contenu par défaut si le template est vide (une seule fois)
  useEffect(() => {
    if (!template.id || !template.type) return
    
    const html = (template.content as any)?.html
    const elementsContent = template.content?.elements?.[0]?.content
    const currentContent = html || elementsContent || ''
    const trimmedContent = currentContent.trim()
    
    console.log('[BodyEditor] Template chargé:', {
      templateId: template.id,
      templateType: template.type,
      hasHtml: !!html,
      hasElementsContent: !!elementsContent,
      currentContentLength: currentContent.length,
      trimmedLength: trimmedContent.length,
    })
    
    // Si le contenu est vide ou très court (moins de 50 caractères), initialiser avec le contenu par défaut
    const isContentEmpty = !trimmedContent || trimmedContent.length < 50
    
    if (isContentEmpty) {
      console.log('[BodyEditor] Contenu vide ou trop court (' + trimmedContent.length + ' caractères), initialisation avec le contenu par défaut...')
      try {
        const defaultContent = getDefaultTemplateContent(template.type)
        console.log('[BodyEditor] Contenu par défaut récupéré:', {
          hasBodyContent: !!defaultContent.bodyContent,
          bodyContentLength: defaultContent.bodyContent?.length || 0,
        })
        
        if (defaultContent.bodyContent && defaultContent.bodyContent.trim().length > 50) {
          const newBodyContent = defaultContent.bodyContent
          console.log('[BodyEditor] Mise à jour du template avec le contenu par défaut (' + newBodyContent.length + ' caractères)')
          // Convertir les balises {variable} en nodes TipTap pour l'affichage dans l'éditeur
          const convertedContent = convertTagsToVariableNodes(newBodyContent)
          setBodyContent(convertedContent)
          
          onTemplateChange({
            content: {
              ...template.content,
              elements: [
                {
                  id: 'main-content',
                  type: 'text',
                  position: { x: 0, y: 0 },
                  content: newBodyContent, // Sauvegarder en format {variable}
                },
              ],
            },
            header: {
              ...(template.header as any),
              content: defaultContent.headerContent,
            },
            footer: {
              ...(template.footer as any),
              content: defaultContent.footerContent,
            },
          })
        } else {
          console.warn('[BodyEditor] Le contenu par défaut est également vide ou trop court')
        }
      } catch (error) {
        console.error('[BodyEditor] Erreur lors de l\'initialisation du contenu par défaut:', error)
      }
    } else {
      // Synchroniser bodyContent avec le template seulement si le contenu est vraiment différent
      // et si on n'est pas en train de synchroniser (pour éviter les boucles)
      if (currentContent !== bodyContent && !isSyncingFromTemplateRef.current) {
        console.log('[BodyEditor] Synchronisation du contenu depuis le template (' + trimmedContent.length + ' caractères)')
        isSyncingFromTemplateRef.current = true
        // Convertir les balises {variable} en nodes TipTap lors de la synchronisation
        const convertedContent = convertTagsToVariableNodes(currentContent)
        setBodyContent(convertedContent)
        // Réinitialiser le flag après un court délai
        setTimeout(() => {
          isSyncingFromTemplateRef.current = false
        }, 100)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template.id, template.type, template.content]) // Se déclenche aussi quand le contenu change
  const [collaborationEnabled, setCollaborationEnabled] = useState(false)
  const [showTableEditor, setShowTableEditor] = useState(false)
  const [showShapeEditor, setShowShapeEditor] = useState(false)
  const [showElementPalette, setShowElementPalette] = useState(false)
  const [showQuickTemplates, setShowQuickTemplates] = useState(false)
  const [showStylePalette, setShowStylePalette] = useState(false)
  const [showWatermarkEditor, setShowWatermarkEditor] = useState(false)
  const [showChartEditor, setShowChartEditor] = useState(false)
  const [showColumnLayout, setShowColumnLayout] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [colorPickerCallback, setColorPickerCallback] = useState<((color: string) => void) | null>(null)
  const [showTextBox, setShowTextBox] = useState(false)
  const [showImageResizer, setShowImageResizer] = useState(false)
  const [showSignatureField, setShowSignatureField] = useState(false)
  const [showMapEmbed, setShowMapEmbed] = useState(false)
  const [showAttachmentEmbed, setShowAttachmentEmbed] = useState(false)
  const [showFormFieldEditor, setShowFormFieldEditor] = useState(false)
  const [showMediaLibrary, setShowMediaLibrary] = useState(false)
  const [imageResizerConfig, setImageResizerConfig] = useState<{ url: string } | null>(null)
  const [editorZoom, setEditorZoom] = useState(1)
  const [showLivePreview, setShowLivePreview] = useState(true)
  const [showLayoutGrid, setShowLayoutGrid] = useState(false)
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    enabled: false,
    gridSize: 10,
    snapToGrid: false,
    showRulers: false,
    showGuides: false,
    guideColor: '#335ACF',
    gridColor: '#e5e7eb',
  })
  const [fullPagePreview, setFullPagePreview] = useState(false)
  
  const snapPosition = useSnapToGrid(gridSettings.gridSize, gridSettings.snapToGrid)

  // Initialiser la collaboration en temps réel (seulement si un serveur WebSocket est configuré)
  useEffect(() => {
    if (!template.id || !user?.id) return
    
    // Vérifier si un serveur WebSocket est configuré
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL
    if (!wsUrl) {
      // Pas de serveur WebSocket configuré, désactiver la collaboration silencieusement
      setCollaborationEnabled(false)
      return
    }

    let isMounted = true

    const initCollaboration = async () => {
      try {
        await realtimeCollaborationService.initializeCollaboration(
          template.id!,
          user.id,
          user.full_name || user.email || 'Utilisateur',
          user.email || '',
          user.avatar_url || undefined
        )
        if (isMounted) {
          setCollaborationEnabled(true)
        }
      } catch (error) {
        // La collaboration échoue silencieusement si le serveur WebSocket n'est pas disponible
        if (isMounted) {
          setCollaborationEnabled(false)
          // Ne pas afficher d'erreur si c'est simplement que le serveur n'est pas configuré
          const errorMessage = error instanceof Error ? error.message : String(error)
          if (!errorMessage.includes('désactivée') && !errorMessage.includes('aucun serveur')) {
            console.warn('Collaboration non disponible:', errorMessage)
          }
        }
      }
    }

    initCollaboration()

    // Nettoyer à la déconnexion
    return () => {
      isMounted = false
      if (template.id && user?.id) {
        realtimeCollaborationService.disconnect(template.id, user.id)
      }
    }
  }, [template.id, user?.id, user?.email, user?.full_name, user?.avatar_url])

  const handleContentChange = (content: string) => {
    // Ne pas déclencher onTemplateChange si on est en train de synchroniser depuis le template
    if (isSyncingFromTemplateRef.current) {
      return
    }
    
    setBodyContent(content)
    
    // Convertir les nodes TipTap <span data-type="variable"> en balises {variable} pour la sauvegarde
    const convertedContent = convertVariableNodesToTags(content)
    
    onTemplateChange({
      content: {
        ...template.content,
        elements: [
          {
            id: 'main-content',
            type: 'text',
            position: { x: 0, y: 0 },
            content: convertedContent,
          },
        ],
      },
    })
  }

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

  const handleInsertHTML = (html: string) => {
    if (editorRef.current) {
      console.log('Insertion HTML:', html)
      // Utiliser la méthode insertHTML du RichTextEditor
      if (editorRef.current.insertHTML) {
        editorRef.current.insertHTML(html)
      } else {
        // Fallback : utiliser getEditor directement
        const editor = editorRef.current.getEditor()
        if (editor) {
          try {
            editor.chain().focus().insertContent(html).run()
          } catch (error) {
            console.error('Erreur lors de l\'insertion:', error)
          }
        }
      }
    } else {
      console.error('editorRef.current est null')
    }
  }

  // Extraire le contenu du header et footer pour la prévisualisation
  const headerContent = (template.header as any)?.content || ''
  const footerContent = (template.footer as any)?.content || ''
  
  // Extraire les paramètres de page
  const pageSize = (template.content as any)?.pageSize || template.page_size || 'A4'
  const margins = template.margins || { top: 20, right: 20, bottom: 20, left: 20 }

  return (
    <div className="space-y-4">
        {/* Info Card */}
        <GlassCard variant="subtle" className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <Info className="h-5 w-5 text-brand-blue mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-primary">
                  Zone d'édition du corps du document
                </p>
                <p className="text-sm text-text-secondary">
                  L'en-tête et le pied de page sont affichés en grisé pour référence.
                  Ils seront automatiquement ajoutés à chaque page lors de la génération du document.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {collaborationEnabled && template.id && user?.id && (
                <CollaborationUsers templateId={template.id} currentUserId={user.id} />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLivePreview(!showLivePreview)}
                className="gap-2"
              >
                {showLivePreview ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Masquer l'aperçu
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Afficher l'aperçu
                  </>
                )}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Contrôles de zoom et outils */}
        <div className="flex items-center justify-between gap-2 p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTextBox(true)}
              title="Insérer une zone de texte"
            >
              <FileText className="h-4 w-4 mr-2" />
              Zone de texte
            </Button>
            <Button
              variant={gridSettings.enabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowLayoutGrid(true)}
              title="Grille et règles"
            >
              <Grid3x3 className="h-4 w-4 mr-2" />
              Grille
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditorZoom(prev => Math.max(prev - 0.1, 0.5))}
              disabled={editorZoom <= 0.5}
              title="Zoom arrière"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(editorZoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditorZoom(prev => Math.min(prev + 0.1, 2))}
              disabled={editorZoom >= 2}
              title="Zoom avant"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditorZoom(1)}
              title="Réinitialiser le zoom"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <GlassCard variant="premium" className="flex-1 flex flex-col overflow-hidden p-6">
          <div className="flex-1 flex flex-col min-h-[600px]">
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
              style={{ 
                transform: `scale(${editorZoom})`,
                transformOrigin: 'top left',
                width: `${100 / editorZoom}%`,
                height: `${100 / editorZoom}%`,
              }}
            >
              <RichTextEditor
                ref={editorRef}
                value={bodyContent}
                onChange={handleContentChange}
                placeholder="Saisissez le contenu du document..."
                className="flex-1"
                onTableEditorOpen={() => setShowTableEditor(true)}
                onShapeEditorOpen={() => setShowShapeEditor(true)}
                onElementPaletteOpen={() => setShowElementPalette(true)}
                onSignatureFieldOpen={() => setShowSignatureField(true)}
                onQuickTemplatesOpen={() => setShowQuickTemplates(true)}
                onStylePaletteOpen={() => setShowStylePalette(true)}
                onWatermarkEditorOpen={() => setShowWatermarkEditor(true)}
              />
            </div>
          </div>
        </GlassCard>

      {/* Live Preview */}
      {showLivePreview && (
        <div className="mt-4">
          <LivePreview
            htmlContent={bodyContent}
            headerContent={headerContent}
            footerContent={footerContent}
            pageSize={pageSize as 'A4' | 'A3' | 'Letter' | 'Legal'}
            margins={margins}
            className="h-full"
          />
        </div>
      )}


      {/* Modals */}
      <AnimatePresence>
        {showTableEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTableEditor(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <TableEditor
                onInsert={handleInsertHTML}
                onClose={() => setShowTableEditor(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showShapeEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowShapeEditor(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ShapeEditor
                onInsert={handleInsertHTML}
                onClose={() => setShowShapeEditor(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showElementPalette && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowElementPalette(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ElementPalette
                onInsert={handleInsertHTML}
                onClose={() => setShowElementPalette(false)}
                onChartEditorOpen={() => {
                  setShowElementPalette(false)
                  setShowChartEditor(true)
                }}
                onSignatureFieldOpen={() => {
                  setShowElementPalette(false)
                  setShowSignatureField(true)
                }}
                onFormFieldOpen={() => {
                  setShowElementPalette(false)
                  setShowFormFieldEditor(true)
                }}
                onMediaLibraryOpen={() => {
                  setShowElementPalette(false)
                  setShowMediaLibrary(true)
                }}
              />
            </motion.div>
          </motion.div>
        )}

        {showQuickTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowQuickTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <QuickTemplates
                onInsert={handleInsertHTML}
                onClose={() => setShowQuickTemplates(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showStylePalette && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowStylePalette(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <StylePalette
                onApplyStyle={(style) => {
                  // Appliquer le style au texte sélectionné
                  const styleProps: string[] = []
                  if (style.fontSize) styleProps.push(`font-size: ${style.fontSize}`)
                  if (style.fontWeight) styleProps.push(`font-weight: ${style.fontWeight}`)
                  if (style.fontStyle) styleProps.push(`font-style: ${style.fontStyle}`)
                  if (style.color) styleProps.push(`color: ${style.color}`)
                  if (style.backgroundColor) styleProps.push(`background-color: ${style.backgroundColor}`)
                  if (style.textAlign) styleProps.push(`text-align: ${style.textAlign}`)
                  if (style.lineHeight) styleProps.push(`line-height: ${style.lineHeight}`)
                  if (style.marginTop) styleProps.push(`margin-top: ${style.marginTop}`)
                  if (style.marginBottom) styleProps.push(`margin-bottom: ${style.marginBottom}`)
                  if (style.padding) styleProps.push(`padding: ${style.padding}`)
                  if (style.borderLeft) {
                    styleProps.push(`border-left: ${style.borderLeft} solid ${style.borderColor || '#335ACF'}`)
                  }
                  const styleHTML = styleProps.join('; ')
                  handleInsertHTML(`<p style="${styleHTML}">Texte stylisé</p>`)
                  setShowStylePalette(false)
                }}
                onClose={() => setShowStylePalette(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showWatermarkEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowWatermarkEditor(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <WatermarkEditor
                onInsert={handleInsertHTML}
                onClose={() => setShowWatermarkEditor(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showColumnLayout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowColumnLayout(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ColumnLayout
                onInsert={handleInsertHTML}
                onClose={() => setShowColumnLayout(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showColorPicker && colorPickerCallback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowColorPicker(false)
              setColorPickerCallback(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ColorPicker
                onSelect={(color) => {
                  colorPickerCallback(color)
                  setShowColorPicker(false)
                  setColorPickerCallback(null)
                }}
                onClose={() => {
                  setShowColorPicker(false)
                  setColorPickerCallback(null)
                }}
              />
            </motion.div>
          </motion.div>
        )}

        {showTextBox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTextBox(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <TextBox
                onInsert={handleInsertHTML}
                onClose={() => setShowTextBox(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showImageResizer && imageResizerConfig && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowImageResizer(false)
              setImageResizerConfig(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ImageResizer
                imageUrl={imageResizerConfig.url}
                onUpdate={(config) => {
                  const imgHTML = `
                    <p style="text-align: ${config.align || 'center'}; margin: 16px 0;">
                      <img 
                        src="${imageResizerConfig.url}" 
                        alt="Image" 
                        style="
                          width: ${config.widthUnit === '%' ? `${config.width}%` : config.widthUnit === 'auto' ? 'auto' : `${config.width}px`};
                          height: ${config.heightUnit === '%' ? `${config.height}%` : config.heightUnit === 'auto' ? 'auto' : `${config.height}px`};
                          border-radius: ${config.borderRadius || 0}px;
                          opacity: ${config.opacity || 1};
                          transform: rotate(${config.rotation || 0}deg);
                          display: block;
                          max-width: 100%;
                          height: auto;
                        "
                      />
                    </p>
                  `
                  handleInsertHTML(imgHTML)
                  setShowImageResizer(false)
                  setImageResizerConfig(null)
                }}
                onClose={() => {
                  setShowImageResizer(false)
                  setImageResizerConfig(null)
                }}
              />
            </motion.div>
          </motion.div>
        )}

        {showSignatureField && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSignatureField(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SignatureField
                onInsert={handleInsertHTML}
                onClose={() => setShowSignatureField(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showMapEmbed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMapEmbed(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <MapEmbed
                onInsert={handleInsertHTML}
                onClose={() => setShowMapEmbed(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showAttachmentEmbed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowAttachmentEmbed(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AttachmentEmbed
                onInsert={handleInsertHTML}
                onClose={() => setShowAttachmentEmbed(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showFormFieldEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFormFieldEditor(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <FormFieldEditor
                onInsert={(html) => {
                  handleInsertHTML(html)
                  setShowFormFieldEditor(false)
                }}
                onClose={() => setShowFormFieldEditor(false)}
              />
            </motion.div>
          </motion.div>
        )}

        {showMediaLibrary && (
          <MediaLibrary
            onInsert={(mediaUrl, altText) => {
              const imgHTML = `<p style="text-align: center; margin: 16px 0;">
                <img 
                  src="${mediaUrl}" 
                  alt="${altText || 'Image'}" 
                  style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 0 auto;"
                />
              </p>`
              handleInsertHTML(imgHTML)
              setShowMediaLibrary(false)
            }}
            category="image"
            showUpload={true}
          />
        )}
      </AnimatePresence>
    </div>
  )
}



