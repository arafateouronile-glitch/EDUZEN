/**
 * Génération de PDF avec signatures électroniques intégrées
 */

import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { processSignatures } from './signature-processor'
import { logger } from '@/lib/utils/logger'

export interface PDFSignatureOptions {
  documentId?: string
  variables?: Record<string, any>
  filename?: string
  orientation?: 'portrait' | 'landscape'
  format?: 'a4' | 'letter' | [number, number]
  includeMetadata?: boolean
  addWatermark?: boolean
  watermarkText?: string
}

export interface PDFGenerationResult {
  blob: Blob
  filename: string
  pageCount: number
  hasSignatures: boolean
}

/**
 * Génère un PDF avec les signatures électroniques intégrées
 *
 * @param htmlContent - Contenu HTML du document (peut contenir des balises <signature-field>)
 * @param options - Options de génération du PDF
 * @returns Résultat de la génération avec le blob PDF
 */
export async function generatePDFWithSignatures(
  htmlContent: string,
  options: PDFSignatureOptions = {}
): Promise<PDFGenerationResult> {
  try {
    const {
      documentId,
      variables = {},
      filename = 'document.pdf',
      orientation = 'portrait',
      format = 'a4',
      includeMetadata = true,
      addWatermark = false,
      watermarkText = 'Copie certifiée conforme',
    } = options

    // Étape 1: Traiter les signatures dans le HTML
    logger.info('Traitement des signatures dans le document', { documentId })
    const processedHtml = await processSignatures(htmlContent, variables, documentId)

    // Étape 2: Créer un élément temporaire pour le rendu
    const tempContainer = document.createElement('div')
    tempContainer.id = `pdf-temp-${Date.now()}`
    tempContainer.style.position = 'absolute'
    tempContainer.style.left = '-9999px'
    tempContainer.style.top = '0'
    tempContainer.style.width = '210mm' // A4 width
    tempContainer.style.padding = '20mm'
    tempContainer.style.backgroundColor = '#ffffff'
    tempContainer.innerHTML = processedHtml

    document.body.appendChild(tempContainer)

    try {
      // Attendre le rendu et le chargement des images
      await waitForImagesToLoad(tempContainer)
      await new Promise(resolve => setTimeout(resolve, 300))

      // Étape 3: Convertir en canvas
      logger.info('Conversion du HTML en canvas')
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 15000,
      })

      // Étape 4: Créer le PDF
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format,
        compress: true,
      })

      // Ajouter les métadonnées
      if (includeMetadata) {
        pdf.setProperties({
          title: filename.replace('.pdf', ''),
          subject: 'Document avec signatures électroniques',
          author: 'EDUZEN Platform',
          creator: 'EDUZEN Document Generator',
          keywords: 'signature électronique, document officiel',
        })
      }

      // Calculer les dimensions
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * pageWidth) / canvas.width

      // Convertir le canvas en image
      const imgData = canvas.toDataURL('image/jpeg', 0.95)

      let heightLeft = imgHeight
      let position = 0
      let pageCount = 1

      // Ajouter la première page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
      heightLeft -= pageHeight

      // Ajouter les pages supplémentaires si nécessaire
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pageCount++
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST')
        heightLeft -= pageHeight
      }

      // Ajouter un filigrane si demandé
      if (addWatermark) {
        addWatermarkToPDF(pdf, watermarkText, pageCount)
      }

      // Vérifier si le document contient des signatures
      const hasSignatures = processedHtml.includes('signature-field signed') ||
                           processedHtml.includes('signature-field filled-from-variable')

      // Étape 5: Générer le blob
      const blob = pdf.output('blob')

      logger.info('PDF généré avec succès', {
        documentId,
        pageCount,
        hasSignatures,
        fileSize: blob.size,
      })

      return {
        blob,
        filename,
        pageCount,
        hasSignatures,
      }
    } finally {
      // Nettoyer l'élément temporaire
      document.body.removeChild(tempContainer)
    }
  } catch (error) {
    logger.error('Erreur lors de la génération du PDF', error instanceof Error ? error : new Error(String(error)), {
      documentId: options.documentId,
    })
    throw error
  }
}

/**
 * Ajoute un filigrane sur toutes les pages du PDF
 */
function addWatermarkToPDF(pdf: jsPDF, text: string, pageCount: number): void {
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i)
    pdf.saveGraphicsState()

    // Configurer le texte du filigrane
    pdf.setTextColor(200, 200, 200)
    pdf.setFontSize(50)
    pdf.setFont('helvetica', 'bold')

    // Calculer la position centrale avec rotation
    const textWidth = pdf.getTextWidth(text)
    const x = pageWidth / 2
    const y = pageHeight / 2

    // Appliquer une rotation de 45 degrés
    pdf.text(text, x, y, {
      align: 'center',
      angle: 45,
      renderingMode: 'stroke',
      lineHeightFactor: 1.5,
    })

    pdf.restoreGraphicsState()
  }
}

/**
 * Attend que toutes les images soient chargées
 */
async function waitForImagesToLoad(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll('img')

  const promises = Array.from(images).map(img => {
    if (img.complete && img.naturalWidth > 0) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve() // Continuer même si l'image échoue

      // Timeout après 10 secondes
      setTimeout(() => resolve(), 10000)
    })
  })

  await Promise.all(promises)
}

/**
 * Télécharge le PDF généré
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Génère et télécharge directement un PDF avec signatures
 */
export async function generateAndDownloadPDF(
  htmlContent: string,
  options: PDFSignatureOptions = {}
): Promise<PDFGenerationResult> {
  const result = await generatePDFWithSignatures(htmlContent, options)
  downloadPDF(result.blob, result.filename)
  return result
}

/**
 * Convertit un blob PDF en base64 pour stockage
 */
export async function pdfBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Upload un PDF avec signatures vers le stockage
 */
export async function uploadSignedPDF(
  blob: Blob,
  documentId: string,
  organizationId: string
): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('file', blob, `document-signed-${documentId}.pdf`)
    formData.append('documentId', documentId)
    formData.append('organizationId', organizationId)
    formData.append('type', 'signed-document')

    const response = await fetch('/api/documents/upload-signed', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.url
  } catch (error) {
    logger.error('Erreur lors de l\'upload du PDF signé', error instanceof Error ? error : new Error(String(error)), {
      documentId,
      organizationId,
    })
    throw error
  }
}
