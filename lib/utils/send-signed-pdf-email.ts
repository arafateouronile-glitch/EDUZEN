/**
 * Envoi de la convention signée par mail au client et à l'admin (Resend).
 * Appelé depuis /api/sign/submit après scellement PDF.
 */

import { logger } from '@/lib/utils/logger'
import { EMAIL_CONFIG } from '@/lib/config/app-config'

const APP_NAME = 'EDUZEN'
const RESEND_SANDBOX_FROM = 'EDUZEN <onboarding@resend.dev>'

function getFromEmail(): string {
  const configured = EMAIL_CONFIG.getFromEmail()
  if (process.env.NODE_ENV === 'development' && configured && !configured.includes('@resend.dev')) {
    return RESEND_SANDBOX_FROM
  }
  return configured
}

function isDomainNotVerifiedError(err: { statusCode?: number; message?: string }): boolean {
  return err?.statusCode === 403 && typeof err?.message === 'string' && err.message.toLowerCase().includes('domain') && err.message.toLowerCase().includes('not verified')
}

export interface SendSignedPdfParams {
  /** Email du signataire (apprenant / client) — reçoit sa copie */
  recipientEmail: string
  recipientName: string
  /** Email de l'OF (admin / secrétaire) — reçoit aussi une copie */
  adminEmail?: string
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
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour,</p>

            <p style="margin:0 0 20px;">Veuillez trouver ci-joint votre copie du document signé : <strong>${params.documentTitle}</strong>.</p>

            <p style="margin:0 0 40px;">Ce document a été scellé électroniquement et constitue une preuve conforme aux exigences en vigueur.</p>

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

  const { Resend } = await import('resend')
  const resend = new Resend(RESEND_API_KEY)

  const seen = new Set<string>()
  const toSend: Array<{ to: string; name: string }> = []
  if (params.recipientEmail?.trim() && !seen.has(params.recipientEmail.trim().toLowerCase())) {
    toSend.push({ to: params.recipientEmail.trim(), name: params.recipientName || 'Signataire' })
    seen.add(params.recipientEmail.trim().toLowerCase())
  }
  if (params.adminEmail?.trim() && !seen.has(params.adminEmail.trim().toLowerCase())) {
    toSend.push({ to: params.adminEmail.trim(), name: 'Administrateur' })
    seen.add(params.adminEmail.trim().toLowerCase())
  }

  if (toSend.length === 0) {
    logger.warn('Aucun destinataire valide pour l\'envoi du document signé (apprenant et OF)')
    return
  }

  const fromEmail = getFromEmail()
  await Promise.allSettled(
    toSend.map(async ({ to, name }) => {
      let { error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject: `Votre document signé : ${params.documentTitle}`,
        html,
        attachments: [{ filename: params.signedFilename, content }],
      })
      if (error && process.env.NODE_ENV === 'development' && isDomainNotVerifiedError(error as { statusCode?: number; message?: string })) {
        logger.warn('Domaine From non vérifié chez Resend, nouvel essai avec onboarding@resend.dev')
        const retry = await resend.emails.send({
          from: RESEND_SANDBOX_FROM,
          to,
          subject: `Votre document signé : ${params.documentTitle}`,
          html,
          attachments: [{ filename: params.signedFilename, content }],
        })
        error = retry.error ?? null
      }
      if (error) logger.error('Envoi signé PDF:', { to, name, error })
    })
  )
}

/**
 * Notification simple (sans PDF) quand le scellement a échoué mais le statut est signé.
 */
export async function sendSignatureNotificationEmails(params: {
  recipientEmail: string
  recipientName: string
  adminEmail?: string
  documentTitle: string
}): Promise<void> {
  const { RESEND_API_KEY } = process.env
  if (!RESEND_API_KEY) return

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour,</p>

            <p style="margin:0 0 20px;">Le document <strong>${params.documentTitle}</strong> a bien été signé électroniquement.</p>

            <p style="margin:0 0 40px;">La copie signée sera disponible prochainement dans votre espace.</p>

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

  const { Resend } = await import('resend')
  const resend = new Resend(RESEND_API_KEY)
  const fromEmail = getFromEmail()
  const seen = new Set<string>()
  const toSend: Array<{ to: string }> = []
  if (params.recipientEmail?.trim()) { toSend.push({ to: params.recipientEmail.trim() }); seen.add(params.recipientEmail.trim().toLowerCase()) }
  if (params.adminEmail?.trim() && !seen.has(params.adminEmail.trim().toLowerCase())) { toSend.push({ to: params.adminEmail.trim() }) }

  await Promise.allSettled(
    toSend.map(async ({ to }) => {
      const { error } = await resend.emails.send({ from: fromEmail, to, subject: `Document signé : ${params.documentTitle}`, html })
      if (error) logger.error('Erreur envoi notification signature:', { to, error })
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
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:48px 24px;">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;line-height:1.8;">

            <p style="margin:0 0 20px;">Bonjour,</p>

            <p style="margin:0 0 20px;">La convention <strong>${params.documentTitle}</strong> a été signée par toutes les parties. Veuillez trouver ci-joint votre copie.</p>

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

  const fromEmail = getFromEmail()
  await Promise.allSettled(
    toSend.map(async ({ to, name }) => {
      let { error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject: `Convention signée : ${params.documentTitle}`,
        html,
        attachments: [{ filename: params.signedFilename, content }],
      })
      if (error && process.env.NODE_ENV === 'development' && isDomainNotVerifiedError(error as { statusCode?: number; message?: string })) {
        logger.warn('Domaine From non vérifié chez Resend, nouvel essai avec onboarding@resend.dev')
        const retry = await resend.emails.send({
          from: RESEND_SANDBOX_FROM,
          to,
          subject: `Convention signée : ${params.documentTitle}`,
          html,
          attachments: [{ filename: params.signedFilename, content }],
        })
        error = retry.error ?? null
      }
      if (error) logger.error('Envoi signé PDF (cascade):', { to, error })
    })
  )
}
