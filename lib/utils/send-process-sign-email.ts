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

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour ${params.recipientName},</p>

            <p style="margin:0 0 20px;">Un document vous attend : <strong>${params.documentTitle}</strong>${params.positionLabel ? ` (${params.positionLabel})` : ''}.</p>

            ${params.message ? `<p style="margin:0 0 20px;">${params.message}</p>` : ''}

            <p style="margin:0 0 20px;">
              <a href="${params.signUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:15px;text-decoration:none;padding:12px 24px;border-radius:4px;">Signer le document</a>
            </p>

            <p style="margin:0 0 40px;">Cordialement,</p>

            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.6;">
              L'équipe EduZen
            </p>

          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: `Signature requise : ${params.documentTitle}`,
      html,
    })
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
