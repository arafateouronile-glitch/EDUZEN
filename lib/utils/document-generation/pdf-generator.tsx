/**
 * Générateur PDF avec support header/footer répétés sur toutes les pages
 * Utilise @react-pdf/renderer pour les anciens templates (éléments)
 * Utilise Puppeteer pour les nouveaux templates (HTML)
 */

import * as React from 'react'
import { Document, Page, View, Text, Image, StyleSheet, pdf, renderToStream } from '@react-pdf/renderer'
import type { DocumentTemplate, DocumentVariables, TemplateElement } from '@/lib/types/document-templates'
import puppeteer from 'puppeteer'
import { generateHTML } from './html-generator'
import { logger } from '@/lib/utils/logger'

export interface PDFGenerationResult {
  blob: Blob
  pageCount: number
  metadata?: DocumentMetadata
}

// Styles de base pour le PDF
const createStyles = (template: DocumentTemplate) => {
  const headerHeight = template.header_enabled ? template.header_height : 0
  const footerHeight = template.footer_enabled ? template.footer_height : 0
  const margins = template.margins || { top: 20, right: 20, bottom: 20, left: 20 }

  return StyleSheet.create({
    page: {
      padding: 0,
      margin: 0,
      fontFamily: 'Helvetica',
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: headerHeight,
      backgroundColor: getHeaderBackgroundColor(template.header),
      paddingTop: 10,
      paddingLeft: margins.left,
      paddingRight: margins.right,
      paddingBottom: 10,
    },
    body: {
      marginTop: headerHeight + margins.top,
      marginBottom: footerHeight + margins.bottom,
      marginLeft: margins.left,
      marginRight: margins.right,
      padding: 10,
      minHeight: calculateAvailableHeight(template),
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: footerHeight,
      backgroundColor: template.footer?.backgroundColor || '#F9FAFB',
      paddingTop: 10,
      paddingLeft: margins.left,
      paddingRight: margins.right,
      paddingBottom: 10,
      borderTop: template.footer?.border?.top?.enabled
        ? `${template.footer.border.top.width}px solid ${template.footer.border.top.color}`
        : 'none',
    },
    element: {
      marginBottom: 10,
    },
    text: {
      fontSize: 12,
      color: '#000000',
      lineHeight: 1.5,
    },
    textBold: {
      fontWeight: 'bold',
    },
    textItalic: {
      fontStyle: 'italic',
    },
    textCenter: {
      textAlign: 'center',
    },
    textRight: {
      textAlign: 'right',
    },
    pagination: {
      fontSize: 9,
      color: '#4D4D4D',
      textAlign: 'center' as const,
    },
  })
}

/**
 * Génère un PDF à partir d'un template avec header/footer répétés
 */
export async function generatePDF(
  template: DocumentTemplate,
  variables: DocumentVariables,
  documentId?: string,
  organizationId?: string
): Promise<PDFGenerationResult> {
  try {
    // Vérifier si le template a du contenu HTML (nouveau format)
    const htmlContent = (template.content as any)?.html || ''
    const headerContent = (template.header as any)?.content || ''
    const footerContent = (template.footer as any)?.content || ''
    
    // Utiliser Puppeteer pour les templates HTML
    if (htmlContent || headerContent || footerContent) {
      // Le template utilise le nouveau format HTML - utiliser Puppeteer
      try {
        return await generatePDFFromHTML(template, variables, documentId, organizationId)
      } catch (puppeteerError) {
        logger.error('Erreur Puppeteer', puppeteerError)
        const errorMessage = puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError)
        throw new Error(
          `Impossible de générer le PDF avec Puppeteer: ${errorMessage}. ` +
          `Veuillez vérifier que Chromium est correctement installé.`
        )
      }
    }
    
    // Ancien format avec éléments - utiliser React-PDF
    return await generatePDFFromElements(template, variables)
  } catch (error) {
    logger.error('Erreur lors de la génération PDF', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Erreur lors de la génération PDF: ${errorMessage}`)
  }
}

/**
 * Génère un PDF depuis HTML avec Puppeteer
 */
async function generatePDFFromHTML(
  template: DocumentTemplate,
  variables: DocumentVariables,
  documentId?: string,
  organizationId?: string
): Promise<PDFGenerationResult> {
  // Utiliser generateHTML pour bénéficier de toutes les fonctionnalités (API externes, boucles, conditions, etc.)
  const htmlResult = await generateHTML(template, variables, documentId, organizationId)
  
  // Le HTML généré contient déjà tout le document avec header/footer et styles
  const fullHTML = htmlResult.html
  
  // Configuration Puppeteer
  // Puppeteer nécessite Chromium, ce qui peut poser problème dans certains environnements
  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
      // Essayer d'utiliser le Chromium installé avec Puppeteer
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    })
  } catch (launchError) {
    logger.error('Erreur lors du lancement de Puppeteer', launchError)
    const errorMessage = launchError instanceof Error ? launchError.message : String(launchError)
    const errorStack = launchError instanceof Error ? launchError.stack : undefined
    logger.error('Stack trace Puppeteer', undefined, { stack: errorStack })
    throw new Error(
      `Impossible de lancer Puppeteer. Erreur: ${errorMessage}. ` +
      `Veuillez vérifier que Chromium est correctement installé.`
    )
  }
  
  try {
    const page = await browser.newPage()
    
    // Définir la taille de la page
    const pageSize = template.page_size || 'A4'
    const pageFormat = pageSize === 'A4' ? 'A4' : pageSize === 'Letter' ? 'Letter' : 'A4'
    
    // Charger le HTML
    await page.setContent(fullHTML, {
      waitUntil: 'networkidle0',
    })
    
    // Générer le PDF
    const pdfBuffer = await page.pdf({
      format: pageFormat,
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
      preferCSSPageSize: true,
    })
    
    // Créer un Blob à partir du buffer
    const pdfBlob = new Blob([pdfBuffer as BlobPart], { type: 'application/pdf' })
    
    // Estimer le nombre de pages (approximation basée sur la hauteur du contenu)
    // Note: Pour un calcul précis, il faudrait générer le PDF deux fois ou utiliser une méthode différente
    const estimatedPageCount = Math.max(1, Math.ceil(pdfBuffer.length / 50000))
    
    return {
      blob: pdfBlob,
      pageCount: htmlResult.pageCount || estimatedPageCount,
    }
  } finally {
    await browser.close()
  }
}

/**
 * Génère un PDF depuis les éléments de template (ancien format) avec React-PDF
 */
async function generatePDFFromElements(
  template: DocumentTemplate,
  variables: DocumentVariables
): Promise<PDFGenerationResult> {
  const styles = createStyles(template)
  const pages = calculatePages(template, variables)

  // Composant React pour le document PDF
  const PDFDocument = () => (
    <Document>
      {pages.map((pageElements, pageIndex) => (
        <Page key={pageIndex} size={(template.page_size || 'A4') as any} style={styles.page}>
          {/* Header répété sur chaque page si activé */}
          {template.header_enabled && template.header && (
            <View style={styles.header} fixed>
              {renderElements(template.header.elements || [], variables, styles)}
            </View>
          )}

          {/* Corps du document */}
          <View style={styles.body}>
            {renderElements(pageElements, variables, styles)}
          </View>

          {/* Footer répété sur chaque page si activé */}
          {template.footer_enabled && template.footer && (
            <View style={styles.footer} fixed>
              {/* Pagination automatique */}
              {(template.footer as any)?.pagination?.enabled && (
                <Text
                  style={[
                    styles.pagination,
                    {
                      textAlign:
                        (template.footer as any).pagination.position === 'left'
                          ? 'left'
                          : (template.footer as any).pagination.position === 'right'
                          ? 'right'
                          : 'center',
                    },
                  ]}
                  render={({ pageNumber, totalPages }) =>
                    replaceVariables((template.footer as any).pagination?.format || 'Page {numero_page} / {total_pages}', {
                      ...variables,
                      numero_page: pageNumber,
                      total_pages: totalPages,
                    })
                  }
                  fixed
                />
              )}
              {/* Éléments du footer */}
              {renderElements((template.footer as any).elements || [], {
                ...variables,
                numero_page: pageIndex + 1,
                total_pages: pages.length,
              }, styles)}
            </View>
          )}
        </Page>
      ))}
    </Document>
  )
  
  // Générer le PDF avec React-PDF
  // Note: React-PDF peut être utilisé côté serveur avec renderToStream
  try {
    const pdfDoc = <PDFDocument />
    const pdfBlob = await pdf(pdfDoc).toBlob()
    
    return {
      blob: pdfBlob,
      pageCount: pages.length,
    }
  } catch (reactPdfError) {
    logger.error('Erreur React-PDF', reactPdfError)
    const errorMessage = reactPdfError instanceof Error ? reactPdfError.message : String(reactPdfError)
    throw new Error(`Erreur lors de la génération PDF avec React-PDF: ${errorMessage}`)
  }
}

/**
 * Calcule les pages nécessaires pour le contenu
 */
function calculatePages(
  template: DocumentTemplate,
  variables: DocumentVariables
): TemplateElement[][] {
  const content = template.content || { elements: [], pageSize: 'A4', margins: { top: 20, right: 20, bottom: 20, left: 20 } }
  const elements = content.elements || []

  if (elements.length === 0) {
    return [[]]
  }

  // Calculer l'espace disponible
  const availableHeight = calculateAvailableHeight(template)

  // Répartir les éléments sur plusieurs pages si nécessaire
  const pages: TemplateElement[][] = [[]]
  let currentPageHeight = 0
  let currentPage = 0

  elements.forEach((element) => {
    const elementHeight = estimateElementHeight(element, variables)

    // Si l'élément dépasse la hauteur disponible, créer une nouvelle page
    if (currentPageHeight + elementHeight > availableHeight && currentPageHeight > 0) {
      currentPage++
      pages[currentPage] = []
      currentPageHeight = 0
    }

    pages[currentPage].push(element)
    currentPageHeight += elementHeight + 20 // 20pt d'espacement entre éléments
  })

  return pages
}

/**
 * Calcule la hauteur disponible pour le contenu (en points)
 */
function calculateAvailableHeight(template: DocumentTemplate): number {
  const pageHeights = {
    A4: 792, // points (8.27" x 11.69" = 595pt x 842pt, mais on utilise la hauteur)
    Letter: 792,
    Legal: 1008,
  }

  const pageHeight = pageHeights[template.page_size || 'A4']
  const headerHeight = template.header_enabled ? template.header_height : 0
  const footerHeight = template.footer_enabled ? template.footer_height : 0
  const margins = template.margins || { top: 20, right: 20, bottom: 20, left: 20 }

  return pageHeight - headerHeight - footerHeight - margins.top - margins.bottom - 20 // Padding
}

/**
 * Estime la hauteur d'un élément en points
 */
function estimateElementHeight(element: TemplateElement, variables: DocumentVariables): number {
  const fontSize = element.style?.fontSize || 12
  const lineHeight = element.style?.lineHeight || 1.5

  switch (element.type) {
    case 'text':
      if (element.content) {
        const content = replaceVariables(element.content, variables)
        // Estimation: ~80 caractères par ligne pour une largeur de 500pt
        const charsPerLine = Math.floor(500 / (fontSize * 0.6))
        const lines = Math.ceil(content.length / charsPerLine) || 1
        return lines * fontSize * lineHeight + 10 // Padding
      }
      return fontSize * lineHeight + 10

    case 'image':
      return element.size?.height || 100

    case 'table':
      const rowCount = element.tableData?.rows?.length || 0
      return (rowCount + 1) * 30 + 20 // Header + rows

    case 'signature':
      return element.size?.height || 80

    case 'qrcode':
    case 'barcode':
      return element.size?.height || 60

    case 'line':
      return 1

    case 'spacer':
      return element.size?.height || 20

    default:
      return 30
  }
}

/**
 * Rend les éléments d'un template
 */
function renderElements(
  elements: TemplateElement[],
  variables: DocumentVariables,
  styles: ReturnType<typeof createStyles>
): React.ReactNode[] {
  return elements.map((element, index) => {
    switch (element.type) {
      case 'text':
        return (
          <View key={element.id || index} style={styles.element}>
            <Text
              style={[
                styles.text,
                element.style?.fontSize && { fontSize: element.style.fontSize },
                element.style?.color && { color: element.style.color },
                element.style?.fontWeight === 'bold' && styles.textBold,
                element.style?.fontStyle === 'italic' && styles.textItalic,
                element.style?.textAlign === 'center' && styles.textCenter,
                element.style?.textAlign === 'right' && styles.textRight,
              ] as any}
            >
              {element.content ? replaceVariables(element.content, variables) : ''}
            </Text>
          </View>
        )

      case 'image':
        // NOTE: Amélioration prévue - Implémenter le rendu d'images
        // Nécessite: URL publique ou données base64 de l'image
        return (
          <View key={element.id || index} style={styles.element}>
            <Text style={styles.text}>[Image: {element.source || 'Non définie'}]</Text>
          </View>
        )

      case 'table':
        if (!element.tableData) return null
        return (
          <View key={element.id || index} style={styles.element}>
            {/* NOTE: Amélioration prévue - Implémenter le rendu de tableaux avec @react-pdf/renderer */}
            <Text style={styles.text}>[Tableau: {element.tableData.headers.length} colonnes]</Text>
          </View>
        )

      case 'line':
        return (
          <View
            key={element.id || index}
            style={{
              height: element.style?.border?.width || 1,
              backgroundColor: element.style?.color || '#000000',
              marginVertical: 10,
            }}
          />
        )

      case 'spacer':
        return (
          <View
            key={element.id || index}
            style={{ height: element.size?.height || 20 }}
          />
        )

      case 'signature':
        return (
          <View key={element.id || index} style={styles.element}>
            <View
              style={{
                height: element.size?.height || 80,
                width: element.size?.width || 150,
                border: '1px solid #000000',
                padding: 10,
              }}
            >
              {element.label && (
                <Text style={[styles.text, { fontSize: 10 }]}>{element.label}</Text>
              )}
              <Text style={[styles.text, { fontSize: 8, marginTop: 30 }]}>
                Signature
              </Text>
            </View>
          </View>
        )

      case 'qrcode':
      case 'barcode':
        // NOTE: Amélioration prévue - Implémenter le rendu de QR codes et codes-barres
        // Nécessite: Bibliothèque de génération de QR codes (qrcode, jsbarcode) et conversion en image
        return (
          <View key={element.id || index} style={styles.element}>
            <Text style={styles.text}>
              [{element.type === 'qrcode' ? 'QR Code' : 'Code-barres'}: {element.qrData || element.barcodeData || 'Non défini'}]
            </Text>
          </View>
        )

      default:
        return null
    }
  })
}

/**
 * Remplace les variables dans un texte
 */
function replaceVariables(text: string, variables: DocumentVariables): string {
  let result = text
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(regex, String(value || ''))
  })
  return result
}

/**
 * Obtient la couleur de fond du header
 */
function getHeaderBackgroundColor(
  header: DocumentTemplate['header']
): string {
  if (!header?.backgroundColor) return '#FFFFFF'

  if (header.backgroundColor.type === 'solid') {
    return header.backgroundColor.color || '#FFFFFF'
  }

  // Pour les gradients, on retourne la première couleur
  // @react-pdf/renderer supporte les gradients mais c'est plus complexe
  return header.backgroundColor.from || '#FFFFFF'
}
import { processConditionals } from './conditional-processor'
import { processLoops } from './loop-processor'
import { processCalculatedVariables } from './calculated-variables'
import { processDynamicTables } from './dynamic-table-processor'
import { processElementVisibility } from './element-visibility-processor'
import { processNestedVariables, flattenVariables } from './nested-variables-processor'
import { processDynamicHyperlinks } from './dynamic-hyperlinks-processor'
// import { extractMetadataFromVariables, formatMetadataForPDF, type DocumentMetadata } from './metadata-processor'
type DocumentMetadata = Record<string, unknown>

/**
 * Remplace les variables dans du HTML
 */
// Fonction pour remplacer les variables dans le HTML (y compris QR codes et codes-barres)
function replaceVariablesInHTML(html: string, variables: DocumentVariables): string {
  // Aplatir les variables imbriquées pour compatibilité
  const flattenedVariables = flattenVariables(variables)

  // Traiter dans l'ordre : tableaux dynamiques -> boucles -> conditions -> visibilité -> variables calculées -> variables imbriquées -> remplacement de variables
  let result = html

  // 1. Traiter les tableaux dynamiques
  result = processDynamicTables(result, flattenedVariables)

  // 2. Traiter les boucles (FOR/WHILE)
  result = processLoops(result, flattenedVariables)

  // 3. Traiter les conditions (IF/ELSE)
  result = processConditionals(result, flattenedVariables)

  // 4. Traiter la visibilité conditionnelle (SHOW_IF/HIDE_IF)
  result = processElementVisibility(result, flattenedVariables)

  // 5. Traiter les variables calculées (SUM, AVERAGE, etc.)
  result = processCalculatedVariables(result, flattenedVariables)

  // 6. Traiter les variables imbriquées (object.property, array[index])
  result = processNestedVariables(result, flattenedVariables)
  
  // Traiter les QR codes avec variables dynamiques
  result = result.replace(/<img([^>]*?)class="qr-code-dynamic"([^>]*?)data-qr-data="([^"]*)"([^>]*?)>/g, (match, before, middle, data, after) => {
    let processedData = data
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      processedData = processedData.replace(regex, String(value))
    })
    // Extraire la taille depuis le style
    const sizeMatch = match.match(/max-width:\s*(\d+)px/)
    const size = sizeMatch ? sizeMatch[1] : '200'
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(processedData)}`
    return `<img${before}${middle}src="${qrCodeUrl}" data-qr-data="${processedData}"${after}>`
  })
  
  // Traiter les codes-barres avec variables dynamiques
  result = result.replace(/<img([^>]*?)class="barcode-dynamic"([^>]*?)data-barcode-data="([^"]*)"([^>]*?)data-barcode-type="([^"]*)"([^>]*?)>/g, (match, before, middle1, data, middle2, type, after) => {
    let processedData = data
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      processedData = processedData.replace(regex, String(value))
    })
    // Extraire la largeur et hauteur depuis le style
    const widthMatch = match.match(/max-width:\s*(\d+)px/)
    const heightMatch = match.match(/height:\s*(\d+)px/)
    const width = widthMatch ? widthMatch[1] : '200'
    const height = heightMatch ? heightMatch[1] : '50'
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(processedData)}&code=${type}&dpi=96&dataseparator=`
    return `<img${before}${middle1}src="${barcodeUrl}" data-barcode-data="${processedData}"${middle2}data-barcode-type="${type}"${after}>`
  })
  
  // Ensuite, remplacer les variables restantes dans le texte
  Object.entries(variables).forEach(([key, value]) => {
    // Remplacer {variable} dans le HTML (mais pas dans les attributs src déjà traités)
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    const replacement = value ? String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''
    result = result.replace(regex, replacement)
  })
  return result
}

/**
 * Extrait et traite les styles du body HTML
 */
function processBodyStyles(html: string): string {
  // Extrait les styles inline et les convertit en CSS si nécessaire
  // Pour l'instant, on retourne une chaîne vide car les styles sont déjà dans le HTML
  return ''
}

/**
 * Traite la pagination dans le footer
 */
function processFooterPagination(
  footerHTML: string,
  template: DocumentTemplate,
  variables: DocumentVariables
): string {
  if (!template.footer?.pagination?.enabled) {
    return footerHTML
  }
  
  // Remplace {numero_page} et {total_pages} dans le footer
  // Note: Puppeteer ne gère pas automatiquement la pagination, on doit utiliser du CSS
  // Pour l'instant, on retourne le footer tel quel et on compte sur le CSS
  const paginationFormat = (template.footer as any)?.pagination?.format || 'Page {numero_page} / {total_pages}'
  const paginationText = replaceVariables(paginationFormat, {
    ...variables,
    numero_page: 1, // Sera remplacé dynamiquement si nécessaire
    total_pages: 1,
  })
  
  // Ajouter la pagination au footer si elle n'y est pas déjà
  if (!footerHTML.includes('{numero_page}') && !footerHTML.includes(paginationText)) {
    const position = (template.footer as any)?.pagination?.position || 'center'
    const textAlign = position === 'left' ? 'left' : position === 'right' ? 'right' : 'center'
    return `${footerHTML}<div style="text-align: ${textAlign}; font-size: 9pt; color: #4D4D4D; margin-top: 10px;">
      ${paginationText.replace(/\{numero_page\}/g, '<span class="page-number"></span>').replace(/\{total_pages\}/g, '<span class="total-pages"></span>')}
    </div>`
  }
  
  return footerHTML
}
