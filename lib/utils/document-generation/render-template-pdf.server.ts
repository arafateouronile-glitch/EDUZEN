/**
 * Génère le PDF d'un modèle de document côté serveur, sans navigateur ni
 * cookies (cron, routes service role) : generateHTML → Gotenberg, repli
 * Puppeteer hors Vercel. Mêmes réglages que /api/documents/generate-pdf.
 */

import type { DocumentTemplate, DocumentVariables } from '@/lib/types/document-templates'
import { generateHTML } from '@/lib/utils/document-generation/html-generator'
import { isGotenbergConfigured, htmlToPdf } from '@/lib/services/gotenberg.service'
import { logger } from '@/lib/utils/logger'

const mmToInch = (mm: number) => `${(mm * 0.03937).toFixed(4)}`

export async function renderTemplatePdf(template: DocumentTemplate, variables: DocumentVariables): Promise<Buffer> {
  const { html, margins } = await generateHTML(template, variables)
  if (!html?.trim()) throw new Error('HTML du document vide')

  if (isGotenbergConfigured()) {
    try {
      const buf = await htmlToPdf(html, {
        format: (template as { page_size?: string }).page_size === 'Letter' ? 'Letter' : 'A4',
        marginTop: mmToInch(margins.top),
        marginBottom: mmToInch(margins.bottom),
        marginLeft: mmToInch(margins.left),
        marginRight: mmToInch(margins.right),
      })
      if (buf?.length) return Buffer.from(buf)
      throw new Error('Gotenberg a retourné un PDF vide')
    } catch (error) {
      logger.warn('[renderTemplatePdf] Gotenberg échoué, bascule vers Puppeteer', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (process.env.VERCEL === '1') {
    throw new Error('Génération PDF indisponible : Gotenberg n\'est pas configuré (GOTENBERG_URL)')
  }

  const { createPage } = await import('@/lib/utils/puppeteer-pool')
  const page = await createPage()
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: `${margins.top}mm`, right: `${margins.right}mm`, bottom: `${margins.bottom}mm`, left: `${margins.left}mm` },
      preferCSSPageSize: true,
    })
    return Buffer.from(pdf)
  } finally {
    await page.close().catch(() => undefined)
  }
}
