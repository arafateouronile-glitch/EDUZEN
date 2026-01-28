/**
 * Adapter DocuSign pour la signature électronique
 * API DocuSign eSignature REST API
 * Documentation: https://developers.docusign.com/docs/esign-rest-api/
 */

import { logger, sanitizeError } from '@/lib/utils/logger'

export interface DocuSignConfig {
  accountId: string
  accessToken: string
  basePath?: string
  environment?: 'production' | 'sandbox'
}

export interface DocuSignSignatureRequest {
  emailSubject: string
  emailMessage?: string
  status?: 'created' | 'sent'
  recipients: {
    signers: Array<{
      email: string
      name: string
      recipientId: string
      routingOrder?: string
      tabs?: {
        signHereTabs?: Array<{
          documentId: string
          pageNumber: string
          xPosition: string
          yPosition: string
          optional?: string
        }>
        dateSignedTabs?: Array<{
          documentId: string
          pageNumber: string
          xPosition: string
          yPosition: string
        }>
        textTabs?: Array<{
          documentId: string
          pageNumber: string
          xPosition: string
          yPosition: string
          width?: string
          height?: string
          value?: string
        }>
      }
    }>
  }
  documents: Array<{
    documentBase64: string
    name: string
    fileExtension: string
    documentId: string
  }>
  customFields?: {
    textCustomFields?: Array<{
      name: string
      value: string
      required?: string
    }>
  }
}

export interface DocuSignSignatureResponse {
  envelopeId: string
  status: string
  statusDateTime: string
  uri: string
}

export interface DocuSignEnvelopeStatus {
  envelopeId: string
  status: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided'
  statusDateTime: string
  recipients?: {
    signers?: Array<{
      email: string
      name: string
      status: string
      signedDateTime?: string
    }>
  }
}

/**
 * Adapter pour l'API DocuSign
 */
export class DocuSignAdapter {
  private config: DocuSignConfig
  private baseUrl: string

  constructor(config: DocuSignConfig) {
    this.config = config
    this.baseUrl = config.basePath || (
      config.environment === 'production'
        ? 'https://www.docusign.net/restapi'
        : 'https://demo.docusign.net/restapi'
    )
  }

  /**
   * Headers pour les requêtes API
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  /**
   * Crée une demande de signature (envelope)
   */
  async createSignatureRequest(request: DocuSignSignatureRequest): Promise<DocuSignSignatureResponse> {
    try {
      const url = `${this.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes`

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`DocuSign API Error: ${error.message || response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('DocuSignAdapter - Erreur lors de la création de l\'envelope DocuSign', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Récupère le statut d'un envelope
   */
  async getEnvelopeStatus(envelopeId: string): Promise<DocuSignEnvelopeStatus> {
    try {
      const url = `${this.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}`

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`DocuSign API Error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('DocuSignAdapter - Erreur lors de la récupération du statut', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Télécharge le document signé
   */
  async downloadSignedDocument(envelopeId: string, documentId: string = 'combined'): Promise<Blob> {
    try {
      const url = `${this.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}/documents/${documentId}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`DocuSign API Error: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      logger.error('DocuSignAdapter - Erreur lors du téléchargement du document', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Annule un envelope
   */
  async voidEnvelope(envelopeId: string, reason: string): Promise<DocuSignEnvelopeStatus> {
    try {
      const url = `${this.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}`

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({
          status: 'voided',
          voidedReason: reason,
        }),
      })

      if (!response.ok) {
        throw new Error(`DocuSign API Error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('DocuSignAdapter - Erreur lors de l\'annulation de l\'envelope', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Teste la connexion à l'API
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/v2.1/accounts/${this.config.accountId}`

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      return response.ok
    } catch (error) {
      logger.error('DocuSignAdapter - Erreur de connexion à DocuSign', error, { error: sanitizeError(error) })
      return false
    }
  }

  /**
   * Helper: Crée une demande de signature simple avec un document
   */
  async createSimpleSignatureRequest(params: {
    documentBase64: string
    documentName: string
    signers: Array<{
      email: string
      name: string
      signaturePositions?: Array<{
        pageNumber: number
        x: number
        y: number
      }>
    }>
    emailSubject: string
    emailMessage?: string
    metadata?: Record<string, string>
  }): Promise<DocuSignSignatureResponse> {
    const { documentBase64, documentName, signers, emailSubject, emailMessage, metadata } = params

    const request: DocuSignSignatureRequest = {
      emailSubject,
      emailMessage,
      status: 'sent',
      recipients: {
        signers: signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          recipientId: (index + 1).toString(),
          routingOrder: (index + 1).toString(),
          tabs: signer.signaturePositions ? {
            signHereTabs: signer.signaturePositions.map((pos, posIndex) => ({
              documentId: '1',
              pageNumber: pos.pageNumber.toString(),
              xPosition: pos.x.toString(),
              yPosition: pos.y.toString(),
              optional: 'false',
            })),
          } : undefined,
        })),
      },
      documents: [
        {
          documentBase64,
          name: documentName,
          fileExtension: 'pdf',
          documentId: '1',
        },
      ],
      customFields: metadata ? {
        textCustomFields: Object.entries(metadata).map(([name, value]) => ({
          name,
          value,
          required: 'false',
        })),
      } : undefined,
    }

    return this.createSignatureRequest(request)
  }

  /**
   * Helper: Obtient l'URL de signature pour un signataire
   */
  async getSigningUrl(envelopeId: string, recipientEmail: string, returnUrl?: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}/views/recipient`

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          returnUrl: returnUrl || 'https://www.docusign.com/deeplinkReturn',
          authenticationMethod: 'email',
          email: recipientEmail,
          userName: 'Recipient',
        }),
      })

      if (!response.ok) {
        throw new Error(`DocuSign API Error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      logger.error('DocuSignAdapter - Erreur lors de la génération de l\'URL de signature', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Helper: Liste les envelopes récents
   */
  async listEnvelopes(options?: {
    fromDate?: string
    status?: string
    count?: number
  }): Promise<any> {
    try {
      const params = new URLSearchParams()
      if (options?.fromDate) params.append('from_date', options.fromDate)
      if (options?.status) params.append('status', options.status)
      if (options?.count) params.append('count', options.count.toString())

      const url = `${this.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes?${params.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`DocuSign API Error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('DocuSignAdapter - Erreur lors de la récupération des envelopes', error, { error: sanitizeError(error) })
      throw error
    }
  }
}
