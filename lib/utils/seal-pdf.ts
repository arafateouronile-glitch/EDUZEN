/**
 * Scellement PDF : fusion de la signature sur le document.
 * Support des zones relatives (%) (Template Picker) ou fallback position fixe.
 * Hash SHA-256 du PDF final.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createHash } from 'crypto'
import type { SignZone } from '@/lib/types/sign-zones'

export interface SealPdfOptions {
  signerName: string
  signerEmail: string
  signedAt: string
  ip?: string
  /** Zones définies par le Template Picker (coord. %). Si fourni, placement dans la zone sig_stagiaire (ou première). */
  zones?: SignZone[]
  /** Id de la zone cible (ex. sig_stagiaire). Par défaut : sig_stagiaire ou première zone. */
  signZoneId?: string
}

const FALLBACK_MARGIN = 40
const FALLBACK_SIG_W = 120
const FALLBACK_SIG_H = 48
const FONT_SIZE = 9
const LINE_HEIGHT = 12

/**
 * Trouve la zone de signature cible.
 */
function resolveZone(zones: SignZone[], signZoneId?: string): SignZone | null {
  if (!zones.length) return null
  const byId = signZoneId && zones.find((z) => z.id === signZoneId)
  if (byId) return byId
  const stagiaire = zones.find((z) => z.id === 'sig_stagiaire')
  return stagiaire ?? zones[0] ?? null
}

/**
 * Tamponne la signature (image base64) sur le PDF.
 * - Si zones fournies : placement dans la zone cible (x, y, w, h en %).
 *   PDF-lib : origine en bas à gauche → y_pdf = (1 - zone.y - zone.h) * height.
 * - Sinon : dernière page, en bas à gauche (comportement legacy).
 * Retourne le buffer scellé et son hash SHA-256.
 */
export async function sealPdf(
  originalPdfBuffer: ArrayBuffer | Uint8Array,
  signatureDataUrl: string,
  options: SealPdfOptions
): Promise<{ sealedPdf: Uint8Array; integrityHash: string }> {
  const pdfDoc = await PDFDocument.load(
    originalPdfBuffer instanceof Uint8Array ? originalPdfBuffer : new Uint8Array(originalPdfBuffer)
  )
  const pages = pdfDoc.getPages()
  if (pages.length === 0) throw new Error('PDF sans page')

  const pngInput =
    signatureDataUrl.startsWith('data:') && signatureDataUrl.includes('base64,')
      ? signatureDataUrl
      : `data:image/png;base64,${signatureDataUrl}`
  const img = await pdfDoc.embedPng(pngInput)
  // Utiliser la police standard Helvetica de pdf-lib
  const font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica)

  const zone = resolveZone(options.zones ?? [], options.signZoneId)

  if (zone) {
    const targetPage = pages[zone.page - 1]
    if (!targetPage) throw new Error(`Page ${zone.page} introuvable`)
    const { width, height } = targetPage.getSize()

    const x = zone.x * width
    const yPdf = (1 - zone.y - zone.h) * height
    const w = zone.w * width
    const h = zone.h * height

    const scaled = img.scaleToFit(w, h)
    const dw = Math.min(scaled.width, w)
    const dh = Math.min(scaled.height, h)
    const dx = x + (w - dw) / 2
    const dy = yPdf + (h - dh) / 2

    targetPage.drawImage(img, {
      x: dx,
      y: dy,
      width: dw,
      height: dh,
    })

    const hasSpaceForText = h > dh + LINE_HEIGHT * 2
    if (hasSpaceForText && options.signerName) {
      const textY = dy - 4
      const lines: string[] = [
        `Signé par : ${options.signerName}`,
        options.signedAt ? `Date : ${options.signedAt}` : null,
      ].filter(Boolean) as string[]
      lines.slice(0, 2).forEach((line, i) => {
        targetPage.drawText(line, {
          x,
          y: textY - i * LINE_HEIGHT,
          size: FONT_SIZE - 1,
          font,
          color: rgb(0.25, 0.25, 0.25),
        })
      })
    }
  } else {
    const lastPage = pages[pages.length - 1]
    const scaled = img.scaleToFit(FALLBACK_SIG_W, FALLBACK_SIG_H)
    const sigX = FALLBACK_MARGIN
    const sigY = FALLBACK_MARGIN

    lastPage.drawImage(img, {
      x: sigX,
      y: sigY,
      width: scaled.width,
      height: scaled.height,
    })

    const textY = sigY + scaled.height + 8
    const lines: string[] = [
      `Signé par : ${options.signerName}`,
      options.signerEmail ? `Email : ${options.signerEmail}` : null,
      `Date : ${options.signedAt}`,
      options.ip ? `IP : ${options.ip}` : null,
    ].filter(Boolean) as string[]

    lines.forEach((line, i) => {
      lastPage.drawText(line, {
        x: FALLBACK_MARGIN,
        y: textY - i * LINE_HEIGHT,
        size: FONT_SIZE,
        font,
        color: rgb(0.2, 0.2, 0.2),
      })
    })
  }

  const sealedPdf = await pdfDoc.save()
  const integrityHash = createHash('sha256').update(sealedPdf).digest('hex')
  return { sealedPdf, integrityHash }
}
