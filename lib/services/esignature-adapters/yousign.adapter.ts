/**
 * Adapter Yousign pour la signature électronique
 * API Yousign - Solution française conforme eIDAS et RGPD
 * Documentation: https://developers.yousign.com
 */

export interface YousignConfig {
  api_key: string
  environment?: 'production' | 'sandbox'
  base_url?: string
}

export interface YousignSignatureRequest {
  name: string
  description?: string
  signers: Array<{
    info?: {
      first_name?: string
      last_name?: string
      email: string
      phone_number?: string
    }
    fields?: Array<{
      type: 'signature' | 'text' | 'date' | 'checkbox'
      page: number
      x: number
      y: number
      width?: number
      height?: number
      name?: string
      required?: boolean
    }>
  }>
  files: Array<{
    name: string
    content: string // Base64
    nature: 'signable' | 'attachment'
  }>
  metadata?: Record<string, string>
}

export interface YousignSignatureResponse {
  id: string
  status: 'pending' | 'processing' | 'done' | 'refused' | 'expired'
  created_at: string
  updated_at: string
  signers: Array<{
    id: string
    status: 'pending' | 'processing' | 'done' | 'refused'
    email: string
    created_at: string
    updated_at: string
  }>
  file_objects: Array<{
    id: string
    file: {
      id: string
      name: string
    }
  }>
  metadata?: Record<string, string>
}

export class YousignAdapter {
  private config: YousignConfig
  private baseUrl: string

  constructor(config: YousignConfig) {
    this.config = config
    this.baseUrl = config.base_url || (config.environment === 'production' 
      ? 'https://api.yousign.com'
      : 'https://api-sandbox.yousign.com')
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.api_key}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }
  }

  async createSignatureRequest(request: YousignSignatureRequest): Promise<YousignSignatureResponse> {
    try {
      const fileIds: string[] = []
      for (const file of request.files) {
        const fileResponse = await this.uploadFile({
          name: file.name,
          content: file.content,
          nature: file.nature,
        })
        fileIds.push(fileResponse.id)
      }

      const procedureBody = {
        name: request.name,
        description: request.description,
        members: request.signers.map((signer, index) => ({
          user: signer.info ? {
            firstname: signer.info.first_name,
            lastname: signer.info.last_name,
            email: signer.info.email,
            phone: signer.info.phone_number,
          } : {
            email: signer.info?.email || '',
          },
          position: index + 1,
          fileObjects: signer.fields?.map((field, fieldIndex) => ({
            file: fileIds[0],
            page: field.page,
            position: fieldIndex + 1,
            fieldName: field.name,
            type: this.mapFieldType(field.type),
            x: field.x,
            y: field.y,
            width: field.width || 100,
            height: field.height || 50,
            required: field.required !== false,
          })) || [],
        })),
        config: {
          email: {
            signatureRequest: {
              message: request.description || 'Veuillez signer ce document',
            },
          },
        },
        metadata: request.metadata,
      }

      const response = await fetch(`${this.baseUrl}/procedures`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(procedureBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur API Yousign' }))
        throw new Error(`Erreur Yousign: ${errorData.message || response.statusText}`)
      }

      const procedure = await response.json()
      await this.activateProcedure(procedure.id)
      return this.mapToSignatureResponse(procedure)
    } catch (error) {
      throw new Error(`Erreur création signature Yousign: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async uploadFile(file: { name: string; content: string; nature: 'signable' | 'attachment' }): Promise<{ id: string; name: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name: file.name,
          content: file.content,
          type: file.nature === 'signable' ? 'signable' : 'attachment',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur upload Yousign' }))
        throw new Error(`Erreur upload Yousign: ${errorData.message || response.statusText}`)
      }

      const data = await response.json()
      return { id: data.id, name: data.name }
    } catch (error) {
      throw new Error(`Erreur upload fichier Yousign: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async activateProcedure(procedureId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/procedures/${procedureId}/activate`, {
        method: 'PUT',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur activation Yousign' }))
        throw new Error(`Erreur activation Yousign: ${errorData.message || response.statusText}`)
      }
    } catch (error) {
      throw new Error(`Erreur activation procédure Yousign: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async getSignatureStatus(procedureId: string): Promise<YousignSignatureResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/procedures/${procedureId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur Yousign' }))
        throw new Error(`Erreur Yousign: ${errorData.message || response.statusText}`)
      }

      const procedure = await response.json()
      return this.mapToSignatureResponse(procedure)
    } catch (error) {
      throw new Error(`Erreur récupération statut Yousign: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async downloadSignedDocument(fileId: string): Promise<Buffer> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${fileId}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.api_key}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Erreur téléchargement Yousign: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      throw new Error(`Erreur téléchargement document Yousign: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async cancelSignature(procedureId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/procedures/${procedureId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur Yousign' }))
        throw new Error(`Erreur annulation Yousign: ${errorData.message || response.statusText}`)
      }
    } catch (error) {
      throw new Error(`Erreur annulation signature Yousign: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  private mapFieldType(type: 'signature' | 'text' | 'date' | 'checkbox'): string {
    const mapping: Record<string, string> = {
      signature: 'signature',
      text: 'text',
      date: 'text',
      checkbox: 'checkbox',
    }
    return mapping[type] || 'signature'
  }

  private mapToSignatureResponse(procedure: any): YousignSignatureResponse {
    return {
      id: procedure.id,
      status: this.mapStatus(procedure.status),
      created_at: procedure.createdAt || procedure.created_at,
      updated_at: procedure.updatedAt || procedure.updated_at,
      signers: (procedure.members || []).map((member: any) => ({
        id: member.id,
        status: this.mapStatus(member.status),
        email: member.user?.email || '',
        created_at: member.createdAt || member.created_at,
        updated_at: member.updatedAt || member.updated_at,
      })),
      file_objects: (procedure.fileObjects || []).map((fo: any) => ({
        id: fo.id,
        file: {
          id: fo.file?.id || '',
          name: fo.file?.name || '',
        },
      })),
      metadata: procedure.metadata,
    }
  }

  private mapStatus(yousignStatus: string): 'pending' | 'processing' | 'done' | 'refused' | 'expired' {
    const statusMapping: Record<string, 'pending' | 'processing' | 'done' | 'refused' | 'expired'> = {
      'draft': 'pending',
      'active': 'processing',
      'finished': 'done',
      'refused': 'refused',
      'expired': 'expired',
    }
    return statusMapping[yousignStatus.toLowerCase()] || 'pending'
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        method: 'GET',
        headers: this.getHeaders(),
      })
      return response.ok
    } catch {
      return false
    }
  }
}



