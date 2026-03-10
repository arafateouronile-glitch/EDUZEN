/**
 * Envoi d'email côté serveur via Resend (sans passer par l'API /api/email/send).
 * À utiliser dans les API routes ou services serveur pour éviter un fetch interne vers soi-même.
 */

import { logger } from '@/lib/utils/logger'

const FROM_DEFAULT = process.env.EMAIL_FROM || 'EDUZEN <noreply@eduzen.io>'
const RESEND_SANDBOX_FROM = 'EDUZEN <onboarding@resend.dev>'

function isDomainNotVerifiedError(err: { statusCode?: number; message?: string }): boolean {
  return (
    err?.statusCode === 403 &&
    typeof err?.message === 'string' &&
    err.message.toLowerCase().includes('domain') &&
    err.message.toLowerCase().includes('not verified')
  )
}

export interface SendEmailViaResendOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
}

/**
 * Envoie un email via Resend depuis le serveur.
 * Utilise RESEND_API_KEY ; en mode test (sans clé), log et résout sans erreur.
 * En dev, si le domaine n'est pas vérifié, réessaie avec l'adresse sandbox Resend.
 */
export async function sendEmailViaResend(
  options: SendEmailViaResendOptions
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY
  const recipients = Array.isArray(options.to) ? options.to : [options.to]

  if (!resendApiKey) {
    logger.info('Email (Resend server) - Test mode', {
      to: recipients,
      subject: options.subject,
      from: FROM_DEFAULT,
    })
    return { success: true }
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(resendApiKey)
    let from = FROM_DEFAULT
    let { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject: options.subject,
      html: options.html ?? undefined,
      text: options.text ?? (options.html ? options.html.replace(/<[^>]*>/g, '') : undefined),
      replyTo: options.replyTo ?? undefined,
    } as Parameters<typeof resend.emails.send>[0])

    if (error && process.env.NODE_ENV === 'development' && isDomainNotVerifiedError(error as { statusCode?: number; message?: string })) {
      logger.warn('Email (Resend server) - Domaine non vérifié, nouvel essai avec onboarding@resend.dev')
      from = RESEND_SANDBOX_FROM
      const retry = await resend.emails.send({
        from,
        to: recipients,
        subject: options.subject,
        html: options.html ?? undefined,
        text: options.text ?? (options.html ? options.html.replace(/<[^>]*>/g, '') : undefined),
        replyTo: options.replyTo ?? undefined,
      } as Parameters<typeof resend.emails.send>[0])
      error = retry.error ?? null
      data = retry.data
    }

    if (error) {
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Erreur Resend'
      logger.error('Email (Resend server) - Erreur', error as Error, {
        to: recipients,
        subject: options.subject,
      })
      return { success: false, error: msg }
    }

    logger.info('Email (Resend server) - Envoyé', {
      to: recipients,
      subject: options.subject,
      id: data?.id,
    })
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('Email (Resend server) - Exception', err as Error)
    return { success: false, error: message }
  }
}
