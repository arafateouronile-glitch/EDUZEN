'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { RichTextEditor, type RichTextEditorRef } from '@/components/ui/rich-text-editor'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import { cn } from '@/lib/utils'
import { convertTagsToVariableNodes, convertVariableNodesToTags } from '@/lib/utils/document-generation/template-converter'
import { getDefaultTemplateContent } from '@/lib/utils/document-template-defaults'
import { ZoomIn, ZoomOut, RotateCcw, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UnifiedDocumentEditorProps {
  template: DocumentTemplate
  onTemplateChange: (updates: Partial<DocumentTemplate>) => void
  onEditorRefReady?: (ref: { insertVariable: (variable: string) => void }) => void
}

type EditingZone = 'header' | 'body' | 'footer'

export function UnifiedDocumentEditor({
  template,
  onTemplateChange,
  onEditorRefReady,
}: UnifiedDocumentEditorProps) {
  const headerEditorRef = useRef<RichTextEditorRef>(null)
  const bodyEditorRef = useRef<RichTextEditorRef>(null)
  const footerEditorRef = useRef<RichTextEditorRef>(null)

  const [zoom, setZoom] = useState(0.85)
  const [editingZone, setEditingZone] = useState<EditingZone>('body')

  // États du contenu
  const [headerContent, setHeaderContent] = useState(() => {
    const content = (template.header as any)?.content || ''
    return convertTagsToVariableNodes(content)
  })

  const [bodyContent, setBodyContent] = useState(() => {
    const html = (template.content as any)?.html
    const elementsContent = template.content?.elements?.[0]?.content
    const content = html || elementsContent || ''
    return convertTagsToVariableNodes(content)
  })

  const [footerContent, setFooterContent] = useState(() => {
    const content = (template.footer as any)?.content || ''
    return convertTagsToVariableNodes(content)
  })

  // Initialiser avec le contenu par défaut si vide
  useEffect(() => {
    if (!template.id || !template.type) return

    const html = (template.content as any)?.html
    const elementsContent = template.content?.elements?.[0]?.content
    const currentContent = html || elementsContent || ''

    if (!currentContent || currentContent.trim().length < 50) {
      const defaultContent = getDefaultTemplateContent(template.type)
      if (defaultContent.bodyContent) {
        setBodyContent(convertTagsToVariableNodes(defaultContent.bodyContent))
        setHeaderContent(convertTagsToVariableNodes(defaultContent.headerContent || ''))
        setFooterContent(convertTagsToVariableNodes(defaultContent.footerContent || ''))

        onTemplateChange({
          content: {
            ...template.content,
            html: defaultContent.bodyContent,
            elements: [{
              id: 'main-content',
              type: 'text',
              position: { x: 0, y: 0 },
              content: defaultContent.bodyContent,
            }],
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
      }
    }
  }, [template.id, template.type])

  // Exposer la référence de l'éditeur actif
  useEffect(() => {
    if (onEditorRefReady) {
      const insertVariable = (variable: string) => {
        const activeRef =
          editingZone === 'header' ? headerEditorRef.current :
          editingZone === 'footer' ? footerEditorRef.current :
          bodyEditorRef.current

        if (activeRef?.insertVariable) {
          activeRef.insertVariable(variable)
        }
      }
      onEditorRefReady({ insertVariable })
    }
  }, [editingZone, onEditorRefReady])

  // Handlers de changement de contenu
  const handleHeaderChange = useCallback((html: string) => {
    setHeaderContent(html)
    const convertedContent = convertVariableNodesToTags(html)
    onTemplateChange({
      header: {
        ...(template.header as any),
        content: convertedContent,
      },
    })
  }, [template.header, onTemplateChange])

  const handleBodyChange = useCallback((html: string) => {
    setBodyContent(html)
    const convertedContent = convertVariableNodesToTags(html)
    onTemplateChange({
      content: {
        ...template.content,
        html: convertedContent,
        elements: [{
          id: 'main-content',
          type: 'text',
          position: { x: 0, y: 0 },
          content: convertedContent,
        }],
      },
    })
  }, [template.content, onTemplateChange])

  const handleFooterChange = useCallback((html: string) => {
    setFooterContent(html)
    const convertedContent = convertVariableNodesToTags(html)
    onTemplateChange({
      footer: {
        ...(template.footer as any),
        content: convertedContent,
      },
    })
  }, [template.footer, onTemplateChange])

  // Styles PDF identiques au générateur - appliqués directement à l'éditeur
  const pdfStyles = `
    .pdf-document * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    .pdf-document {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    .pdf-document p { margin-bottom: 0.5em; font-size: 10pt; }
    .pdf-document h1 { font-size: 16pt; margin: 12px 0 8px; font-weight: bold; }
    .pdf-document h2 { font-size: 14pt; margin: 10px 0 6px; font-weight: bold; }
    .pdf-document h3 { font-size: 12pt; margin: 8px 0 4px; font-weight: bold; }
    .pdf-document table {
      width: 100%;
      border-collapse: collapse;
      margin: 6px 0;
      font-size: 9pt;
    }
    .pdf-document th, .pdf-document td {
      border: 1px solid #ddd;
      padding: 6px 8px;
      text-align: left;
    }
    .pdf-document th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .pdf-document img { max-width: 100%; height: auto; }
    .pdf-document ul, .pdf-document ol { margin: 0.5em 0; padding-left: 1.5em; }
    .pdf-document li { margin: 0.25em 0; }
    .pdf-document strong, .pdf-document b { font-weight: bold; }
    .pdf-document em, .pdf-document i { font-style: italic; }

    /* Zone d'édition */
    .editing-zone {
      outline: 2px dashed #3b82f6;
      outline-offset: 2px;
      background-color: rgba(59, 130, 246, 0.02);
    }
    .editable-zone {
      cursor: pointer;
      transition: all 0.2s ease;
      min-height: 40px;
    }
    .editable-zone:hover:not(.editing-zone) {
      background-color: rgba(59, 130, 246, 0.05);
      outline: 1px dashed #93c5fd;
      outline-offset: 2px;
    }

    /* Header style */
    .pdf-header {
      border-bottom: 2px solid #1A1A1A;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }

    /* Footer style */
    .pdf-footer {
      border-top: 1px solid #E5E7EB;
      padding-top: 12px;
      margin-top: auto;
      background-color: #FAFAFA;
      font-family: 'Times New Roman', Times, serif;
      font-size: 8pt;
    }

    /* Éditeur intégré */
    .zone-editor .ProseMirror {
      outline: none;
      min-height: inherit;
    }
    .zone-editor .ProseMirror p { font-size: 10pt; margin-bottom: 0.5em; }
  `

  const handleZoneClick = (zone: EditingZone) => {
    setEditingZone(zone)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barre d'outils minimaliste */}
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Format A4</span>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-white border rounded px-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="h-7 w-7 p-0"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs w-10 text-center text-gray-600">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
            className="h-7 w-7 p-0"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(0.85)}
            className="h-7 w-7 p-0"
            title="Réinitialiser le zoom"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>

        {/* Indicateur de zone */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditingZone('header')}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              editingZone === 'header' ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            En-tête
          </button>
          <button
            onClick={() => setEditingZone('body')}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              editingZone === 'body' ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            Contenu
          </button>
          <button
            onClick={() => setEditingZone('footer')}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              editingZone === 'footer' ? "bg-blue-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            Pied de page
          </button>
        </div>
      </div>

      {/* Zone de document - fond gris simulant un lecteur PDF */}
      <div className="flex-1 overflow-auto p-4 bg-[#525659]">
        <style dangerouslySetInnerHTML={{ __html: pdfStyles }} />

        {/* Page A4 - WYSIWYG */}
        <div
          className="mx-auto bg-white shadow-2xl pdf-document"
          style={{
            width: '210mm',
            minHeight: '297mm',
            maxWidth: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            padding: '10mm',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* EN-TÊTE */}
          <div
            className={cn(
              'pdf-header cursor-pointer transition-all',
              editingZone === 'header' ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:bg-blue-50/30'
            )}
            onClick={() => handleZoneClick('header')}
            style={{ minHeight: '60px' }}
          >
            <div className="zone-editor">
              <RichTextEditor
                ref={headerEditorRef}
                value={headerContent}
                onChange={handleHeaderChange}
                placeholder="En-tête du document (cliquez pour modifier)..."
              />
            </div>
          </div>

          {/* CONTENU PRINCIPAL */}
          <div
            className={cn(
              'flex-1 cursor-pointer transition-all',
              editingZone === 'body' ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:bg-blue-50/30'
            )}
            onClick={() => handleZoneClick('body')}
            style={{ minHeight: '500px', marginTop: '20px' }}
          >
            <div className="zone-editor h-full">
              <RichTextEditor
                ref={bodyEditorRef}
                value={bodyContent}
                onChange={handleBodyChange}
                placeholder="Contenu du document (cliquez pour modifier)..."
              />
            </div>
          </div>

          {/* PIED DE PAGE */}
          <div
            className={cn(
              'pdf-footer cursor-pointer transition-all mt-auto',
              editingZone === 'footer' ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:bg-blue-50/30'
            )}
            onClick={() => handleZoneClick('footer')}
            style={{ minHeight: '60px' }}
          >
            <div className="zone-editor">
              <RichTextEditor
                ref={footerEditorRef}
                value={footerContent}
                onChange={handleFooterChange}
                placeholder="Pied de page (cliquez pour modifier)..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
