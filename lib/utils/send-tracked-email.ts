/**
 * sendTrackedEmail — Wrapper d'envoi d'email avec tracking Resend.
 *
 * Envoie un email via Resend, récupère le resend_id de la réponse,
 * et insère immédiatement une ligne dans email_logs avec le statut 'sent'.
 * Les mises à jour de statut ultérieures (delivered, opened, bounced…)
 * sont effectuées par le webhook /api/webhooks/resend.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'

const FROM_DEFAULT = process.env.EMAIL_FROM || 'EDUZEN <noreply@eduzen.io>'
const RESEND_SANDBOX_FROM = 'EDUZEN <onboarding@resend.dev>'

export interface SendTrackedEmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  replyTo?: string
  /** UUID de l'organisation expéditrice (pour filtrage super-admin) */
  organizationId?: string
  /** Type de template : 'convocation', 'contrat', 'alerte', 'facturation', 'onboarding', etc. */
  templateType?: string
  /** Métadonnées additionnelles stockées en JSONB */
  metadata?: Record<string, unknown>
}

export interface SendTrackedEmailResult {
  success: boolean
  resendId?: string
  logId?: string
  error?: string
}

function isDomainNotVerifiedError(err: { statusCode?: number; message?: string }): boolean {
  return (
    err?.statusCode === 403 &&
    typeof err?.message === 'string' &&
    err.message.toLowerCase().includes('domain') &&
    err.message.toLowerCase().includes('not verified')
  )
}

export async function sendTrackedEmail(
  options: SendTrackedEmailOptions
): Promise<SendTrackedEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY
  const supabase = createAdminClient()

  const recipients = Array.isArray(options.to) ? options.to : [options.to]
  const primaryRecipient = recipients[0]

  // Mode test sans clé API
  if (!resendApiKey) {
    logger.info('sendTrackedEmail - Mode test (pas de clé Resend)', {
      to: recipients,
      subject: options.subject,
    })
    return { success: true }
  }

  let resendId: string | undefined
  let sendError: string | undefined

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

    // Retry sandbox en dev si domaine non vérifié
    if (error && process.env.NODE_ENV === 'development' && isDomainNotVerifiedError(error as { statusCode?: number; message?: string })) {
      logger.warn('sendTrackedEmail - Domaine non vérifié, retry avec sandbox')
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
      logger.error('sendTrackedEmail - Erreur envoi', error as Error, { to: recipients, subject: options.subject })
      sendError = msg
    } else {
      resendId = data?.id
      logger.info('sendTrackedEmail - Email envoyé', { to: recipients, subject: options.subject, resendId })
    }
  } catch (err) {
    sendError = err instanceof Error ? err.message : String(err)
    logger.error('sendTrackedEmail - Exception', err as Error)
  }

  // Insérer le log dans Supabase
  const { data: logRow, error: dbError } = await (supabase as any)
    .from('email_logs')
    .insert({
      organization_id: options.organizationId ?? null,
      recipient: primaryRecipient,
      subject: options.subject,
      template_type: options.templateType ?? null,
      resend_id: resendId ?? null,
      status: sendError ? 'failed' : 'sent',
      metadata: {
        ...(options.metadata ?? {}),
        all_recipients: recipients.length > 1 ? recipients : undefined,
      },
    })
    .select('id')
    .single()

  if (dbError) {
    logger.error('sendTrackedEmail - Erreur insertion email_logs', dbError as Error)
  }

  if (sendError) {
    return { success: false, error: sendError, logId: logRow?.id }
  }

  return { success: true, resendId, logId: logRow?.id }
}
