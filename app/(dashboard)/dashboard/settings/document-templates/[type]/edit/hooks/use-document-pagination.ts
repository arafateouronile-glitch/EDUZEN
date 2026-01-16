'use client'

import { useMemo } from 'react'
import type { DocumentTemplate, TemplateElement } from '@/lib/types/document-templates'

interface UseDocumentPaginationReturn {
  pageCount: number
  pages: TemplateElement[][]
  availableHeight: number
  contentArea: {
    width: number
    height: number
    marginTop: number
    marginBottom: number
    marginLeft: number
    marginRight: number
  }
}

/**
 * Calcule la pagination d'un document en fonction du contenu et de la hauteur disponible
 */
export function useDocumentPagination(
  template: DocumentTemplate
): UseDocumentPaginationReturn {
  const result = useMemo(() => {
    // Dimensions de page en pixels (pour affichage web)
    const pageDimensions = {
      A4: { width: 210 * 3.779527559, height: 297 * 3.779527559 }, // mm to px (96 DPI)
      Letter: { width: 216 * 3.779527559, height: 279 * 3.779527559 },
      Legal: { width: 216 * 3.779527559, height: 356 * 3.779527559 },
    }

    const pageSize = template.page_size || 'A4'
    const pageHeight = pageDimensions[pageSize]?.height || pageDimensions.A4.height

    // Calculer l'espace disponible pour le contenu
    const headerHeight = template.header_enabled ? template.header_height : 0
    const footerHeight = template.footer_enabled ? template.footer_height : 0
    const margins = template.margins || { top: 20, right: 20, bottom: 20, left: 20 }

    const availableHeight =
      pageHeight - headerHeight - footerHeight - margins.top - margins.bottom

    // Calculer le nombre de pages nécessaires
    const content = template.content || { elements: [], pageSize: 'A4', margins }
    const elements = content.elements || []

    // Pour l'instant, on place tous les éléments sur une page
    // TODO: Implémenter la logique de pagination réelle basée sur la hauteur des éléments
    let currentPageHeight = 0
    const pages: TemplateElement[][] = [[]]
    let currentPage = 0

    elements.forEach((element) => {
      const elementHeight = calculateElementHeight(element)

      if (currentPageHeight + elementHeight > availableHeight && currentPageHeight > 0) {
        // Nouvelle page
        currentPage++
        pages[currentPage] = []
        currentPageHeight = 0
      }

      pages[currentPage].push(element)
      currentPageHeight += elementHeight + 20 // 20px d'espacement entre éléments
    })

    const pageCount = pages.length

    return {
      pageCount,
      pages,
      availableHeight,
      contentArea: {
        width: pageDimensions[pageSize]?.width || pageDimensions.A4.width - margins.left - margins.right,
        height: availableHeight,
        marginTop: margins.top + headerHeight,
        marginBottom: margins.bottom + footerHeight,
        marginLeft: margins.left,
        marginRight: margins.right,
      },
    }
  }, [template])

  return result
}

/**
 * Calcule la hauteur estimée d'un élément en pixels
 */
function calculateElementHeight(element: TemplateElement): number {
  // Hauteur par défaut selon le type
  const defaultHeights: Record<TemplateElement['type'], number> = {
    text: 30, // Hauteur moyenne d'une ligne de texte
    image: element.size?.height || 100,
    line: 1,
    spacer: element.size?.height || 20,
    table: (element.tableData?.rows?.length || 0) * 30 + 40, // 30px par ligne + 40px pour header
    signature: element.size?.height || 80,
    qrcode: element.size?.height || 60,
    barcode: element.size?.height || 30,
    variable: 20,
  }

  const baseHeight = defaultHeights[element.type] || 30

  // Pour le texte, multiplier par le nombre de lignes estimées
  if (element.type === 'text' && element.content) {
    const fontSize = element.style?.fontSize || 12
    const lineHeight = element.style?.lineHeight || 1.5
    const textWidth = 500 // Largeur approximative
    const textLength = element.content.length
    const charsPerLine = Math.floor(textWidth / (fontSize * 0.6)) // Estimation
    const lines = Math.ceil(textLength / charsPerLine)
    return lines * fontSize * lineHeight + 20 // Padding
  }

  return baseHeight
}























