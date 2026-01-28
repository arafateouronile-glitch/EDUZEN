/**
 * Service de génération automatique de templates DOCX à partir des templates HTML
 * 
 * Ce service convertit les templates HTML (header, body, footer) en documents DOCX
 * qui peuvent ensuite être traités par docxtemplater pour la génération finale.
 * 
 * Avantages :
 * - Pas besoin d'uploader manuellement des templates DOCX
 * - Utilise les mêmes templates HTML que pour les PDFs
 * - Variables {variable} préservées pour docxtemplater
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Header,
  Footer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  ImageRun,
  TableLayoutType,
  VerticalAlign,
  ShadingType,
  ITableCellOptions,
  ITableRowOptions,
  ITableOptions,
  IParagraphOptions,
  IRunOptions,
} from 'docx'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import { documentTemplateDefaults } from '@/lib/utils/document-template-defaults'
import { logger, sanitizeError } from '@/lib/utils/logger'

// Constantes pour les dimensions
const A4_WIDTH_TWIPS = 11906 // 210mm en twips
const A4_HEIGHT_TWIPS = 16838 // 297mm en twips
const MM_TO_TWIPS = 56.6929

/**
 * Génère un document Word directement à partir d'un template HTML
 * Sans avoir besoin d'un fichier .docx pré-uploadé
 */
export async function generateDocxFromHtmlTemplate(
  template: DocumentTemplate,
  variables: DocumentVariables
): Promise<Buffer> {
  logger.info('AutoDocx - Génération automatique du DOCX depuis le template HTML', {
    templateType: template.type,
  })
  
  // Récupérer le template par défaut si nécessaire
  const defaultTemplate = documentTemplateDefaults[template.type]
  
  // Récupérer les contenus HTML
  let headerHtml = ''
  let bodyHtml = ''
  let footerHtml = ''
  
  // Header
  if (template.header && typeof template.header === 'object') {
    headerHtml = (template.header as any).content || ''
  }
  if (!headerHtml && defaultTemplate) {
    headerHtml = defaultTemplate.headerContent || ''
  }
  
  // Body
  if (template.content && typeof template.content === 'object') {
    bodyHtml = (template.content as any).html || ''
  }
  if (!bodyHtml && typeof template.content === 'string') {
    bodyHtml = template.content
  }
  if (!bodyHtml && defaultTemplate) {
    bodyHtml = defaultTemplate.bodyContent || ''
  }
  
  // Footer
  if (template.footer && typeof template.footer === 'object') {
    footerHtml = (template.footer as any).content || ''
  }
  if (!footerHtml && defaultTemplate) {
    footerHtml = defaultTemplate.footerContent || ''
  }
  
  logger.debug('AutoDocx - HTML lengths', {
    headerLength: headerHtml.length,
    bodyLength: bodyHtml.length,
    footerLength: footerHtml.length,
  })
  
  // Afficher les variables de logo disponibles
  const varKeys = Object.keys(variables)
  const varsAsAny = variables as any
  logger.debug('AutoDocx - Variables reçues', {
    variableCount: varKeys.length,
    hasEcoleLogo: !!varsAsAny.ecole_logo,
    hasOrganizationLogo: !!varsAsAny.organization_logo,
  })
  
  // Remplacer les variables dans le HTML AVANT la conversion
  const processedHeader = replaceVariables(headerHtml, variables)
  const processedBody = replaceVariables(bodyHtml, variables)
  const processedFooter = replaceVariables(footerHtml, variables)
  
  // Log après remplacement pour vérifier les images
  const hasImgInHeader = processedHeader.includes('<img')
  if (hasImgInHeader) {
    const imgMatch = processedHeader.match(/<img[^>]*src="([^"]{0,50})/i)
    logger.debug('AutoDocx - Header contient image', {
      hasImage: true,
      imageSrcPreview: imgMatch ? imgMatch[1].substring(0, 50) : 'Non trouvé',
    })
  }
  
  // Taille de police par défaut
  const defaultFontSize = template.font_size || 10
  
  // Convertir chaque section HTML en éléments DOCX
  const headerChildren = await htmlToDocxElements(processedHeader, 'header', variables, defaultFontSize)
  const bodyChildren = await htmlToDocxElements(processedBody, 'body', variables, defaultFontSize)
  const footerChildren = await htmlToDocxElements(processedFooter, 'footer', variables, defaultFontSize)
  
  logger.debug('AutoDocx - Elements créés', {
    headerElements: headerChildren.length,
    bodyElements: bodyChildren.length,
    footerElements: footerChildren.length,
  })
  
  // Créer le header Word
  const docxHeader = new Header({
    children: headerChildren.length > 0 ? headerChildren : [new Paragraph({ children: [] })],
  })
  
  // Créer le footer Word
  const docxFooter = new Footer({
    children: footerChildren.length > 0 ? footerChildren : [new Paragraph({ children: [] })],
  })
  
  // Marges du document
  const margins = template.margins || { top: 20, right: 15, bottom: 20, left: 15 }
  
  // Créer le document - Header et footer sur TOUTES les pages
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: A4_WIDTH_TWIPS,
            height: A4_HEIGHT_TWIPS,
          },
          margin: {
            top: convertMillimetersToTwip(margins.top),
            right: convertMillimetersToTwip(margins.right),
            bottom: convertMillimetersToTwip(margins.bottom),
            left: convertMillimetersToTwip(margins.left),
          },
        },
      },
      headers: {
        default: docxHeader, // Header sur TOUTES les pages
      },
      footers: {
        default: docxFooter, // Footer sur TOUTES les pages
      },
      children: bodyChildren,
    }],
  })
  
  // Générer le buffer
  const buffer = await Packer.toBuffer(doc)
  logger.info('AutoDocx - Document généré avec succès', {
    bufferSize: buffer.length,
  })
  
  return Buffer.from(buffer)
}

/**
 * Variables de logo connues qui doivent être converties en balises <img>
 */
const LOGO_VARIABLES = [
  'ecole_logo',
  'organization_logo',
  'organisation_logo',
  'logo',
  'company_logo',
  'school_logo',
]

/**
 * Remplace les variables {variable} par leurs valeurs
 * Convertit automatiquement les variables de logo en balises <img>
 */
function replaceVariables(html: string, variables: DocumentVariables): string {
  if (!html) return ''
  
  let result = html
  
  // D'abord, convertir les variables de logo en balises <img>
  const varsAsAny = variables as any
  for (const logoVar of LOGO_VARIABLES) {
    const logoValue = varsAsAny[logoVar]
    if (logoValue && typeof logoValue === 'string' && logoValue.startsWith('http')) {
      // Remplacer {logo_var} par une balise <img>
      const logoRegex = new RegExp(`\\{${logoVar}\\}`, 'g')
      const imgTag = `<img src="${logoValue}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />`
      result = result.replace(logoRegex, imgTag)
      logger.debug(`AutoDocx - Variable logo convertie`, { logoVar })
    }
  }
  
  // Ensuite, remplacer toutes les autres variables {variable}
  let replacedCount = 0
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      // Ne pas retraiter les logos déjà convertis
      if (LOGO_VARIABLES.includes(key)) continue
      
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      const before = result
      result = result.replace(regex, String(value))
      if (before !== result) {
        replacedCount++
      }
    }
  }
  
  // Détecter les variables non remplacées
  const unreplacedVars = result.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g)
  if (unreplacedVars && unreplacedVars.length > 0) {
    const uniqueVars = [...new Set(unreplacedVars)]
    logger.warn('AutoDocx - Variables non remplacées', {
      count: uniqueVars.length,
      variables: uniqueVars.slice(0, 10),
    })
    
    // Remplacer les variables non trouvées par une chaîne vide (comme le PDF)
    // Cela évite que les balises {variable} apparaissent dans le document final
    for (const varName of uniqueVars) {
      result = result.replace(new RegExp(varName.replace(/[{}]/g, '\\$&'), 'g'), '')
    }
    logger.debug('AutoDocx - Variables non remplacées supprimées', {
      removedCount: uniqueVars.length,
    })
  }
  
  return result
}

/**
 * Convertit du HTML en éléments DOCX (paragraphes et tables)
 */
async function htmlToDocxElements(
  html: string,
  context: 'header' | 'body' | 'footer',
  variables: DocumentVariables,
  defaultFontSize: number
): Promise<(Paragraph | Table)[]> {
  const elements: (Paragraph | Table)[] = []
  
  if (!html || html.trim() === '') {
    return elements
  }
  
  // Nettoyer le HTML
  let cleanHtml = html
    .replace(/<!--[\s\S]*?-->/g, '') // Supprimer les commentaires
    .trim()
  
  // Trouver et traiter les images standalone (hors tables)
  const standaloneImages = await extractAndProcessStandaloneImages(cleanHtml, defaultFontSize)
  
  // Trouver et traiter les tables
  let currentIndex = 0
  const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi
  let match
  
  // Créer une copie pour itérer
  const htmlCopy = cleanHtml
  
  while ((match = tableRegex.exec(htmlCopy)) !== null) {
    const tableHtml = match[0]
    const tableStartIndex = match.index
    
    // Traiter le texte AVANT cette table
    if (tableStartIndex > currentIndex) {
      const beforeText = htmlCopy.substring(currentIndex, tableStartIndex)
      // Vérifier s'il y a des images standalone dans cette section
      const sectionImages = await extractAndProcessStandaloneImages(beforeText, defaultFontSize)
      elements.push(...sectionImages)
      
      const textElements = parseHtmlToTextElements(beforeText, defaultFontSize, context)
      elements.push(...textElements)
    }
    
    // Convertir la table
    logger.debug('AutoDocx - Table trouvée', { tableHtmlLength: tableHtml.length })
    const table = await parseHtmlTable(tableHtml, variables, defaultFontSize)
    if (table) {
      elements.push(table)
      logger.debug('AutoDocx - Table convertie avec succès')
    } else {
      logger.warn('AutoDocx - Table non convertie, conversion en texte')
      // Si la table n'a pas pu être convertie, extraire le texte
      const tableTextElements = parseHtmlToTextElements(tableHtml, defaultFontSize, context)
      elements.push(...tableTextElements)
    }
    
    currentIndex = tableStartIndex + tableHtml.length
  }
  
  // Traiter le texte restant après la dernière table
  if (currentIndex < htmlCopy.length) {
    const afterText = htmlCopy.substring(currentIndex)
    // Vérifier s'il y a des images standalone dans cette section
    const sectionImages = await extractAndProcessStandaloneImages(afterText, defaultFontSize)
    elements.push(...sectionImages)
    
    const textElements = parseHtmlToTextElements(afterText, defaultFontSize, context)
    elements.push(...textElements)
  }
  
  // Si aucune table n'a été trouvée, traiter tout comme texte
  if (elements.length === 0 && cleanHtml.trim()) {
    elements.push(...standaloneImages)
    const textElements = parseHtmlToTextElements(cleanHtml, defaultFontSize, context)
    elements.push(...textElements)
  }
  
  return elements
}

/**
 * Extrait et traite les images standalone (hors tables)
 */
async function extractAndProcessStandaloneImages(
  html: string,
  defaultFontSize: number
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = []
  
  // Chercher les images qui ne sont PAS dans des tables
  const imgRegex = /<img[^>]*src="([^"]*)"[^>]*>/gi
  let imgMatch
  
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    // Vérifier si l'image est dans une table (on ne la traite pas ici si c'est le cas)
    const beforeImg = html.substring(0, imgMatch.index)
    const tableOpenCount = (beforeImg.match(/<table/gi) || []).length
    const tableCloseCount = (beforeImg.match(/<\/table>/gi) || []).length
    
    // Si on est dans une table, on passe
    if (tableOpenCount > tableCloseCount) {
      continue
    }
    
    const imgSrc = imgMatch[1]
    if (imgSrc && !imgSrc.startsWith('{')) {
      try {
        const logoBuffer = await downloadImage(imgSrc)
        if (logoBuffer) {
          // Extraire le style de l'image
          const fullImgTag = imgMatch[0]
          const styleMatch = fullImgTag.match(/style="([^"]*)"/i)
          const imgStyle = styleMatch ? styleMatch[1] : ''
          const styles = parseInlineStyles(imgStyle)
          
          // Déterminer l'alignement
          let alignment: typeof AlignmentType.LEFT | typeof AlignmentType.CENTER | typeof AlignmentType.RIGHT = AlignmentType.LEFT
          if (styles.textAlign === 'center' || styles.margin === 'auto' || styles.marginLeft === 'auto') {
            alignment = AlignmentType.CENTER as typeof AlignmentType.LEFT
          } else if (styles.textAlign === 'right') {
            alignment = AlignmentType.RIGHT as typeof AlignmentType.LEFT
          }
          
          // Dimensions
          let imgWidth = 100
          let imgHeight = 50
          
          if (styles.width) {
            const parsedWidth = parseFloat(styles.width)
            if (!isNaN(parsedWidth)) imgWidth = parsedWidth
          }
          if (styles.height || styles.maxHeight) {
            const heightStr = styles.height || styles.maxHeight
            const parsedHeight = parseFloat(heightStr)
            if (!isNaN(parsedHeight)) imgHeight = parsedHeight
          }
          
          logger.debug('AutoDocx - Image standalone détectée', {
            imageSrcPreview: imgSrc.substring(0, 40),
          })
          
          paragraphs.push(new Paragraph({
            children: [
              new ImageRun({
                data: logoBuffer,
                transformation: { width: imgWidth, height: imgHeight },
              } as any),
            ],
            alignment,
          }))
        }
      } catch (error) {
        logger.warn('AutoDocx - Erreur image standalone', { error: sanitizeError(error) })
      }
    }
  }
  
  return paragraphs
}

/**
 * Parse le HTML en éléments de texte (paragraphes) avec détection des styles
 */
function parseHtmlToTextElements(
  html: string, 
  defaultFontSize: number,
  context: 'header' | 'body' | 'footer'
): Paragraph[] {
  const paragraphs: Paragraph[] = []
  
  if (!html) return paragraphs
  
  // Détecter les différents blocs (h1, h2, p, div, li, etc.)
  const blockRegex = /<(h[1-6]|p|div|li|span)[^>]*>([\s\S]*?)<\/\1>/gi
  const blocks: { tag: string; content: string; style: string }[] = []
  
  let match
  let lastIndex = 0
  
  while ((match = blockRegex.exec(html)) !== null) {
    // Texte avant ce bloc
    if (match.index > lastIndex) {
      const beforeText = html.substring(lastIndex, match.index)
      const cleanText = stripHtmlTags(beforeText).trim()
      if (cleanText) {
        blocks.push({ tag: 'text', content: cleanText, style: '' })
      }
    }
    
    const tag = match[1].toLowerCase()
    const fullMatch = match[0]
    const innerContent = match[2]
    
    // Extraire le style
    const styleMatch = fullMatch.match(/style="([^"]*)"/i)
    const style = styleMatch ? styleMatch[1] : ''
    
    const cleanContent = stripHtmlTags(innerContent).trim()
    if (cleanContent) {
      blocks.push({ tag, content: cleanContent, style })
    }
    
    lastIndex = match.index + fullMatch.length
  }
  
  // Texte restant après le dernier bloc
  if (lastIndex < html.length) {
    const afterText = html.substring(lastIndex)
    const cleanText = stripHtmlTags(afterText).trim()
    if (cleanText) {
      blocks.push({ tag: 'text', content: cleanText, style: '' })
    }
  }
  
  // Si aucun bloc n'a été trouvé, traiter tout le HTML comme texte simple
  if (blocks.length === 0) {
    const cleanText = stripHtmlTags(html).trim()
    if (cleanText) {
      blocks.push({ tag: 'text', content: cleanText, style: '' })
    }
  }
  
  // Convertir chaque bloc en paragraphe
  for (const block of blocks) {
    const paragraph = createParagraphFromBlock(block, defaultFontSize, context)
    if (paragraph) {
      paragraphs.push(paragraph)
    }
  }
  
  return paragraphs
}

/**
 * Crée un paragraphe DOCX à partir d'un bloc HTML
 */
function createParagraphFromBlock(
  block: { tag: string; content: string; style: string },
  defaultFontSize: number,
  context: 'header' | 'body' | 'footer'
): Paragraph | null {
  const { tag, content, style } = block
  
  if (!content.trim()) return null
  
  // Parser les styles CSS
  const styles = parseInlineStyles(style)
  
  // Déterminer la taille de police
  let fontSize = defaultFontSize
  if (styles.fontSize) {
    const parsed = parseFloat(styles.fontSize)
    if (!isNaN(parsed)) {
      fontSize = parsed
    }
  }
  
  // Ajuster pour les titres
  if (tag.startsWith('h')) {
    const level = parseInt(tag[1])
    fontSize = defaultFontSize * (2.5 - level * 0.2)
  }
  
  // Taille réduite pour header/footer
  if (context === 'header' || context === 'footer') {
    fontSize = Math.min(fontSize, 8)
  }
  
  // Déterminer l'alignement
  let alignment: typeof AlignmentType.LEFT | typeof AlignmentType.CENTER | typeof AlignmentType.RIGHT | typeof AlignmentType.JUSTIFIED = AlignmentType.LEFT
  if (styles.textAlign === 'center') alignment = AlignmentType.CENTER as typeof AlignmentType.LEFT
  else if (styles.textAlign === 'right') alignment = AlignmentType.RIGHT as typeof AlignmentType.LEFT
  else if (styles.textAlign === 'justify') alignment = AlignmentType.JUSTIFIED as typeof AlignmentType.LEFT
  
  // Créer le TextRun
  const textRunOptions: IRunOptions = {
    text: content,
    size: Math.round(fontSize * 2), // Points * 2 pour half-points
    font: styles.fontFamily || 'Times New Roman',
    bold: tag.startsWith('h') || styles.fontWeight === 'bold' || styles.fontWeight === '700',
    italics: styles.fontStyle === 'italic',
    color: cssColorToHex(styles.color),
  }
  
  // Créer le paragraphe
  const paragraphOptions: IParagraphOptions = {
    children: [new TextRun(textRunOptions)],
    alignment,
    spacing: {
      after: tag.startsWith('h') ? 200 : 100,
      line: 276, // 1.15 line spacing
    },
  }
  
  // Ajouter un style de titre si nécessaire
  let finalParagraphOptions = paragraphOptions
  if (tag === 'h1') {
    finalParagraphOptions = { ...paragraphOptions, heading: HeadingLevel.HEADING_1 }
  } else if (tag === 'h2') {
    finalParagraphOptions = { ...paragraphOptions, heading: HeadingLevel.HEADING_2 }
  } else if (tag === 'h3') {
    finalParagraphOptions = { ...paragraphOptions, heading: HeadingLevel.HEADING_3 }
  }
  
  return new Paragraph(finalParagraphOptions)
}

/**
 * Parse une table HTML en Table DOCX
 */
async function parseHtmlTable(
  tableHtml: string,
  variables: DocumentVariables,
  defaultFontSize: number
): Promise<Table | null> {
  try {
    logger.debug('AutoDocx - Parsing table HTML')
    
    // Vérifier si la table a border-collapse: collapse ou des bordures explicites
    const tableStyleMatch = tableHtml.match(/<table[^>]*style="([^"]*)"/i)
    const tableStyle = tableStyleMatch ? tableStyleMatch[1] : ''
    const tableStyles = parseInlineStyles(tableStyle)
    const hasBorderCollapse = tableStyles.borderCollapse === 'collapse'
    
    // Détecter si c'est une table de mise en page (sans bordures)
    const isLayoutTable = tableStyles.border === '0' || 
                          tableStyles.border === 'none' || 
                          tableStyles.border === '0px' ||
                          tableHtml.includes('border: 0') ||
                          tableHtml.includes('border:0')
    
    // Extraire toutes les lignes (tr)
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    const rowMatches = [...tableHtml.matchAll(rowRegex)]
    
    logger.debug('AutoDocx - Lignes trouvées dans table', {
      rowCount: rowMatches.length,
      hasBorderCollapse,
    })
    
    if (rowMatches.length === 0) {
      logger.warn('AutoDocx - Aucune ligne trouvée dans la table')
      return null
    }
    
    const tableRows: TableRow[] = []
    
    for (let rowIndex = 0; rowIndex < rowMatches.length; rowIndex++) {
      const rowMatch = rowMatches[rowIndex]
      const rowHtml = rowMatch[0]
      const rowContent = rowMatch[1]
      
      // Extraire le style de la ligne
      const rowStyleMatch = rowHtml.match(/<tr[^>]*style="([^"]*)"/i)
      const rowStyle = rowStyleMatch ? rowStyleMatch[1] : ''
      const rowStyles = parseInlineStyles(rowStyle)
      
      // Extraire les cellules (td ou th)
      const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi
      const cellMatches = [...rowContent.matchAll(cellRegex)]
      
      logger.debug('AutoDocx - Ligne analysée', {
        rowIndex: rowIndex + 1,
        cellCount: cellMatches.length,
      })
      
      if (cellMatches.length === 0) continue
      
      const tableCells: TableCell[] = []
      
      for (const cellMatch of cellMatches) {
        const cellTag = cellMatch[1] // td ou th
        const cellContent = cellMatch[2]
        const fullCellHtml = cellMatch[0]
        
        // Extraire le style de la cellule
        const styleMatch = fullCellHtml.match(/style="([^"]*)"/i)
        const cellStyle = styleMatch ? styleMatch[1] : ''
        const styles = parseInlineStyles(cellStyle)
        
        // Vérifier si c'est un header (th)
        const isHeader = cellTag.toLowerCase() === 'th'
        
        // Vérifier si la cellule contient une table imbriquée - l'aplatir en texte structuré
        const hasNestedTable = /<table/i.test(cellContent)
        let processedCellContent = cellContent
        
        if (hasNestedTable) {
          // Extraire le contenu des cellules de la table imbriquée comme texte structuré
          processedCellContent = cellContent
            .replace(/<table[^>]*>/gi, '')
            .replace(/<\/table>/gi, '')
            .replace(/<thead[^>]*>/gi, '')
            .replace(/<\/thead>/gi, '')
            .replace(/<tbody[^>]*>/gi, '')
            .replace(/<\/tbody>/gi, '')
            .replace(/<tr[^>]*>/gi, '')
            .replace(/<\/tr>/gi, '\n')
            .replace(/<t[dh][^>]*>/gi, '')
            .replace(/<\/t[dh]>/gi, ' | ')
        }
        
        // Vérifier si la cellule contient une image/logo
        const imgMatch = processedCellContent.match(/<img[^>]*src="([^"]*)"[^>]*>/i)
        const hasImage = imgMatch !== null
        
        const cellChildren: Paragraph[] = []
        
        // Gérer l'image si présente
        if (hasImage && imgMatch) {
          const imgSrc = imgMatch[1]
          if (imgSrc && !imgSrc.startsWith('{')) {
            try {
              const logoBuffer = await downloadImage(imgSrc)
              if (logoBuffer) {
                // Déterminer l'alignement de l'image
                let imgAlignment: typeof AlignmentType.LEFT | typeof AlignmentType.CENTER | typeof AlignmentType.RIGHT = AlignmentType.LEFT
                if (styles.textAlign === 'right') imgAlignment = AlignmentType.RIGHT as typeof AlignmentType.LEFT
                else if (styles.textAlign === 'center') imgAlignment = AlignmentType.CENTER as typeof AlignmentType.LEFT
                
                // Extraire les dimensions de l'image depuis le HTML
                const imgStyleMatch = processedCellContent.match(/<img[^>]*style="([^"]*)"[^>]*>/i)
                const imgStyle = imgStyleMatch ? imgStyleMatch[1] : ''
                const imgStyles = parseInlineStyles(imgStyle)
                
                // Dimensions par défaut ou depuis le style
                let imgWidth = 100 // Largeur par défaut
                let imgHeight = 50 // Hauteur par défaut
                
                if (imgStyles.width) {
                  const parsedWidth = parseFloat(imgStyles.width)
                  if (!isNaN(parsedWidth)) imgWidth = parsedWidth
                }
                if (imgStyles.height || imgStyles.maxHeight) {
                  const heightStr = imgStyles.height || imgStyles.maxHeight
                  const parsedHeight = parseFloat(heightStr)
                  if (!isNaN(parsedHeight)) imgHeight = parsedHeight
                }
                
                logger.debug('AutoDocx - Image détectée dans cellule', {
                  imageSrcPreview: imgSrc.substring(0, 50),
                  width: imgWidth,
                  height: imgHeight,
                })
                
                cellChildren.push(new Paragraph({
                  children: [
                    new ImageRun({
                      data: logoBuffer,
                      transformation: {
                        width: imgWidth,
                        height: imgHeight,
                      },
                    } as any),
                  ],
                  alignment: imgAlignment,
                }))
              }
            } catch (error) {
              logger.warn('AutoDocx - Impossible de charger l\'image', { error: sanitizeError(error) })
            }
          }
        }
        
        // Extraire et ajouter le texte de la cellule (sans les tags d'image)
        let textContent = processedCellContent
          .replace(/<img[^>]*>/gi, '')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<\/li>/gi, '\n')
          .replace(/<\/h[1-6]>/gi, '\n')
          .replace(/<hr[^>]*>/gi, '\n---\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&euro;/gi, '€')
          .replace(/&copy;/gi, '©')
          .replace(/&reg;/gi, '®')
          .replace(/&trade;/gi, '™')
          .replace(/\n\s*\n/g, '\n') // Supprimer les lignes vides multiples
          .trim()
        
        if (textContent) {
          // Diviser par lignes
          const lines = textContent.split('\n').filter(l => l.trim())
          
          // Extraire la taille de police si définie dans le style
          let cellFontSize = defaultFontSize
          if (styles.fontSize) {
            const parsedSize = parseFloat(styles.fontSize)
            if (!isNaN(parsedSize)) cellFontSize = parsedSize
          }
          
          // Déterminer la couleur du texte
          const textColor = cssColorToHex(styles.color)
          
          // Détecter si le contenu original contient des balises bold/italic
          const hasBoldTag = /<(strong|b)[\s>]/i.test(processedCellContent)
          const hasItalicTag = /<(em|i)[\s>]/i.test(processedCellContent)
          
          for (const line of lines) {
            // Déterminer l'alignement du texte
            let textAlignment: typeof AlignmentType.LEFT | typeof AlignmentType.CENTER | typeof AlignmentType.RIGHT = AlignmentType.LEFT
            if (styles.textAlign === 'right') textAlignment = AlignmentType.RIGHT as typeof AlignmentType.LEFT
            else if (styles.textAlign === 'center') textAlignment = AlignmentType.CENTER as typeof AlignmentType.LEFT
            
            cellChildren.push(new Paragraph({
              children: [
                new TextRun({
                  text: line.trim(),
                  size: Math.round(cellFontSize * 2),
                  bold: isHeader || styles.fontWeight === 'bold' || styles.fontWeight === '700' || hasBoldTag,
                  italics: styles.fontStyle === 'italic' || hasItalicTag,
                  font: styles.fontFamily?.replace(/['"]/g, '') || 'Times New Roman',
                  color: textColor,
                }),
              ],
              alignment: textAlignment,
            }))
          }
        }
        
        // Si pas de contenu, ajouter un paragraphe vide
        if (cellChildren.length === 0) {
          cellChildren.push(new Paragraph({ children: [] }))
        }
        
        // Déterminer la largeur de la cellule
        let cellWidth: { size: number; type: typeof WidthType[keyof typeof WidthType] } | undefined
        if (styles.width) {
          const widthValue = parseFloat(styles.width)
          if (!isNaN(widthValue)) {
            cellWidth = {
              size: styles.width.includes('%') ? widthValue : Math.round(widthValue * 20),
              type: styles.width.includes('%') ? WidthType.PERCENTAGE : WidthType.DXA,
            }
          }
        }
        
        // Déterminer l'alignement vertical
        let verticalAlignment: typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM = VerticalAlign.TOP
        if (styles.verticalAlign === 'middle' || styles.verticalAlign === 'center') {
          verticalAlignment = VerticalAlign.CENTER as typeof VerticalAlign.TOP
        } else if (styles.verticalAlign === 'bottom') {
          verticalAlignment = VerticalAlign.BOTTOM as typeof VerticalAlign.TOP
        }
        
        // Déterminer les bordures (vérifier border global, bordures individuelles, ou border-collapse de la table)
        const hasCellBorder = (styles.border && styles.border !== '0' && styles.border !== 'none') ||
          styles.borderTop || styles.borderBottom || styles.borderLeft || styles.borderRight
        // Si c'est une table de mise en page (border: 0), pas de bordures
        // Si la table a border-collapse, appliquer des bordures aux cellules
        const hasBorder = isLayoutTable ? false : (hasCellBorder || hasBorderCollapse)
        const borderStyle = hasBorder ? BorderStyle.SINGLE : BorderStyle.NIL
        
        // Extraire la couleur de bordure si définie
        let borderColor = 'E2E8F0' // Couleur par défaut (gris clair)
        if (styles.border) {
          const borderColorMatch = styles.border.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/i)
          if (borderColorMatch) {
            borderColor = borderColorMatch[1].toUpperCase()
            if (borderColor.length === 3) {
              borderColor = borderColor.split('').map(c => c + c).join('')
            }
          }
        } else if (styles.borderBottom) {
          // Aussi vérifier borderBottom pour les lignes de séparation
          const borderColorMatch = styles.borderBottom.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/i)
          if (borderColorMatch) {
            borderColor = borderColorMatch[1].toUpperCase()
            if (borderColor.length === 3) {
              borderColor = borderColor.split('').map(c => c + c).join('')
            }
          }
        }
        
        // Déterminer la couleur de fond (cellule ou ligne)
        let shading = undefined
        let bgColor = styles.backgroundColor || styles.background || rowStyles.backgroundColor || rowStyles.background
        
        // Gérer les gradients CSS - extraire la première couleur
        if (bgColor && bgColor.includes('linear-gradient')) {
          const gradientColors = bgColor.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/gi)
          if (gradientColors && gradientColors.length > 0) {
            bgColor = gradientColors[0] // Utiliser la première couleur du gradient
            logger.debug('AutoDocx - Gradient converti en couleur solide', { bgColor })
          }
        }
        
        if (bgColor && bgColor !== 'transparent' && !bgColor.includes('gradient')) {
          const bgHex = cssColorToHex(bgColor)
          if (bgHex) {
            shading = {
              type: ShadingType.SOLID,
              color: bgHex,
              fill: bgHex,
            }
          }
        }
        
        // Créer la cellule
        const cellOptions: ITableCellOptions = {
          children: cellChildren,
          verticalAlign: verticalAlignment,
          borders: {
            top: { style: borderStyle, size: 1, color: borderColor },
            bottom: { style: borderStyle, size: 1, color: borderColor },
            left: { style: borderStyle, size: 1, color: borderColor },
            right: { style: borderStyle, size: 1, color: borderColor },
          },
          margins: {
            top: 80,
            bottom: 80,
            left: 80,
            right: 80,
          },
        }
        
        let finalCellOptions = cellOptions
        if (cellWidth) {
          finalCellOptions = { ...cellOptions, width: cellWidth }
        }
        
        if (shading) {
          finalCellOptions = { ...finalCellOptions, shading }
        }
        
        tableCells.push(new TableCell(finalCellOptions))
      }
      
      if (tableCells.length > 0) {
        tableRows.push(new TableRow({
          children: tableCells,
        }))
      }
    }
    
    logger.debug('AutoDocx - Lignes créées pour table', { rowCount: tableRows.length })
    
    if (tableRows.length === 0) {
      logger.warn('AutoDocx - Aucune ligne créée pour la table')
      return null
    }
    
    // Extraire la largeur de la table
    // Pour les tables de données (avec bordures), on force 100% de largeur pour un meilleur rendu Word
    // Pour les tables de mise en page, on respecte la largeur définie
    let tableWidth = 100
    
    // Si c'est une table de données (pas de mise en page), toujours utiliser 100%
    // Les largeurs en pixels sont mal rendues dans Word
    if (!isLayoutTable) {
      tableWidth = 100
    } else if (tableStyles.width) {
      const widthStr = tableStyles.width.toString()
      // Ne prendre en compte que les pourcentages (ignorer les px, em, etc.)
      if (widthStr.includes('%')) {
        const parsedWidth = parseFloat(widthStr)
        if (!isNaN(parsedWidth)) tableWidth = Math.min(parsedWidth, 100)
      }
      // Sinon, garder 100% pour les tables de mise en page aussi
    }
    
    // Déterminer les bordures de la table
    // Si borderCollapse est 'collapse', les cellules ont des bordures individuelles
    // Si border est défini sur la table, utiliser des bordures globales
    const hasTableBorder = tableStyles.border && tableStyles.border !== '0' && tableStyles.border !== 'none'
    
    // Pour les tables de mise en page (border: 0), pas de bordures du tout
    // Pour border-collapse, on utilise NIL au niveau table car les bordures sont sur les cellules
    // Pour border sur la table, on utilise SINGLE
    const tableBorderStyle = isLayoutTable ? BorderStyle.NIL : 
                             (hasTableBorder && !hasBorderCollapse ? BorderStyle.SINGLE : BorderStyle.NIL)
    
    // Extraire la couleur de bordure si définie
    let tableBorderColor = 'E2E8F0' // Couleur par défaut plus claire
    if (tableStyles.borderColor) {
      const parsedColor = cssColorToHex(tableStyles.borderColor)
      if (parsedColor) tableBorderColor = parsedColor
    } else if (tableStyles.border) {
      const tableBorderColorMatch = tableStyles.border.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/i)
      if (tableBorderColorMatch) {
        tableBorderColor = tableBorderColorMatch[1].toUpperCase()
        if (tableBorderColor.length === 3) {
          tableBorderColor = tableBorderColor.split('').map(c => c + c).join('')
        }
      }
    }
    
    // Log pour debug
    logger.debug('AutoDocx - Table styles', {
      isLayoutTable,
      borderCollapse: hasBorderCollapse,
      hasTableBorder: hasTableBorder,
      borderColor: tableBorderColor,
    })
    
    // Créer la table
    const tableOptions: ITableOptions = {
      rows: tableRows,
      width: {
        size: tableWidth,
        type: WidthType.PERCENTAGE,
      },
      layout: TableLayoutType.FIXED,
      borders: {
        top: { style: tableBorderStyle, size: 1, color: tableBorderColor },
        bottom: { style: tableBorderStyle, size: 1, color: tableBorderColor },
        left: { style: tableBorderStyle, size: 1, color: tableBorderColor },
        right: { style: tableBorderStyle, size: 1, color: tableBorderColor },
        insideHorizontal: { style: tableBorderStyle, size: 1, color: tableBorderColor },
        insideVertical: { style: tableBorderStyle, size: 1, color: tableBorderColor },
      },
    }
    
    logger.info('AutoDocx - Table créée avec succès', {
      rowCount: tableRows.length,
      width: tableWidth + '%',
    })
    return new Table(tableOptions)
    
  } catch (error) {
    logger.error('AutoDocx - Erreur lors du parsing de la table', error, { error: sanitizeError(error) })
    return null
  }
}

/**
 * Mappe les noms de couleurs CSS vers leurs valeurs hexadécimales
 */
const CSS_COLOR_NAMES: Record<string, string> = {
  white: 'FFFFFF',
  black: '000000',
  red: 'FF0000',
  green: '00FF00',
  blue: '0000FF',
  yellow: 'FFFF00',
  orange: 'FFA500',
  purple: '800080',
  pink: 'FFC0CB',
  gray: '808080',
  grey: '808080',
  lightgray: 'D3D3D3',
  lightgrey: 'D3D3D3',
  darkgray: 'A9A9A9',
  darkgrey: 'A9A9A9',
  silver: 'C0C0C0',
  navy: '000080',
  teal: '008080',
  aqua: '00FFFF',
  cyan: '00FFFF',
  magenta: 'FF00FF',
  maroon: '800000',
  olive: '808000',
  lime: '00FF00',
  transparent: 'FFFFFF',
}

/**
 * Convertit une couleur CSS en valeur hexadécimale (sans #)
 */
function cssColorToHex(color: string | undefined): string | undefined {
  if (!color) return undefined
  
  const cleanColor = color.trim().toLowerCase()
  
  // Si c'est déjà un hex
  if (cleanColor.startsWith('#')) {
    const hex = cleanColor.slice(1)
    // Convertir #RGB en #RRGGBB
    if (hex.length === 3) {
      return hex.split('').map(c => c + c).join('').toUpperCase()
    }
    return hex.toUpperCase()
  }
  
  // Si c'est un nom de couleur CSS
  if (CSS_COLOR_NAMES[cleanColor]) {
    return CSS_COLOR_NAMES[cleanColor]
  }
  
  // Si c'est rgb() ou rgba()
  const rgbMatch = cleanColor.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
    return (r + g + b).toUpperCase()
  }
  
  // Si rien ne correspond, retourner undefined
  logger.warn('AutoDocx - Couleur non reconnue', { color })
  return undefined
}

/**
 * Parse les styles CSS inline
 */
function parseInlineStyles(style: string): Record<string, string> {
  const styles: Record<string, string> = {}
  
  if (!style) return styles
  
  const declarations = style.split(';')
  for (const declaration of declarations) {
    const [property, value] = declaration.split(':').map(s => s.trim())
    if (property && value) {
      // Convertir les propriétés CSS en camelCase
      const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      styles[camelProperty] = value
    }
  }
  
  return styles
}

/**
 * Supprime tous les tags HTML et retourne le texte brut
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' ')
    .replace(/<\/th>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Télécharge une image et retourne son buffer
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    if (!url || url.startsWith('{')) {
      logger.warn('AutoDocx - URL image invalide ou variable non remplacée', {
        urlPreview: url?.substring(0, 30),
      })
      return null
    }
    
    // Si c'est une data URL, la décoder
    if (url.startsWith('data:')) {
      logger.debug('AutoDocx - Décodage image base64')
      const base64 = url.split(',')[1]
      const buffer = Buffer.from(base64, 'base64')
      logger.debug('AutoDocx - Image base64 décodée', { bufferSize: buffer.length })
      return buffer
    }
    
    // Télécharger l'image
    logger.debug('AutoDocx - Téléchargement image', {
      urlPreview: url.substring(0, 60),
    })
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    logger.debug('AutoDocx - Image téléchargée', { bufferSize: buffer.length })
    return buffer
  } catch (error) {
    logger.error('AutoDocx - Erreur téléchargement image', error, { error: sanitizeError(error) })
    return null
  }
}

/**
 * Génère un document Word complet depuis un template et des variables
 * C'est la fonction principale à utiliser pour la génération automatique
 */
export async function generateWordDocument(
  template: DocumentTemplate,
  variables: DocumentVariables
): Promise<Buffer> {
  // Si un template DOCX natif existe, l'utiliser avec docxtemplater
  if (template.docx_template_url) {
    logger.info('AutoDocx - Template DOCX natif trouvé, utilisation de docxtemplater')
    const { generateDocxFromTemplate } = await import('./docx-generator.service')
    return generateDocxFromTemplate(template.docx_template_url, variables)
  }
  
  // Sinon, générer automatiquement depuis le HTML
  logger.info('AutoDocx - Génération automatique depuis le template HTML')
  return generateDocxFromHtmlTemplate(template, variables)
}
