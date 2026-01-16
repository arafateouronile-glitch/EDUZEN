/**
 * Utilitaire pour générer des QR codes
 * Utilise la bibliothèque qrcode côté serveur
 */

import QRCode from 'qrcode'

export interface QRCodeOptions {
  size?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  color?: {
    dark?: string
    light?: string
  }
}

/**
 * Génère un QR code en base64
 */
export async function generateQRCodeBase64(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  try {
    const {
      size = 200,
      margin = 1,
      errorCorrectionLevel = 'M',
      color = { dark: '#000000', light: '#FFFFFF' },
    } = options

    const qrCodeDataUrl = await QRCode.toDataURL(data, {
      width: size,
      margin,
      errorCorrectionLevel,
      color,
    })

    return qrCodeDataUrl
  } catch (error) {
    console.error('Erreur lors de la génération du QR code:', error)
    throw new Error('Impossible de générer le QR code')
  }
}

/**
 * Génère un QR code SVG
 */
export async function generateQRCodeSVG(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  try {
    const {
      size = 200,
      margin = 1,
      errorCorrectionLevel = 'M',
      color = { dark: '#000000', light: '#FFFFFF' },
    } = options

    const qrCodeSVG = await QRCode.toString(data, {
      type: 'svg',
      width: size,
      margin,
      errorCorrectionLevel,
      color,
    })

    return qrCodeSVG
  } catch (error) {
    console.error('Erreur lors de la génération du QR code SVG:', error)
    throw new Error('Impossible de générer le QR code SVG')
  }
}

/**
 * Remplace les variables dans les données du QR code
 */
export function replaceVariablesInQRData(
  data: string,
  variables: Record<string, string | number>
): string {
  let result = data
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g')
    result = result.replace(regex, String(value))
  })
  return result
}

