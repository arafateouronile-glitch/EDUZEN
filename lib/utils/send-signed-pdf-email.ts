/**
 * Envoi de la convention signée par mail au client et à l'admin (Resend).
 * Appelé depuis /api/sign/submit après scellement PDF.
 */

import { logger } from '@/lib/utils/logger'
import { EMAIL_CONFIG } from '@/lib/config/app-config'

const APP_NAME = 'EDUZEN'
const FROM_EMAIL = EMAIL_CONFIG.getFromEmail()

export interface SendSignedPdfParams {
  recipientEmail: string
  recipientName: string
  adminEmail: string
  documentTitle: string
  signedPdfBuffer: Uint8Array
  signedFilename: string
}

/**
 * Envoie la copie signée au client et à l'admin via Resend.
 */
export async function sendSignedPdfEmails(params: SendSignedPdfParams): Promise<void> {
  const { RESEND_API_KEY } = process.env
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY manquant : envoi signé ignoré')
    return
  }

  const content = Buffer.from(params.signedPdfBuffer)
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #274472 0%, #1e3a5f 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0;">Document signé</h1>
  </div>
  <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Bonjour,</p>
    <p>Veuillez trouver ci-joint votre copie du document signé : <strong>${params.documentTitle}</strong>.</p>
    <p>Ce document a été scellé électroniquement et constitue une preuve conforme aux exigences en vigueur.</p>
  </div>
  <p style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 14px;">${APP_NAME} – Plateforme de gestion de formation</p>
</body></html>`

  const { Resend } = await import('resend')
  const resend = new Resend(RESEND_API_KEY)

  const toSend = [
    { to: params.recipientEmail, name: params.recipientName },
    ...(params.adminEmail && params.adminEmail !== params.recipientEmail
      ? [{ to: params.adminEmail, name: 'Administrateur' }]
      : []),
  ]

  await Promise.allSettled(
    toSend.map(async ({ to }) => {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject: `Votre document signé : ${params.documentTitle}`,
        html,
        attachments: [{ filename: params.signedFilename, content }],
      } as any)
      if (error) logger.error('Envoi signé PDF:', { to, error })
    })
  )
}

/**
 * Envoie le PDF final à plusieurs destinataires (workflow cascade).
 * Un email par destinataire + un à l'admin si fourni.
 */
export async function sendSignedPdfToRecipients(params: {
  recipients: Array<{ email: string; name: string }>
  adminEmail?: string
  documentTitle: string
  signedPdfBuffer: Uint8Array
  signedFilename: string
}): Promise<void> {
  const { RESEND_API_KEY } = process.env
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY manquant : envoi signé ignoré')
    return
  }

  const content = Buffer.from(params.signedPdfBuffer)
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #274472 0%, #1e3a5f 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0;">Convention signée</h1>
  </div>
  <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Bonjour,</p>
    <p>La convention <strong>${params.documentTitle}</strong> a été signée par toutes les parties. Veuillez trouver ci-joint votre copie.</p>
  </div>
  <p style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 14px;">EDUZEN – Plateforme de gestion de formation</p>
</body></html>`

  const { Resend } = await import('resend')
  const resend = new Resend(RESEND_API_KEY)
  const seen = new Set<string>()
  const toSend = [
    ...params.recipients.map((r) => ({ to: r.email, name: r.name })),
    ...(params.adminEmail && !params.recipients.some((r) => r.email === params.adminEmail)
      ? [{ to: params.adminEmail, name: 'Administrateur' }]
      : []),
  ].filter(({ to }) => {
    if (seen.has(to)) return false
    seen.add(to)
    return true
  })

  await Promise.allSettled(
    toSend.map(async ({ to, name }) => {
      const { error } = await resend.emails.send({
        from: EMAIL_CONFIG.getFromEmail(),
        to,
        subject: `Convention signée : ${params.documentTitle}`,
        html,
        attachments: [{ filename: params.signedFilename, content }],
      } as any)
      if (error) logger.error('Envoi signé PDF (cascade):', { to, error })
    })
  )
}
