import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { logger, maskEmail, sanitizeError } from '@/lib/utils/logger'
import { sendEmailBodySchema } from '@/lib/validations/schemas'

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // 10 MB

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function validateAttachmentUrl(raw: string): void {
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('URL pièce jointe invalide') }

  if (!['https:', 'http:'].includes(url.protocol)) {
    throw new Error('Protocole URL non autorisé')
  }

  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1', 'metadata.google.internal']
  if (blocked.includes(url.hostname)) throw new Error('URL interne non autorisée')

  // Bloque les plages IPv4 privées (RFC 1918)
  const ipv4 = url.hostname.match(/^(\d+)\.(\d+)\./)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (
      a === 10 ||
      a === 127 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    ) throw new Error('IP privée non autorisée')
  }
}

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
        validateAttachmentUrl(attachmentUrl)

        const fileResponse = await fetch(attachmentUrl, {
          signal: AbortSignal.timeout(10_000),
        })

        if (!fileResponse.ok) {
          throw new Error(`Failed to fetch attachment: ${fileResponse.statusText}`)
        }

        const contentLength = fileResponse.headers.get('content-length')
        if (contentLength && parseInt(contentLength) > MAX_ATTACHMENT_BYTES) {
          throw new Error('Pièce jointe trop volumineuse (max 10 MB)')
        }

        const fileBuffer = await fileResponse.arrayBuffer()
        if (fileBuffer.byteLength > MAX_ATTACHMENT_BYTES) {
          throw new Error('Pièce jointe trop volumineuse (max 10 MB)')
        }

        attachments.push({
          filename: attachmentName || 'document.pdf',
          content: Buffer.from(fileBuffer),
        })

        logger.debug('Attachment downloaded successfully', {
          fileName: attachmentName,
          size: fileBuffer.byteLength,
        })
      } catch (error) {
        logger.error('Failed to download attachment', error, { error: sanitizeError(error) })
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
              ${escapeHtml(messageStr).split('\n').map((line: string) => `<p style="margin: 10px 0;">${line}</p>`).join('')}
            </div>
            ${attachments.length > 0 ? `
              <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-left: 4px solid #667eea; border-radius: 4px;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  📎 Document joint à cet email: <strong>${escapeHtml(attachmentName || 'document.pdf')}</strong>
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
