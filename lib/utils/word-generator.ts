/**
 * Utilitaire de génération de documents Word (.docx)
 * Utilise la bibliothèque docx pour créer des documents Word depuis du HTML
 * 
 * Ce fichier doit être utilisé uniquement côté serveur (API routes)
 */

'use server'

import { Document, Packer, Paragraph, HeadingLevel, Header, Footer, TextRun, AlignmentType, PageBreak, ImageRun, WidthType, Table, TableRow, TableCell, VerticalAlign, BorderStyle, ShadingType, convertMillimetersToTwip } from 'docx'
// @ts-ignore - html-to-text n'a pas de types TypeScript
import { convert } from 'html-to-text'
import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import { logger, sanitizeError } from '@/lib/utils/logger'

/**
 * Parse les styles CSS depuis un élément HTML et retourne les propriétés pour TextRun
 */
function parseStyles(element: Element, context?: 'header' | 'content' | 'footer', defaultFontSize?: number): Partial<any> {
  const style: Partial<any> = {}
  const computedStyle = element.getAttribute('style') || ''
  const tagName = element.tagName.toLowerCase()
  
  // Parser les styles inline
  const styleMap: Record<string, string> = {}
  computedStyle.split(';').forEach(rule => {
    const [key, value] = rule.split(':').map(s => s.trim())
    if (key && value) {
      styleMap[key] = value
    }
  })
  
  // Font size (convertir px/pt en half-points)
  if (styleMap['font-size']) {
    const size = styleMap['font-size']
    const match = size.match(/(\d+(?:\.\d+)?)(pt|px)/i)
    if (match) {
      const value = parseFloat(match[1])
      const unit = match[2].toLowerCase()
      // docx utilise des half-points (1 point = 2 half-points)
      style.size = unit === 'pt' ? Math.round(value * 2) : Math.round(value * 1.33 * 2)
    }
  } else if (defaultFontSize) {
    // Appliquer la taille de police par défaut si non spécifiée
    style.size = Math.round(defaultFontSize * 2) // Convertir en half-points
  }
  
  // Font weight (bold)
  if (styleMap['font-weight'] === 'bold' || styleMap['font-weight'] === '700' || tagName === 'strong' || tagName === 'b') {
    style.bold = true
  }
  
  // Font style (italic)
  if (styleMap['font-style'] === 'italic' || tagName === 'em' || tagName === 'i') {
    style.italics = true
  }
  
  // Color
  if (styleMap['color']) {
    const color = styleMap['color'].replace('#', '')
    if (color.match(/^[0-9a-fA-F]{6}$/)) {
      style.color = color
    }
  }
  
  // Font family (basique)
  if (styleMap['font-family']) {
    const fontFamily = styleMap['font-family'].split(',')[0].replace(/['"]/g, '').trim()
    style.font = fontFamily
  } else if (context === 'header' || context === 'footer') {
    // Police par défaut pour header/footer : Times New Roman (comme dans le générateur PDF)
    style.font = 'Times New Roman'
  } else {
    // Police par défaut pour le body : Arial (comme dans le générateur PDF)
    style.font = 'Arial'
  }
  
  return style
}

/**
 * Parse l'alignement depuis les styles CSS
 */
function parseAlignment(element: Element): any {
  const style = element.getAttribute('style') || ''
  if (style.includes('text-align: center')) return AlignmentType.CENTER
  if (style.includes('text-align: right')) return AlignmentType.RIGHT
  if (style.includes('text-align: justify')) return AlignmentType.JUSTIFIED
  return AlignmentType.LEFT
}

/**
 * Parse les styles de bordure depuis un élément HTML
 * Détecte border, border-top, border-bottom, border-left, border-right
 */
function parseBorderStyle(element: Element): { color: string; size: number; style: typeof BorderStyle[keyof typeof BorderStyle] } | null {
  const style = element.getAttribute('style') || ''
  
  // Chercher border (général) ou border-top/bottom/left/right
  // Pattern: border: 1px solid #E5E7EB ou border-top: 1px solid #ddd
  const borderPatterns = [
    /border(?:-(?:top|bottom|left|right))?:\s*([^;]+)/gi,
  ]
  
  for (const pattern of borderPatterns) {
    const matches = [...style.matchAll(pattern)]
    if (matches.length > 0) {
      // Prendre la première bordure trouvée
      const borderValue = matches[0][1].trim()
      
      // Ignorer si none ou 0
      if (borderValue.includes('none') || borderValue === '0' || borderValue.startsWith('0px')) {
        continue
      }
      
      // Extraire la taille (en px)
      const sizeMatch = borderValue.match(/(\d+(?:\.\d+)?)\s*px/i)
      const size = sizeMatch ? parseFloat(sizeMatch[1]) : 1
      
      // Extraire la couleur
      let color = '000000' // Par défaut noir
      const hexMatch = borderValue.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/i)
      if (hexMatch) {
        color = hexMatch[1].toUpperCase()
        // Convertir les couleurs 3 caractères en 6
        if (color.length === 3) {
          color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2]
        }
      } else {
        // Couleurs nommées courantes
        const colorMap: Record<string, string> = {
          'black': '000000',
          'white': 'FFFFFF',
          'red': 'FF0000',
          'green': '00FF00',
          'blue': '0000FF',
          'gray': '808080',
          'grey': '808080',
          'lightgray': 'D3D3D3',
          'lightgrey': 'D3D3D3',
        }
        const namedColor = colorMap[borderValue.toLowerCase()]
        if (namedColor) {
          color = namedColor
        }
      }
      
      // Convertir px en twips (1px = 20 twips selon docx, mais on utilise 8 pour être cohérent)
      const sizeInTwips = Math.round(size * 8)
      
      return {
        color,
        size: sizeInTwips,
        style: BorderStyle.SINGLE,
      }
    }
  }
  
  return null
}

/**
 * Parse la couleur de fond depuis un élément HTML
 */
function parseBackgroundColor(element: Element): string | undefined {
  const style = element.getAttribute('style') || ''
  
  // Chercher background-color ou background
  const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/i)
  if (bgMatch) {
    const bgValue = bgMatch[1].trim()
    
    // Couleur hex
    const hexMatch = bgValue.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/i)
    if (hexMatch) {
      let color = hexMatch[1].toUpperCase()
      // Convertir les couleurs 3 caractères en 6
      if (color.length === 3) {
        color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2]
      }
      return color
    }
    
    // Couleurs nommées courantes
    const colorMap: Record<string, string> = {
      'white': 'FFFFFF',
      'black': '000000',
      'red': 'FF0000',
      'green': '00FF00',
      'blue': '0000FF',
      'yellow': 'FFFF00',
      'gray': '808080',
      'grey': '808080',
      'lightgray': 'D3D3D3',
      'lightgrey': 'D3D3D3',
      'transparent': undefined as any,
    }
    
    const namedColor = colorMap[bgValue.toLowerCase()]
    if (namedColor) {
      return namedColor
    }
    
    // RGB
    const rgbMatch = bgValue.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i)
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0')
      const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0')
      const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0')
      return (r + g + b).toUpperCase()
    }
  }
  
  return undefined
}

/**
 * Parse la largeur depuis un élément HTML (en pourcentage ou pixels)
 */
function parseWidth(element: Element): { size: number; type: typeof WidthType[keyof typeof WidthType] } | undefined {
  const style = element.getAttribute('style') || ''
  const widthAttr = element.getAttribute('width')
  
  // Chercher dans le style inline
  const styleMatch = style.match(/width:\s*([^;]+)/i)
  const widthValue = styleMatch ? styleMatch[1].trim() : widthAttr
  
  if (widthValue) {
    // Pourcentage
    const percentMatch = widthValue.match(/(\d+(?:\.\d+)?)\s*%/i)
    if (percentMatch) {
      return {
        size: parseFloat(percentMatch[1]) * 50, // docx utilise 50 unités = 1%
        type: WidthType.PERCENTAGE,
      }
    }
    
    // Pixels
    const pxMatch = widthValue.match(/(\d+(?:\.\d+)?)\s*px/i)
    if (pxMatch) {
      return {
        size: convertMillimetersToTwip(parseFloat(pxMatch[1]) * 0.264583), // px to mm to twip
        type: WidthType.DXA,
      }
    }
    
    // Nombre seul (assumé pixels)
    const numMatch = widthValue.match(/^(\d+)$/i)
    if (numMatch) {
      return {
        size: convertMillimetersToTwip(parseInt(numMatch[1]) * 0.264583),
        type: WidthType.DXA,
      }
    }
  }
  
  return undefined
}

/**
 * Télécharge une image depuis une URL et retourne un buffer
 */
async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    // Si c'est une image en base64, la décoder directement
    if (url.startsWith('data:image')) {
      const base64Data = url.split(',')[1]
      if (base64Data) {
        return Buffer.from(base64Data, 'base64')
      }
    }
    
    // Sinon, télécharger depuis l'URL
    const response = await fetch(url)
    if (!response.ok) {
      logger.warn(`Impossible de télécharger l'image depuis ${url}: ${response.statusText}`)
      return null
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    logger.error(`Erreur lors du téléchargement de l'image ${url}:`, error)
    return null
  }
}

/**
 * Convertit du HTML en paragraphes Word avec support des images
 */
async function htmlToParagraphs(html: string, doc?: Document, context?: 'header' | 'content' | 'footer', defaultFontSize?: number): Promise<Paragraph[]> {
  if (!html || html.trim().length === 0) {
    logger.warn('[Word Generator] htmlToParagraphs: HTML vide')
    return []
  }

  logger.debug('[Word Generator] htmlToParagraphs appelé:', {
    htmlLength: html.length,
    htmlPreview: html.substring(0, 300),
    hasDoc: !!doc,
    hasImages: html.includes('<img'),
    context,
    defaultFontSize,
  })

  const paragraphs: Paragraph[] = []
  
  // Fonction wrapper pour parseStyles avec le contexte
  const parseStylesWithContext = (element: Element): Partial<any> => {
    return parseStyles(element, context, defaultFontSize)
  }
  
  // Parser le HTML pour extraire les éléments
  // Utiliser une approche simple : extraire le texte et les images
  const parser = typeof window !== 'undefined' 
    ? new DOMParser() 
    : null
  
  if (parser) {
    // Côté client : utiliser DOMParser
    // IMPORTANT : utiliser un nom différent pour éviter d'écraser le paramètre doc (Document Word)
    const htmlDoc = parser.parseFromString(html, 'text/html')
    const body = htmlDoc.body
    
    // Parcourir les éléments
    const processNode = async (node: Node): Promise<void> => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element
        const tagName = element.tagName.toLowerCase()
        
        if (tagName === 'img') {
          // Dans le contexte header, ignorer les images qui ne sont pas dans un tableau
          if (context === 'header') {
            // Vérifier si l'image est dans un tableau
            let parent = element.parentElement
            let isInTable = false
            while (parent) {
              if (parent.tagName?.toLowerCase() === 'table' || parent.tagName?.toLowerCase() === 'td' || parent.tagName?.toLowerCase() === 'th') {
                isInTable = true
                break
              }
              parent = parent.parentElement
            }
            
            if (!isInTable) {
              logger.debug(`[Word Generator] ⏭️ Image ignorée dans header (pas dans un tableau): ${element.getAttribute('src')?.substring(0, 100)}`)
              return
            }
          }
          
          // Traiter les images
          const src = element.getAttribute('src') || ''
          logger.debug(`[Word Generator] Image trouvée`, { src: src.substring(0, 100), hasDoc: !!doc })
          if (src && doc) {
            try {
              logger.debug(`[Word Generator] Téléchargement de l'image`, { src: src.substring(0, 100) })
              const imageBuffer = await downloadImage(src)
              if (imageBuffer) {
                logger.debug(`[Word Generator] Image téléchargée, taille: ${imageBuffer.length} bytes`)
                // Obtenir les dimensions de l'image depuis les attributs HTML
                const widthAttr = element.getAttribute('width') || element.getAttribute('style')?.match(/width:\s*(\d+)(px|pt)/i)?.[1]
                const heightAttr = element.getAttribute('height') || element.getAttribute('style')?.match(/height:\s*(\d+)(px|pt)/i)?.[1]
                const maxHeightAttr = element.getAttribute('style')?.match(/max-height:\s*(\d+)(px|pt)/i)?.[1]
                
                let imageWidth = 200
                let imageHeight = 200
                
                if (maxHeightAttr) {
                  const maxHeight = parseInt(maxHeightAttr)
                  imageHeight = maxHeight
                  imageWidth = maxHeight // Conserver le ratio carré par défaut
                } else if (widthAttr) {
                  imageWidth = parseInt(widthAttr)
                }
                if (heightAttr) {
                  imageHeight = parseInt(heightAttr)
                }
                
                // Utiliser ImageRun directement (Media.addImage n'existe pas dans docx)
                const imageRun = new ImageRun({
                  data: imageBuffer as any,
                  transformation: {
                    width: imageWidth,
                    height: imageHeight,
                  },
                } as any)
                
                // Déterminer l'alignement depuis le parent ou les styles
                let alignment = AlignmentType.CENTER
                let parent = element.parentElement
                while (parent) {
                  const parentStyle = parent.getAttribute('style') || ''
                  if (parentStyle.includes('text-align: left')) {
                    alignment = AlignmentType.LEFT as any
                    break
                  } else if (parentStyle.includes('text-align: right')) {
                    alignment = AlignmentType.RIGHT as any
                    break
                  } else if (parentStyle.includes('text-align: center')) {
                    alignment = AlignmentType.CENTER
                    break
                  }
                  parent = parent.parentElement
                }
                
                paragraphs.push(
                  new Paragraph({
                    children: [imageRun],
                    alignment,
                    spacing: { after: 200 },
                  })
                )
                logger.debug(`[Word Generator] ✅ Image ajoutée avec succès (${imageWidth}x${imageHeight}, align: ${alignment})`)
              } else {
                logger.warn(`[Word Generator] Impossible de télécharger l'image`, { src: src.substring(0, 100) })
              }
            } catch (error) {
              logger.error('Erreur lors de l\'ajout de l\'image:', error)
            }
          } else {
            logger.warn(`[Word Generator] Image sans src ou doc manquant: src=${!!src}, doc=${!!doc}`)
          }
        } else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3') {
          const text = element.textContent?.trim() || ''
          if (text) {
            const level = tagName === 'h1' ? HeadingLevel.HEADING_1 
                       : tagName === 'h2' ? HeadingLevel.HEADING_2 
                       : HeadingLevel.HEADING_3
            const styles = parseStylesWithContext(element)
            const alignment = parseAlignment(element)
            paragraphs.push(
              new Paragraph({
                children: [new TextRun({ text, ...styles })],
                heading: level,
                alignment,
                spacing: { after: 200 },
              })
            )
          }
        } else if (tagName === 'p') {
          // Pour les paragraphes, préserver les styles
          const alignment = parseAlignment(element)
          const children: TextRun[] = []
          
          // Traiter les enfants pour préserver les styles (strong, em, span avec styles, etc.)
          const processTextNode = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent?.trim() || ''
              if (text) {
                // Chercher le parent pour les styles
                let parent = node.parentElement
                const styles: Partial<any> = {}
                while (parent && parent !== element) {
                  const parentStyles = parseStylesWithContext(parent)
                  Object.assign(styles, parentStyles)
                  parent = parent.parentElement
                }
                // Ajouter les styles de l'élément parent aussi
                const elementStyles = parseStylesWithContext(element)
                Object.assign(styles, elementStyles)
                children.push(new TextRun({ text, ...styles }))
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as Element
              const tag = el.tagName.toLowerCase()
              const styles = parseStylesWithContext(el)
              const text = el.textContent?.trim() || ''
              if (text && (tag === 'strong' || tag === 'b' || tag === 'em' || tag === 'i' || tag === 'span')) {
                children.push(new TextRun({ text, ...styles }))
              } else {
                // Pour les autres éléments, traiter les enfants
                Array.from(el.childNodes).forEach(processTextNode)
              }
            }
          }
          
          Array.from(element.childNodes).forEach(processTextNode)
          
          // Si pas d'enfants avec styles, utiliser le texte simple avec styles de l'élément
          if (children.length === 0) {
            const text = element.textContent?.trim() || ''
            if (text) {
              const styles = parseStylesWithContext(element)
              children.push(new TextRun({ text, ...styles }))
            }
          }
          
          if (children.length > 0) {
            paragraphs.push(
              new Paragraph({
                children,
                alignment,
                spacing: { after: 100 },
              })
            )
          }
        } else if (tagName === 'div') {
          // Vérifier si le div est un encadrement (bordures, background, padding significatif)
          const divStyle = element.getAttribute('style') || ''
          
          const hasBorder = divStyle.match(/border[:\s]/i) && !divStyle.match(/border:\s*0|border:\s*none/i)
          const hasBackground = divStyle.match(/background(?:-color)?:\s*[^;]+/i) && !divStyle.match(/background(?:-color)?:\s*(?:transparent|none)/i)
          const paddingMatch = divStyle.match(/padding:\s*(\d+(?:\.\d+)?)/i)
          const hasPadding = paddingMatch && parseFloat(paddingMatch[1]) >= 5
          const marginMatch = divStyle.match(/margin(?:-top|-bottom)?:\s*(\d+(?:\.\d+)?)/i)
          const hasMargin = marginMatch && parseFloat(marginMatch[1]) >= 10
          
          // C'est un encadrement si au moins une de ces conditions est vraie
          const isEncadrement = hasBorder || (hasBackground && (hasPadding || hasMargin))
          
          // Si le div est un encadrement, créer un tableau Word avec une seule cellule
          if (isEncadrement) {
            try {
              logger.debug('[Word Generator] 📦 Encadrement détecté:', {
                hasBorder: !!hasBorder,
                hasBackground: !!hasBackground,
                hasPadding: !!hasPadding,
                hasMargin: !!hasMargin,
              })
              const divBorder = parseBorderStyle(element)
              const divBgColor = parseBackgroundColor(element)
              
              // Traiter le contenu HTML du div pour créer les paragraphes
              const divHTML = element.innerHTML
              const divContentParagraphs: Paragraph[] = []
              
              if (divHTML) {
                // Utiliser htmlToParagraphs pour traiter le contenu du div (y compris les tableaux imbriqués)
                const tempDivParagraphs = await htmlToParagraphs(`<div>${divHTML}</div>`, doc, context, defaultFontSize)
                divContentParagraphs.push(...tempDivParagraphs.filter(p => !(p as any).__isTableMarker))
                
                // Récupérer aussi les tableaux du div (ils seront ajoutés séparément)
                const divTables = (tempDivParagraphs as any).__tables || []
                if (divTables.length > 0) {
                  logger.debug(`[Word Generator] 📊 ${divTables.length} tableau(x) trouvé(s) dans l'encadrement`)
                  if (!(paragraphs as any).__tables) {
                    (paragraphs as any).__tables = []
                  }
                  (paragraphs as any).__tables.push(...divTables)
                }
              }
              
              // Si pas de paragraphes créés, créer un avec le texte
              if (divContentParagraphs.length === 0) {
                const divText = element.textContent?.trim() || ''
                if (divText) {
                  const styles = parseStylesWithContext(element)
                  divContentParagraphs.push(
                    new Paragraph({
                      children: [new TextRun({ text: divText, ...styles })],
                      spacing: { after: 100 },
                    })
                  )
                } else {
                  // Cellule vide
                  divContentParagraphs.push(
                    new Paragraph({
                      children: [new TextRun({ text: ' ' })],
                    })
                  )
                }
              }
              
              // Parser le padding depuis le style
              const paddingMatch = divStyle.match(/padding:\s*(\d+(?:\.\d+)?)\s*(?:px|pt)?/i)
              const paddingValue = paddingMatch ? parseFloat(paddingMatch[1]) : 5
              const paddingInTwip = convertMillimetersToTwip(paddingValue * 0.264583) // px to mm to twip
              
              // Créer un tableau avec une seule cellule pour l'encadrement
              const borderConfig = divBorder || (hasBorder ? {
                color: 'E5E7EB',
                size: 8,
                style: BorderStyle.SINGLE,
              } : null)
              
              const cellConfig: any = {
                children: divContentParagraphs,
                verticalAlign: VerticalAlign.TOP,
                margins: {
                  top: paddingInTwip,
                  bottom: paddingInTwip,
                  left: paddingInTwip,
                  right: paddingInTwip,
                },
              }
              
              // Ajouter les bordures si présentes
              if (borderConfig) {
                (cellConfig as any).borders = {
                  top: borderConfig,
                  bottom: borderConfig,
                  left: borderConfig,
                  right: borderConfig,
                }
              }
              
              // Ajouter la couleur de fond si présente
              if (divBgColor) {
                cellConfig.shading = {
                  fill: divBgColor,
                  type: ShadingType.CLEAR,
                  color: 'auto',
                }
              }
              
              const encadrementTable = new Table({
                rows: [
                  new TableRow({
                    children: [new TableCell(cellConfig)],
                  }),
                ],
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
              })
              
              // Ajouter les bordures au tableau si présentes
              if (borderConfig) {
                (encadrementTable as any).borders = {
                  top: borderConfig,
                  bottom: borderConfig,
                  left: borderConfig,
                  right: borderConfig,
                }
              }
              
              // Stocker le tableau dans paragraphs
              if (!(paragraphs as any).__tables) {
                (paragraphs as any).__tables = []
              }
              (paragraphs as any).__tables.push(encadrementTable)
              
              // Ajouter un paragraphe vide avant pour l'espacement
              paragraphs.push(
                new Paragraph({
                  children: [],
                  spacing: { after: 100 },
                })
              )
              
              logger.debug('[Word Generator] ✅ Encadrement créé avec succès', { paragraphCount: divContentParagraphs.length })
            } catch (error) {
              logger.error('[Word Generator] Erreur lors de la création de l\'encadrement:', error)
              // Fallback : traiter les enfants normalement
              Array.from(element.childNodes).forEach(child => processNode(child))
            }
          } else {
            // Div sans bordures : traiter les enfants normalement
            Array.from(element.childNodes).forEach(child => processNode(child))
          }
        } else if (tagName === 'span' || tagName === 'td' || tagName === 'th' || tagName === 'li') {
          // Pour ces éléments, traiter les enfants (ne pas utiliser textContent pour éviter les doublons)
          Array.from(element.childNodes).forEach(child => processNode(child))
        } else if (tagName === 'table') {
          // Pour les tableaux, créer un vrai tableau Word
          logger.debug('[Word Generator] 📊 Tableau HTML détecté')
          try {
            const rows = element.querySelectorAll('tr')
            logger.debug('[Word Generator] Nombre de lignes trouvées dans le tableau', { rowCount: rows.length })
            const tableRows: TableRow[] = []
            
            // Traiter les lignes de manière asynchrone pour gérer les images
            for (const row of Array.from(rows)) {
              const cells = row.querySelectorAll('td, th')
              const tableCells: TableCell[] = []
              
              // Pour le header, inverser l'ordre des cellules (logo à gauche, infos à droite)
              const cellsArray = Array.from(cells)
              // Utiliser le contexte passé en paramètre pour détecter si on est dans le header
              const isHeaderRow = context === 'header'
              const shouldReverse = isHeaderRow && cellsArray.length === 2
              
              if (shouldReverse) {
                logger.debug('[Word Generator] 🔄 Inversion des cellules du header (logo à gauche, infos à droite)')
                logger.debug('[Word Generator] Cellules avant inversion', { cells: cellsArray.map(c => c.textContent?.substring(0, 50) || 'vide') })
              }
              
              const processedCells = shouldReverse ? [...cellsArray].reverse() : cellsArray
              
              if (shouldReverse) {
                logger.debug('[Word Generator] Cellules après inversion', { cells: processedCells.map(c => c.textContent?.substring(0, 50) || 'vide') })
              }
              
              // Traiter chaque cellule de manière asynchrone
              for (const cell of processedCells) {
                const cellText = cell.textContent?.trim() || ''
                const isHeader = cell.tagName.toLowerCase() === 'th'
                const styles = parseStylesWithContext(cell)
                const cellAlignment = parseAlignment(cell)
                
                // Créer les paragraphes pour la cellule
                const cellParagraphs: Paragraph[] = []
                const currentCellIndex = processedCells.indexOf(cell)
                
                // Traiter les enfants pour préserver les styles et détecter les images
                const processCellNode = async (node: Node): Promise<void> => {
                  if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent?.trim() || ''
                    if (text) {
                      let parent = node.parentElement
                      const nodeStyles: Partial<any> = {}
                      while (parent && parent !== cell) {
                        const parentStyles = parseStylesWithContext(parent)
                        Object.assign(nodeStyles, parentStyles)
                        parent = parent.parentElement
                      }
                      const cellStyles = parseStylesWithContext(cell)
                      Object.assign(nodeStyles, cellStyles)
                      if (isHeader) {
                        nodeStyles.bold = true
                      }
                      cellParagraphs.push(
                        new Paragraph({
                          children: [new TextRun({ text, ...nodeStyles })],
                          alignment: cellAlignment,
                        })
                      )
                    }
                  } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const el = node as Element
                    const tag = el.tagName.toLowerCase()
                    
                    // Détecter les images dans les cellules
                    if (tag === 'img') {
                      const src = el.getAttribute('src') || ''
                      if (src) {
                        try {
                          logger.debug(`[Word Generator] 🖼️ Image trouvée dans cellule du header, src: ${src.substring(0, 100)}`)
                          const imageBuffer = await downloadImage(src)
                          if (imageBuffer) {
                            const widthAttr = el.getAttribute('width') || el.getAttribute('style')?.match(/width:\s*(\d+)(px|pt)/i)?.[1]
                            const heightAttr = el.getAttribute('height') || el.getAttribute('style')?.match(/height:\s*(\d+)(px|pt)/i)?.[1]
                            const maxHeightAttr = el.getAttribute('style')?.match(/max-height:\s*(\d+)(px|pt)/i)?.[1]
                            
                            let imageWidth = 140
                            let imageHeight = 55
                            
                            if (maxHeightAttr) {
                              const maxHeight = parseInt(maxHeightAttr)
                              imageHeight = maxHeight
                              imageWidth = maxHeight * 2.5 // Ratio approximatif
                            } else if (widthAttr) {
                              imageWidth = parseInt(widthAttr)
                            }
                            if (heightAttr) {
                              imageHeight = parseInt(heightAttr)
                            }
                            
                            const imageRun = new ImageRun({
                              data: imageBuffer as any,
                              transformation: {
                                width: imageWidth,
                                height: imageHeight,
                              },
                            } as any)
                            
                            // Alignement de l'image selon la cellule
                            let imageAlignment = cellAlignment || AlignmentType.LEFT
                            const cellStyle = cell.getAttribute('style') || ''
                            
                            // Si on est dans le header et que c'est la première cellule après inversion (logo), aligner à gauche
                            if (context === 'header' && currentCellIndex === 0 && shouldReverse) {
                              imageAlignment = AlignmentType.LEFT
                              logger.debug('[Word Generator] 📍 Logo aligné à gauche (cellule 0 après inversion)')
                            } else if (cellStyle.includes('text-align: left')) {
                              imageAlignment = AlignmentType.LEFT
                            } else if (cellStyle.includes('text-align: right')) {
                              imageAlignment = AlignmentType.RIGHT
                            } else if (cellStyle.includes('text-align: center')) {
                              imageAlignment = AlignmentType.CENTER
                            }
                            
                            cellParagraphs.push(
                              new Paragraph({
                                children: [imageRun],
                                alignment: imageAlignment,
                              })
                            )
                            logger.debug(`[Word Generator] ✅ Image ajoutée dans cellule ${currentCellIndex} (${imageWidth}x${imageHeight}, align: ${imageAlignment})`)
                          }
                        } catch (imgError) {
                          logger.error('[Word Generator] Erreur lors de l\'ajout de l\'image dans cellule:', imgError)
                        }
                      }
                      return
                    }
                    
                    const elStyles = parseStylesWithContext(el)
                    const text = el.textContent?.trim() || ''
                    if (text && (tag === 'strong' || tag === 'b' || tag === 'em' || tag === 'i' || tag === 'span' || tag === 'p')) {
                      if (isHeader) {
                        elStyles.bold = true
                      }
                      cellParagraphs.push(
                        new Paragraph({
                          children: [new TextRun({ text, ...elStyles })],
                          alignment: cellAlignment,
                        })
                      )
                    } else {
                      // Traiter récursivement les enfants
                      for (const child of Array.from(el.childNodes)) {
                        await processCellNode(child)
                      }
                    }
                  }
                }
                
                // Traiter tous les nœuds de la cellule (de manière asynchrone pour les images)
                for (const child of Array.from(cell.childNodes)) {
                  await processCellNode(child)
                }
                
                // Si pas de paragraphes créés, créer un avec le texte simple
                if (cellParagraphs.length === 0 && cellText) {
                  cellParagraphs.push(
                    new Paragraph({
                      children: [new TextRun({ text: cellText, ...styles, bold: isHeader })],
                      alignment: cellAlignment,
                    })
                  )
                } else if (cellParagraphs.length === 0) {
                  // Cellule vide
                  cellParagraphs.push(
                    new Paragraph({
                      children: [new TextRun({ text: ' ' })],
                    })
                  )
                }
                
                // Parser les styles de la cellule
                const cellBgColor = parseBackgroundColor(cell)
                const cellWidth = parseWidth(cell)
                const cellBorder = parseBorderStyle(cell)
                
                // Parser le padding depuis le style de la cellule
                const cellStyle = cell.getAttribute('style') || ''
                const cellPaddingMatch = cellStyle.match(/padding(?:-right|-left|-top|-bottom)?:\s*(\d+(?:\.\d+)?)\s*(?:px|pt)?/i)
                const cellPaddingValue = cellPaddingMatch ? parseFloat(cellPaddingMatch[1]) : 3
                const cellPaddingInTwip = convertMillimetersToTwip(cellPaddingValue * 0.264583)
                
                // Parser l'alignement vertical
                const verticalAlignMatch = cellStyle.match(/vertical-align:\s*(\w+)/i)
                const verticalAlignValue = verticalAlignMatch ? verticalAlignMatch[1].toLowerCase() : 'top'
                const verticalAlign = verticalAlignValue === 'middle' || verticalAlignValue === 'center' 
                  ? VerticalAlign.CENTER 
                  : verticalAlignValue === 'bottom' 
                  ? VerticalAlign.BOTTOM 
                  : VerticalAlign.TOP
                
                // Configuration de la cellule avec bordures, fond et marges
                const cellConfig: any = {
                  children: cellParagraphs,
                  verticalAlign: verticalAlign,
                  margins: {
                    top: cellPaddingInTwip,
                    bottom: cellPaddingInTwip,
                    left: cellPaddingInTwip,
                    right: cellPaddingInTwip,
                  },
                }
                
                // Ajouter la largeur si définie
                if (cellWidth) {
                  cellConfig.width = cellWidth
                }
                
                // Ajouter la couleur de fond si définie
                if (cellBgColor) {
                  cellConfig.shading = {
                    fill: cellBgColor,
                    type: ShadingType.CLEAR,
                    color: 'auto',
                  }
                }
                
                // Ajouter les bordures - utiliser celle de la cellule ou une par défaut
                // MAIS seulement si les bordures sont définies (pas pour border: 0)
                const cellHasBorder = cellStyle.match(/border[:\s]/i) && !cellStyle.match(/border:\s*0|border:\s*none/i)
                if (cellHasBorder) {
                  const defaultBorder = {
                    color: 'E5E7EB', // Couleur par défaut des bordures dans les templates
                    size: 8, // 1px = 8 twips
                    style: BorderStyle.SINGLE,
                  }
                  
                  const finalBorder = cellBorder || defaultBorder
                  ;(cellConfig as any).borders = {
                    top: finalBorder,
                    bottom: finalBorder,
                    left: finalBorder,
                    right: finalBorder,
                  }
                }
                
                tableCells.push(new TableCell(cellConfig))
              }
              
              if (tableCells.length > 0) {
                tableRows.push(new TableRow({ children: tableCells }))
              }
            }
            
            if (tableRows.length > 0) {
              // Détecter si le tableau a des bordures dans le HTML
              const tableStyle = element.getAttribute('style') || ''
              const tableBorder = parseBorderStyle(element)
              
              // Vérifier si les cellules ont des bordures (plus courant que les bordures sur le tableau)
              const firstCell = element.querySelector('td, th')
              const cellBorder = firstCell ? parseBorderStyle(firstCell) : null
              const firstCellStyle = firstCell?.getAttribute('style') || ''
              const cellHasBorder = firstCellStyle.match(/border[:\s]/i) && !firstCellStyle.match(/border:\s*0|border:\s*none/i)
              const tableHasBorder = tableStyle.match(/border[:\s]/i) && !tableStyle.match(/border:\s*0|border:\s*none/i)
              
              // Utiliser la bordure seulement si elle est définie (pas pour border: 0)
              const borderConfig = (cellHasBorder && cellBorder) || (tableHasBorder && tableBorder) || null
              
              // Parser la largeur du tableau
              const tableWidth = parseWidth(element) || {
                size: 100,
                type: WidthType.PERCENTAGE,
              }
              
              // Configuration du tableau
              const tableConfig: any = {
                rows: tableRows,
                width: tableWidth,
              }
              
              // Ajouter les bordures seulement si elles sont définies
              if (borderConfig) {
                (tableConfig as any).borders = {
                  top: borderConfig,
                  bottom: borderConfig,
                  left: borderConfig,
                  right: borderConfig,
                  insideHorizontal: borderConfig,
                  insideVertical: borderConfig,
                }
              }
              
              const table = new Table(tableConfig)
              
              // Stocker le tableau dans un tableau spécial pour l'ajouter plus tard
              // On va utiliser une propriété spéciale sur paragraphs
              if (!(paragraphs as any).__tables) {
                (paragraphs as any).__tables = []
              }
              (paragraphs as any).__tables.push(table)
              
              // Ajouter un paragraphe vide avant le tableau pour l'espacement
              paragraphs.push(
                new Paragraph({
                  children: [],
                  spacing: { after: 100 },
                })
              )
              
              const firstRowChildren = ((tableRows[0] as any)?.children as any)?.length || 0
              logger.debug(`[Word Generator] ✅ Tableau créé avec ${tableRows.length} lignes et ${firstRowChildren} colonnes`)
            } else {
              logger.warn('[Word Generator] ⚠️ Aucune ligne trouvée dans le tableau HTML')
            }
          } catch (error) {
            logger.error('[Word Generator] ❌ Erreur lors de la création du tableau:', error)
            // Fallback : extraire le texte
            const cells = element.querySelectorAll('td, th')
            cells.forEach(cell => {
              const cellText = cell.textContent?.trim() || ''
              if (cellText) {
                const styles = parseStylesWithContext(cell)
                const alignment = parseAlignment(cell)
                paragraphs.push(
                  new Paragraph({
                    children: [new TextRun({ text: cellText, ...styles })],
                    alignment,
                    spacing: { after: 50 },
                  })
                )
              }
            })
          }
        } else {
          // Pour tous les autres éléments, traiter les enfants
          Array.from(element.childNodes).forEach(child => processNode(child))
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim() || ''
        if (text && text.length > 0) {
          // Chercher le parent pour les styles
          let parent = node.parentElement
          const styles: Partial<any> = {}
          while (parent) {
            const parentStyles = parseStylesWithContext(parent)
            Object.assign(styles, parentStyles)
            parent = parent.parentElement
          }
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text, ...styles })],
              spacing: { after: 100 },
            })
          )
        }
      }
    }
    
    await processNode(body)
  } else {
    // Côté serveur : utiliser html-to-text mais améliorer pour les images et tableaux
    logger.debug('[Word Generator] htmlToParagraphs côté serveur', { htmlLength: html.length, preview: html.substring(0, 200) })
    logger.debug('[Word Generator] Images dans HTML', { imageCount: (html.match(/<img/gi) || []).length })
    
    // Set pour marquer les images déjà traitées dans les tableaux (accessible dans toute la fonction)
    const imagesInTables: Set<string> = new Set()
    
    // D'ABORD : Extraire et convertir les tableaux AVANT de convertir le texte
    // IMPORTANT : Détecter TOUS les tableaux, même ceux avec border: 0 (comme dans l'en-tête)
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi
    let tableMatch
    const tables: Table[] = []
    let processedHTML = html
    const tablePlaceholders: string[] = []
    
    // Réinitialiser la regex
    tableRegex.lastIndex = 0
    
    // Trouver tous les tableaux dans le HTML (même ceux sans bordures)
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHTML = tableMatch[0]
      const tableIndex = tableMatch.index
      
      try {
        logger.debug('[Word Generator] 📊 Tableau HTML détecté côté serveur', { index: tableIndex })
        
        // Extraire les lignes (tr)
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
        const tableRows: TableRow[] = []
        let trMatch
        
        while ((trMatch = trRegex.exec(tableHTML)) !== null) {
          const rowHTML = trMatch[1]
          
          // Extraire les cellules (td, th)
          const cellRegex = /<(td|th)[^>]*>([\s\S]*?)<\/\1>/gi
          const tableCells: TableCell[] = []
          let cellMatch
          
          while ((cellMatch = cellRegex.exec(rowHTML)) !== null) {
            const cellHTML = cellMatch[2]
            const isHeader = cellMatch[1].toLowerCase() === 'th'
            
            // Extraire le texte de la cellule (sans les balises HTML internes)
            const cellText = cellHTML
              .replace(/<[^>]*>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
            
            // Parser les styles de la cellule depuis le HTML
            const cellTagMatch = cellMatch[0].match(/<(td|th)([^>]*)>/i)
            const cellAttributes = cellTagMatch ? cellTagMatch[2] : ''
            
            // Créer un élément virtuel pour parser les styles
            const virtualCell = { 
              getAttribute: (name: string) => {
                if (name === 'style') {
                  const styleMatch = cellAttributes.match(/style\s*=\s*["']([^"']+)["']/i)
                  return styleMatch ? styleMatch[1] : null
                }
                const attrMatch = cellAttributes.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'))
                return attrMatch ? attrMatch[1] : null
              } 
            } as any
            
            const cellBgColor = parseBackgroundColor(virtualCell)
            const cellBorder = parseBorderStyle(virtualCell)
            
            // Parser le padding depuis les attributs ou styles de la cellule
            const cellStyle = virtualCell.getAttribute('style') || ''
            const cellPaddingMatch = cellStyle.match(/padding(?:-right|-left|-top|-bottom)?:\s*(\d+(?:\.\d+)?)\s*(?:px|pt)?/i)
            const cellPaddingValue = cellPaddingMatch ? parseFloat(cellPaddingMatch[1]) : 3
            const cellPaddingInTwip = convertMillimetersToTwip(cellPaddingValue * 0.264583)
            
            // Parser l'alignement vertical
            const verticalAlignMatch = cellStyle.match(/vertical-align:\s*(\w+)/i)
            const verticalAlignValue = verticalAlignMatch ? verticalAlignMatch[1].toLowerCase() : 'top'
            const verticalAlign = verticalAlignValue === 'middle' || verticalAlignValue === 'center' 
              ? VerticalAlign.CENTER 
              : verticalAlignValue === 'bottom' 
              ? VerticalAlign.BOTTOM 
              : VerticalAlign.TOP
            
            // Parser l'alignement horizontal depuis le style
            const textAlignMatch = cellStyle.match(/text-align:\s*(\w+)/i)
            const textAlignValue = textAlignMatch ? textAlignMatch[1].toLowerCase() : 'left'
            const cellTextAlignment = textAlignValue === 'center' 
              ? AlignmentType.CENTER 
              : textAlignValue === 'right' 
              ? AlignmentType.RIGHT 
              : AlignmentType.LEFT
            
            // Parser la largeur de la cellule
            const widthMatch = cellStyle.match(/width:\s*(\d+(?:\.\d+)?)\s*%/i)
            const cellWidth = widthMatch ? {
              size: parseFloat(widthMatch[1]) * 50, // docx utilise 50 unités = 1%
              type: WidthType.PERCENTAGE,
            } : undefined
            
            const defaultBorder = {
              color: 'E5E7EB',
              size: 8,
              style: BorderStyle.SINGLE,
            }
            
            // Utiliser la bordure de la cellule si définie, sinon par défaut seulement si le tableau a des bordures
            const finalBorder = cellBorder || defaultBorder
            
            // Traiter le contenu HTML de la cellule pour préserver la structure (paragraphes, images, etc.)
            const cellParagraphs: Paragraph[] = []
            
            // Détecter les images dans la cellule
            const cellImageMatch = cellHTML.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)
            if (cellImageMatch && doc) {
              // Il y a une image dans la cellule
              try {
                const imageSrc = cellImageMatch[1]
                // Marquer cette image comme traitée dans un tableau pour éviter de la traiter à nouveau
                imagesInTables.add(imageSrc)
                logger.debug(`[Word Generator] 🖼️ Image trouvée dans cellule côté serveur, src: ${imageSrc.substring(0, 100)}`)
                const imageBuffer = await downloadImage(imageSrc)
                if (imageBuffer) {
                  // Parser les dimensions de l'image
                  const imgTag = cellImageMatch[0]
                  const widthMatch = imgTag.match(/width\s*=\s*["']?(\d+)/i) || imgTag.match(/style[^>]*width:\s*(\d+)/i)
                  const heightMatch = imgTag.match(/height\s*=\s*["']?(\d+)/i) || imgTag.match(/style[^>]*height:\s*(\d+)/i)
                  const maxHeightMatch = imgTag.match(/max-height:\s*(\d+)/i)
                  
                  let imageWidth = 140
                  let imageHeight = 55
                  
                  if (maxHeightMatch) {
                    imageHeight = parseInt(maxHeightMatch[1])
                    imageWidth = imageHeight * 2.5
                  } else if (widthMatch) {
                    imageWidth = parseInt(widthMatch[1])
                  }
                  if (heightMatch) {
                    imageHeight = parseInt(heightMatch[1])
                  }
                  
                  const imageRun = new ImageRun({
                    data: imageBuffer as any,
                    transformation: {
                      width: imageWidth,
                      height: imageHeight,
                    },
                  } as any)
                  
                  // Déterminer l'alignement de l'image selon le style de la cellule
                  // Pour l'en-tête, si text-align: right, l'image doit être à droite
                  const imageAlignment = cellTextAlignment
                  
                  cellParagraphs.push(
                    new Paragraph({
                      children: [imageRun],
                      alignment: imageAlignment,
                    })
                  )
                  logger.debug(`[Word Generator] ✅ Image ajoutée dans cellule côté serveur (${imageWidth}x${imageHeight}, align: ${imageAlignment})`)
                }
              } catch (imgError) {
                logger.error('[Word Generator] Erreur lors de l\'ajout de l\'image dans cellule côté serveur:', imgError)
              }
            }
            
            // Traiter les paragraphes HTML dans la cellule
            const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
            let pMatch
            const paragraphsFound: Array<{ content: string; style: string }> = []
            
            // Réinitialiser la regex
            paragraphRegex.lastIndex = 0
            
            while ((pMatch = paragraphRegex.exec(cellHTML)) !== null) {
              const pTag = pMatch[0]
              const pContent = pMatch[1]
              const pStyleMatch = pTag.match(/style\s*=\s*["']([^"']+)["']/i)
              const pStyle = pStyleMatch ? pStyleMatch[1] : ''
              paragraphsFound.push({ content: pContent, style: pStyle })
            }
            
            // Si des paragraphes HTML sont trouvés, les traiter
            if (paragraphsFound.length > 0) {
              paragraphsFound.forEach((pData, index) => {
                // Extraire le texte du paragraphe
                const pText = pData.content
                  .replace(/<img[^>]*>/gi, '') // Exclure les images déjà traitées
                  .replace(/<[^>]*>/g, '')
                  .replace(/\s+/g, ' ')
                  .trim()
                
                if (pText) {
                  const defaultStyles: Partial<any> = {}
                  if (defaultFontSize) {
                    defaultStyles.size = Math.round(defaultFontSize * 2)
                  }
                  if (isHeader || pData.style.match(/font-weight:\s*bold/i)) {
                    defaultStyles.bold = true
                  }
                  
                  // Parser l'alignement du paragraphe
                  const pAlignMatch = pData.style.match(/text-align:\s*(\w+)/i)
                  const pAlignValue = pAlignMatch ? pAlignMatch[1].toLowerCase() : textAlignValue
                  const pAlignment = pAlignValue === 'center' 
                    ? AlignmentType.CENTER 
                    : pAlignValue === 'right' 
                    ? AlignmentType.RIGHT 
                    : AlignmentType.LEFT
                  
                  cellParagraphs.push(
                    new Paragraph({
                      children: [new TextRun({ text: pText, ...defaultStyles })],
                      alignment: pAlignment,
                      spacing: { after: index < paragraphsFound.length - 1 ? 50 : 0 },
                    })
                  )
                }
              })
            }
            
            // Si pas d'image et pas de paragraphes HTML, traiter le texte simple
            if (cellParagraphs.length === 0) {
              // Extraire le texte en préservant les sauts de ligne
              const processedCellText = cellHTML
                .replace(/<img[^>]*>/gi, '') // Exclure les images déjà traitées
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<[^>]*>/g, '')
                .replace(/\n\s*\n/g, '\n')
                .trim()
              
              if (processedCellText) {
                // Diviser en paragraphes selon les sauts de ligne
                const lines = processedCellText.split('\n').filter(line => line.trim())
                lines.forEach((line, index) => {
                  const defaultStyles: Partial<any> = {}
                  if (defaultFontSize) {
                    defaultStyles.size = Math.round(defaultFontSize * 2)
                  }
                  if (isHeader) {
                    defaultStyles.bold = true
                  }
                  
                  cellParagraphs.push(
                    new Paragraph({
                      children: [new TextRun({ text: line.trim(), ...defaultStyles })],
                      alignment: cellTextAlignment,
                      spacing: { after: index < lines.length - 1 ? 50 : 0 },
                    })
                  )
                })
              } else {
                // Cellule vide
                cellParagraphs.push(
                  new Paragraph({
                    children: [new TextRun({ text: ' ' })],
                    alignment: cellTextAlignment,
                  })
                )
              }
            }
            
            // CRITIQUE : S'assurer que cellParagraphs contient au moins un paragraphe
            // Si cellParagraphs est vide, créer un paragraphe vide pour éviter une cellule invalide
            if (cellParagraphs.length === 0) {
              cellParagraphs.push(
                new Paragraph({
                  children: [new TextRun({ text: ' ' })],
                  alignment: cellTextAlignment,
                })
              )
            }
            
            const cellConfig: any = {
              children: cellParagraphs, // Les paragraphes avec images sont inclus ici
              verticalAlign: verticalAlign,
              margins: {
                top: cellPaddingInTwip,
                bottom: cellPaddingInTwip,
                left: cellPaddingInTwip,
                right: cellPaddingInTwip,
              },
            }
            
            // Ajouter la largeur si définie
            if (cellWidth) {
              cellConfig.width = cellWidth
            }
            
            // Ajouter les bordures seulement si elles sont définies (pas pour border: 0)
            const cellHasBorder = cellStyle.match(/border[:\s]/i) && !cellStyle.match(/border:\s*0|border:\s*none/i)
            if (cellHasBorder && finalBorder) {
              (cellConfig as any).borders = {
                top: finalBorder,
                bottom: finalBorder,
                left: finalBorder,
                right: finalBorder,
              }
            }
            
            if (cellBgColor) {
              cellConfig.shading = {
                fill: cellBgColor,
                type: ShadingType.CLEAR,
                color: 'auto',
              }
            }
            
            // Vérifier que la cellule a bien des paragraphes avec contenu
            const hasContent = cellParagraphs.some(p => {
              const children = (p as any).children as any || []
              return children.length > 0 && children.some((c: any) => {
                return c.text || c.type === 'imageRun' || c.constructor?.name === 'ImageRun'
              })
            })
            
            if (!hasContent) {
              logger.warn('[Word Generator] ⚠️ Cellule sans contenu, ajout d\'un paragraphe vide')
            }
            
            const cell = new TableCell(cellConfig)
            tableCells.push(cell)
            
            // Log pour déboguer les images dans les cellules
            try {
              const imageCount = cellParagraphs.filter(p => {
                const children = (p as any).children as any || []
                return children.some((c: any) => c.type === 'imageRun' || c.constructor?.name === 'ImageRun')
              }).length
              if (imageCount > 0) {
                logger.debug('[Word Generator] ✅ Cellule créée avec ' + imageCount + ' image(s) dans ' + cellParagraphs.length + ' paragraphe(s)')
              }
            } catch (e) {
              // Ignorer les erreurs de log
            }
            try {
              logger.debug('[Word Generator] Cellule ' + tableCells.length + ' ajoutée:', {
                cellChildrenCount: (cellConfig as any).children?.length || 0,
                cellHasImage: (cellConfig as any).children?.some((p: any) => 
                  (p as any).children?.some((c: any) => c.type === 'imageRun' || c.constructor?.name === 'ImageRun')
                ) || false,
              })
            } catch (e) {
              // Ignorer les erreurs de log
            }
          }
          
          if (tableCells.length > 0) {
            // CRITIQUE : Dans docx v9.5.1, TableRow et TableCell ne stockent pas les enfants dans .children as any après création
            // Les enfants sont passés au constructeur et seront rendus correctement même si on ne peut pas les lire après
            // On fait confiance que si tableCells.length > 0, les cellules ont été créées avec du contenu valide
            const row = new TableRow({ children: tableCells })
            tableRows.push(row)
            try {
              logger.debug('[Word Generator] Ligne ' + tableRows.length + ' ajoutée avec ' + tableCells.length + ' cellules')
            } catch (e) {
              // Ignorer les erreurs de log
            }
          } else {
            try {
              logger.warn('[Word Generator] ⚠️ Aucune cellule à ajouter à la ligne ' + (tableRows.length + 1))
            } catch (e) {
              // Ignorer les erreurs de log
            }
          }
        }
        
        if (tableRows.length > 0) {
          // Vérifier si le tableau a des bordures dans le HTML
          const tableStyleMatch = tableHTML.match(/<table[^>]*style\s*=\s*["']([^"']+)["']/i)
          const tableStyle = tableStyleMatch ? tableStyleMatch[1] : ''
          const tableHasBorder = tableStyle.match(/border[:\s]/i) && !tableStyle.match(/border:\s*0|border:\s*none/i)
          
          // Vérifier aussi les cellules pour déterminer si on doit ajouter des bordures
          const firstCellMatch = tableHTML.match(/<(td|th)[^>]*>/i)
          const firstCellStyle = firstCellMatch ? (firstCellMatch[0].match(/style\s*=\s*["']([^"']+)["']/i)?.[1] || '') : ''
          const cellHasBorder = firstCellStyle.match(/border[:\s]/i) && !firstCellStyle.match(/border:\s*0|border:\s*none/i)
          
          // Utiliser des bordures seulement si elles sont définies dans le HTML
          // Pour les tableaux avec border: 0 (comme l'en-tête), on ne met pas de bordures
          const borderConfig = (tableHasBorder || cellHasBorder) ? {
            color: 'E5E7EB',
            size: 8,
            style: BorderStyle.SINGLE,
          } : null
          
          const tableConfig: any = {
            rows: tableRows,
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
          }
          
          // Ajouter les bordures seulement si elles sont définies
          if (borderConfig) {
            (tableConfig as any).borders = {
              top: borderConfig,
              bottom: borderConfig,
              left: borderConfig,
              right: borderConfig,
              insideHorizontal: borderConfig,
              insideVertical: borderConfig,
            }
          }
          
          // CRITIQUE : Dans docx v9.5.1, TableRow ne stocke pas les cellules dans row.children as any après création
          // Les cellules sont passées au constructeur et seront rendues correctement même si on ne peut pas les lire après
          // On fait confiance que si tableRows.length > 0, les lignes ont été créées avec des cellules valides
          if (tableRows.length === 0) {
            logger.warn('[Word Generator] ⚠️ Aucune ligne à ajouter au tableau, ignoré')
            continue
          }
          
          // Utiliser directement tableRows car les cellules ont été validées AVANT la création du TableRow
          const finalTableConfig: any = {
            rows: tableRows,
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
          }
          
          // Ajouter les bordures seulement si elles sont définies
          if (borderConfig) {
            (finalTableConfig as any).borders = {
              top: borderConfig,
              bottom: borderConfig,
              left: borderConfig,
              right: borderConfig,
              insideHorizontal: borderConfig,
              insideVertical: borderConfig,
            }
          }
          
          const table = new Table(finalTableConfig)
          
          // Dans docx v9.5.1, les lignes sont passées au constructeur mais ne sont pas accessibles via table.rows
          // Le tableau sera rendu correctement si les lignes ont été créées avec des cellules valides
          try {
            logger.debug('[Word Generator] ✅ Tableau créé côté serveur avec ' + tableRows.length + ' lignes')
            logger.debug('[Word Generator] Détail du tableau:', {
              tableRowsLength: tableRows.length,
              firstRowExists: !!tableRows[0],
              tableConfigRows: finalTableConfig.rows?.length,
              // Note: Les cellules sont dans la config passée au constructeur, pas accessibles après
            })
          } catch (e) {
            // Ignorer les erreurs de log
          }
          
          tables.push(table)
          
          // Remplacer le tableau dans le HTML par un placeholder pour éviter la duplication
          const placeholder = `__TABLE_PLACEHOLDER_${tables.length - 1}__`
          tablePlaceholders.push(placeholder)
          processedHTML = processedHTML.replace(tableHTML, placeholder)
        }
      } catch (error) {
        logger.error('[Word Generator] ❌ Erreur lors de la création du tableau côté serveur:', error)
      }
    }
    
    // Détecter aussi les encadrements (divs avec bordures, background, padding significatif)
    // Pattern plus large pour capturer tous les divs avec style
    const divWithStyleRegex = /<div[^>]*style[^>]*>([\s\S]*?)<\/div>/gi
    let divMatch
    const encadrements: Table[] = []
    
    // Réinitialiser la regex
    divWithStyleRegex.lastIndex = 0
    
    while ((divMatch = divWithStyleRegex.exec(processedHTML)) !== null) {
      const divHTML = divMatch[0]
      const divContent = divMatch[1]
      
      try {
        // Parser les styles du div
        const divTagMatch = divHTML.match(/<div([^>]*)>/i)
        const divAttributes = divTagMatch ? divTagMatch[1] : ''
        
        // Extraire le style inline
        const styleMatch = divAttributes.match(/style\s*=\s*["']([^"']+)["']/i)
        const styleValue = styleMatch ? styleMatch[1] : ''
        
        // Vérifier si c'est un encadrement (a des bordures, background, ou padding significatif)
        const hasBorder = styleValue.match(/border[:\s]/i) && !styleValue.match(/border:\s*0|border:\s*none/i)
        const hasBackground = styleValue.match(/background(?:-color)?:\s*[^;]+/i) && !styleValue.match(/background(?:-color)?:\s*(?:transparent|none)/i)
        const hasPadding = styleValue.match(/padding:\s*(\d+)/i) && parseInt(styleValue.match(/padding:\s*(\d+)/i)?.[1] || '0') >= 5
        const hasMargin = styleValue.match(/margin(?:-top|-bottom)?:\s*(\d+)/i) && parseInt(styleValue.match(/margin(?:-top|-bottom)?:\s*(\d+)/i)?.[1] || '0') >= 10
        
        // C'est un encadrement si au moins une de ces conditions est vraie
        const isEncadrement = hasBorder || (hasBackground && (hasPadding || hasMargin))
        
        if (isEncadrement) {
          logger.debug('[Word Generator] 📦 Encadrement détecté côté serveur:', {
            hasBorder: !!hasBorder,
            hasBackground: !!hasBackground,
            hasPadding: !!hasPadding,
            hasMargin: !!hasMargin,
          })
          
          // Parser les styles avec un objet virtuel
          const virtualDiv = { 
            getAttribute: (name: string) => {
              if (name === 'style') return styleValue
              const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
              const attrMatch = divAttributes.match(new RegExp(escapedName + '\\s*=\\s*["\']([^"\']+)["\']', 'i'))
              return attrMatch ? attrMatch[1] : null
            } 
          } as any
          
          const divBorder = parseBorderStyle(virtualDiv)
          const divBgColor = parseBackgroundColor(virtualDiv)
          
          // Parser le padding depuis le style
          const paddingMatch = styleValue.match(/padding:\s*(\d+(?:\.\d+)?)\s*(?:px|pt)?/i)
          const paddingValue = paddingMatch ? parseFloat(paddingMatch[1]) : 5
          const paddingInTwip = convertMillimetersToTwip(paddingValue * 0.264583) // px to mm to twip
          
          const borderConfig = divBorder || (hasBorder ? {
            color: 'E5E7EB',
            size: 8,
            style: BorderStyle.SINGLE,
          } : null)
          
          // Traiter le contenu du div de manière récursive pour préserver la structure
          // Exclure les tableaux déjà traités et les divs imbriqués (pour éviter la récursion infinie)
          let processedDivContent = divContent
            .replace(/<table[^>]*>[\s\S]*?<\/table>/gi, '') // Exclure les tableaux
            .replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '') // Exclure les divs imbriqués (traités séparément)
          
          // Extraire le texte en préservant les sauts de ligne
          const divText = processedDivContent
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/\n\s*\n/g, '\n')
            .trim()
          
          const divParagraphs: Paragraph[] = []
          
          // Diviser le texte en paragraphes selon les sauts de ligne
          if (divText) {
            const lines = divText.split('\n').filter(line => line.trim())
            lines.forEach((line, index) => {
              const defaultStyles: Partial<any> = {}
              if (defaultFontSize) {
                defaultStyles.size = Math.round(defaultFontSize * 2)
              }
              
              divParagraphs.push(
                new Paragraph({
                  children: [new TextRun({ text: line.trim(), ...defaultStyles })],
                  spacing: { after: index < lines.length - 1 ? 100 : 0 },
                })
              )
            })
          }
          
          if (divParagraphs.length === 0) {
            divParagraphs.push(
              new Paragraph({
                children: [new TextRun({ text: ' ' })],
              })
            )
          }
          
          const cellConfig: any = {
            children: divParagraphs,
            verticalAlign: VerticalAlign.TOP,
            margins: {
              top: paddingInTwip,
              bottom: paddingInTwip,
              left: paddingInTwip,
              right: paddingInTwip,
            },
          }
          
          // Ajouter les bordures si présentes
          if (borderConfig) {
            (cellConfig as any).borders = {
              top: borderConfig,
              bottom: borderConfig,
              left: borderConfig,
              right: borderConfig,
            }
          }
          
          // Ajouter la couleur de fond si présente
          if (divBgColor) {
            cellConfig.shading = {
              fill: divBgColor,
              type: ShadingType.CLEAR,
              color: 'auto',
            }
          }
          
          const encadrementTable = new Table({
            rows: [
              new TableRow({
                children: [new TableCell(cellConfig)],
              }),
            ],
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
          })
          
          // Ajouter les bordures au tableau si présentes
          if (borderConfig) {
            (encadrementTable as any).borders = {
              top: borderConfig,
              bottom: borderConfig,
              left: borderConfig,
              right: borderConfig,
            }
          }
          
          encadrements.push(encadrementTable)
          
          // Remplacer le div dans le HTML par un placeholder
          const placeholder = `__ENCADREMENT_PLACEHOLDER_${encadrements.length - 1}__`
          processedHTML = processedHTML.replace(divHTML, placeholder)
          
          logger.debug('[Word Generator] ✅ Encadrement créé côté serveur', { paragraphCount: divParagraphs.length })
        }
      } catch (error) {
        logger.error('[Word Generator] ❌ Erreur lors de la création de l\'encadrement côté serveur:', error)
      }
    }
    
    // Stocker les tableaux et encadrements dans paragraphs
    const allTables = [...tables, ...encadrements]
    if (allTables.length > 0) {
      // CRITIQUE : S'assurer que __tables est bien attaché au tableau paragraphs
      // En créant un nouvel objet qui préserve la propriété
      if (!(paragraphs as any).__tables) {
        (paragraphs as any).__tables = []
      }
      (paragraphs as any).__tables.push(...allTables)
      
      // Vérifier que les tableaux ont bien des lignes
      const tablesWithRows = allTables.filter(t => {
        // Dans docx, les lignes sont passées au constructeur mais ne sont pas accessibles via t.rows
        // On doit vérifier que le tableau a été créé avec des lignes valides
        // En vérifiant si c'est une instance de Table
        return t instanceof Table
      })
      
      logger.debug(`[Word Generator] 📊 ${allTables.length} tableau(x) et encadrement(s) stocké(s) dans paragraphs`)
      logger.debug(`[Word Generator] 📊 ${tablesWithRows.length} tableau(x) valide(s) avec lignes`)
      logger.debug(`[Word Generator] 📊 Détail des tableaux stockés`, { 
        details: allTables.map((t, i) => ({
          index: i,
          isTableInstance: t instanceof Table,
          tableType: t.constructor?.name,
          // Note: t.rows n'est pas accessible dans docx v9.5.1, mais les lignes sont dans la config
        }))
      })
    }
    
    // D'ABORD : Extraire et ajouter les images AVANT de convertir le texte
    // Cela garantit que les images sont dans le bon ordre
    if (doc) {
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
      let match
      const imagePromises: Promise<void>[] = []
      const imagePositions: Array<{ index: number; url: string }> = []
      
      // Trouver toutes les images et leur position
      while ((match = imgRegex.exec(html)) !== null) {
        const imageUrl = match[1]
        const position = match.index
        
        // Ignorer les images qui ont déjà été traitées dans les tableaux
        if (imageUrl && imagesInTables.has(imageUrl)) {
          logger.debug(`[Word Generator] ⏭️ Image ignorée (déjà traitée dans un tableau): ${imageUrl.substring(0, 100)}`)
          continue
        }
        
        // Dans le contexte header, ignorer les images qui ne sont pas dans un tableau
        if (context === 'header' && imageUrl) {
          // Extraire le HTML avant l'image pour vérifier si elle est dans un tableau
          const htmlBeforeImage = html.substring(0, position)
          const lastTableOpen = htmlBeforeImage.lastIndexOf('<table')
          const lastTableClose = htmlBeforeImage.lastIndexOf('</table>')
          
          // Si la dernière balise <table> est après la dernière balise </table>, l'image est dans un tableau
          const isInTable = lastTableOpen > lastTableClose
          
          if (!isInTable) {
            logger.debug(`[Word Generator] ⏭️ Image ignorée dans header (pas dans un tableau): ${imageUrl.substring(0, 100)}`)
            continue
          }
        }
        
        if (imageUrl) {
          imagePositions.push({ index: position, url: imageUrl })
        }
      }
      
      logger.debug('[Word Generator] Images trouvées', { count: imagePositions.length })
      
      // Télécharger et ajouter toutes les images
      for (const { url } of imagePositions) {
        try {
          logger.debug(`[Word Generator] Téléchargement de l'image`, { url: url.substring(0, 100) })
          const imageBuffer = await downloadImage(url)
          if (imageBuffer && doc) {
            try {
              logger.debug(`[Word Generator] Image téléchargée, taille: ${imageBuffer.length} bytes`)
              // Utiliser ImageRun directement (Media.addImage n'existe pas dans docx)
              const imageRun = new ImageRun({
                data: imageBuffer as any,
                transformation: {
                  width: 200,
                  height: 200,
                },
              } as any)
              paragraphs.push(
                new Paragraph({
                  children: [imageRun],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 },
                })
              )
              logger.debug(`[Word Generator] ✅ Image ajoutée avec succès`)
            } catch (imgError) {
              logger.error('[Word Generator] Erreur lors de l\'ajout de l\'image:', imgError)
            }
          } else {
            logger.warn(`[Word Generator] ⚠️ Impossible de télécharger l'image`, { url: url.substring(0, 100) })
          }
        } catch (error) {
          logger.error('[Word Generator] Erreur lors du téléchargement de l\'image:', error)
        }
      }
    }
    
    // ENSUITE : Convertir le HTML en texte (sans les images, tableaux et encadrements déjà traités)
    // Remplacer les placeholders par des sauts de ligne
    const htmlWithoutTables = processedHTML
      .replace(/__TABLE_PLACEHOLDER_\d+__/g, '\n\n')
      .replace(/__ENCADREMENT_PLACEHOLDER_\d+__/g, '\n\n')
    
    const text = convert(htmlWithoutTables, {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: 'img', format: 'skip' }, // Ignorer les images dans la conversion texte
      ],
      longWordSplit: {
        wrapCharacters: [],
        forceWrapOnLimit: false,
      },
    })

    logger.debug('[Word Generator] Texte converti depuis HTML:', {
      textLength: text.length,
      textPreview: text.substring(0, 300),
    })

    const lines = text.split('\n').filter((line: string) => line.trim())
    
    logger.debug('[Word Generator] Lignes extraites:', lines.length)
    
    if (lines.length === 0 && text.trim().length > 0) {
      // Si pas de lignes mais du texte, créer un paragraphe avec tout le texte
      logger.debug('[Word Generator] Pas de lignes, création d\'un paragraphe avec tout le texte')
      // Appliquer les styles par défaut selon le contexte
      const defaultStyles: Partial<any> = {}
      if (defaultFontSize) {
        defaultStyles.size = Math.round(defaultFontSize * 2) // Convertir en half-points
      }
      if (context === 'header' || context === 'footer') {
        defaultStyles.font = 'Times New Roman'
      } else {
        defaultStyles.font = 'Arial'
      }
      
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: text.trim(), ...defaultStyles })],
          spacing: { after: 100 },
        })
      )
    } else {
      lines.forEach((line: any) => {
        const trimmed = line.trim()
        if (!trimmed) return

        // Détecter les titres
        const isLikelyHeading = trimmed.length < 80 && (
          trimmed === trimmed.toUpperCase() ||
          trimmed.match(/^[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ\s]+$/) ||
          trimmed.match(/^[\d\.\s]+[A-Z]/)
        )

        // Appliquer les styles par défaut selon le contexte
        const defaultStyles: Partial<any> = {}
        if (defaultFontSize) {
          defaultStyles.size = Math.round(defaultFontSize * 2) // Convertir en half-points
        }
        if (context === 'header' || context === 'footer') {
          defaultStyles.font = 'Times New Roman'
        } else {
          defaultStyles.font = 'Arial'
        }
        
        if (isLikelyHeading) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: trimmed, ...defaultStyles, bold: true, size: Math.round((defaultFontSize || 10) * 1.6 * 2) })],
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 },
            })
          )
        } else {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: trimmed, ...defaultStyles })],
              spacing: { after: 100 },
            })
          )
        }
      })
    }
    
    logger.debug('[Word Generator] Paragraphes créés côté serveur', { 
      paragraphCount: paragraphs.length, 
      imageCount: paragraphs.filter(p => ((p as any).children as any)?.some((c: any) => c.type === 'imageRun')).length 
    })
  }

  if (paragraphs.length === 0) {
    logger.warn('[Word Generator] ⚠️ Aucun paragraphe généré depuis HTML:', {
      htmlLength: html.length,
      htmlPreview: html.substring(0, 500),
      hasParser: !!parser,
      isServer: typeof window === 'undefined',
    })
    
    // Essayer de créer au moins un paragraphe avec le texte brut
    const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    if (plainText && plainText.length > 0) {
      logger.debug('[Word Generator] Création d\'un paragraphe depuis le texte brut:', {
        textLength: plainText.length,
        textPreview: plainText.substring(0, 300),
      })
      // Diviser en plusieurs paragraphes si le texte est long
      const chunks = plainText.match(/.{1,500}/g) || [plainText]
      return chunks.map(chunk => new Paragraph({ 
        children: [new TextRun({ text: chunk })],
        spacing: { after: 100 },
      }))
    }
    
    logger.error('[Word Generator] ❌ Impossible de générer des paragraphes, HTML vide ou invalide')
    return [new Paragraph({ children: [new TextRun({ text: 'Document généré' })] })]
  }
  
  logger.debug('[Word Generator] ✅ Paragraphes générés', { count: paragraphs.length })
  logger.debug('[Word Generator] ✅ Paragraphes.__tables AVANT retour', { tableCount: (paragraphs as any).__tables?.length || 0 })
  
  // S'assurer que la propriété __tables est bien attachée au tableau avant le retour
  if ((paragraphs as any).__tables && (paragraphs as any).__tables.length > 0) {
    logger.debug('[Word Generator] ✅ Détail des tableaux AVANT retour', { 
      details: (paragraphs as any).__tables.map((t: any, i: number) => ({
        index: i,
        tableType: t.constructor?.name,
        rowsCount: (t as any).rows?.length || (t as any)._rows?.length || 0,
        hasRows: !!(t as any).rows || !!(t as any)._rows,
        firstRowCells: ((t as any).rows?.[0]?.children as any)?.length || ((t as any)._rows?.[0]?.children as any)?.length || 0,
      }))
    })
    
    // Vérifier que les tableaux ont bien des lignes
    try {
      (paragraphs as any).__tables.forEach((table: any, index: number) => {
        const rows = table.rows || table._rows || []
        logger.debug('[Word Generator] Tableau ' + index + ':', {
          rowsCount: rows.length,
          firstRowExists: !!rows[0],
          firstRowChildren: ((rows[0] as any)?.children as any)?.length || 0,
        })
      })
    } catch (e) {
      // Ignorer les erreurs de log
    }
  }
  
  // CRITIQUE : Créer un nouvel objet Array qui préserve la propriété __tables
  // Les tableaux JavaScript peuvent perdre les propriétés personnalisées lors de certaines opérations
  const result = [...paragraphs] as any
  
  // Attacher explicitement la propriété __tables au nouveau tableau
  if ((paragraphs as any).__tables && (paragraphs as any).__tables.length > 0) {
    result.__tables = [...(paragraphs as any).__tables] // Créer une copie du tableau
    logger.debug('[Word Generator] ✅ Paragraphes.__tables APRÈS préparation', { tableCount: result.__tables.length })
    
    // Vérifier que les tableaux sont bien des instances de Table
    const validTables = result.__tables.filter((t: any) => t instanceof Table)
    logger.debug('[Word Generator] ✅ Tableaux valides (instances de Table):', validTables.length)
    
    if (validTables.length < result.__tables.length) {
      logger.warn('[Word Generator] ⚠️ Certains tableaux ne sont pas des instances valides de Table')
      // Garder uniquement les tableaux valides
      result.__tables = validTables
    }
  } else {
    result.__tables = []
    logger.debug('[Word Generator] ⚠️ Aucun tableau dans paragraphs.__tables')
  }
  
  return result
}

/**
 * Génère un document Word depuis du HTML complet (avec header et footer)
 */
export async function generateWordFromHTML(
  html: string,
  filename: string = 'document.docx'
): Promise<Blob> {
  try {
    // Parser le HTML pour extraire header, body et footer
    // Le HTML généré contient tout dans un seul document
    // On va extraire les parties en cherchant des patterns ou en utilisant des sélecteurs
    
    // Pour l'instant, on traite tout le HTML comme contenu principal
    // et on va créer des headers/footers basés sur le template si disponible
    
    const bodyParagraphs = await htmlToParagraphs(html)

    // Créer le document Word avec sections
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: bodyParagraphs,
        },
      ],
    })

    // Générer le blob
    const blob = await Packer.toBlob(doc)
    return blob
  } catch (error) {
    logger.error('Erreur lors de la génération du document Word:', error)
    throw error
  }
}

/**
 * Génère un document Word depuis un template et des variables (avec header et footer)
 * Utilise la même logique de traitement que generateHTML pour être conforme au PDF
 */
export async function generateWordFromTemplate(
  template: DocumentTemplate,
  variables: DocumentVariables,
  documentId?: string,
  organizationId?: string
): Promise<Blob> {
  try {
    // Importer toutes les fonctions de traitement depuis leurs fichiers respectifs
    const { evaluateConditionalContent } = await import('@/lib/utils/document-generation/conditional-processor')
    const { processLoops } = await import('@/lib/utils/document-generation/loop-processor')
    const { processCalculatedVariables } = await import('@/lib/utils/document-generation/calculated-variables')
    const { processDynamicTables } = await import('@/lib/utils/document-generation/dynamic-table-processor')
    const { processElementVisibility } = await import('@/lib/utils/document-generation/element-visibility-processor')
    const { processNestedVariables, flattenVariables } = await import('@/lib/utils/document-generation/nested-variables-processor')
    const { processDynamicHyperlinks } = await import('@/lib/utils/document-generation/dynamic-hyperlinks-processor')
    // Importer processSignatures et processAttachments seulement si documentId est fourni
    // pour éviter les problèmes d'import côté client
    let processSignatures: any = null
    let processAttachments: any = null
    
    if (documentId) {
      try {
        const signatureModule = await import('@/lib/utils/document-generation/signature-processor')
        processSignatures = signatureModule.processSignatures
      } catch (error) {
        logger.warn('Impossible d\'importer processSignatures', sanitizeError(error))
      }
      
      try {
        const attachmentModule = await import('@/lib/utils/document-generation/attachment-processor')
        processAttachments = attachmentModule.processAttachments
      } catch (error) {
        logger.warn('Impossible d\'importer processAttachments', sanitizeError(error))
      }
    }
    const { processFormFields } = await import('@/lib/utils/document-generation/form-field-processor')
    
    // SIMPLIFICATION : Utiliser directement les paramètres du template
    // Extraire header, content et footer directement depuis le template
    let headerContent = ''
    if (template.header) {
      const headerData = template.header as any
      if (typeof headerData === 'string') {
        headerContent = headerData
      } else if (headerData.content) {
        headerContent = headerData.content
      }
    }
    if (!headerContent && (template as any).headerContent) {
      headerContent = (template as any).headerContent
    }
    
    // Pour le body, utiliser content directement
    let content = ''
    if (template.content) {
      const contentData = template.content as any
      if (typeof contentData === 'string') {
        content = contentData
      } else if (contentData.body) {
        content = contentData.body
      } else if (contentData.content) {
        content = contentData.content
      } else if (contentData.html) {
        content = contentData.html
      }
    }
    if (!content && (template as any).bodyContent) {
      content = (template as any).bodyContent
    }
    
    // Pour le footer, utiliser footer.content directement
    let footerContent = ''
    if (template.footer) {
      const footerData = template.footer as any
      if (typeof footerData === 'string') {
        footerContent = footerData
      } else if (footerData.content) {
        footerContent = footerData.content
      }
    }
    if (!footerContent && (template as any).footerContent) {
      footerContent = (template as any).footerContent
    }

    // Aplatir les variables
    const flattenedVariables = flattenVariables(variables)

    // Traiter header, content et footer séparément avec les mêmes fonctions de traitement
    let processedHeader = headerContent
    let processedContent = content
    let processedFooter = footerContent

    // 0. PRÉ-TRAITEMENT : Remplacer {ecole_logo} et autres variables de logo par des balises img avec src
    const logoVariablePatterns = ['ecole_logo', 'organization_logo', 'organisation_logo']
    logoVariablePatterns.forEach(key => {
      const pattern = new RegExp(`\\{${key}\\}`, 'g')
      const logoValue = flattenedVariables[key]
      if (logoValue && String(logoValue).trim()) {
        processedHeader = processedHeader.replace(
          pattern,
          `<img src="${String(logoValue)}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />`
        )
        processedContent = processedContent.replace(
          pattern,
          `<img src="${String(logoValue)}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />`
        )
        processedFooter = processedFooter.replace(
          pattern,
          `<img src="${String(logoValue)}" alt="Logo" style="max-height: 55px; max-width: 140px; object-fit: contain;" />`
        )
      } else {
        processedHeader = processedHeader.replace(pattern, '')
        processedContent = processedContent.replace(pattern, '')
        processedFooter = processedFooter.replace(pattern, '')
      }
    })
      
    // Traiter header, content et footer avec les mêmes fonctions de traitement
    // 1. Traiter les tableaux dynamiques
    processedHeader = processDynamicTables(processedHeader, flattenedVariables)
    processedContent = processDynamicTables(processedContent, flattenedVariables)
    processedFooter = processDynamicTables(processedFooter, flattenedVariables)

    // 2. Traiter les boucles
    processedHeader = processLoops(processedHeader, flattenedVariables)
    processedContent = processLoops(processedContent, flattenedVariables)
    processedFooter = processLoops(processedFooter, flattenedVariables)

    // 3. Traiter les conditions
    processedHeader = evaluateConditionalContent(processedHeader, flattenedVariables)
    processedContent = evaluateConditionalContent(processedContent, flattenedVariables)
    processedFooter = evaluateConditionalContent(processedFooter, flattenedVariables)

    // 4. Traiter la visibilité conditionnelle
    processedHeader = processElementVisibility(processedHeader, flattenedVariables)
    processedContent = processElementVisibility(processedContent, flattenedVariables)
    processedFooter = processElementVisibility(processedFooter, flattenedVariables)

    // 5. Traiter les variables calculées
    processedHeader = processCalculatedVariables(processedHeader, flattenedVariables)
    processedContent = processCalculatedVariables(processedContent, flattenedVariables)
    processedFooter = processCalculatedVariables(processedFooter, flattenedVariables)

    // 6. Traiter les variables imbriquées
    processedHeader = processNestedVariables(processedHeader, flattenedVariables)
    processedContent = processNestedVariables(processedContent, flattenedVariables)
    processedFooter = processNestedVariables(processedFooter, flattenedVariables)

    // 7. Traiter les liens hypertextes dynamiques
    processedHeader = processDynamicHyperlinks(processedHeader, flattenedVariables)
    processedContent = processDynamicHyperlinks(processedContent, flattenedVariables)
    processedFooter = processDynamicHyperlinks(processedFooter, flattenedVariables)

    // 8. Traiter les signatures
    if (documentId && processSignatures) {
      try {
        processedHeader = await processSignatures(processedHeader, documentId)
        processedContent = await processSignatures(processedContent, documentId)
        processedFooter = await processSignatures(processedFooter, documentId)
      } catch (sigError) {
        logger.error('Erreur lors du traitement des signatures:', sigError)
      }
    }

    // 9. Traiter les pièces jointes
    if (documentId && processAttachments) {
      try {
        processedHeader = await processAttachments(processedHeader, documentId)
        processedContent = await processAttachments(processedContent, documentId)
        processedFooter = await processAttachments(processedFooter, documentId)
      } catch (attError) {
        logger.error('Erreur lors du traitement des pièces jointes:', attError)
      }
    }

    // 10. Traiter les champs de formulaire
    processedHeader = processFormFields(processedHeader, flattenedVariables)
    processedContent = processFormFields(processedContent, flattenedVariables)
    processedFooter = processFormFields(processedFooter, flattenedVariables)

    // 11. Remplacer les variables restantes
    const sortedKeys = Object.keys(flattenedVariables)
      .filter(key => !['ecole_logo', 'organization_logo', 'organisation_logo'].includes(key))
      .sort((a, b) => b.length - a.length)
    
    const replaceVariables = (text: string): string => {
      let result = text
      sortedKeys.forEach((key) => {
        const value = flattenedVariables[key]
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`\\{${escapedKey}\\}`, 'g')
        const replacement = (value === null || value === undefined) 
          ? '' 
          : String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;')
        result = result.replace(regex, replacement)
      })
      // Supprimer les variables non remplacées
      result = result.replace(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g, '')
      return result
    }

    processedHeader = replaceVariables(processedHeader)
    processedContent = replaceVariables(processedContent)
    processedFooter = replaceVariables(processedFooter)

    // Taille de police par défaut (même que le générateur PDF)
    // DOIT être défini AVANT d'être utilisé dans htmlToParagraphs
    const defaultFontSize = template.font_size || 10 // en points
    
    // Créer un document temporaire avec une section vide pour Media.addImage
    // Media.addImage nécessite un document avec des sections
    const tempDoc = new Document({
      sections: [
        {
          properties: {},
          children: [],
        },
      ],
    })
    
    // Convertir en paragraphes (avec support des images)
    logger.debug('[Word Generator] Conversion en paragraphes:', {
      headerLength: processedHeader.length,
      contentLength: processedContent.length,
      footerLength: processedFooter.length,
    })
    
    logger.debug('[Word Generator] Avant conversion en paragraphes:', {
      headerLength: processedHeader.length,
      contentLength: processedContent.length,
      footerLength: processedFooter.length,
      headerHTML: processedHeader.substring(0, 500),
      contentHTML: processedContent.substring(0, 500),
      footerHTML: processedFooter.substring(0, 500),
      headerHasImages: processedHeader.includes('<img'),
      contentHasImages: processedContent.includes('<img'),
      footerHasImages: processedFooter.includes('<img'),
      headerImageCount: (processedHeader.match(/<img/gi) || []).length,
      contentImageCount: (processedContent.match(/<img/gi) || []).length,
      footerImageCount: (processedFooter.match(/<img/gi) || []).length,
    })
    
    // Convertir en paragraphes SÉQUENTIELLEMENT pour garantir que le document est partagé correctement
    // Le document tempDoc doit être le même pour toutes les images
    logger.debug('[Word Generator] Conversion du header en paragraphes...')
    logger.debug('[Word Generator] Header HTML avant conversion:', {
      length: processedHeader.length,
      preview: processedHeader.substring(0, 500),
      hasImages: processedHeader.includes('<img'),
      imageCount: (processedHeader.match(/<img/gi) || []).length,
      imageTags: processedHeader.match(/<img[^>]*>/gi) || [],
    })
    // Taille de police par défaut pour header/footer (85% de la taille normale, comme dans le générateur PDF)
    const headerFooterFontSize = Math.round(defaultFontSize * 0.85)
    
    const headerParagraphs = await htmlToParagraphs(processedHeader, tempDoc, 'header', headerFooterFontSize)
    logger.debug('[Word Generator] Header paragraphes créés', { count: headerParagraphs.length })
    logger.debug('[Word Generator] Header paragraphs.__tables', { count: (headerParagraphs as any).__tables?.length || 0 })
    logger.debug('[Word Generator] Header paragraphs.__tables détails', { 
      details: (headerParagraphs as any).__tables ? (headerParagraphs as any).__tables.map((t: any, i: number) => ({
        index: i,
        rowsCount: t.rows?.length || 0,
        hasRows: !!t.rows,
      })) : 'aucun'
    })
    
    // Extraire les tableaux du header (comme pour le body)
    const headerTablesRaw = (headerParagraphs as any).__tables || []
    // CRITIQUE : Filtrer pour ne garder que les instances valides de Table
    const headerTables: Table[] = headerTablesRaw.filter((t: any) => t instanceof Table)
    const cleanHeaderParagraphs = headerParagraphs.filter(p => !(p as any).__isTableMarker)
    
    logger.debug('[Word Generator] Header - Paragraphes et tableaux', { 
      paragraphs: cleanHeaderParagraphs.length, 
      tables: headerTables.length, 
      rawTables: headerTablesRaw.length 
    })
    if (headerTablesRaw.length > headerTables.length) {
      logger.warn('[Word Generator] ⚠️ Certains tableaux du header ne sont pas des instances valides de Table')
    }
    logger.debug('[Word Generator] Header - headerTables détails', { 
      details: headerTables.map((t, i) => ({
        index: i,
        isTableInstance: t instanceof Table,
        tableType: t.constructor?.name,
        // Note: t.rows n'est pas accessible dans docx v9.5.1, mais les lignes sont dans la config passée au constructeur
      }))
    })
    
    // Vérifier si des images sont dans les paragraphes ou les tableaux
    const headerHasImages = cleanHeaderParagraphs.some(p => {
      const children = (p as any).children as any || []
      return children.some((c: any) => c.type === 'imageRun' || c.type === 'drawing')
    }) || headerTables.some(t => {
      // Vérifier les images dans les tableaux
      const rows = (t as any).rows || []
      return rows.some((r: any) => {
        const cells = ((r as any).children as any) || []
        return cells.some((c: any) => {
          const cellChildren = ((c as any).children as any) || []
          return cellChildren.some((p: any) => {
            const pChildren = (p as any).children as any || []
            return pChildren.some((child: any) => child.type === 'imageRun' || child.type === 'drawing')
          })
        })
      })
    })
    logger.debug('[Word Generator] Header contient des images', { hasImages: headerHasImages })
    
    logger.debug('[Word Generator] Conversion du content en paragraphes...')
    const bodyParagraphs = await htmlToParagraphs(processedContent, tempDoc, 'content', defaultFontSize)
    logger.debug('[Word Generator] Content paragraphes', { count: bodyParagraphs.length })
    
    logger.debug('[Word Generator] Conversion du footer en paragraphes...')
    const footerParagraphs = await htmlToParagraphs(processedFooter, tempDoc, 'footer', headerFooterFontSize)
    logger.debug('[Word Generator] Footer paragraphes', { count: footerParagraphs.length })
    
    logger.debug('[Word Generator] Paragraphes créés:', {
      headerCount: headerParagraphs.length,
      bodyCount: bodyParagraphs.length,
      footerCount: footerParagraphs.length,
      headerPreview: headerParagraphs.length > 0 ? 'Oui' : 'Non',
      bodyPreview: bodyParagraphs.length > 0 ? 'Oui' : 'Non',
      footerPreview: footerParagraphs.length > 0 ? 'Oui' : 'Non',
    })
    
    // Extraire les tableaux des paragraphes du body
    const bodyTablesRaw = (bodyParagraphs as any).__tables || []
    // CRITIQUE : Filtrer pour ne garder que les instances valides de Table
    const bodyTables: Table[] = bodyTablesRaw.filter((t: any) => t instanceof Table)
    const cleanBodyParagraphs = bodyParagraphs.filter(p => !(p as any).__isTableMarker)
    
    if (bodyTablesRaw.length > bodyTables.length) {
      logger.warn('[Word Generator] ⚠️ Certains tableaux du body ne sont pas des instances valides de Table')
    }
    
    // Combiner les paragraphes et les tableaux dans le bon ordre
    // CRITIQUE : Pour l'instant, on met les tableaux AVANT les paragraphes pour le header
    // car les tableaux d'en-tête doivent être en premier
    const finalBodyChildren: (Paragraph | Table)[] = []
    
    // Pour le body, on ajoute d'abord les paragraphes, puis les tableaux
    // NOTE: Amélioration prévue - Préserver l'ordre exact en utilisant les placeholders dans le texte converti
    finalBodyChildren.push(...cleanBodyParagraphs)
    
    // Ajouter les tableaux à la fin
    if (bodyTables.length > 0) {
      // Ajouter un paragraphe vide avant les tableaux pour l'espacement
      finalBodyChildren.push(new Paragraph({ children: [] }))
      finalBodyChildren.push(...bodyTables)
    }
    
    // Si pas de contenu, utiliser le fallback
    if (finalBodyChildren.length === 0) {
      logger.warn('[Word Generator] ⚠️ Aucun contenu dans le body, utilisation du content original')
      const fallbackParagraphs = await htmlToParagraphs(content, tempDoc)
      const fallbackTables = (fallbackParagraphs as any).__tables || []
      const cleanFallbackParagraphs = fallbackParagraphs.filter(p => !(p as any).__isTableMarker)
      
      if (cleanFallbackParagraphs.length > 0 || fallbackTables.length > 0) {
        finalBodyChildren.push(...cleanFallbackParagraphs)
        finalBodyChildren.push(...fallbackTables)
      } else {
        finalBodyChildren.push(new Paragraph({
          children: [new TextRun({ text: processedContent || content || 'Document généré' })],
        }))
      }
    }
    
    logger.debug('[Word Generator] Contenu final:', {
      headerCount: headerParagraphs.length,
      bodyParagraphsCount: cleanBodyParagraphs.length,
      bodyTablesCount: bodyTables.length,
      bodyTotalCount: finalBodyChildren.length,
      footerCount: footerParagraphs.length,
    })

    // Créer les headers et footers Word
    // CRITIQUE : Pour le header, mettre les tableaux EN PREMIER car ils contiennent le logo
    // Les tableaux d'en-tête doivent être avant les paragraphes
    const headerChildren: (Paragraph | Table)[] = []
    
    // Ajouter d'abord les tableaux (qui contiennent le logo)
    if (headerTables.length > 0) {
      headerChildren.push(...headerTables)
    }
    
    // Puis les paragraphes
    headerChildren.push(...cleanHeaderParagraphs)
    
    logger.debug('[Word Generator] Création du Header Word', { 
      paragraphCount: cleanHeaderParagraphs.length, 
      tableCount: headerTables.length 
    })
    if (cleanHeaderParagraphs.length > 0 || headerTables.length > 0) {
      // Vérifier le contenu des paragraphes du header
      cleanHeaderParagraphs.forEach((p, i) => {
        const children = (p as any).children as any || []
        const hasImage = children.some((c: any) => c.type === 'imageRun' || c.type === 'drawing')
        logger.debug(`[Word Generator] Header paragraphe ${i}`, {
          hasImage,
          childrenCount: children.length,
          childrenTypes: children.map((c: any) => c.type || typeof c),
        })
      })
      
      // Vérifier le contenu des tableaux du header
      headerTables.forEach((t, i) => {
        // Dans docx v9.5.1, t.rows n'est pas accessible directement
        // Les lignes sont stockées dans la configuration passée au constructeur
        logger.debug(`[Word Generator] Header tableau ${i}`, {
          isTableInstance: t instanceof Table,
          tableType: t.constructor?.name,
          // Note: Les lignes sont dans la config du constructeur, pas dans t.rows
          // Le tableau sera rendu correctement par docx si les lignes ont été passées au constructeur
        })
      })
    }
    
    // Vérifier que le header contient du contenu
    logger.debug('[Word Generator] Vérification du header avant création:', {
      headerChildrenLength: headerChildren.length,
      cleanHeaderParagraphsLength: cleanHeaderParagraphs.length,
      headerTablesLength: headerTables.length,
      headerChildrenTypes: headerChildren.map(c => c.constructor.name),
    })
    
    const header = headerChildren.length > 0 ? new Header({
      children: headerChildren,
    }) : undefined

    logger.debug('[Word Generator] Header Word créé', { created: !!header, elementCount: headerChildren.length })
    
    if (!header) {
      logger.warn('[Word Generator] ⚠️ Header non créé car headerChildren est vide')
    } else {
      logger.debug('[Word Generator] ✅ Header créé avec succès')
    }

    // Créer le footer avec les paragraphes convertis
    const footer = footerParagraphs.length > 0 ? new Footer({
      children: footerParagraphs,
    }) : undefined

    logger.debug('[Word Generator] Footer Word créé', { created: !!footer, paragraphCount: footerParagraphs.length })

    // Récupérer les paramètres du template (mêmes que le générateur PDF)
    const pageSize = (template.content as any)?.pageSize || template.page_size || 'A4'
    const defaultMargins = { top: 20, right: 20, bottom: 20, left: 20 } // en mm (comme dans html-generator.ts)
    const margins = template.margins || defaultMargins
    const finalMargins = {
      top: margins.top ?? defaultMargins.top,
      right: margins.right ?? defaultMargins.right,
      bottom: margins.bottom ?? defaultMargins.bottom,
      left: margins.left ?? defaultMargins.left,
    }
    
    // Convertir les marges de mm en twips (1mm = 56.6929 twips)
    // docx utilise des twips (1/20 de point, 1 point = 1/72 inch)
    // 1mm = 0.0393701 inch = 0.0393701 * 72 * 20 = 56.6929 twips
    const marginTopTwip = Math.round(finalMargins.top * 56.6929)
    const marginBottomTwip = Math.round(finalMargins.bottom * 56.6929)
    const marginLeftTwip = Math.round(finalMargins.left * 56.6929)
    const marginRightTwip = Math.round(finalMargins.right * 56.6929)
    
    // Taille de page A4 en twips (210mm x 297mm)
    // 210mm = 11906 twips, 297mm = 16838 twips
    const A4_WIDTH_TWIP = 11906
    const A4_HEIGHT_TWIP = 16838
    
    // Créer les sections du document Word avec header et footer
    // Pour avoir le header uniquement sur la première page, on utilise 'first'
    // Pour avoir le footer sur toutes les pages, on utilise 'default'
    const sectionConfig: any = {
      properties: {
        page: {
          size: {
            orientation: 'portrait' as const,
            width: A4_WIDTH_TWIP,
            height: A4_HEIGHT_TWIP,
          },
          margin: {
            top: marginTopTwip,
            bottom: marginBottomTwip,
            left: marginLeftTwip,
            right: marginRightTwip,
          },
        },
        titlePage: true, // Pour avoir un header différent sur la première page
      },
      children: finalBodyChildren,
    }
    
    // Ajouter le header uniquement sur la première page
    // Dans docx, pour avoir un header uniquement sur la première page :
    // - On définit 'first' avec le header de la première page
    // - On ne définit PAS 'default' (ou on le définit comme undefined/null)
    if (header) {
      // Créer un header vide pour les autres pages
      const emptyHeader = new Header({ children: [new Paragraph({ children: [] })] })
      
      sectionConfig.headers = {
        first: header, // Header avec contenu sur la première page
        default: emptyHeader, // Header vide sur les autres pages
      }
      
      // titlePage est déjà défini dans les properties ci-dessus
      
      logger.debug('[Word Generator] ✅ Header configuré avec first (première page) et default (vide pour autres pages)')
      logger.debug('[Word Generator] Header contient', { elementCount: headerChildren.length })
      logger.debug('[Word Generator] Types des éléments du header', { types: headerChildren.map(c => c.constructor.name) })
    } else {
      logger.warn('[Word Generator] ⚠️ Pas de header à ajouter - headerChildren est vide', {
        headerChildrenLength: headerChildren.length,
        cleanHeaderParagraphsLength: cleanHeaderParagraphs.length,
        headerTablesLength: headerTables.length
      })
    }
    
    // Ajouter le footer sur toutes les pages
    if (footer) {
      sectionConfig.footers = {
        default: footer, // Footer sur toutes les pages
      }
      logger.debug('[Word Generator] Footer configuré avec default')
    }
    
    const finalDoc = new Document({
      sections: [sectionConfig],
    })
    
    logger.debug('[Word Generator] Document créé avec:', {
      hasHeader: !!header,
      hasFooter: !!footer,
      headerChildrenCount: headerChildren.length,
      footerChildrenCount: footerParagraphs.length,
      bodyChildrenCount: finalBodyChildren.length,
    })

    // Générer le blob
    const blob = await Packer.toBlob(finalDoc)
    return blob
  } catch (error) {
    logger.error('Erreur lors de la génération du document Word depuis template:', error)
    throw error
  }
}

