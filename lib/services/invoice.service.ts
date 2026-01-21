import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { errorHandler, ErrorCode, AppError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'
import { getAllByOrganization, getById } from '@/lib/utils/supabase-helpers'
import { generateUniqueNumber } from '@/lib/utils/number-generator'
import { validateRequired, validatePositiveAmount } from '@/lib/utils/validators'

type Invoice = Database['public']['Tables']['invoices']['Row']
type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']

export class InvoiceService {
  private supabase: SupabaseClient<Database>

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  /**
   * Récupère toutes les factures d'une organisation
   */
  async getAll(organizationId: string, filters?: {
    studentId?: string
    status?: Invoice['status']
    search?: string
    documentType?: 'quote' | 'invoice'
  }) {
    try {
      // Utiliser le helper pour réduire la duplication
      const filtersMap: Record<string, unknown> = {}
      if (filters?.studentId) filtersMap.student_id = filters.studentId
      if (filters?.status) filtersMap.status = filters.status
      if (filters?.documentType) filtersMap.document_type = filters.documentType

      return getAllByOrganization<Invoice>(
        this.supabase,
        'invoices',
        organizationId,
        {
          select: '*, students(id, first_name, last_name, student_number), payments(id, amount, status, paid_at)',
          filters: filtersMap,
          search: filters?.search ? { field: 'invoice_number', value: filters.search } : undefined,
          orderBy: { column: 'issue_date', ascending: false },
        }
      )
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
   * Récupère une facture par son ID
   */
  async getById(id: string) {
    try {
      // Utiliser le helper pour réduire la duplication
      return getById<Invoice>(
        this.supabase,
        'invoices',
        id,
        '*, students(*), enrollments(*), payments(*)'
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
   * Génère un numéro de facture unique
   */
  private async generateInvoiceNumber(organizationId: string, documentType: 'quote' | 'invoice' = 'invoice'): Promise<string> {
    const year = new Date().getFullYear().toString()
    
    // Trouver le dernier numéro pour cette organisation (TOUS types) pour l'année en cours
    // Format recherché: ANNEE-NUMERO (ex: 2025-001)
    const { data: lastInvoice } = await this.supabase
      .from('invoices')
      .select('invoice_number')
      .eq('organization_id', organizationId)
      .like('invoice_number', `${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    let sequence = 1
    if (lastInvoice?.invoice_number) {
      // Extraire le numéro de séquence du format ANNEE-NUMERO
      const parts = lastInvoice.invoice_number.split('-')
      if (parts.length >= 2 && parts[0] === year) {
        const lastSequence = parseInt(parts[1] || '0', 10)
        sequence = lastSequence + 1
      }
    }

    // Format: ANNEE-NUMERO avec 3 chiffres (ex: 2025-001, 2025-002, etc.)
    return `${year}-${String(sequence).padStart(3, '0')}`
  }

  /**
   * Crée une nouvelle facture
   */
  async create(invoice: InvoiceInsert) {
    try {
      // Utiliser le helper de validation pour réduire la duplication
      validateRequired(invoice, ['organization_id', 'student_id'])

      // Générer le numéro de facture si vide ou non fourni
      const invoiceData = invoice as InvoiceInsert & { invoice_number?: string; document_type?: 'quote' | 'invoice' }
      let invoiceNumber = invoiceData.invoice_number
      const shouldAutoGenerateNumber = !invoiceNumber || invoiceNumber.trim() === ''
      if (shouldAutoGenerateNumber) {
        const orgId = invoice.organization_id
        if (!orgId) {
          throw errorHandler.createValidationError('Organization ID is required to create an invoice.')
        }
        invoiceNumber = await this.generateInvoiceNumber(
          orgId,
          invoiceData.document_type || 'invoice'
        )
      }

      // Insertion avec retry sur collision de numéro (contrainte unique org+invoice_number)
      let data: any = null
      let error: any = null
      const maxAttempts = shouldAutoGenerateNumber ? 3 : 1
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await this.supabase
          .from('invoices')
          .insert({
            ...invoice,
            invoice_number: invoiceNumber,
          } as InvoiceInsert)
          .select()
          .single()

        data = res.data
        error = res.error

        if (!error) break

        const isUniqueViolation = error.code === '23505'
        const isInvoiceNumberConflict =
          isUniqueViolation &&
          (String(error.message || '').includes('invoice_number') ||
            String(error.message || '').includes('invoices_organization_id_invoice_number_key') ||
            String(error.details || '').includes('invoice_number'))

        if (shouldAutoGenerateNumber && isInvoiceNumberConflict && attempt < maxAttempts) {
          // Régénérer et réessayer (collision possible en cas de créations simultanées)
          invoiceNumber = await this.generateInvoiceNumber(
            invoice.organization_id as string,
            invoiceData.document_type || 'invoice'
          )
          continue
        }

        break
      }

      if (error) {
        if (error.code === '23505') {
          throw errorHandler.handleError(error, {
            code: ErrorCode.VALIDATION_UNIQUE_CONSTRAINT,
            operation: 'create',
            field: 'invoice_number',
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
          invoice,
        })
      }

      logger.info('Facture créée avec succès', {
        id: data?.id,
        organizationId: invoice.organization_id || undefined,
        invoiceNumber: data?.invoice_number,
      })

      return data
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'create',
        invoice,
      })
    }
  }

  /**
   * Met à jour une facture
   */
  async update(id: string, updates: InvoiceUpdate) {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .update(updates)
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
          `Facture avec l'ID ${id} introuvable pour la mise à jour`,
          { id }
        )
      }

      logger.info('Facture mise à jour avec succès', {
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
   * Génère des factures en masse pour une classe
   */
  async generateForClass(
    organizationId: string,
    classId: string,
    amount: number,
    currency: string,
    dueDate: string,
    type: 'tuition' | 'registration' | 'other' = 'tuition'
  ) {
    // Récupérer tous les élèves actifs de la classe
    const { data: students, error: studentsError } = await this.supabase
      .from('students')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('class_id', classId)
      .eq('status', 'active')

    if (studentsError) {
      throw errorHandler.handleError(studentsError, {
        operation: 'generateForClass',
        organizationId,
        classId,
        step: 'fetchStudents',
      })
    }
    if (!students || students.length === 0) {
      throw errorHandler.createValidationError(
        'Aucun élève actif dans cette classe',
        'classId'
      )
    }

    // Générer le préfixe de numéro
    const { data: organization } = await this.supabase
      .from('organizations')
      .select('code')
      .eq('id', organizationId)
      .single()

    const orgCode = organization?.code || 'ORG'
    const year = new Date().getFullYear().toString().slice(-2)
    const prefix = 'FAC'
    
    // Trouver le dernier numéro pour cette organisation
    const { data: lastInvoice } = await this.supabase
      .from('invoices')
      .select('invoice_number')
      .eq('organization_id', organizationId)
      .like('invoice_number', `${prefix}-${orgCode}-${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    let sequence = 1
    if (lastInvoice?.invoice_number) {
      const parts = lastInvoice.invoice_number.split('-')
      const lastSequence = parseInt(parts[parts.length - 1] || '0')
      sequence = lastSequence + 1
    }

    // Générer les factures avec numéros uniques
    const invoices = students.map((student, index) => ({
      organization_id: organizationId,
      student_id: student.id,
      invoice_number: `${prefix}-${orgCode}-${year}-${String(sequence + index).padStart(6, '0')}`,
      type,
      document_type: 'invoice' as const,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: dueDate,
      amount: amount,
      tax_amount: 0,
      total_amount: amount,
      currency,
      status: 'draft' as const,
      items: [],
    }))

    const { data, error } = await this.supabase
      .from('invoices')
      .insert(invoices as InvoiceInsert[])
      .select()

    if (error) {
      throw errorHandler.handleError(error, {
        operation: 'generateForClass',
        organizationId,
        classId,
        count: invoices.length,
      })
    }

    logger.info('Factures générées en masse avec succès', {
      organizationId,
      classId,
      count: data?.length || 0,
    })

    return data || []
  }

  /**
   * Récupère les factures impayées (overdue)
   */
  async getOverdue(organizationId: string) {
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select('*, students(id, first_name, last_name, student_number)') // ✅ Jointure optimisée
        .eq('organization_id', organizationId)
        .eq('document_type', 'invoice') // Seulement les factures, pas les devis
        .in('status', ['sent', 'partial'])
        .lt('due_date', today)
        .order('due_date', { ascending: true })

      if (error) {
        throw errorHandler.handleError(error, {
          operation: 'getOverdue',
          organizationId,
        })
      }

      return data || []
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'getOverdue',
        organizationId,
      })
    }
  }

  /**
   * Transforme un devis en facture
   */
  async convertQuoteToInvoice(quoteId: string) {
    try {
    const { data: quote, error: quoteError } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('id', quoteId)
      .eq('document_type', 'quote')
      .single()

    if (quoteError) {
      if (quoteError.code === 'PGRST116' || quoteError.code === '42P01') {
        throw errorHandler.handleError(quoteError, {
          code: ErrorCode.DB_NOT_FOUND,
          operation: 'convertQuoteToInvoice',
          quoteId,
        })
      }
      throw errorHandler.handleError(quoteError, {
        operation: 'convertQuoteToInvoice',
        quoteId,
        step: 'fetchQuote',
      })
    }
    if (!quote) {
      throw errorHandler.createDatabaseError(
        `Devis avec l'ID ${quoteId} introuvable`,
        { quoteId }
      )
    }

    // Mettre à jour le devis pour en faire une facture
    const { data, error } = await this.supabase
      .from('invoices')
      .update({
        document_type: 'invoice',
        status: 'draft', // Facture créée en brouillon, à envoyer ensuite
        issue_date: quote.issue_date || new Date().toISOString().split('T')[0],
      })
      .eq('id', quoteId)
      .select()
      .single()

    if (error) {
      throw errorHandler.handleError(error, {
        operation: 'convertQuoteToInvoice',
        quoteId,
        step: 'updateInvoice',
      })
    }

    logger.info('Devis converti en facture avec succès', {
      quoteId,
      invoiceId: data?.id,
    })

    return data
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw errorHandler.handleError(error, {
        operation: 'convertQuoteToInvoice',
        quoteId,
      })
    }
  }
}

// Note: invoiceService doit être instancié avec un client Supabase
// Pour les routes API: new InvoiceService(await createClient()) avec le client serveur
// Pour les composants client: new InvoiceService(createClient()) avec le client client

