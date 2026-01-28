/**
 * Envoi du mail "À signer" pour le workflow en cascade (process).
 * Lien /sign/[token] pour le signataire courant.
 */

import { logger } from '@/lib/utils/logger'
import { EMAIL_CONFIG } from '@/lib/config/app-config'

const APP_NAME = 'EDUZEN'
const FROM_EMAIL = EMAIL_CONFIG.getFromEmail()

export interface SendProcessSignEmailParams {
  to: string
  recipientName: string
  documentTitle: string
  signUrl: string
  positionLabel?: string
  message?: string
}

export async function sendProcessSignEmail(params: SendProcessSignEmailParams): Promise<boolean> {
  const { RESEND_API_KEY } = process.env
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY manquant : envoi process sign ignoré')
    return false
  }

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #274472 0%, #1e3a5f 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="margin: 0;">Signature requise</h1>
  </div>
  <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 8px 8px;">
    <p>Bonjour ${params.recipientName},</p>
    <p>Un document vous attend : <strong>${params.documentTitle}</strong>${params.positionLabel ? ` (${params.positionLabel})` : ''}.</p>
    ${params.message ? `<p>${params.message}</p>` : ''}
    <p style="text-align: center; margin: 24px 0;">
      <a href="${params.signUrl}" style="display: inline-block; background: #34B9EE; color: #0f2847; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Signer le document</a>
    </p>
  </div>
  <p style="text-align: center; margin-top: 24px; color: #9ca3af; font-size: 14px;">${APP_NAME} – Plateforme de gestion de formation</p>
</body></html>`

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Signature requise : ${params.documentTitle}`,
      html,
    } as any)
    if (error) {
      logger.error('Envoi process sign:', { to: params.to, error })
      return false
    }
    return true
  } catch (e) {
    logger.error('Envoi process sign:', e)
    return false
  }
}
