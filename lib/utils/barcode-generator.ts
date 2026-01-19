/**
 * Utilitaire pour générer des codes-barres
 * Utilise la bibliothèque bwip-js
 */

// @ts-expect-error - Module bwip-js peut ne pas avoir de types
import bwipjs from 'bwip-js'

export type BarcodeType = 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' | 'EAN8' | 'ITF14' | 'MSI' | 'PHARMACODE'

export interface BarcodeOptions {
  width?: number
  height?: number
  scale?: number
  includetext?: boolean
  textxalign?: 'offleft' | 'center' | 'offright'
  textyalign?: 'below' | 'center' | 'above'
  textsize?: number
  textfont?: string
  backgroundcolor?: string
  barcolor?: string
  textcolor?: string
}

/**
 * Génère un code-barres en base64
 */
export async function generateBarcodeBase64(
  data: string,
  type: BarcodeType = 'CODE128',
  options: BarcodeOptions = {}
): Promise<string> {
  try {
    const {
      width = 200,
      height = 50,
      scale = 2,
      includetext = true,
      textxalign = 'center',
      textyalign = 'below',
      textsize = 10,
      backgroundcolor = 'FFFFFF',
      barcolor = '000000',
      textcolor = '000000',
    } = options

    const canvas = document.createElement('canvas')
    
    await bwipjs.toCanvas(canvas, {
      bcid: type.toLowerCase(),
      text: data,
      scale,
      width,
      height,
      includetext,
      textxalign,
      textyalign,
      textsize,
      backgroundcolor,
      barcolor,
      textcolor,
    })

    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Erreur lors de la génération du code-barres:', error)
    throw new Error(`Impossible de générer le code-barres: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}

/**
 * Génère un code-barres SVG
 */
export async function generateBarcodeSVG(
  data: string,
  type: BarcodeType = 'CODE128',
  options: BarcodeOptions = {}
): Promise<string> {
  try {
    const {
      width = 200,
      height = 50,
      scale = 2,
      includetext = true,
      textxalign = 'center',
      textyalign = 'below',
      textsize = 10,
      backgroundcolor = 'FFFFFF',
      barcolor = '000000',
      textcolor = '000000',
    } = options

    const svg = await bwipjs.toSVG({
      bcid: type.toLowerCase(),
      text: data,
      scale,
      width,
      height,
      includetext,
      textxalign,
      textyalign,
      textsize,
      backgroundcolor,
      barcolor,
      textcolor,
    })

    return svg
  } catch (error) {
    console.error('Erreur lors de la génération du code-barres SVG:', error)
    throw new Error(`Impossible de générer le code-barres SVG: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
  }
}

/**
 * Remplace les variables dans les données du code-barres
 */
export function replaceVariablesInBarcodeData(
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

