/**
 * Utilitaires pour générer des QR codes et codes-barres dynamiques
 * Note: Pour le serveur, on utilise des services en ligne ou Puppeteer
 * Pour le client, on peut utiliser les bibliothèques locales
 */

import { logger } from '@/lib/utils/logger'

/**
 * Génère un QR code en base64 à partir de données (côté serveur)
 * Utilise un service en ligne pour la génération
 */
export async function generateQRCodeBase64(
  data: string,
  size: number = 200
): Promise<string> {
  try {
    // Pour le serveur, utiliser un service en ligne
    // Pour le client, on pourrait utiliser la bibliothèque qrcode
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png`
    
    // En production, on pourrait télécharger l'image et la convertir en base64
    // Pour l'instant, on retourne l'URL qui sera utilisée directement
    return qrCodeUrl
  } catch (error) {
    logger.error('Erreur lors de la génération du QR code:', error)
    throw new Error('Impossible de générer le QR code')
  }
}

/**
 * Génère un code-barres en base64 à partir de données (côté serveur)
 * Utilise un service en ligne pour la génération
 */
export async function generateBarcodeBase64(
  data: string,
  type: 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' = 'CODE128',
  width: number = 200,
  height: number = 50
): Promise<string> {
  try {
    // Pour le serveur, utiliser un service en ligne
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(data)}&code=${type}&dpi=96&dataseparator=&width=${width}&height=${height}`
    return barcodeUrl
  } catch (error) {
    logger.error('Erreur lors de la génération du code-barres:', error)
    throw new Error('Impossible de générer le code-barres')
  }
}

/**
 * Remplace les variables dans les QR codes et codes-barres dynamiques
 * Cette fonction doit être appelée après replaceVariablesInHTML
 */
export function processDynamicQRBarcodes(
  html: string,
  variables: Record<string, any>
): string {
  let processedHTML = html
  
  // Remplacer les variables dans les attributs data-qr-data et data-barcode-data
  // et mettre à jour les URLs des images
  const qrCodeRegex = /<img[^>]*class="qr-code-dynamic"[^>]*data-qr-data="([^"]*)"[^>]*>/g
  const barcodeRegex = /<img[^>]*class="barcode-dynamic"[^>]*data-barcode-data="([^"]*)"[^>]*data-barcode-type="([^"]*)"[^>]*>/g
  
  // Traiter les QR codes
  processedHTML = processedHTML.replace(qrCodeRegex, (match, originalData) => {
    // Remplacer les variables dans les données
    let processedData = originalData
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      processedData = processedData.replace(regex, value ? String(value) : '')
    })
    
    // Mettre à jour l'URL du QR code avec les données traitées
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(processedData)}`
    return match
      .replace(/src="[^"]*"/, `src="${qrCodeUrl}"`)
      .replace(/data-qr-data="[^"]*"/, `data-qr-data="${processedData}"`)
  })
  
  // Traiter les codes-barres
  processedHTML = processedHTML.replace(barcodeRegex, (match, originalData, barcodeType) => {
    const type = (barcodeType || 'CODE128') as 'CODE128' | 'CODE39' | 'EAN13' | 'UPC'
    
    // Remplacer les variables dans les données
    let processedData = originalData
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g')
      processedData = processedData.replace(regex, value ? String(value) : '')
    })
    
    // Mettre à jour l'URL du code-barres avec les données traitées
    const barcodeUrl = `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(processedData)}&code=${type}&dpi=96&dataseparator=`
    return match
      .replace(/src="[^"]*"/, `src="${barcodeUrl}"`)
      .replace(/data-barcode-data="[^"]*"/, `data-barcode-data="${processedData}"`)
  })
  
  return processedHTML
}
