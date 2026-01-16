/**
 * Générateur Word (.docx) avec support header/footer répétés sur toutes les pages
 * Utilise la bibliothèque docx
 */

import {
  Document,
  Packer,
  Paragraph,
  Header,
  Footer,
  TextRun,
  AlignmentType,
  PageNumber,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ExternalHyperlink,
  ImageRun,
  HeadingLevel,
} from 'docx'
import type { DocumentTemplate, DocumentVariables, TemplateElement } from '@/lib/types/document-templates'

export interface DOCXGenerationResult {
  blob: Blob
  pageCount: number
}

/**
 * Génère un document Word à partir d'un template avec header/footer répétés
 */
export async function generateDOCX(
  template: DocumentTemplate,
  variables: DocumentVariables,
  documentId?: string,
  organizationId?: string
): Promise<DOCXGenerationResult> {
  const margins = template.margins || { top: 20, right: 20, bottom: 20, left: 20 }
  const pages = calculatePages(template, variables)

  // Créer les enfants du document (contenu + sauts de page)
  const children: (Paragraph | Table)[] = []

  pages.forEach((pageElements, pageIndex) => {
    // Ajouter les éléments de la page
    pageElements.forEach((element) => {
      const rendered = renderElement(element, variables)
      if (rendered) {
        if (Array.isArray(rendered)) {
          children.push(...rendered)
        } else {
          children.push(rendered)
        }
      }
    })

    // Ajouter un saut de page sauf pour la dernière page
    if (pageIndex < pages.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }
  })

  // Créer le document avec header/footer
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: getPageWidth(template.page_size || 'A4'),
              height: getPageHeight(template.page_size || 'A4'),
            },
            margin: {
              top: convertPxToDXA(margins.top + (template.header_enabled ? template.header_height : 0)),
              right: convertPxToDXA(margins.right),
              bottom: convertPxToDXA(margins.bottom + (template.footer_enabled ? template.footer_height : 0)),
              left: convertPxToDXA(margins.left),
            },
          },
        },

        // Header
        headers: {
          default:
            template.header_enabled && template.header
              ? new Header({
                  children: renderElements(
                    template.header.elements || [],
                    variables
                  ).filter((el): el is Paragraph => el instanceof Paragraph),
                })
              : undefined,
        },

        // Body
        children,

        // Footer
        footers: {
          default:
            template.footer_enabled && template.footer
              ? new Footer({
                  children: [
                    // Pagination
                    ...(template.footer.pagination?.enabled
                      ? [
                          new Paragraph({
                            alignment: getAlignmentType(template.footer.pagination.position),
                            children: [
                              new TextRun({
                                children: replacePaginationFormat(
                                  template.footer.pagination.format || 'Page {numero_page} / {total_pages}',
                                  variables,
                                  pages.length
                                ),
                              }),
                            ],
                            style: 'footer',
                          }),
                        ]
                      : []),
                    // Éléments du footer
                    ...renderElements(template.footer.elements || [], {
                      ...variables,
                      numero_page: 1,
                      total_pages: pages.length,
                    }).filter((el): el is Paragraph => el instanceof Paragraph),
                  ],
                })
              : undefined,
        },
      },
    ],
  })

  // Générer le blob DOCX
  const blob = await Packer.toBlob(doc)

  return {
    blob,
    pageCount: pages.length,
  }
}

/**
 * Rend un élément en format Word
 */
function renderElement(
  element: TemplateElement,
  variables: DocumentVariables
): Paragraph | Paragraph[] | null {
  switch (element.type) {
    case 'text':
      return new Paragraph({
        children: [
          new TextRun({
            text: element.content ? replaceVariables(element.content, variables) : '',
            bold: element.style?.fontWeight === 'bold',
            italics: element.style?.fontStyle === 'italic',
            color: element.style?.color?.replace('#', '') || '000000',
            size: element.style?.fontSize ? element.style.fontSize * 2 : 24, // docx utilise des demi-points
          }),
        ],
        alignment: getAlignmentType(element.style?.textAlign),
        spacing: {
          after: 200, // 10pt
        },
      })

    case 'line':
      return new Paragraph({
        children: [
          new TextRun({
            text: '─'.repeat(50),
            color: element.style?.color?.replace('#', '') || '000000',
          }),
        ],
        spacing: {
          after: 200,
        },
      })

    case 'spacer':
      return new Paragraph({
        text: '',
        spacing: {
          after: (element.size?.height || 20) * 20, // Convertir px en demi-points
        },
      })

    case 'table':
      if (!element.tableData) return null
      return new Paragraph({
        children: [
          // TODO: Créer une vraie table avec Table, TableRow, TableCell
          new TextRun({
            text: `[Tableau: ${element.tableData.headers.join(', ')}]`,
          }),
        ],
      })

    default:
      return null
  }
}

/**
 * Rend plusieurs éléments
 */
function renderElements(
  elements: TemplateElement[],
  variables: DocumentVariables
): (Paragraph | Table)[] {
  const results: (Paragraph | Table)[] = []

  elements.forEach((element) => {
    const rendered = renderElement(element, variables)
    if (rendered) {
      if (Array.isArray(rendered)) {
        results.push(...rendered)
      } else {
        results.push(rendered)
      }
    }
  })

  return results
}

/**
 * Calcule les pages nécessaires pour le contenu
 */
function calculatePages(
  template: DocumentTemplate,
  variables: DocumentVariables
): TemplateElement[][] {
  const content = template.content || {
    elements: [],
    pageSize: 'A4',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
  }
  const elements = content.elements || []

  if (elements.length === 0) {
    return [[]]
  }

  // Pour l'instant, on met tous les éléments sur une page
  // TODO: Implémenter la vraie pagination basée sur la hauteur
  return [elements]
}

/**
 * Convertit des pixels en DXA (unités Word)
 */
function convertPxToDXA(px: number): number {
  // 1 DXA = 1/20 point, 1 point = 1/72 inch, 1 inch = 96 px
  // Donc: px * (1/96) * 72 * 20 = px * 15
  return Math.round(px * 15)
}

/**
 * Convertit l'alignement CSS en AlignmentType de docx
 */
function getAlignmentType(
  align?: 'left' | 'center' | 'right' | 'justify'
): AlignmentType {
  switch (align) {
    case 'center':
      return AlignmentType.CENTER
    case 'right':
      return AlignmentType.RIGHT
    case 'justify':
      return AlignmentType.JUSTIFIED
    default:
      return AlignmentType.LEFT
  }
}

import { processConditionals } from './conditional-processor'
import { processLoops } from './loop-processor'
import { processCalculatedVariables } from './calculated-variables'
import { processDynamicTables } from './dynamic-table-processor'
import { processElementVisibility } from './element-visibility-processor'
import { processNestedVariables, flattenVariables } from './nested-variables-processor'
import { processDynamicHyperlinks } from './dynamic-hyperlinks-processor'

/**
 * Remplace les variables dans un texte et traite les conditions
 */
function replaceVariables(text: string, variables: DocumentVariables): string {
  // Aplatir les variables imbriquées pour compatibilité
  const flattenedVariables = flattenVariables(variables)

  // Traiter dans l'ordre : tableaux dynamiques -> boucles -> conditions -> visibilité -> variables calculées -> variables imbriquées -> remplacement de variables
  let result = text

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

  // 7. Traiter les liens hypertextes dynamiques (LINK, EMAIL, PHONE, SMS)
  result = processDynamicHyperlinks(result, flattenedVariables)

  // 8. Remplacer les variables restantes
  Object.entries(flattenedVariables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(regex, String(value || ''))
  })
  return result
}

/**
 * Remplace le format de pagination avec les numéros de page
 */
function replacePaginationFormat(
  format: string,
  variables: DocumentVariables,
  totalPages: number
): string {
  // Pour Word, on utilise des champs spéciaux qui seront remplacés lors du rendu
  // Pour l'instant, on fait une substitution basique
  let result = format
    .replace(/\{numero_page\}/g, '1') // Sera remplacé par PageNumber.CURRENT dans la vraie implémentation
    .replace(/\{total_pages\}/g, String(totalPages))

  return result
}

/**
 * Obtient la largeur de page en DXA
 */
function getPageWidth(size: 'A4' | 'Letter' | 'Legal'): number {
  const widths = {
    A4: 11906, // 8.27" * 1440 DXA/inch
    Letter: 12240, // 8.5" * 1440
    Legal: 12240, // 8.5" * 1440
  }
  return widths[size] || widths.A4
}

/**
 * Obtient la hauteur de page en DXA
 */
function getPageHeight(size: 'A4' | 'Letter' | 'Legal'): number {
  const heights = {
    A4: 16838, // 11.69" * 1440 DXA/inch
    Letter: 15840, // 11" * 1440
    Legal: 20160, // 14" * 1440
  }
  return heights[size] || heights.A4
}
