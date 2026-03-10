import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { logger, maskEmail, sanitizeError } from '@/lib/utils/logger'
import { sendEmailBodySchema } from '@/lib/validations/schemas'

/**
 * API Route pour envoyer des emails avec pièces jointes via Resend
 *
 * Documentation Resend: https://resend.com/docs/send-with-nextjs
 *
 * Configuration requise dans .env.local:
 * - RESEND_API_KEY=re_votre_cle_api
 * - RESEND_FROM_EMAIL (optionnel, défaut: noreply@eduzen.io)
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      logger.warn('Email send attempt without authentication')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = sendEmailBodySchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] || parsed.error.message
      return NextResponse.json(
        { error: 'Données invalides', details: msg },
        { status: 400 }
      )
    }
    const { to, subject, message, attachmentUrl, attachmentName } = parsed.data
    const toList = Array.isArray(to) ? to : [to]
    const toFirst = toList[0]
    const messageStr = message ?? ''

    // En dev/test sans Resend configuré : ne pas faire échouer l'appel (éviter 500)
    if (!process.env.RESEND_API_KEY) {
      logger.info('send-email: mode test (RESEND_API_KEY absente)', { to: toFirst ? maskEmail(toFirst) : '', subject })
      return NextResponse.json({
        success: true,
        message: 'Mode test — email non envoyé',
        hint: 'Définir RESEND_API_KEY dans .env.local pour envoyer réellement les emails.',
      })
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'EDUZEN <noreply@eduzen.io>'

    // Instancier Resend uniquement après avoir vérifié la clé API
    const resend = new Resend(process.env.RESEND_API_KEY)

    logger.info('Sending email via Resend', {
      to: toFirst ? maskEmail(toFirst) : '',
      subject,
      hasAttachment: !!attachmentUrl,
    })

    // Télécharger la pièce jointe si présente
    const attachments: Array<{ filename: string; content: Buffer }> = []

    if (attachmentUrl) {
      try {
        logger.debug('Downloading attachment', { attachmentUrl })

        const fileResponse = await fetch(attachmentUrl)

        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch attachment: ${fileResponse.statusText}`)
        }

        const fileBuffer = await fileResponse.arrayBuffer()

        attachments.push({
          filename: attachmentName || 'document.pdf',
          content: Buffer.from(fileBuffer),
        })

        logger.debug('Attachment downloaded successfully', {
          fileName: attachmentName,
          size: fileBuffer.byteLength,
        })
      } catch (error) {
        logger.error('Failed to download attachment', error, {
          attachmentUrl,
          error: sanitizeError(error),
        })
        // Continue without attachment rather than failing completely
        logger.warn('Sending email without attachment due to download failure')
      }
    }

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toList,
      subject: subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">EDUZEN</h1>
          </div>
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <div style="white-space: pre-wrap; line-height: 1.6;">
              ${messageStr.split('\n').map((line: string) => `<p style="margin: 10px 0;">${line}</p>`).join('')}
            </div>
            ${attachments.length > 0 ? `
              <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-left: 4px solid #667eea; border-radius: 4px;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  📎 Document joint à cet email: <strong>${attachmentName || 'document.pdf'}</strong>
                </p>
              </div>
            ` : ''}
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 12px; text-align: center;">
              <p>Cet email a été envoyé automatiquement par la plateforme EDUZEN.</p>
              <p>© ${new Date().getFullYear()} EDUZEN. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      `,
      attachments: attachments.length > 0 ? attachments : undefined,
    })

    if (error) {
      logger.error('Resend email send failed', error, {
        to: toFirst ? maskEmail(toFirst) : '',
        subject,
        errorName: error.name,
        errorMessage: error.message,
      })

      return NextResponse.json(
        {
          error: 'Erreur lors de l\'envoi de l\'email',
          details: error.message
        },
        { status: 500 }
      )
    }

    logger.info('Email sent successfully via Resend', {
      to: toFirst ? maskEmail(toFirst) : '',
      emailId: data?.id,
      hasAttachment: attachments.length > 0,
    })

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
      emailId: data?.id,
    })
  } catch (error) {
    logger.error('Email send failed with exception', error, {
      error: sanitizeError(error),
    })

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
