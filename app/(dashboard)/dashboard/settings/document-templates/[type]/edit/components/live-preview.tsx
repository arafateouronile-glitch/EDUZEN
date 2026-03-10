'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { Eye, RefreshCw, ChevronLeft, ChevronRight, Printer, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DocumentVariables } from '@/lib/types/document-templates'
import { cn } from '@/lib/utils'
import { processConditionals } from '@/lib/utils/document-generation/conditional-processor'
import { sanitizeDocumentTemplate } from '@/lib/utils/sanitize-html'

// Données d'exemple pour la prévisualisation (style PDF réaliste)
const SAMPLE_VARIABLES: Record<string, string | number> = {
  // Établissement
  ecole_nom: 'INSSI FORMATION',
  ecole_logo: '',
  ecole_adresse: '123 Avenue de la Formation',
  ecole_ville: 'Paris',
  ecole_code_postal: '75001',
  ecole_telephone: '01 23 45 67 89',
  ecole_email: 'contact@inssi-formation.fr',
  ecole_site_web: 'www.inssi-formation.fr',
  ecole_slogan: 'Excellence et Innovation',
  ecole_siret: '123 456 789 00012',
  ecole_numero_declaration: '11 75 12345 67',
  ecole_region: 'Île-de-France',

  // Élève/Client
  eleve_nom: 'DUPONT',
  eleve_prenom: 'Jean',
  eleve_numero: 'CLI-2025-001',
  eleve_date_naissance: '15/03/1990',
  eleve_classe: 'Formation Professionnelle',
  eleve_adresse: '45 Rue de la République',
  eleve_ville: 'Lyon',
  eleve_code_postal: '69001',
  eleve_email: 'jean.dupont@email.com',
  eleve_telephone: '06 12 34 56 78',

  // Formation
  formation_nom: 'Formation en Développement Web Full Stack',
  formation_code: 'DEV-WEB-2025',
  formation_duree: '400 heures',
  formation_prix: '4 500,00 €',

  // Session
  session_nom: 'Session Janvier 2025',
  session_debut: '15/01/2025',
  session_fin: '15/06/2025',

  // Dates
  date_jour: new Date().toLocaleDateString('fr-FR'),
  date_emission: new Date().toLocaleDateString('fr-FR'),
  annee_scolaire: '2024-2025',

  // Montants
  montant_ht: '4 500,00 €',
  montant_ttc: '4 500,00 €',
  tva: 'Exonéré de TVA (art. 261 du CGI)',

  // Numéros de documents
  numero_document: 'DOC-2025-001',
  numero_facture: 'FAC-2025-001',
  numero_devis: 'DEV-2025-001',
  date_generation: new Date().toLocaleDateString('fr-FR'),
  numero_page: 1,
  total_pages: 1,
}

interface LivePreviewProps {
  htmlContent: string
  headerContent?: string
  footerContent?: string
  className?: string
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal'
  margins?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  fullPageMode?: boolean
}

/**
 * Remplace les variables dans du HTML et traite les conditions
 * Le contenu est sanitizé pour prévenir les attaques XSS
 */
function replaceVariablesInHTML(html: string, variables: Record<string, unknown>): string {
  if (!html) return html

  // D'abord, traiter les conditions
  let result = processConditionals(html, variables as DocumentVariables)

  // Ensuite, remplacer les variables restantes
  Object.entries(variables).forEach(([key, value]) => {
    // Remplacer {variable} dans le HTML
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    const replacement = value ? String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''
    result = result.replace(regex, replacement)
  })

  // Sanitize the final result to prevent XSS
  return sanitizeDocumentTemplate(result)
}

/**
 * Styles CSS identiques au PDF généré par Paged.js
 * Ces styles reproduisent exactement le rendu du document final
 */
const PDF_STYLES = `
  /* Reset et base - identique au PDF */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* Corps du document */
  .pdf-preview-content {
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.4;
    color: #000;
    background: #ffffff;
  }

  /* Paragraphes */
  .pdf-preview-content p {
    margin-bottom: 0.5em;
    font-size: 10pt;
    line-height: 1.4;
  }

  /* Titres */
  .pdf-preview-content h1 {
    font-size: 16pt;
    line-height: 1.3;
    margin-bottom: 8px;
    margin-top: 12px;
    font-weight: bold;
  }

  .pdf-preview-content h2 {
    font-size: 14pt;
    line-height: 1.3;
    margin-bottom: 6px;
    margin-top: 10px;
    font-weight: bold;
  }

  .pdf-preview-content h3 {
    font-size: 12pt;
    line-height: 1.3;
    margin-bottom: 4px;
    margin-top: 8px;
    font-weight: bold;
  }

  /* Tableaux - style PDF */
  .pdf-preview-content table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0;
    table-layout: auto;
    border-spacing: 0;
    font-size: 9pt;
  }

  .pdf-preview-content table th,
  .pdf-preview-content table td {
    border: 1px solid #ddd;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }

  .pdf-preview-content table th {
    background-color: #f3f4f6;
    font-weight: bold;
    font-size: 9pt;
  }

  /* Images */
  .pdf-preview-content img {
    max-width: 100%;
    height: auto;
  }

  /* Listes */
  .pdf-preview-content ul,
  .pdf-preview-content ol {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  .pdf-preview-content li {
    margin: 0.25em 0;
    line-height: 1.4;
  }

  /* Liens */
  .pdf-preview-content a {
    color: #1a0dab;
    text-decoration: underline;
  }

  /* Texte en gras et italique */
  .pdf-preview-content strong,
  .pdf-preview-content b {
    font-weight: bold;
  }

  .pdf-preview-content em,
  .pdf-preview-content i {
    font-style: italic;
  }

  /* Header style PDF */
  .pdf-preview-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0 0 15px 0;
    border-bottom: 2px solid #1A1A1A;
    margin-bottom: 20px;
    font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;
  }

  .pdf-preview-header p {
    margin: 0;
    line-height: 1.4;
  }

  .pdf-preview-header .org-name {
    font-weight: bold;
    font-size: 14pt;
    color: #1A1A1A;
  }

  .pdf-preview-header .org-info {
    font-size: 9pt;
    color: #666;
    margin-top: 4px;
  }

  /* Footer style PDF */
  .pdf-preview-footer {
    border-top: 1px solid #E5E7EB;
    padding: 12px 0 8px 0;
    margin-top: auto;
    background-color: #FAFAFA;
    font-family: 'Times New Roman', Times, serif;
  }

  .pdf-preview-footer p {
    margin: 0;
    text-align: center;
  }

  .pdf-preview-footer .footer-main {
    font-size: 8pt;
    color: #1A1A1A;
    font-weight: 500;
    line-height: 1.4;
  }

  .pdf-preview-footer .footer-declaration {
    font-size: 8pt;
    color: #666;
    margin-top: 4px;
    line-height: 1.3;
  }

  .pdf-preview-footer .footer-legal {
    font-size: 8pt;
    color: #888;
    font-style: italic;
    margin-top: 3px;
    line-height: 1.3;
  }

  .pdf-preview-footer .footer-pagination {
    font-size: 9pt;
    color: #666;
    margin-top: 8px;
    text-align: right;
    font-weight: 500;
  }
`

// Dimensions des formats de page en mm
const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
}

export function LivePreview({
  htmlContent,
  headerContent,
  footerContent,
  className,
  pageSize = 'A4',
  margins = { top: 20, right: 20, bottom: 20, left: 20 },
  // eslint-disable-next-line
  fullPageMode: _fullPageMode = false
}: LivePreviewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [zoom, setZoom] = useState(0.8)
  const [printMode, setPrintMode] = useState(false)
  const [fullPageView, setFullPageView] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  // Générer le HTML prévisualisé avec variables remplacées
  const previewHTML = useMemo(() => {
    const processedBody = htmlContent ? replaceVariablesInHTML(htmlContent, SAMPLE_VARIABLES) : ''
    const processedHeader = headerContent ? replaceVariablesInHTML(headerContent, SAMPLE_VARIABLES) : ''
    const processedFooter = footerContent ? replaceVariablesInHTML(footerContent, SAMPLE_VARIABLES) : ''

    // Estimer le nombre de pages basé sur la longueur du contenu
    // Approximation: ~3000 caractères par page A4
    const estimatedPages = Math.max(1, Math.ceil(processedBody.length / 3000))
    
    return {
      header: processedHeader,
      body: processedBody,
      footer: processedFooter,
      estimatedPages,
    }
  }, [htmlContent, headerContent, footerContent])

  // Calculer les dimensions de la page pour la pagination
  const pageDimensions = PAGE_SIZES[pageSize]
  const MM_TO_PX = 3.779527559 // 1mm ≈ 3.78px à 96dpi
  const pageHeightPx = pageDimensions.height * MM_TO_PX
  const headerHeightPx = 100
  const footerHeightPx = 60
  const contentHeightPx = pageHeightPx - headerHeightPx - footerHeightPx - (margins.top + margins.bottom) * MM_TO_PX

  // Mettre à jour le nombre de pages après le rendu
  useEffect(() => {
    // Utiliser requestAnimationFrame pour éviter les mises à jour pendant le render
    const updatePages = () => {
      if (bodyRef.current) {
        const bodyHeight = bodyRef.current.scrollHeight
        const calculatedPages = Math.max(1, Math.ceil(bodyHeight / contentHeightPx))
        setTotalPages(calculatedPages)
        
        // Ajuster la page courante si nécessaire
        if (currentPage > calculatedPages) {
          setCurrentPage(calculatedPages)
        }
      }
    }
    
    // Attendre que le DOM soit mis à jour
    requestAnimationFrame(() => {
      requestAnimationFrame(updatePages)
    })
  }, [previewHTML.body, currentPage, contentHeightPx])

  // Forcer le rafraîchissement de la prévisualisation
  const handleRefresh = () => {
    setIsRefreshing(true)
    setPreviewKey(prev => prev + 1)
    setTimeout(() => setIsRefreshing(false), 300)
  }

  // Navigation entre les pages
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Gestion du zoom
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.5))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3))
  const handleZoomReset = () => setZoom(0.8)

  // Mode impression
  const handlePrint = () => {
    setPrintMode(true)
    window.print()
    setTimeout(() => setPrintMode(false), 1000)
  }

  return (
    <GlassCard variant="premium" className={cn('flex flex-col overflow-hidden w-full flex-1', className)}>
      {/* Header - Sticky toolbar full-width */}
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-brand-blue" />
          <h3 className="font-semibold text-text-primary">Prévisualisation en temps réel</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Contrôles de zoom */}
          <div className="flex items-center gap-1 border rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 0.3}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-text-secondary px-2 min-w-[3rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 1.5}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomReset}
              className="h-8 px-2 text-xs"
            >
              Reset
            </Button>
          </div>
          
          {/* Mode aperçu page complète */}
          <Button
            variant={fullPageView ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFullPageView(!fullPageView)}
            className="gap-2"
            title="Afficher toutes les pages"
          >
            {fullPageView ? (
              <>
                <Minimize2 className="h-4 w-4" />
                Vue page
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                Vue complète
              </>
            )}
          </Button>

          {/* Bouton impression */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Preview Content - Canvas Workspace style PDF */}
      <div className="flex-1 overflow-auto p-4 md:p-8 bg-[#525659] preview-container w-full h-full">
        {/* Injection des styles PDF */}
        <style dangerouslySetInnerHTML={{ __html: PDF_STYLES }} />

        {/* Navigation des pages - Centrée */}
        {totalPages > 1 && !printMode && !fullPageView && (
          <div className="flex items-center justify-center gap-4 mb-4 preview-navigation w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-white">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Indicateur format de page */}
        <div className="mb-4 flex items-center justify-center gap-2 preview-controls">
          <span className="text-xs text-white/70 bg-black/20 px-2 py-1 rounded">
            {pageSize} ({pageDimensions.width} × {pageDimensions.height} mm) — Aperçu identique au PDF
          </span>
        </div>

        {/* Pages Preview - Rendu fidèle au PDF */}
        <div className={cn(
          'w-full flex justify-center items-start',
          fullPageView ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'flex-col items-center space-y-6'
        )}>
          {Array.from({ length: totalPages }).map((_, pageIndex) => {
            const pageNum = pageIndex + 1
            const isCurrentPage = pageNum === currentPage

            return (
              <div
                key={pageNum}
                className={cn(
                  'bg-white shadow-2xl transition-all preview-page flex flex-col',
                  fullPageView ? 'w-full' : 'mx-auto',
                  isCurrentPage ? 'ring-2 ring-blue-500' : fullPageView ? 'opacity-95' : 'opacity-50',
                  !isCurrentPage && totalPages > 1 && !printMode && !fullPageView && 'hidden'
                )}
                style={{
                  width: `${pageDimensions.width}mm`,
                  minHeight: `${pageDimensions.height}mm`,
                  maxWidth: '100%',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  // Marges identiques au PDF (10mm par défaut)
                  padding: `${margins.top || 10}mm ${margins.right || 10}mm ${margins.bottom || 25}mm ${margins.left || 10}mm`,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
                }}
              >
                {/* Header Preview - Style PDF Premium */}
                {previewHTML.header ? (
                  <div
                    className="pdf-preview-header"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '0 0 15px 0',
                      borderBottom: '2px solid #1A1A1A',
                      marginBottom: '20px',
                      fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: replaceVariablesInHTML(
                        previewHTML.header,
                        { ...SAMPLE_VARIABLES, numero_page: pageNum, total_pages: totalPages }
                      )
                    }}
                  />
                ) : (
                  /* Header par défaut si aucun header n'est défini */
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '0 0 15px 0',
                      borderBottom: '2px solid #1A1A1A',
                      marginBottom: '20px',
                      fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 'bold', fontSize: '14pt', margin: 0, color: '#1A1A1A', lineHeight: 1.3 }}>
                        {SAMPLE_VARIABLES.ecole_nom}
                      </p>
                      <p style={{ fontSize: '9pt', color: '#666', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                        {SAMPLE_VARIABLES.ecole_adresse}
                      </p>
                      <p style={{ fontSize: '9pt', color: '#666', margin: '2px 0', lineHeight: 1.4 }}>
                        {SAMPLE_VARIABLES.ecole_code_postal} {SAMPLE_VARIABLES.ecole_ville}
                      </p>
                      <p style={{ fontSize: '9pt', color: '#666', margin: '2px 0', lineHeight: 1.4 }}>
                        Email : {SAMPLE_VARIABLES.ecole_email}
                      </p>
                      <p style={{ fontSize: '9pt', color: '#666', margin: '2px 0', lineHeight: 1.4 }}>
                        Tel : {SAMPLE_VARIABLES.ecole_telephone}
                      </p>
                    </div>
                  </div>
                )}

                {/* Body Preview - Style PDF identique */}
                <div
                  ref={pageNum === 1 ? bodyRef : null}
                  className="pdf-preview-content flex-1"
                  key={`${previewKey}-${pageNum}`}
                  style={{
                    fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                    fontSize: '10pt',
                    lineHeight: 1.4,
                    color: '#000',
                    display: pageNum === 1 ? 'block' : 'none',
                  }}
                  dangerouslySetInnerHTML={{
                    __html: replaceVariablesInHTML(
                      previewHTML.body,
                      { ...SAMPLE_VARIABLES, numero_page: pageNum, total_pages: totalPages }
                    )
                  }}
                />

                {/* Footer Preview - Style PDF Premium */}
                {previewHTML.footer ? (
                  <div
                    className="pdf-preview-footer mt-auto"
                    style={{
                      borderTop: '1px solid #E5E7EB',
                      padding: '12px 0 8px 0',
                      marginTop: 'auto',
                      backgroundColor: '#FAFAFA',
                      fontFamily: "'Times New Roman', Times, serif",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: replaceVariablesInHTML(
                        previewHTML.footer,
                        { ...SAMPLE_VARIABLES, numero_page: pageNum, total_pages: totalPages }
                      )
                    }}
                  />
                ) : (
                  /* Footer par défaut si aucun footer n'est défini */
                  <div
                    style={{
                      borderTop: '1px solid #E5E7EB',
                      padding: '12px 0 8px 0',
                      marginTop: 'auto',
                      backgroundColor: '#FAFAFA',
                      fontFamily: "'Times New Roman', Times, serif",
                    }}
                  >
                    <p style={{ fontSize: '8pt', color: '#1A1A1A', margin: 0, textAlign: 'center', fontWeight: 500, lineHeight: 1.4 }}>
                      {SAMPLE_VARIABLES.ecole_nom} | {SAMPLE_VARIABLES.ecole_adresse} {SAMPLE_VARIABLES.ecole_ville} {SAMPLE_VARIABLES.ecole_code_postal} | Numéro SIRET: {SAMPLE_VARIABLES.ecole_siret}
                    </p>
                    <p style={{ fontSize: '8pt', color: '#666', margin: '4px 0 0 0', textAlign: 'center', lineHeight: 1.3 }}>
                      Numéro de déclaration d&apos;activité: {SAMPLE_VARIABLES.ecole_numero_declaration} <em>(auprès du préfet de région de: {SAMPLE_VARIABLES.ecole_region})</em>
                    </p>
                    <p style={{ fontSize: '8pt', color: '#888', fontStyle: 'italic', margin: '3px 0 0 0', textAlign: 'center', lineHeight: 1.3 }}>
                      Cet enregistrement ne vaut pas l&apos;agrément de l&apos;État.
                    </p>
                    <p style={{ fontSize: '9pt', color: '#666', margin: '8px 0 0 0', textAlign: 'right', fontWeight: 500 }}>
                      Page {pageNum} / {totalPages}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </GlassCard>
  )
}




