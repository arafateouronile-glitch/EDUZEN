import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'
import { isValidPaymentAmount, calculateInvoiceStatus } from '@/lib/utils/payment-calculations'
import { errorHandler, ErrorCode, AppError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'
import { getAllByOrganization, getById } from '@/lib/utils/supabase-helpers'

type Payment = TableRow<'payments'>
type PaymentInsert = TableInsert<'payments'>
type PaymentUpdate = TableUpdate<'payments'>
type Invoice = TableRow<'invoices'>

/**
 * Service de gestion des paiements
 * 
 * Gère les paiements avec :
 * - Validation des montants et devises
 * - Mise à jour automatique du statut des factures
 * - Support de multiples méthodes de paiement (Stripe, SEPA, Mobile Money, cash)
 * - Gestion gracieuse des erreurs de relations manquantes
 */
export class PaymentService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère tous les paiements d'une organisation
   * 
   * @param organizationId - ID de l'organisation
   * @param filters - Filtres optionnels (facture, étudiant, statut)
   * @returns Liste des paiements avec relations (factures, étudiants)
   */
  async getAll(organizationId: string, filters?: {
    invoiceId?: string
    studentId?: string
    status?: Payment['status']
  }) {
    try {
      // Utiliser le helper pour réduire la duplication
      const filtersMap: Record<string, unknown> = {}
      if (filters?.invoiceId) filtersMap.invoice_id = filters.invoiceId
      if (filters?.studentId) filtersMap.student_id = filters.studentId
      if (filters?.status) filtersMap.status = filters.status

      try {
        return await getAllByOrganization<Payment>(
          this.supabase,
          'payments',
          organizationId,
          {
            select: '*, invoices(*), students(id, first_name, last_name, student_number)',
            filters: filtersMap,
            orderBy: { column: 'created_at', ascending: false },
          }
        )
      } catch (error) {
        // Gestion gracieuse si la table n'existe pas encore ou si les relations sont manquantes
        const errorCode = (error as any)?.code || (error as any)?.originalError?.code
        const errorMessage = (error as any)?.message || String(error)
        
        // Vérifier les codes d'erreur Supabase et les messages d'erreur liés aux relations
        if (
          errorCode === 'PGRST116' || 
          errorCode === '42P01' || 
          errorCode === 'PGRST200' ||
          errorCode === 'PGRST301' ||
          errorCode === '400' ||
          errorMessage?.includes('relation') ||
          errorMessage?.includes('relationship') ||
          errorMessage?.includes('does not exist') ||
          errorMessage?.includes('schema cache')
        ) {
          logger.warn('Payments table or relations not available, returning empty array', {
            organizationId,
            errorCode,
            errorMessage,
          })
          return []
        }
        
        // Si c'est une AppError, vérifier aussi dans originalError et context
        if (error instanceof AppError) {
          const originalError = error.originalError as { code?: string; message?: string } | undefined
          if (originalError) {
            const origCode = originalError.code
            const origMessage = originalError.message || ''
            if (
              origCode === 'PGRST116' || 
              origCode === '42P01' || 
              origCode === 'PGRST200' ||
              origCode === 'PGRST301' ||
              origCode === '400' ||
              origMessage.includes('relation') ||
              origMessage.includes('relationship') ||
              origMessage.includes('does not exist') ||
              origMessage.includes('schema cache')
            ) {
              logger.warn('Payments table or relations not available (from AppError.originalError), returning empty array', {
                organizationId,
                errorCode: origCode,
                errorMessage: origMessage,
              })
              return []
            }
          }
          const contextCode = (error.context as { code?: string })?.code
          if (contextCode === 'PGRST116' || contextCode === '42P01' || contextCode === 'PGRST200' || contextCode === 'PGRST301' || contextCode === '400') {
            logger.warn('Payments table or relations not available (from AppError.context), returning empty array', {
              organizationId,
              errorCode: contextCode,
            })
            return []
          }
        }
        throw error
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        organizationId,
        operation: 'getAll',
      })
    }
  }

  /**
   * Récupère un paiement par son ID
   */
  async getById(id: string) {
    try {
      // Utiliser le helper pour réduire la duplication
      return getById<Payment>(
        this.supabase,
        'payments',
        id,
        '*, invoices(*), students(*)'
      )
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'getById',
        id,
      })
    }
  }

  /**
   * Crée un nouveau paiement
   */
  async create(payment: FlexibleInsert<'payments'>) {
    try {
      // Validation
      if (!payment.amount || Number(payment.amount) <= 0) {
        throw errorHandler.createValidationError(
          'Le montant doit être supérieur à 0',
          'amount'
        )
      }

      if (!payment.organization_id) {
        throw errorHandler.createValidationError(
          'L\'organisation est obligatoire',
          'organization_id'
        )
      }

      const { data, error } = await this.supabase
        .from('payments')
        .insert(payment as PaymentInsert)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.VALIDATION_UNIQUE_CONSTRAINT,
            operation: 'create',
            field: 'transaction_id',
          })
        }
        if (error.code === '42501') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_RLS_POLICY_VIOLATION,
            operation: 'create',
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'create',
          payment,
        })
      }

      // Mettre à jour le montant payé de la facture et son statut
      if (payment.invoice_id) {
        await this.updateInvoicePaymentStatus(payment.invoice_id)
      }

      logger.info('Paiement créé avec succès', {
        id: data?.id,
        organizationId: payment.organization_id,
        amount: payment.amount,
      })

      return data
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'create',
        payment,
      })
    }
  }

  /**
   * Met à jour un paiement
   */
  async update(id: string, updates: FlexibleUpdate<'payments'>) {
    try {
      const { data, error } = await this.supabase
        .from('payments')
        .update(updates as PaymentUpdate)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_NOT_FOUND,
            operation: 'update',
            id,
          })
        }
        if (error.code === '42501') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.DB_RLS_POLICY_VIOLATION,
            operation: 'update',
            id,
          })
        }
        throw errorHandler.handleError(error, {
          operation: 'update',
          id,
          updates,
        })
      }

      if (!data) {
        throw errorHandler.createDatabaseError(
          `Paiement avec l'ID ${id} introuvable pour la mise à jour`,
          { id }
        )
      }

      // Mettre à jour le montant payé de la facture et son statut
      if (updates.status === 'completed' || updates.status === 'failed') {
        const payment = await this.getById(id)
        if (payment && typeof payment === 'object' && 'invoice_id' in payment) {
          const invoiceId = (payment as { invoice_id?: string }).invoice_id
          if (invoiceId) {
            await this.updateInvoicePaymentStatus(invoiceId)
          }
        }
      }

      logger.info('Paiement mis à jour avec succès', {
        id,
        updates,
      })

      return data
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'update',
        id,
        updates,
      })
    }
  }

  /**
   * Met à jour le statut et le montant payé d'une facture
   */
  private async updateInvoicePaymentStatus(invoiceId: string) {
    try {
      // Calculer le total payé
      const { data: payments, error: paymentsError } = await this.supabase
        .from('payments')
        .select('amount')
        .eq('invoice_id', invoiceId)
        .eq('status', 'completed')

      if (paymentsError) {
        throw errorHandler.handleError(paymentsError, {
          operation: 'updateInvoicePaymentStatus',
          invoiceId,
          step: 'fetchPayments',
        })
      }

      const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

      // Récupérer la facture
      const { data: invoice, error: invoiceError } = await this.supabase
        .from('invoices')
        .select('total_amount')
        .eq('id', invoiceId)
        .single()

      if (invoiceError) {
        throw errorHandler.handleError(invoiceError, {
          operation: 'updateInvoicePaymentStatus',
          invoiceId,
          step: 'fetchInvoice',
        })
      }

      if (!invoice) {
        throw errorHandler.createDatabaseError(
          `Facture avec l'ID ${invoiceId} introuvable`,
          { invoiceId }
        )
      }

      // Déterminer le nouveau statut
      let newStatus: string = 'sent'
      if (totalPaid >= Number(invoice.total_amount)) {
        newStatus = 'paid'
      } else if (totalPaid > 0) {
        newStatus = 'partial'
      }

      // Vérifier si la date d'échéance est dépassée
      const { data: invoiceDetails } = await this.supabase
        .from('invoices')
        .select('due_date')
        .eq('id', invoiceId)
        .single()

      if (invoiceDetails) {
        const today = new Date()
        const dueDate = new Date(invoiceDetails.due_date)
        if (dueDate < today && newStatus !== 'paid') {
          newStatus = 'overdue'
        }
      }

      // Mettre à jour la facture
      const { error: updateError } = await this.supabase
        .from('invoices')
        .update({
          status: newStatus as Invoice['status'],
          // Note: paid_amount n'existe pas dans le schéma, on utilise les paiements pour le calcul
        })
        .eq('id', invoiceId)

      if (updateError) {
        throw errorHandler.handleError(updateError, {
          operation: 'updateInvoicePaymentStatus',
          invoiceId,
          step: 'updateInvoice',
        })
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'updateInvoicePaymentStatus',
        invoiceId,
      })
    }
  }

  /**
   * Enregistre un paiement Mobile Money
   */
  async recordMobileMoneyPayment(
    invoiceId: string,
    amount: number,
    currency: string,
    provider: 'mtn' | 'orange' | 'airtel' | 'wave',
    transactionId: string,
    phoneNumber: string
  ) {
    try {
      // Validation
      if (!transactionId) {
        throw errorHandler.createValidationError(
          'L\'ID de transaction est obligatoire',
          'transactionId'
        )
      }

      // Récupérer la facture pour avoir l'organization_id et student_id
      const { data: invoice, error: invoiceError } = await this.supabase
        .from('invoices')
        .select('organization_id, student_id')
        .eq('id', invoiceId)
        .single()

      if (invoiceError) {
        if (invoiceError.code === 'PGRST116' || invoiceError.code === '42P01') {
          throw errorHandler.handleError(invoiceError, {
            code: ErrorCode.DB_NOT_FOUND,
            operation: 'recordMobileMoneyPayment',
            invoiceId,
          })
        }
        throw errorHandler.handleError(invoiceError, {
          operation: 'recordMobileMoneyPayment',
          invoiceId,
        })
      }

      if (!invoice) {
        throw errorHandler.createDatabaseError(
          `Facture avec l'ID ${invoiceId} introuvable`,
          { invoiceId }
        )
      }

      return this.create({
        organization_id: invoice.organization_id,
        invoice_id: invoiceId,
        student_id: invoice.student_id,
        amount,
        currency,
        payment_method: 'mobile_money',
        payment_provider: provider,
        transaction_id: transactionId,
        status: 'pending', // Sera mis à jour via webhook
        metadata: {
          phone_number: phoneNumber,
        },
      })
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'recordMobileMoneyPayment',
        invoiceId,
        provider,
      })
    }
  }
}

export const paymentService = new PaymentService()

