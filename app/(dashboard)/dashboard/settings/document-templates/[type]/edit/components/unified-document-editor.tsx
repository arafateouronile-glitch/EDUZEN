'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { RichTextEditor, type RichTextEditorRef } from '@/components/ui/rich-text-editor'
import type { DocumentTemplate } from '@/lib/types/document-templates'
import { cn } from '@/lib/utils'
import { convertTagsToVariableNodes, convertVariableNodesToTags } from '@/lib/utils/document-generation/template-converter'
import { getDefaultTemplateContent } from '@/lib/utils/document-template-defaults'
import { ZoomIn, ZoomOut, RotateCcw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UnifiedDocumentEditorProps {
  template: DocumentTemplate
  onTemplateChange: (updates: Partial<DocumentTemplate>) => void
  onEditorRefReady?: (ref: { insertVariable: (variable: string) => void }) => void
  saveStatus?: 'saved' | 'saving' | 'unsaved' | 'error'
}

type EditingZone = 'header' | 'body' | 'footer'

// ============================================================
// Règle horizontale style Google Docs
// ============================================================

function DocumentRuler({ pageWidthMm = 210, marginsMm = { left: 10, right: 10 } }: {
  pageWidthMm?: number
  marginsMm?: { left: number; right: number }
}) {
  const contentWidthMm = pageWidthMm - marginsMm.left - marginsMm.right
  const rulerTicks: React.ReactNode[] = []

  // Graduations toutes les 5mm, marque toutes les 10mm
  for (let mm = 0; mm <= contentWidthMm; mm += 5) {
    const isMajor = mm % 10 === 0
    const isHalf = mm % 10 === 5
    const left = `${(mm / contentWidthMm) * 100}%`
    rulerTicks.push(
      <div
        key={mm}
        className="absolute bottom-0 flex flex-col items-center"
        style={{ left, transform: 'translateX(-50%)' }}
      >
        <div
          className="bg-[#9aa0a6]"
          style={{
            width: '1px',
            height: isMajor ? '8px' : isHalf ? '5px' : '3px',
          }}
        />
        {isMajor && mm > 0 && mm < contentWidthMm && (
          <span
            className="text-[8px] text-[#9aa0a6] leading-none select-none"
            style={{ position: 'absolute', top: '-1px', transform: 'translateX(-50%) translateY(-100%)' }}
          >
            {mm / 10}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex-shrink-0 relative bg-white border-b border-[#dadce0]"
      style={{ height: '20px', width: '210mm', maxWidth: '100%' }}
    >
      {/* Zone grise des marges */}
      <div
        className="absolute top-0 bottom-0 bg-[#e8eaed]"
        style={{ left: 0, width: `${(marginsMm.left / pageWidthMm) * 100}%` }}
      />
      <div
        className="absolute top-0 bottom-0 bg-[#e8eaed]"
        style={{ right: 0, width: `${(marginsMm.right / pageWidthMm) * 100}%` }}
      />
      {/* Zone des graduations — sur la partie contenu */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: `${(marginsMm.left / pageWidthMm) * 100}%`,
          right: `${(marginsMm.right / pageWidthMm) * 100}%`,
        }}
      >
        {rulerTicks}
      </div>
    </div>
  )
}

// ============================================================
// Composant principal
// ============================================================

export function UnifiedDocumentEditor({
  template,
  onTemplateChange,
  onEditorRefReady,
  saveStatus,
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

  // Styles PDF pour les zones
  const pdfStyles = `
    .pdf-document * {
      box-sizing: border-box;
    }
    .pdf-document {
      font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    .pdf-document p { margin-bottom: 0.5em; font-size: 10pt; margin-top: 0; }
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
      border: 1px solid #000;
      padding: 4px 6px;
      text-align: left;
    }
    .pdf-document th { font-weight: bold; }
    .pdf-document img { max-width: 100%; height: auto; }
    .pdf-document ul, .pdf-document ol { margin: 0.5em 0; padding-left: 1.5em; }
    .pdf-document li { margin: 0.25em 0; }
    .pdf-document strong, .pdf-document b { font-weight: bold; }
    .pdf-document em, .pdf-document i { font-style: italic; }

    /* Zone d'édition active */
    .zone-active {
      outline: 2px solid #1a73e8;
      outline-offset: -1px;
    }

    /* Zone éditable survol */
    .zone-editable:not(.zone-active):hover {
      background-color: rgba(26, 115, 232, 0.03);
      outline: 1px dashed #aecbfa;
      outline-offset: -1px;
    }

    /* Header style */
    .pdf-header {
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    /* Footer style */
    .pdf-footer {
      border-top: 1px solid #e0e0e0;
      padding-top: 10px;
      margin-top: auto;
      font-size: 8pt;
    }

    /* Éditeur intégré dans les zones */
    .zone-editor .ProseMirror {
      outline: none;
      min-height: inherit;
      caret-color: #1a73e8;
    }
    .zone-editor .ProseMirror p {
      font-size: 10pt;
      margin-bottom: 0.5em;
      margin-top: 0;
    }
  `

  const handleZoneClick = (zone: EditingZone) => {
    setEditingZone(zone)
  }

  const zoneLabel: Record<EditingZone, string> = {
    header: 'EN-TÊTE',
    body: 'CORPS',
    footer: 'PIED DE PAGE',
  }

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0]">
      {/* ============================================================
          BARRE DU HAUT — Zoom + indicateur de zone
          ============================================================ */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-[#f8f9fa] border-b border-[#e0e0e0] flex-shrink-0"
        style={{ minHeight: '36px' }}
      >
        {/* Indicateurs de zone */}
        <div className="flex items-center gap-1">
          {(['header', 'body', 'footer'] as EditingZone[]).map((zone) => (
            <button
              key={zone}
              type="button"
              onClick={() => setEditingZone(zone)}
              className={cn(
                'px-2.5 py-1 text-xs rounded transition-colors font-medium',
                editingZone === zone
                  ? 'bg-[#e8f0fe] text-[#1a73e8]'
                  : 'text-[#5f6368] hover:bg-[#e8eaed] hover:text-[#202124]'
              )}
            >
              {zoneLabel[zone]}
            </button>
          ))}
        </div>

        {/* Contrôle de zoom */}
        <div className="flex items-center gap-0.5 bg-white border border-[#dadce0] rounded px-1">
          <button
            type="button"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            className="h-6 w-6 flex items-center justify-center text-[#444746] hover:bg-[#f1f3f4] rounded"
            title="Zoom arrière"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(0.85)}
            className="text-xs min-w-[40px] text-center text-[#5f6368] hover:text-[#202124] py-0.5"
            title="Réinitialiser le zoom (85%)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
            className="h-6 w-6 flex items-center justify-center text-[#444746] hover:bg-[#f1f3f4] rounded"
            title="Zoom avant"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(0.85)}
            className="h-6 w-6 flex items-center justify-center text-[#444746] hover:bg-[#f1f3f4] rounded ml-0.5"
            title="Réinitialiser"
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      {/* ============================================================
          CANVAS — Fond gris Google Docs avec page blanche
          ============================================================ */}
      <div className="flex-1 overflow-auto bg-[#f0f0f0]">
        <style dangerouslySetInnerHTML={{ __html: pdfStyles }} />

        {/* Centrage + margin vertical */}
        <div className="flex flex-col items-center py-6">

          {/* Règle horizontale */}
          <div
            className="flex-shrink-0"
            style={{
              width: '210mm',
              maxWidth: 'calc(100% - 48px)',
              transform: `scaleX(${zoom})`,
              transformOrigin: 'top center',
              marginBottom: '2px',
            }}
          >
            <DocumentRuler />
          </div>

          {/* Page A4 — WYSIWYG */}
          <div
            className="pdf-document"
            style={{
              width: '210mm',
              minHeight: '297mm',
              maxWidth: 'calc(100% - 48px)',
              transform: `scale(${zoom})`,
              transformOrigin: 'top center',
              padding: '10mm 12mm',
              display: 'flex',
              flexDirection: 'column',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
              marginBottom: `${(1 - zoom) * 297 * 0.6}mm`,
            }}
          >
            {/* Badge zone active */}
            <div className="absolute top-2 left-2 z-10 pointer-events-none">
              <span className="text-[9px] font-medium text-[#1a73e8] bg-[#e8f0fe] px-1.5 py-0.5 rounded opacity-80">
                {zoneLabel[editingZone]}
              </span>
            </div>

            {/* EN-TÊTE */}
            <div
              className={cn(
                'pdf-header zone-editable cursor-text transition-all relative',
                editingZone === 'header' && 'zone-active'
              )}
              onClick={() => handleZoneClick('header')}
              style={{ minHeight: '50px' }}
            >
              {editingZone !== 'header' && (
                <div className="absolute top-1 right-1 z-10 pointer-events-none">
                  <span className="text-[8px] text-[#9aa0a6] bg-white border border-[#e0e0e0] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100">
                    EN-TÊTE
                  </span>
                </div>
              )}
              <div className="zone-editor">
                <RichTextEditor
                  ref={headerEditorRef}
                  value={headerContent}
                  onChange={handleHeaderChange}
                  placeholder="En-tête du document..."
                  previewMode="pdf"
                />
              </div>
            </div>

            {/* CONTENU PRINCIPAL */}
            <div
              className={cn(
                'flex-1 zone-editable cursor-text transition-all',
                editingZone === 'body' && 'zone-active'
              )}
              onClick={() => handleZoneClick('body')}
              style={{ minHeight: '500px', marginTop: '0' }}
            >
              <div className="zone-editor h-full">
                <RichTextEditor
                  ref={bodyEditorRef}
                  value={bodyContent}
                  onChange={handleBodyChange}
                  placeholder="Contenu du document..."
                  previewMode="pdf"
                />
              </div>
            </div>

            {/* PIED DE PAGE */}
            <div
              className={cn(
                'pdf-footer zone-editable cursor-text transition-all mt-auto',
                editingZone === 'footer' && 'zone-active'
              )}
              onClick={() => handleZoneClick('footer')}
              style={{ minHeight: '50px' }}
            >
              <div className="zone-editor">
                <RichTextEditor
                  ref={footerEditorRef}
                  value={footerContent}
                  onChange={handleFooterChange}
                  placeholder="Pied de page..."
                  previewMode="pdf"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          STATUS BAR — Bas de l'éditeur
          ============================================================ */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#f8f9fa] border-t border-[#e0e0e0] flex-shrink-0 text-xs text-[#5f6368]">
        <div className="flex items-center gap-3">
          <span>Format A4</span>
          <span className="text-[#dadce0]">·</span>
          <span>Marges : 10mm</span>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-[#1a73e8]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sauvegarde…
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-[#34a853]">
              <CheckCircle2 className="h-3 w-3" />
              Sauvegardé
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="text-[#9aa0a6]">Modifications non sauvegardées</span>
          )}
          {saveStatus === 'error' && (
            <span className="flex items-center gap-1 text-[#ea4335]">
              <AlertCircle className="h-3 w-3" />
              Erreur de sauvegarde
            </span>
          )}
          <span className="text-[#dadce0]">·</span>
          <span>Page 1</span>
          <span className="text-[#dadce0]">·</span>
          <span>Zoom {Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  )
}
