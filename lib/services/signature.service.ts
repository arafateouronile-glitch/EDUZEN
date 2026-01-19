import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'
import { errorHandler, ErrorCode, AppError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'

type DocumentSignature = TableRow<'document_signatures'>
type DocumentSignatureInsert = TableInsert<'document_signatures'>
type DocumentSignatureUpdate = TableUpdate<'document_signatures'>

export interface CreateSignatureParams {
  documentId: string
  organizationId: string
  signerId: string
  signatureData: string // Base64 image
  signatureType?: 'handwritten' | 'typed' | 'image'
  signerName?: string
  signerEmail?: string
  signerRole?: string
  positionX?: number
  positionY?: number
  width?: number
  height?: number
  pageNumber?: number
  comment?: string
}

export interface SignatureWithUser {
  id: string
  document_id: string
  signer_id: string
  signature_data: string
  signature_type: 'handwritten' | 'typed' | 'image' | null
  signer_name: string | null
  signer_email: string | null
  signer_role: string | null
  position_x: number | null
  position_y: number | null
  width: number | null
  height: number | null
  page_number: number | null
  status: 'pending' | 'signed' | 'declined' | 'revoked' | 'expired' | null
  is_valid: boolean | null
  signed_at: string | null
  comment: string | null
  created_at: string
  signer: {
    id: string
    full_name: string | null
    email: string | null
    role: string | null
  } | null
}

/**
 * Service pour gérer les signatures électroniques de documents
 */
export class SignatureService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  /**
   * Récupère toutes les signatures d'un document
   */
  async getSignaturesByDocument(documentId: string) {
    try {
      const { data, error } = await this.supabase
        .from('document_signatures')
        .select(`
          *,
          signer:users!document_signatures_signer_id_fkey(id, full_name, email, role)
        `)
        .eq('document_id', documentId)
        .eq('status', 'signed')
        .order('signed_at', { ascending: true })

      if (error) throw error
      return (data || []) as SignatureWithUser[]
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getSignaturesByDocument',
        documentId,
      })
    }
  }

  /**
   * Récupère une signature par son ID
   */
  async getSignatureById(signatureId: string) {
    try {
      const { data, error } = await this.supabase
        .from('document_signatures')
        .select(`
          *,
          signer:users!document_signatures_signer_id_fkey(id, full_name, email, role),
          document:documents(id, title, organization_id)
        `)
        .eq('id', signatureId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw errorHandler.createNotFoundError(
            `Signature avec l'ID ${signatureId} introuvable`,
            { signatureId }
          )
        }
        throw error
      }

      return data as SignatureWithUser & {
        document: { id: string; title: string | null; organization_id: string } | null
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getSignatureById',
        signatureId,
      })
    }
  }

  /**
   * Récupère toutes les signatures d'un utilisateur
   */
  async getSignaturesByUser(userId: string, organizationId: string) {
    try {
      const { data, error } = await this.supabase
        .from('document_signatures')
        .select(`
          *,
          document:documents(id, title, type, organization_id)
        `)
        .eq('signer_id', userId)
        .eq('organization_id', organizationId)
        .order('signed_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getSignaturesByUser',
        userId,
        organizationId,
      })
    }
  }

  /**
   * Récupère toutes les signatures pour les documents liés à une session
   * (via les étudiants inscrits à la session)
   */
  async getSignaturesBySession(sessionId: string, organizationId: string) {
    try {
      // Récupérer les étudiants inscrits à la session
      const { data: enrollments, error: enrollmentsError } = await this.supabase
        .from('enrollments')
        .select('student_id')
        .eq('session_id', sessionId)
        .in('status', ['confirmed', 'completed', 'active'])

      if (enrollmentsError) throw enrollmentsError
      if (!enrollments || enrollments.length === 0) return []

      const studentIds = enrollments.map((e: any) => e.student_id).filter(Boolean)

      // Récupérer les documents de ces étudiants
      const { data: documents, error: documentsError } = await this.supabase
        .from('documents')
        .select('id')
        .eq('organization_id', organizationId)
        .in('student_id', studentIds)

      if (documentsError) throw documentsError
      if (!documents || documents.length === 0) return []

      const documentIds = documents.map((d: any) => d.id)

      // Récupérer les signatures de ces documents
      const { data, error } = await this.supabase
        .from('document_signatures')
        .select(`
          *,
          signer:users!document_signatures_signer_id_fkey(id, full_name, email, role),
          document:documents(id, title, type, student_id, students(id, first_name, last_name))
        `)
        .in('document_id', documentIds)
        .eq('organization_id', organizationId)
        .order('signed_at', { ascending: false })

      if (error) throw error
      return (data || []) as (SignatureWithUser & {
        document: {
          id: string
          title: string | null
          type: string | null
          student_id: string | null
          students: { id: string; first_name: string | null; last_name: string | null } | null
        } | null
      })[]
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'getSignaturesBySession',
        sessionId,
        organizationId,
      })
    }
  }

  /**
   * Crée une nouvelle signature
   */
  async createSignature(params: CreateSignatureParams) {
    try {
      // Récupérer les informations de l'utilisateur
      const { data: userData } = await this.supabase.auth.getUser()
      if (!userData.user) {
        throw errorHandler.createAuthError(ErrorCode.AUTH_REQUIRED, 'Utilisateur non authentifié')
      }

      // Générer un code de validation
      const validationCode = this.generateValidationCode()

      // Récupérer l'IP et le user agent si disponibles
      let ipAddress: string | null = null
      let userAgent: string | null = null
      
      if (typeof window !== 'undefined') {
        userAgent = navigator.userAgent
        // L'IP sera récupérée côté serveur si nécessaire
      }

      const signatureData: FlexibleInsert<'document_signatures'> = {
        document_id: params.documentId,
        organization_id: params.organizationId,
        signer_id: params.signerId,
        signature_data: params.signatureData,
        signature_type: params.signatureType || 'handwritten',
        signer_name: params.signerName || userData.user.user_metadata?.full_name || 'Utilisateur',
        signer_email: params.signerEmail || userData.user.email || null,
        signer_role: params.signerRole || null,
        position_x: params.positionX || null,
        position_y: params.positionY || null,
        width: params.width || 200,
        height: params.height || 80,
        page_number: params.pageNumber || 1,
        status: 'signed',
        is_valid: true,
        validation_code: validationCode,
        comment: params.comment || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      }

      const { data, error } = await this.supabase
        .from('document_signatures')
        .insert(signatureData as DocumentSignatureInsert)
        .select(`
          *,
          signer:users!document_signatures_signer_id_fkey(id, full_name, email, role)
        `)
        .single()

      if (error) throw error

      logger.info('Signature créée', {
        signatureId: data.id,
        documentId: params.documentId,
        signerId: params.signerId,
      })

      return data as SignatureWithUser
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'createSignature',
        documentId: params.documentId,
        signerId: params.signerId,
      })
    }
  }

  /**
   * Met à jour une signature
   */
  async updateSignature(signatureId: string, updates: FlexibleUpdate<'document_signatures'>) {
    try {
      const { data, error } = await this.supabase
        .from('document_signatures')
        .update(updates as DocumentSignatureUpdate)
        .eq('id', signatureId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw errorHandler.createNotFoundError(
            `Signature avec l'ID ${signatureId} introuvable`,
            { signatureId }
          )
        }
        throw error
      }

      return data
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'updateSignature',
        signatureId,
      })
    }
  }

  /**
   * Révoque une signature
   */
  async revokeSignature(signatureId: string, reason?: string) {
    try {
      return this.updateSignature(signatureId, {
        status: 'revoked',
        is_valid: false,
        comment: reason || 'Signature révoquée',
      })
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'revokeSignature',
        signatureId,
      })
    }
  }

  /**
   * Supprime une signature
   */
  async deleteSignature(signatureId: string) {
    try {
      const { error } = await this.supabase
        .from('document_signatures')
        .delete()
        .eq('id', signatureId)

      if (error) throw error

      logger.info('Signature supprimée', { signatureId })
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'deleteSignature',
        signatureId,
      })
    }
  }

  /**
   * Vérifie si un document a des signatures
   */
  async hasSignatures(documentId: string): Promise<boolean> {
    try {
      const { count, error } = await this.supabase
        .from('document_signatures')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId)
        .eq('status', 'signed')

      if (error) throw error
      return (count || 0) > 0
    } catch (error) {
      if (error instanceof AppError) throw error
      throw errorHandler.handleError(error, {
        operation: 'hasSignatures',
        documentId,
      })
    }
  }

  /**
   * Génère un code de validation pour la signature
   */
  private generateValidationCode(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    return `${timestamp}-${random}`
  }

  /**
   * Valide l'intégrité d'une signature
   */
  async validateSignature(signatureId: string, validationCode: string): Promise<boolean> {
    try {
      const signature = await this.getSignatureById(signatureId)
      const sig = signature as any
      return (sig.validation_code === validationCode) && (sig.is_valid === true)
    } catch (error) {
      return false
    }
  }
}

// Note: signatureService doit être instancié avec un client Supabase
// Pour les routes API: new SignatureService(await createClient()) avec le client serveur
// Pour les composants client: new SignatureService(createClient()) avec le client client

