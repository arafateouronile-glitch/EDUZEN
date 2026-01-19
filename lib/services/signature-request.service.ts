import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'
import { errorHandler, AppError, ErrorCode } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'
import { EmailService } from './email.service'

type SignatureRequest = TableRow<'signature_requests'>
type SignatureRequestInsert = TableInsert<'signature_requests'>
type SignatureRequestUpdate = TableUpdate<'signature_requests'>

export interface CreateSignatureRequestParams {
  documentId: string
  organizationId: string
  recipientEmail: string
  recipientName: string
  recipientType: 'student' | 'funder' | 'teacher' | 'other'
  recipientId?: string
  subject?: string
  message?: string
  expiresAt?: string
  requiresNotarization?: boolean
  reminderFrequency?: 'daily' | 'weekly' | 'none'
}

export interface SignatureRequestWithDetails extends SignatureRequest {
  document: {
    id: string
    title: string | null
    file_url: string | null
  } | null
  requester: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

/**
 * Service pour gérer les demandes de signature électronique par email
 */
export class SignatureRequestService {
  private supabase: SupabaseClient<Database>
  private emailService: EmailService

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
    this.emailService = new EmailService()
  }

  /**
   * Crée une demande de signature et envoie l'email
   */
  async createSignatureRequest(params: CreateSignatureRequestParams) {
    try {
      // Récupérer l'utilisateur actuel
      const { data: userData } = await this.supabase.auth.getUser()
      if (!userData.user) {
        throw errorHandler.createAuthError(ErrorCode.AUTH_REQUIRED, 'Utilisateur non authentifié')
      }

      // Récupérer les informations du document
      const { data: document, error: documentError } = await this.supabase
        .from('documents')
        .select('id, title, file_url, organization_id')
        .eq('id', params.documentId)
        .single()

      if (documentError || !document) {
        throw errorHandler.createNotFoundError('Document introuvable', { documentId: params.documentId })
      }

      // Générer un token unique pour la signature
      const signatureToken = this.generateSignatureToken()

      // Calculer la date d'expiration (par défaut 30 jours)
      const expiresAt = params.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      // Créer la demande de signature
      const requestData: FlexibleInsert<'signature_requests'> = {
        document_id: params.documentId,
        organization_id: params.organizationId,
        requester_id: userData.user.id,
        recipient_email: params.recipientEmail,
        recipient_name: params.recipientName,
        recipient_type: params.recipientType,
        recipient_id: params.recipientId || null,
        subject: params.subject || `Demande de signature : ${document.title}`,
        message: params.message || null,
        status: 'pending',
        signature_token: signatureToken,
        expires_at: expiresAt,
        requires_notarization: params.requiresNotarization || false,
        reminder_frequency: params.reminderFrequency || 'none',
      }

      const { data, error } = await this.supabase
        .from('signature_requests')
        .insert(requestData as SignatureRequestInsert)
        .select(`
          *,
          document:documents(id, title, file_url),
          requester:users!signature_requests_requester_id_fkey(id, full_name, email)
        `)
        .single()

      if (error) throw error

      // Générer l'URL de signature
      const signatureUrl = this.generateSignatureUrl(signatureToken)

      // Envoyer l'email de demande de signature
      await this.sendSignatureRequestEmail({
        to: params.recipientEmail,
        recipientName: params.recipientName,
        documentTitle: document.title || 'Document',
        signatureUrl,
        message: params.message,
        expiresAt,
        requesterName: userData.user.user_metadata?.full_name || 'Un utilisateur',
      })

      logger.info('Demande de signature créée et email envoyé', {
        requestId: data.id,
        documentId: params.documentId,
        recipientEmail: params.recipientEmail,
      })

      return data as SignatureRequestWithDetails
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'createSignatureRequest',
        documentId: params.documentId,
      })
    }
  }

  /**
   * Crée plusieurs demandes de signature en masse
   */
  async createBulkSignatureRequests(
    documentId: string,
    organizationId: string,
    recipients: Array<{
      email: string
      name: string
      type: 'student' | 'funder' | 'teacher' | 'other'
      id?: string
    }>,
    options?: {
      subject?: string
      message?: string
      expiresAt?: string
    }
  ) {
    try {
      const results = await Promise.allSettled(
        recipients.map((recipient) =>
          this.createSignatureRequest({
            documentId,
            organizationId,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            recipientType: recipient.type,
            recipientId: recipient.id,
            subject: options?.subject,
            message: options?.message,
            expiresAt: options?.expiresAt,
          })
        )
      )

      const successful = results.filter((r) => r.status === 'fulfilled')
      const failed = results.filter((r) => r.status === 'rejected')

      logger.info('Demandes de signature en masse', {
        total: recipients.length,
        successful: successful.length,
        failed: failed.length,
      })

      return {
        successful: successful.map((r) => (r as PromiseFulfilledResult<SignatureRequestWithDetails>).value),
        failed: failed.map((r) => (r as PromiseRejectedResult).reason),
        total: recipients.length,
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'createBulkSignatureRequests',
        documentId,
      })
    }
  }

  /**
   * Récupère une demande de signature par son token
   */
  async getSignatureRequestByToken(token: string) {
    try {
      const { data, error } = await this.supabase
        .from('signature_requests')
        .select(`
          *,
          document:documents(id, title, file_url, type),
          requester:users!signature_requests_requester_id_fkey(id, full_name, email)
        `)
        .eq('signature_token', token)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw errorHandler.createNotFoundError('Demande de signature introuvable', { token })
        }
        throw error
      }

      // Vérifier si la demande n'a pas expiré
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        throw errorHandler.createValidationError('La demande de signature a expiré', 'expires_at')
      }

      return data as SignatureRequestWithDetails
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getSignatureRequestByToken',
      })
    }
  }

  /**
   * Récupère toutes les demandes de signature pour un document
   */
  async getSignatureRequestsByDocument(documentId: string) {
    try {
      const { data, error } = await this.supabase
        .from('signature_requests')
        .select(`
          *,
          requester:users!signature_requests_requester_id_fkey(id, full_name, email)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getSignatureRequestsByDocument',
        documentId,
      })
    }
  }

  /**
   * Récupère toutes les demandes de signature pour une organisation
   */
  async getSignatureRequestsByOrganization(
    organizationId: string,
    filters?: {
      status?: 'pending' | 'signed' | 'expired' | 'declined' | 'cancelled'
      recipientType?: 'student' | 'funder' | 'teacher' | 'other'
    }
  ) {
    try {
      let query = this.supabase
        .from('signature_requests')
        .select(`
          *,
          document:documents(id, title, type),
          requester:users!signature_requests_requester_id_fkey(id, full_name, email)
        `)
        .eq('organization_id', organizationId)

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.recipientType) {
        query = query.eq('recipient_type', filters.recipientType)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getSignatureRequestsByOrganization',
        organizationId,
      })
    }
  }

  /**
   * Met à jour le statut d'une demande de signature
   */
  async updateSignatureRequestStatus(
    requestId: string,
    status: 'pending' | 'signed' | 'expired' | 'declined' | 'cancelled',
    signatureId?: string
  ) {
    try {
      const updates: FlexibleUpdate<'signature_requests'> = {
        status,
      }

      if (status === 'signed' && signatureId) {
        updates.signature_id = signatureId
        updates.signed_at = new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('signature_requests')
        .update(updates as SignatureRequestUpdate)
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw error

      logger.info('Statut de demande de signature mis à jour', {
        requestId,
        status,
      })

      return data
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'updateSignatureRequestStatus',
        requestId,
      })
    }
  }

  /**
   * Annule une demande de signature
   */
  async cancelSignatureRequest(requestId: string) {
    return this.updateSignatureRequestStatus(requestId, 'cancelled')
  }

  /**
   * Envoie un rappel pour une demande de signature en attente
   */
  async sendReminder(requestId: string) {
    try {
      const { data: request, error } = await this.supabase
        .from('signature_requests')
        .select(`
          *,
          document:documents(id, title, file_url),
          requester:users!signature_requests_requester_id_fkey(id, full_name, email)
        `)
        .eq('id', requestId)
        .single()

      if (error || !request) {
        throw errorHandler.createNotFoundError('Demande de signature introuvable', { requestId })
      }

      if (request.status !== 'pending') {
        throw errorHandler.createValidationError(
          'Impossible d\'envoyer un rappel pour une demande qui n\'est pas en attente',
          'status'
        )
      }

      const signatureUrl = this.generateSignatureUrl(request.signature_token)

      await this.sendSignatureReminderEmail({
        to: request.recipient_email,
        recipientName: request.recipient_name,
        documentTitle: (request.document as any)?.title || 'Document',
        signatureUrl,
        expiresAt: request.expires_at,
        requesterName: (request.requester as any)?.full_name || 'Un utilisateur',
      })

      // Mettre à jour le compteur de rappels et la date du dernier rappel
      await this.supabase
        .from('signature_requests')
        .update({
          reminder_count: (request.reminder_count || 0) + 1,
          last_reminder_sent_at: new Date().toISOString(),
        } as SignatureRequestUpdate)
        .eq('id', requestId)

      logger.info('Rappel de signature envoyé', { requestId })

      return true
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'sendReminder',
        requestId,
      })
    }
  }

  /**
   * Génère un token unique pour une demande de signature
   */
  private generateSignatureToken(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2, 15)
    const randomPart2 = Math.random().toString(36).substring(2, 15)
    return `${timestamp}-${randomPart}-${randomPart2}`
  }

  /**
   * Génère l'URL de signature à partir du token
   */
  private generateSignatureUrl(token: string): string {
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return `${baseUrl}/signature/${token}`
  }

  /**
   * Envoie l'email de demande de signature
   */
  private async sendSignatureRequestEmail(params: {
    to: string
    recipientName: string
    documentTitle: string
    signatureUrl: string
    message?: string | null
    expiresAt: string
    requesterName: string
  }) {
    const expirationDate = new Date(params.expiresAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: #667eea;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .button:hover {
              background: #5568d3;
            }
            .info-box {
              background: white;
              border-left: 4px solid #667eea;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">📝 Demande de signature</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${params.recipientName}</strong>,</p>

            <p>${params.requesterName} vous demande de signer le document suivant :</p>

            <div class="info-box">
              <strong>📄 ${params.documentTitle}</strong>
            </div>

            ${params.message ? `<p><em>${params.message}</em></p>` : ''}

            <p>Pour consulter et signer ce document, veuillez cliquer sur le bouton ci-dessous :</p>

            <div style="text-align: center;">
              <a href="${params.signatureUrl}" class="button">Signer le document</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Ou copiez ce lien dans votre navigateur :<br>
              <a href="${params.signatureUrl}" style="color: #667eea;">${params.signatureUrl}</a>
            </p>

            <div class="info-box" style="background: #fef3c7; border-left-color: #f59e0b;">
              <strong>⏰ Date d'expiration :</strong> ${expirationDate}
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Cette demande de signature est conforme aux normes eIDAS et garantit la validité juridique de votre signature électronique.
            </p>
          </div>

          <div class="footer">
            <p>EDUZEN - Plateforme de gestion de formation</p>
            <p style="font-size: 12px;">Si vous n'êtes pas le destinataire de ce message, veuillez l'ignorer.</p>
          </div>
        </body>
      </html>
    `

    const textBody = `
Bonjour ${params.recipientName},

${params.requesterName} vous demande de signer le document suivant :

Document : ${params.documentTitle}

${params.message ? `Message : ${params.message}\n\n` : ''}

Pour consulter et signer ce document, veuillez cliquer sur ce lien :
${params.signatureUrl}

Date d'expiration : ${expirationDate}

Cette demande de signature est conforme aux normes eIDAS et garantit la validité juridique de votre signature électronique.

---
EDUZEN - Plateforme de gestion de formation
Si vous n'êtes pas le destinataire de ce message, veuillez l'ignorer.
    `

    await this.emailService.sendEmail({
      to: params.to,
      subject: `Demande de signature : ${params.documentTitle}`,
      html: htmlBody,
      text: textBody,
    })
  }

  /**
   * Envoie l'email de rappel de signature
   */
  private async sendSignatureReminderEmail(params: {
    to: string
    recipientName: string
    documentTitle: string
    signatureUrl: string
    expiresAt: string | null
    requesterName: string
  }) {
    const expirationText = params.expiresAt
      ? `Expire le ${new Date(params.expiresAt).toLocaleDateString('fr-FR')}`
      : ''

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background: #f59e0b;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">🔔 Rappel de signature</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${params.recipientName}</strong>,</p>

            <p>Ceci est un rappel concernant la demande de signature du document suivant :</p>

            <p><strong>📄 ${params.documentTitle}</strong></p>

            <p>Ce document est en attente de votre signature.</p>

            ${expirationText ? `<p style="color: #f59e0b;"><strong>⏰ ${expirationText}</strong></p>` : ''}

            <div style="text-align: center;">
              <a href="${params.signatureUrl}" class="button">Signer maintenant</a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              Lien de signature :<br>
              <a href="${params.signatureUrl}" style="color: #f59e0b;">${params.signatureUrl}</a>
            </p>
          </div>

          <div class="footer">
            <p>EDUZEN - Plateforme de gestion de formation</p>
          </div>
        </body>
      </html>
    `

    const textBody = `
Bonjour ${params.recipientName},

Ceci est un rappel concernant la demande de signature du document suivant :

Document : ${params.documentTitle}

Ce document est en attente de votre signature.

${expirationText}

Pour signer ce document, veuillez cliquer sur ce lien :
${params.signatureUrl}

---
EDUZEN - Plateforme de gestion de formation
    `

    await this.emailService.sendEmail({
      to: params.to,
      subject: `Rappel : Signature en attente - ${params.documentTitle}`,
      html: htmlBody,
      text: textBody,
    })
  }
}

// Note: signatureRequestService doit être instancié avec un client Supabase
// Pour les routes API: new SignatureRequestService(await createClient()) avec le client serveur
// Pour les composants client: new SignatureRequestService(createClient()) avec le client client
