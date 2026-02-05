/**
 * Service d'envoi d'emails
 * 
 * Ce service permet d'envoyer des emails avec pièces jointes depuis l'application.
 * Appelable depuis le client (navigateur) ou le serveur (API routes) ; en contexte serveur
 * une URL absolue est utilisée pour fetch (NEXT_PUBLIC_APP_URL ou localhost).
 * 
 * Configuration requise :
 * - Installer Resend : npm install resend
 * - Ajouter RESEND_API_KEY dans .env.local
 * - En serveur : NEXT_PUBLIC_APP_URL (ex. http://localhost:3001) pour les appels à l'API email
 */

function getEmailApiUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/email/send'
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    `http://localhost:${process.env.PORT || 3001}`
  return `${base.replace(/\/$/, '')}/api/email/send`
}

interface EmailAttachment {
  filename: string
  content: Blob | ArrayBuffer | string // Base64 ou Blob
  contentType: string
}

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  attachments?: EmailAttachment[]
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
}

export class EmailService {
  /**
   * Convertit un Blob en base64
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * Envoie un email avec pièces jointes.
   * @param options - Options de l'email
   * @param serverContext - Contexte serveur : cookieHeader pour les appels depuis une API route (auth)
   */
  async sendEmail(
    options: SendEmailOptions,
    serverContext?: { cookieHeader?: string }
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Convertir les pièces jointes en base64 si nécessaire
      const attachments = options.attachments
        ? await Promise.all(
            options.attachments.map(async (att) => {
              let content: string
              if (att.content instanceof Blob) {
                content = await this.blobToBase64(att.content)
              } else if (att.content instanceof ArrayBuffer) {
                const blob = new Blob([att.content], { type: att.contentType })
                content = await this.blobToBase64(blob)
              } else {
                content = att.content
              }

              return {
                filename: att.filename,
                content,
                contentType: att.contentType,
              }
            })
          )
        : undefined

      const apiUrl = getEmailApiUrl()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (serverContext?.cookieHeader) {
        headers.Cookie = serverContext.cookieHeader
      }
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments,
          cc: options.cc,
          bcc: options.bcc,
          replyTo: options.replyTo,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        const message =
          err?.message || err?.error || 'Erreur lors de l\'envoi de l\'email'
        throw new Error(message)
      }

      const data = await response.json()
      return { success: true, message: data.message || 'Email envoyé avec succès' }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Erreur lors de l\'envoi de l\'email'
      )
    }
  }

  /**
   * Envoie un document PDF par email
   */
  async sendDocument(
    to: string | string[],
    subject: string,
    pdfBlob: Blob,
    filename: string,
    htmlBody?: string,
    textBody?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail({
      to,
      subject,
      html: htmlBody,
      text: textBody,
      attachments: [
        {
          filename,
          content: pdfBlob,
          contentType: 'application/pdf',
        },
      ],
    })
  }

  /**
   * Envoie plusieurs documents par email
   */
  async sendMultipleDocuments(
    to: string | string[],
    subject: string,
    documents: Array<{ blob: Blob; filename: string }>,
    htmlBody?: string,
    textBody?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.sendEmail({
      to,
      subject,
      html: htmlBody,
      text: textBody,
      attachments: documents.map((doc) => ({
        filename: doc.filename,
        content: doc.blob,
        contentType: 'application/pdf',
      })),
    })
  }
}

export const emailService = new EmailService()
