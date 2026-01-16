/**
 * Service d'envoi d'emails
 * 
 * Ce service permet d'envoyer des emails avec pièces jointes depuis l'application.
 * 
 * Configuration requise :
 * - Installer Resend : npm install resend
 * - Ajouter RESEND_API_KEY dans .env.local
 * - Ou utiliser un autre service d'email (SendGrid, etc.)
 */

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
   * Envoie un email avec pièces jointes
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; message: string }> {
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

      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Inclure les cookies pour l'authentification
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
        const error = await response.json()
        throw new Error(error.message || 'Erreur lors de l\'envoi de l\'email')
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
