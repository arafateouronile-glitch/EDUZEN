/**
 * Scellement PDF : fusion de la signature sur le document.
 * Support des zones relatives (%) (Template Picker) ou zone par défaut « signature apprenant » sur la dernière page.
 * Hash SHA-256 du PDF final.
 * Les champs texte (nom, email, IP, date) sont sanitizés pour éviter XSS/encodage dans le PDF.
 */

import { PDFDocument, rgb } from 'pdf-lib'
import { createHash } from 'crypto'
import type { SignZone } from '@/lib/types/sign-zones'
import { sanitizeForPDF } from '@/lib/utils/pdf-sanitizer'

/** Limite de longueur pour les champs affichés sur le PDF (éviter débordement / abus). */
const MAX_NAME_LEN = 200
const MAX_EMAIL_LEN = 254
const MAX_IP_LEN = 50
const MAX_DATE_LEN = 50

/**
 * Sanitize un champ texte pour affichage dans le PDF (normalisation Unicode, caractères sûrs, troncature).
 */
function sanitizePdfField(value: string | null | undefined, maxLen: number): string {
  if (value == null || typeof value !== 'string') return ''
  return sanitizeForPDF(value, maxLen)
}

export interface SealPdfOptions {
  signerName: string
  signerEmail: string
  signedAt: string
  ip?: string
  /** Zones définies par le Template Picker (coord. %). Si fourni, placement dans la zone sig_stagiaire (ou première). */
  zones?: SignZone[]
  /** Id de la zone cible (ex. sig_stagiaire). Par défaut : sig_stagiaire ou première zone. */
  signZoneId?: string
  /** Image (data URL ou base64 PNG/JPEG) du cachet/signature de l'organisme, placée dans la zone sig_of si présente. */
  orgSignatureImageDataUrl?: string
}

const FONT_SIZE = 9
const LINE_HEIGHT = 12

/** Zone par défaut « signature apprenant / client » sur la dernière page (dans le contenu, pas au bord). */
const DEFAULT_SIG_STAGIAIRE_ZONE: SignZone = {
  id: 'sig_stagiaire',
  page: 1,
  x: 0.12,
  y: 0.62,
  w: 0.36,
  h: 0.2,
  label: 'Signature apprenant / client',
}

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
 * Retourne une zone par défaut pour la signature apprenant sur la dernière page
 * (dans le contenu de la page, section signature, pas au bas de page).
 */
function defaultStagiaireZoneForLastPage(lastPageIndex: number): SignZone {
  return { ...DEFAULT_SIG_STAGIAIRE_ZONE, page: lastPageIndex + 1 }
}

/**
 * Trouve la zone sig_of (signature organisme de formation).
 */
function resolveOrgZone(zones: SignZone[]): SignZone | null {
  if (!zones.length) return null
  const ofZone = zones.find((z) => z.id === 'sig_of')
  return ofZone ?? null
}

/** Zone par défaut « cachet / signature OF » (même hauteur que sig_stagiaire, à droite). */
function defaultOrgZoneForPage(pageNumber: number): SignZone {
  return {
    id: 'sig_of',
    page: pageNumber,
    x: 0.52,
    y: 0.62,
    w: 0.36,
    h: 0.2,
    label: 'Cachet et signature OF',
  }
}

/**
 * Embed une image PNG ou JPEG (data URL / base64) pour la signature OF.
 */
async function embedOrgImage(pdfDoc: PDFDocument, dataUrl: string) {
  const normalized =
    dataUrl.startsWith('data:') && dataUrl.includes('base64,')
      ? dataUrl
      : `data:image/png;base64,${dataUrl}`
  const isJpeg = normalized.includes('image/jpeg') || normalized.includes('image/jpg')
  if (isJpeg) {
    return pdfDoc.embedJpg(normalized)
  }
  return pdfDoc.embedPng(normalized)
}

/**
 * Tamponne la signature (image base64) sur le PDF.
 * - Si zones fournies (template ou document) : placement dans la zone sig_stagiaire (ou première zone).
 * - Sinon : zone par défaut « signature apprenant / client » sur la dernière page (dans le contenu, pas au bord).
 * Retourne le buffer scellé et son hash SHA-256.
 */
export async function sealPdf(
  originalPdfBuffer: ArrayBuffer | Uint8Array,
  signatureDataUrl: string,
  options: SealPdfOptions
): Promise<{ sealedPdf: Uint8Array; integrityHash: string }> {
  // Sanitizer les champs affichés dans le PDF pour éviter XSS et problèmes d'encodage
  const safeOptions: SealPdfOptions = {
    ...options,
    signerName: sanitizePdfField(options.signerName, MAX_NAME_LEN) || 'Signataire',
    signerEmail: sanitizePdfField(options.signerEmail, MAX_EMAIL_LEN),
    signedAt: sanitizePdfField(options.signedAt, MAX_DATE_LEN),
    ip: options.ip ? sanitizePdfField(options.ip, MAX_IP_LEN) : undefined,
  }

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
  const font = await pdfDoc.embedStandardFont('Helvetica' as any)

  const resolvedZone = resolveZone(options.zones ?? [], options.signZoneId)
  const lastPageNum = pages.length
  const zone = resolvedZone ?? defaultStagiaireZoneForLastPage(lastPageNum - 1)

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
    if (hasSpaceForText && safeOptions.signerName) {
      const textY = dy - 4
      const lines: string[] = [
        `Signé par : ${safeOptions.signerName}`,
        safeOptions.signedAt ? `Date : ${safeOptions.signedAt}` : null,
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

    // Signature / cachet de l'organisme de formation : zone sig_of ou zone par défaut (même page, à droite)
    if (options.orgSignatureImageDataUrl?.trim()) {
      let ofZone = resolveOrgZone(options.zones ?? [])
      if (!ofZone) {
        ofZone = defaultOrgZoneForPage(zone.page)
      }
      try {
        const orgImg = await embedOrgImage(pdfDoc, options.orgSignatureImageDataUrl.trim())
        const ofPage = pages[ofZone.page - 1]
        if (ofPage) {
          const { width: ofW, height: ofH } = ofPage.getSize()
          const ofX = ofZone.x * ofW
          const ofYPdf = (1 - ofZone.y - ofZone.h) * ofH
          const ofWw = ofZone.w * ofW
          const ofHh = ofZone.h * ofH
          const ofScaled = orgImg.scaleToFit(ofWw, ofHh)
          const ofDw = Math.min(ofScaled.width, ofWw)
          const ofDh = Math.min(ofScaled.height, ofHh)
          ofPage.drawImage(orgImg, {
            x: ofX + (ofWw - ofDw) / 2,
            y: ofYPdf + (ofHh - ofDh) / 2,
            width: ofDw,
            height: ofDh,
          })
        }
      } catch {
        // Ignorer si l'image OF est invalide (format non supporté, etc.)
      }
    }
  }

  const sealedPdf = await pdfDoc.save()
  const integrityHash = createHash('sha256').update(sealedPdf).digest('hex')
  return { sealedPdf, integrityHash }
}
