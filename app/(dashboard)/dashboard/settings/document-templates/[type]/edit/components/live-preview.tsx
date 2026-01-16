'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { GlassCard } from '@/components/ui/glass-card'
import { Eye, RefreshCw, ChevronLeft, ChevronRight, Printer, ZoomIn, ZoomOut, Maximize2, Minimize2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DocumentVariables } from '@/lib/types/document-templates'
import { cn } from '@/lib/utils'
import { processConditionals } from '@/lib/utils/document-generation/conditional-processor'

// Données d'exemple pour la prévisualisation
const SAMPLE_VARIABLES: DocumentVariables = {
  // Établissement
  ecole_nom: 'École Moderne de Dakar',
  ecole_logo: '',
  ecole_adresse: '123 Avenue de l\'Education, Dakar, Sénégal',
  ecole_ville: 'Dakar',
  ecole_telephone: '+221 77 123 45 67',
  ecole_email: 'contact@ecolemoderne.sn',
  ecole_site_web: 'www.ecolemoderne.sn',
  ecole_slogan: 'Excellence et Innovation',

  // Élève
  eleve_nom: 'DIALLO',
  eleve_prenom: 'Amadou',
  eleve_numero: 'LYC001',
  eleve_date_naissance: '15/03/2007',
  eleve_classe: 'Terminale A',

  // Formation
  formation_nom: 'Formation en Développement Web',
  formation_code: 'DEV-WEB-2024',
  formation_duree: '6 mois',
  formation_prix: '500 000 XOF',

  // Session
  session_nom: 'Session Janvier 2024',
  session_debut: '01/01/2024',
  session_fin: '30/06/2024',

  // Dates
  date_jour: new Date().toLocaleDateString('fr-FR'),
  date_emission: new Date().toLocaleDateString('fr-FR'),
  annee_scolaire: '2024-2025',

  // Divers
  numero_document: '2025-001',
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
 */
function replaceVariablesInHTML(html: string, variables: DocumentVariables): string {
  if (!html) return html
  
  // D'abord, traiter les conditions
  let result = processConditionals(html, variables)
  
  // Ensuite, remplacer les variables restantes
  Object.entries(variables).forEach(([key, value]) => {
    // Remplacer {variable} dans le HTML
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    const replacement = value ? String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''
    result = result.replace(regex, replacement)
  })
  return result
}

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
  fullPageMode = false
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

    // Calculer le nombre de pages approximatif
    // Hauteur A4: 297mm, moins header (100px ≈ 26mm) et footer (60px ≈ 16mm) = ~255mm de contenu
    const A4_HEIGHT_MM = 297
    const HEADER_HEIGHT_MM = 26
    const FOOTER_HEIGHT_MM = 16
    const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM
    const MM_TO_PX = 3.779527559 // 1mm ≈ 3.78px à 96dpi
    const CONTENT_HEIGHT_PX = CONTENT_HEIGHT_MM * MM_TO_PX

    // Estimer le nombre de pages basé sur la longueur du contenu
    // Approximation: ~3000 caractères par page
    const estimatedPages = Math.max(1, Math.ceil(processedBody.length / 3000))
    
    return {
      header: processedHeader,
      body: processedBody,
      footer: processedFooter,
      estimatedPages,
    }
  }, [htmlContent, headerContent, footerContent])

  // Calculer les dimensions de la page
  const pageDimensions = PAGE_SIZES[pageSize]
  const MM_TO_PX = 3.779527559 // 1mm ≈ 3.78px à 96dpi
  const pageWidthPx = pageDimensions.width * MM_TO_PX
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
    <GlassCard variant="premium" className={cn('flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
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

      {/* Preview Content */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50 preview-container">
        {/* Navigation des pages */}
        {totalPages > 1 && !printMode && !fullPageView && (
          <div className="flex items-center justify-center gap-4 mb-4 preview-navigation">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-text-secondary">
              Page {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Sélecteur de format de page */}
        <div className="mb-4 flex items-center gap-2 preview-controls">
          <label className="text-sm text-text-secondary">Format:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              // Le format est contrôlé par le parent, on ne peut que l'afficher
            }}
            disabled
            className="text-sm px-2 py-1 border rounded"
          >
            <option value="A4">A4 (210 × 297 mm)</option>
            <option value="A3">A3 (297 × 420 mm)</option>
            <option value="Letter">Letter (216 × 279 mm)</option>
            <option value="Legal">Legal (216 × 356 mm)</option>
          </select>
        </div>

        {/* Pages Preview */}
        <div className={cn('space-y-4', fullPageView && 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4')}>
          {Array.from({ length: totalPages }).map((_, pageIndex) => {
            const pageNum = pageIndex + 1
            const isCurrentPage = pageNum === currentPage
            
            return (
              <div
                key={pageNum}
                className={cn(
                  'mx-auto bg-white shadow-lg rounded-lg overflow-hidden transition-all preview-page',
                  fullPageView ? 'w-full' : '',
                  isCurrentPage ? 'ring-2 ring-brand-blue' : fullPageView ? 'opacity-90' : 'opacity-60',
                  !isCurrentPage && totalPages > 1 && !printMode && !fullPageView && 'hidden'
                )}
                style={{ 
                  width: `${pageDimensions.width}mm`,
                  minHeight: `${pageDimensions.height}mm`,
                  maxWidth: '100%',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  padding: `${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm`,
                }}
              >
                {/* Header Preview - répété sur chaque page */}
                {previewHTML.header && (
                  <div 
                    className="border-b border-gray-300 bg-gray-100/50 p-4"
                    style={{ minHeight: '100px' }}
                    dangerouslySetInnerHTML={{ 
                      __html: replaceVariablesInHTML(
                        previewHTML.header, 
                        { ...SAMPLE_VARIABLES, numero_page: pageNum, total_pages: totalPages }
                      ) 
                    }}
                  />
                )}

                {/* Body Preview - avec pagination visuelle */}
                <div 
                  ref={pageNum === 1 ? bodyRef : null}
                  className="p-6 prose prose-sm max-w-none"
                  key={`${previewKey}-${pageNum}`}
                  style={{
                    fontFamily: 'Inter, Arial, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    // Pour les pages suivantes, on pourrait utiliser CSS pour couper le contenu
                    // Pour l'instant, on affiche tout le contenu sur la première page
                    display: pageNum === 1 ? 'block' : 'none',
                  }}
                  dangerouslySetInnerHTML={{ 
                    __html: replaceVariablesInHTML(
                      previewHTML.body, 
                      { ...SAMPLE_VARIABLES, numero_page: pageNum, total_pages: totalPages }
                    ) 
                  }}
                />

                {/* Footer Preview - répété sur chaque page */}
                {previewHTML.footer && (
                  <div 
                    className="border-t border-gray-300 bg-gray-100/50 p-4 mt-auto"
                    style={{ minHeight: '60px' }}
                    dangerouslySetInnerHTML={{ 
                      __html: replaceVariablesInHTML(
                        previewHTML.footer, 
                        { ...SAMPLE_VARIABLES, numero_page: pageNum, total_pages: totalPages }
                      ) 
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </GlassCard>
  )
}




