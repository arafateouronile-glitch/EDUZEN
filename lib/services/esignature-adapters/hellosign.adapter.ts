/**
 * Adapter HelloSign (Dropbox Sign) pour la signature électronique
 * API HelloSign (maintenant Dropbox Sign)
 * Documentation: https://developers.hellosign.com/api/reference/
 */

import { logger, sanitizeError } from '@/lib/utils/logger'

export interface HelloSignConfig {
  apiKey: string
  clientId?: string
  environment?: 'production' | 'sandbox'
}

export interface HelloSignSignatureRequest {
  title: string
  subject?: string
  message?: string
  signers: Array<{
    email_address: string
    name: string
    order?: number
  }>
  files?: File[]
  file_url?: string[]
  test_mode?: boolean
  metadata?: Record<string, string>
  signing_options?: {
    draw?: boolean
    type?: boolean
    upload?: boolean
    phone?: boolean
    default_type?: 'draw' | 'type' | 'upload' | 'phone'
  }
}

export interface HelloSignSignatureResponse {
  signature_request_id: string
  requester_email_address: string
  title: string
  subject: string | null
  message: string | null
  is_complete: boolean
  is_declined: boolean
  has_error: boolean
  files_url: string
  signing_url: string | null
  details_url: string
  cc_email_addresses: string[]
  signing_redirect_url: string | null
  custom_fields: any[]
  response_data: any[]
  signatures: Array<{
    signature_id: string
    signer_email_address: string
    signer_name: string
    signer_role: string | null
    order: number | null
    status_code: string
    signed_at: number | null
    last_viewed_at: number | null
    last_reminded_at: number | null
    has_pin: boolean
    reassigned_by: string | null
    reassignment_reason: string | null
    error: string | null
  }>
  metadata?: Record<string, string>
}

export interface HelloSignSignatureStatus {
  signature_request_id: string
  status_code: string
  is_complete: boolean
  is_declined: boolean
  signatures: Array<{
    signature_id: string
    signer_email_address: string
    status_code: string
    signed_at: number | null
  }>
}

/**
 * Adapter pour l'API HelloSign (Dropbox Sign)
 */
export class HelloSignAdapter {
  private config: HelloSignConfig
  private baseUrl: string

  constructor(config: HelloSignConfig) {
    this.config = config
    this.baseUrl = 'https://api.hellosign.com/v3'
  }

  /**
   * Headers pour les requêtes API
   */
  private getHeaders(isMultipart: boolean = false): HeadersInit {
    const headers: HeadersInit = {
      'Authorization': `Basic ${Buffer.from(this.config.apiKey + ':').toString('base64')}`,
    }

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json'
    }

    return headers
  }

  /**
   * Crée une demande de signature
   */
  async createSignatureRequest(request: HelloSignSignatureRequest): Promise<HelloSignSignatureResponse> {
    try {
      const url = `${this.baseUrl}/signature_request/send`

      // Préparer le corps de la requête en FormData
      const formData = new FormData()

      formData.append('title', request.title)
      if (request.subject) formData.append('subject', request.subject)
      if (request.message) formData.append('message', request.message)
      if (request.test_mode !== undefined) formData.append('test_mode', request.test_mode ? '1' : '0')

      // Signataires
      request.signers.forEach((signer, index) => {
        formData.append(`signers[${index}][email_address]`, signer.email_address)
        formData.append(`signers[${index}][name]`, signer.name)
        if (signer.order !== undefined) {
          formData.append(`signers[${index}][order]`, signer.order.toString())
        }
      })

      // Fichiers
      if (request.files) {
        request.files.forEach((file, index) => {
          formData.append(`file[${index}]`, file)
        })
      }

      // URLs de fichiers
      if (request.file_url) {
        request.file_url.forEach((url, index) => {
          formData.append(`file_url[${index}]`, url)
        })
      }

      // Métadonnées
      if (request.metadata) {
        Object.entries(request.metadata).forEach(([key, value]) => {
          formData.append(`metadata[${key}]`, value)
        })
      }

      // Options de signature
      if (request.signing_options) {
        const opts = request.signing_options
        if (opts.draw !== undefined) formData.append('signing_options[draw]', opts.draw ? '1' : '0')
        if (opts.type !== undefined) formData.append('signing_options[type]', opts.type ? '1' : '0')
        if (opts.upload !== undefined) formData.append('signing_options[upload]', opts.upload ? '1' : '0')
        if (opts.phone !== undefined) formData.append('signing_options[phone]', opts.phone ? '1' : '0')
        if (opts.default_type) formData.append('signing_options[default_type]', opts.default_type)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`HelloSign API Error: ${error.error?.error_msg || response.statusText}`)
      }

      const data = await response.json()
      return data.signature_request
    } catch (error) {
      logger.error('HelloSignAdapter - Erreur lors de la création de la demande HelloSign', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Récupère le statut d'une demande de signature
   */
  async getSignatureRequestStatus(signatureRequestId: string): Promise<HelloSignSignatureStatus> {
    try {
      const url = `${this.baseUrl}/signature_request/${signatureRequestId}`

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HelloSign API Error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.signature_request
    } catch (error) {
      logger.error('HelloSignAdapter - Erreur lors de la récupération du statut', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Télécharge le document signé
   */
  async downloadSignedDocument(signatureRequestId: string): Promise<Blob> {
    try {
      const url = `${this.baseUrl}/signature_request/files/${signatureRequestId}`

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HelloSign API Error: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      logger.error('HelloSignAdapter - Erreur lors du téléchargement du document', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Annule une demande de signature
   */
  async cancelSignatureRequest(signatureRequestId: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/signature_request/cancel/${signatureRequestId}`

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HelloSign API Error: ${response.statusText}`)
      }
    } catch (error) {
      logger.error('HelloSignAdapter - Erreur lors de l\'annulation de la demande', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Envoie un rappel à un signataire
   */
  async sendReminder(signatureRequestId: string, emailAddress: string): Promise<void> {
    try {
      const url = `${this.baseUrl}/signature_request/remind/${signatureRequestId}`

      const formData = new FormData()
      formData.append('email_address', emailAddress)

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HelloSign API Error: ${response.statusText}`)
      }
    } catch (error) {
      logger.error('HelloSignAdapter - Erreur lors de l\'envoi du rappel', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Obtient l'URL de signature pour un signataire
   */
  async getSigningUrl(signatureRequestId: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/signature_request/get_final_copy/${signatureRequestId}`

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HelloSign API Error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.signature_request.signing_url
    } catch (error) {
      logger.error('HelloSignAdapter - Erreur lors de la récupération de l\'URL de signature', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Liste les demandes de signature
   */
  async listSignatureRequests(options?: {
    page?: number
    page_size?: number
    query?: string
  }): Promise<any> {
    try {
      const params = new URLSearchParams()
      if (options?.page) params.append('page', options.page.toString())
      if (options?.page_size) params.append('page_size', options.page_size.toString())
      if (options?.query) params.append('query', options.query)

      const url = `${this.baseUrl}/signature_request/list?${params.toString()}`

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HelloSign API Error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('HelloSignAdapter - Erreur lors de la récupération des demandes', error, { error: sanitizeError(error) })
      throw error
    }
  }

  /**
   * Teste la connexion à l'API
   */
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/account`

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      return response.ok
    } catch (error) {
      logger.error('HelloSignAdapter - Erreur de connexion à HelloSign', error, { error: sanitizeError(error) })
      return false
    }
  }

  /**
   * Helper: Crée une demande de signature simple
   */
  async createSimpleSignatureRequest(params: {
    documentBase64: string
    documentName: string
    signers: Array<{
      email: string
      name: string
    }>
    title: string
    subject?: string
    message?: string
    metadata?: Record<string, string>
    testMode?: boolean
  }): Promise<HelloSignSignatureResponse> {
    const { documentBase64, documentName, signers, title, subject, message, metadata, testMode } = params

    // Convertir base64 en Blob puis en File
    const byteString = atob(documentBase64.split(',')[1] || documentBase64)
    const mimeString = documentBase64.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: mimeString })
    const file = new File([blob], documentName, { type: mimeString })

    return this.createSignatureRequest({
      title,
      subject,
      message,
      signers: signers.map((signer, index) => ({
        email_address: signer.email,
        name: signer.name,
        order: index,
      })),
      files: [file],
      test_mode: testMode !== undefined ? testMode : true,
      metadata,
      signing_options: {
        draw: true,
        type: true,
        upload: true,
        phone: false,
        default_type: 'draw',
      },
    })
  }

  /**
   * Helper: Obtient les informations du compte
   */
  async getAccountInfo(): Promise<any> {
    try {
      const url = `${this.baseUrl}/account`

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HelloSign API Error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.account
    } catch (error) {
      logger.error('HelloSignAdapter - Erreur lors de la récupération du compte', error, { error: sanitizeError(error) })
      throw error
    }
  }
}
