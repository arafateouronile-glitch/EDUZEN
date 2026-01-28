import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { logger, sanitizeError } from '@/lib/utils/logger'

export interface DocumentTemplate {
  title: string
  content: string
  logo?: string
  organization?: {
    name: string
    address?: string
    phone?: string
    email?: string
  }
  metadata?: Record<string, any>
}

/**
 * Génère un PDF depuis un élément HTML
 */
export async function generatePDFFromHTML(
  elementId: string,
  filename: string = 'document.pdf',
  options?: {
    format?: [number, number]
    orientation?: 'portrait' | 'landscape'
    quality?: number
  }
): Promise<Blob> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Élément avec l'ID "${elementId}" non trouvé`)
  }

  try {
    // Vérifier que l'élément est visible et a des dimensions
    let rect = element.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      logger.warn('Élément sans dimensions, tentative de correction...')
      // Forcer des dimensions minimales
      if (element instanceof HTMLElement) {
        element.style.width = element.style.width || '210mm'
        element.style.minHeight = element.style.minHeight || '297mm'
        // Attendre que le style soit appliqué
        await new Promise((resolve) => setTimeout(resolve, 100))
        rect = element.getBoundingClientRect()
      }
    }

    // Attendre que toutes les images soient chargées
    const images = element.querySelectorAll('img')
    await Promise.all(
      Array.from(images).map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve()
        return new Promise((resolve) => {
          img.onload = resolve
          img.onerror = resolve // Continuer même si une image échoue
          // Timeout après 5 secondes
          setTimeout(resolve, 5000)
        })
      })
    )

    // Générer le canvas avec html2canvas
    const elementWidth = rect.width || element.scrollWidth || 794
    const elementHeight = element.scrollHeight || 1123
    
    const canvas = await html2canvas(element, {
      scale: 2, // Augmenter la résolution pour une meilleure qualité
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      removeContainer: false, // Ne pas supprimer le conteneur
      imageTimeout: 15000,
      width: elementWidth,
      height: elementHeight,
      windowWidth: elementWidth,
      windowHeight: elementHeight,
      x: 0,
      y: 0,
      onclone: (clonedDoc, element) => {
        // html2canvas peut planter avec certains background-image (url/svg/pattern) => canvas 0x0.
        // On neutralise les backgrounds en URL (pas les couleurs) pour fiabiliser la génération PDF.
        try {
          const style = clonedDoc.createElement('style')
          style.textContent = `
            * { background-image: none !important; }
            [style*="background-image"] { background-image: none !important; }
            [style*="background: url"] { background-image: none !important; }
            [style*="background:url"] { background-image: none !important; }
          `
          clonedDoc.head.appendChild(style)
        } catch {
          // ignore
        }

        // S'assurer que toutes les images dans le clone sont chargées
        const clonedImages = clonedDoc.querySelectorAll('img')
        clonedImages.forEach((img) => {
          if (!img.complete || img.naturalWidth === 0) {
            // Remplacer les images non chargées par un placeholder
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=='
          }
        })
        
        // S'assurer que l'élément cloné a des dimensions
        if (element instanceof HTMLElement) {
          const clonedRect = element.getBoundingClientRect()
          if (clonedRect.width === 0 || clonedRect.height === 0) {
            element.style.width = '210mm'
            element.style.minHeight = '297mm'
          }
        }
      },
    })

    // Vérifier que le canvas est valide
    if (!canvas) {
      throw new Error('Le canvas n\'a pas pu être généré')
    }
    
    if (canvas.width === 0 || canvas.height === 0) {
      logger.error('Canvas invalide:', { width: canvas.width, height: canvas.height })
      throw new Error(`Le canvas généré est invalide (${canvas.width}x${canvas.height})`)
    }

    // Convertir en data URL avec gestion d'erreur
    let imgData: string
    try {
      imgData = canvas.toDataURL('image/png', 0.95)
      if (!imgData || imgData.length < 100) {
        throw new Error('Data URL invalide')
      }
    } catch (error) {
      logger.error('Erreur lors de la conversion du canvas en data URL', error)
      // Essayer avec JPEG comme fallback
      imgData = canvas.toDataURL('image/jpeg', 0.95)
    }

    const pdf = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'mm',
      format: options?.format || 'a4',
      compress: true,
    })

    const imgWidth = pdf.internal.pageSize.getWidth()
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    // Ajouter la première page
    try {
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
    } catch (error) {
      logger.error('Erreur lors de l\'ajout de l\'image au PDF:', error)
      // Essayer avec JPEG si PNG échoue
      if (imgData.startsWith('data:image/png')) {
        const jpegData = canvas.toDataURL('image/jpeg', 0.95)
        pdf.addImage(jpegData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      } else {
        throw error
      }
    }

    heightLeft -= pdf.internal.pageSize.getHeight()

    // Ajouter les pages supplémentaires si nécessaire
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      try {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      } catch (error) {
        // Si PNG échoue, essayer JPEG
        if (imgData.startsWith('data:image/png')) {
          const jpegData = canvas.toDataURL('image/jpeg', 0.95)
          pdf.addImage(jpegData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
        }
      }
      heightLeft -= pdf.internal.pageSize.getHeight()
    }

    pdf.save(filename)
    return pdf.output('blob')
  } catch (error) {
    logger.error('Erreur lors de la génération du PDF', error)
    throw new Error(`Erreur lors de la génération du PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}

/**
 * Génère un PDF simple avec du texte
 */
export function generateSimplePDF(
  content: string[],
  filename: string = 'document.pdf',
  options?: {
    title?: string
    orientation?: 'portrait' | 'landscape'
  }
): Blob {
  const pdf = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  if (options?.title) {
    pdf.setFontSize(18)
    pdf.text(options.title, 105, 20, { align: 'center' })
    pdf.setFontSize(12)
    let y = 35
    content.forEach((line) => {
      if (y > 280) {
        pdf.addPage()
        y = 20
      }
      pdf.text(line, 20, y)
      y += 7
    })
  } else {
    let y = 20
    content.forEach((line) => {
      if (y > 280) {
        pdf.addPage()
        y = 20
      }
      pdf.text(line, 20, y)
      y += 7
    })
  }

  pdf.save(filename)
  return pdf.output('blob')
}

/**
 * Formate une date pour l'affichage dans un document
 */
export function formatDateForDocument(date: string | Date, locale: string = 'fr-FR'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/**
 * Génère un PDF depuis du HTML (sans téléchargement)
 * Retourne le Blob du PDF
 * Amélioré pour préserver les marges, headers et footers
 */
export async function generatePDFBlobFromHTML(
  elementId: string,
  options?: {
    format?: [number, number]
    orientation?: 'portrait' | 'landscape'
    quality?: number
  }
): Promise<Blob> {
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Élément avec l'ID "${elementId}" non trouvé`)
  }

  // Vérifier que l'élément est visible et a des dimensions
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    logger.warn('Élément sans dimensions, tentative de correction...')
    if (element instanceof HTMLElement) {
      element.style.width = element.style.width || '794px'
      element.style.minHeight = element.style.minHeight || '1123px'
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  // Attendre que toutes les images soient chargées
  const images = element.querySelectorAll('img')
  await Promise.all(
    Array.from(images).map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve()
      return new Promise((resolve) => {
        img.onload = resolve
        img.onerror = resolve
        setTimeout(resolve, 5000)
      })
    })
  )

  // Extraire le header et le footer pour traitement séparé
  const headerElement = element.querySelector('.header') as HTMLElement
  const footerElement = element.querySelector('.footer') as HTMLElement
  const contentElement = element.querySelector('.content') as HTMLElement
  
  // Vérifier si le header doit être répété sur toutes les pages
  const headerRepeatOnAllPages = headerElement?.getAttribute('data-repeat-on-all-pages') === 'true' || false
  
  // Récupérer les styles calculés de l'élément original avant la capture
  const originalStyle = window.getComputedStyle(element)
  const originalPaddingTop = parseFloat(originalStyle.paddingTop) || 75.6 // 20mm par défaut
  const originalPaddingBottom = parseFloat(originalStyle.paddingBottom) || 75.6
  const originalPaddingLeft = parseFloat(originalStyle.paddingLeft) || 75.6
  const originalPaddingRight = parseFloat(originalStyle.paddingRight) || 75.6
  
  // Générer le canvas avec html2canvas avec des options optimisées
  // Utiliser scrollWidth et scrollHeight pour capturer tout le contenu
  const elementWidth = element.scrollWidth || rect.width || 794
  const elementHeight = element.scrollHeight || rect.height || 1123
  
  // Capturer le footer séparément si présent
  let footerCanvas: HTMLCanvasElement | null = null
  let footerHeight = 0
  if (footerElement) {
    try {
      footerHeight = footerElement.offsetHeight || 60
      footerCanvas = await html2canvas(footerElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: elementWidth - originalPaddingLeft - originalPaddingRight,
        height: footerHeight,
      })
      logger.debug('[PDF Generator] Footer capturé séparément:', {
        width: footerCanvas.width,
        height: footerCanvas.height,
        footerHeight,
      })
    } catch (error) {
      logger.warn('[PDF Generator] Erreur lors de la capture du footer', { error })
    }
  }
  
  logger.debug('[PDF Generator] Capturing element:', {
    elementId,
    width: elementWidth,
    height: elementHeight,
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
    rectWidth: rect.width,
    rectHeight: rect.height,
    computedPadding: originalStyle.padding,
    paddingTop: originalPaddingTop,
    paddingBottom: originalPaddingBottom,
    paddingLeft: originalPaddingLeft,
    paddingRight: originalPaddingRight,
  })
  
  const canvas = await html2canvas(element, {
    scale: 2, // Augmenter la résolution pour une meilleure qualité
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    removeContainer: false,
    imageTimeout: 15000,
    width: elementWidth,
    height: elementHeight,
    windowWidth: elementWidth,
    windowHeight: elementHeight,
    x: 0,
    y: 0,
    scrollX: 0,
    scrollY: 0,
    onclone: (clonedDoc, clonedElement) => {
      // S'assurer que toutes les images dans le clone sont chargées
      const clonedImages = clonedDoc.querySelectorAll('img')
      clonedImages.forEach((img) => {
        if (!img.complete || img.naturalWidth === 0) {
          img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=='
        }
      })
      
      // S'assurer que l'élément cloné a des dimensions et préserve les styles
      if (clonedElement instanceof HTMLElement) {
        // Forcer les dimensions de base
        clonedElement.style.width = '794px'
        clonedElement.style.minHeight = '1123px'
        clonedElement.style.backgroundColor = '#ffffff'
        clonedElement.style.boxSizing = 'border-box'
        clonedElement.style.position = 'relative'
        
        // Appliquer le padding (marges) en utilisant les valeurs de l'original
        clonedElement.style.padding = `${originalPaddingTop}px ${originalPaddingRight}px ${originalPaddingBottom}px ${originalPaddingLeft}px`
        
        // S'assurer que le conteneur utilise flexbox
        clonedElement.style.display = 'flex'
        clonedElement.style.flexDirection = 'column'
        
        logger.debug('[PDF Generator] Clone styles applied:', {
          padding: clonedElement.style.padding,
          width: clonedElement.style.width,
          minHeight: clonedElement.style.minHeight,
          display: clonedElement.style.display,
        })
        
        // S'assurer que header et footer sont visibles et correctement positionnés
        const clonedHeader = clonedElement.querySelector('.header') as HTMLElement
        const clonedFooter = clonedElement.querySelector('.footer') as HTMLElement
        const clonedContent = clonedElement.querySelector('.content') as HTMLElement
        
        if (clonedHeader) {
          // Le header ne doit être visible que sur la première page si repeatOnAllPages est false
          // Pour l'instant, on le laisse visible pour la première page
          clonedHeader.style.display = 'block'
          clonedHeader.style.visibility = 'visible'
          clonedHeader.style.opacity = '1'
          clonedHeader.style.width = '100%'
          clonedHeader.style.marginBottom = '20px'
          clonedHeader.style.flexShrink = '0'
          clonedHeader.style.position = 'relative'
          clonedHeader.style.zIndex = '1'
          logger.debug('[PDF Generator] Header cloné activé:', {
            display: clonedHeader.style.display,
            visibility: clonedHeader.style.visibility,
            innerHTML: clonedHeader.innerHTML.substring(0, 100),
            offsetHeight: clonedHeader.offsetHeight,
          })
        } else {
          logger.warn('[PDF Generator] Header non trouvé dans le clone')
        }
        
        // Masquer le footer dans le clone principal car on l'ajoutera séparément sur chaque page
        if (clonedFooter) {
          clonedFooter.style.display = 'none'
          logger.debug('[PDF Generator] Footer masqué dans le clone principal (sera ajouté séparément)')
        }
        
        if (clonedContent) {
          clonedContent.style.flex = '1'
          clonedContent.style.width = '100%'
          clonedContent.style.overflow = 'visible'
        }
      }
    },
  })

  // Vérifier que le canvas est valide
  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error(`Le canvas généré est invalide (${canvas?.width || 0}x${canvas?.height || 0})`)
  }

  // Convertir en data URL pour la première page (avec header)
  let imgDataFirstPage: string
  try {
    imgDataFirstPage = canvas.toDataURL('image/png', 0.95)
    if (!imgDataFirstPage || imgDataFirstPage.length < 100) {
      throw new Error('Data URL invalide')
    }
  } catch (error) {
    logger.error('Erreur lors de la conversion du canvas en data URL:', error)
    imgDataFirstPage = canvas.toDataURL('image/jpeg', 0.95)
  }

  // Si le header ne doit pas être répété, créer une version sans header pour les pages suivantes
  let imgDataOtherPages: string | null = null
  if (headerElement && !headerRepeatOnAllPages) {
    // Masquer temporairement le header pour capturer le contenu sans header
    const originalHeaderDisplay = headerElement.style.display
    headerElement.style.display = 'none'
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100)) // Attendre que le style soit appliqué
      const canvasWithoutHeader = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: false,
        imageTimeout: 15000,
        width: elementWidth,
        height: elementHeight,
        windowWidth: elementWidth,
        windowHeight: elementHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc, clonedElement) => {
          // Masquer le header dans le clone aussi
          const clonedHeader = clonedElement.querySelector('.header') as HTMLElement
          if (clonedHeader) {
            clonedHeader.style.display = 'none'
          }
          const clonedFooter = clonedElement.querySelector('.footer') as HTMLElement
          if (clonedFooter) {
            clonedFooter.style.display = 'none'
          }
        },
      })
      
      imgDataOtherPages = canvasWithoutHeader.toDataURL('image/png', 0.95)
      logger.debug('[PDF Generator] Canvas sans header créé pour les pages suivantes')
    } catch (error) {
      logger.warn('[PDF Generator] Erreur lors de la création du canvas sans header', { error })
      // Utiliser la même image si l'erreur survient
      imgDataOtherPages = imgDataFirstPage
    } finally {
      // Restaurer l'affichage du header
      headerElement.style.display = originalHeaderDisplay
    }
  } else {
    // Si le header doit être répété ou s'il n'y a pas de header, utiliser la même image
    imgDataOtherPages = imgDataFirstPage
  }

  const pdf = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: options?.format || 'a4',
    compress: true,
  })

  const imgWidth = pdf.internal.pageSize.getWidth()
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const pageHeight = pdf.internal.pageSize.getHeight()
  const footerHeightMm = footerHeight / 3.78 // Convertir pixels en mm
  const marginBottomMm = originalPaddingBottom / 3.78 // Convertir la marge en mm

  let heightLeft = imgHeight
  let position = 0
  let pageNumber = 1
  const totalPages = Math.ceil(imgHeight / pageHeight)

  // Fonction pour ajouter le footer sur une page
  const addFooterToPage = (page: any, pageNum: number, totalPages: number) => {
    if (footerCanvas) {
      try {
        const footerImgData = footerCanvas.toDataURL('image/png', 0.95)
        const footerImgWidth = imgWidth
        const footerImgHeight = (footerCanvas.height * footerImgWidth) / footerCanvas.width
        const footerY = pageHeight - footerImgHeight - marginBottomMm
        
        // Remplacer les variables de pagination dans le footer si nécessaire
        // (cela nécessiterait de recapturer le footer avec les bonnes valeurs, mais pour l'instant on garde simple)
        
        page.addImage(footerImgData, 'PNG', 0, footerY, footerImgWidth, footerImgHeight, undefined, 'FAST')
        logger.debug(`[PDF Generator] Footer ajouté sur la page ${pageNum}/${totalPages} à ${footerY}mm du bas`)
      } catch (error) {
        logger.warn('[PDF Generator] Erreur lors de l\'ajout du footer', { error })
      }
    }
  }

  // Ajouter la première page (avec header si présent)
  const imgDataToUseFirst = imgDataFirstPage
  try {
    pdf.addImage(imgDataToUseFirst, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
    addFooterToPage(pdf, pageNumber, totalPages)
  } catch (error) {
    logger.error('Erreur lors de l\'ajout de l\'image au PDF:', error)
    if (imgDataToUseFirst.startsWith('data:image/png')) {
      const jpegData = canvas.toDataURL('image/jpeg', 0.95)
      pdf.addImage(jpegData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      addFooterToPage(pdf, pageNumber, totalPages)
    } else {
      throw error
    }
  }

  heightLeft -= pageHeight
  pageNumber++

  // Ajouter les pages supplémentaires si nécessaire
  const imgDataToUseOther = imgDataOtherPages || imgDataFirstPage
  while (heightLeft >= 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    
    // Pour les pages suivantes, utiliser l'image sans header si disponible
    try {
      pdf.addImage(imgDataToUseOther, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      addFooterToPage(pdf, pageNumber, totalPages)
    } catch (error) {
      if (imgDataToUseOther.startsWith('data:image/png')) {
        const jpegData = imgDataToUseOther.replace('data:image/png', 'data:image/jpeg')
        pdf.addImage(jpegData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
        addFooterToPage(pdf, pageNumber, totalPages)
      }
    }
    heightLeft -= pageHeight
    pageNumber++
  }

  return pdf.output('blob')
}

/**
 * Crée un fichier ZIP contenant plusieurs PDFs
 */
export async function createZipFromPDFs(
  files: Array<{ name: string; blob: Blob }>,
  zipFilename: string = 'documents.zip'
): Promise<void> {
  const zip = new JSZip()

  // Ajouter chaque PDF au ZIP
  for (const file of files) {
    zip.file(file.name, file.blob)
  }

  // Générer le ZIP et le télécharger
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = zipFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

