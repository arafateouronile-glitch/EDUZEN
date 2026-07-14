import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
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
   * Génère un numéro unique : devis (DEV-YYYY-NNN) ou facture (FAC-YYYY-NNN).
   * Les devis et les factures ont des séquences séparées.
   */
  private async generateInvoiceNumber(organizationId: string, documentType: 'quote' | 'invoice' = 'invoice'): Promise<string> {
    const year = new Date().getFullYear().toString()
    const prefix = documentType === 'quote' ? 'DEV' : 'FAC'
    const pattern = `${prefix}-${year}-%`

    const { data: lastDoc } = await this.supabase
      .from('invoices')
      .select('invoice_number')
      .eq('organization_id', organizationId)
      .eq('document_type', documentType)
      .like('invoice_number', pattern)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    let sequence = 1
    if (lastDoc?.invoice_number) {
      const parts = lastDoc.invoice_number.split('-')
      if (parts.length >= 3 && parts[0] === prefix && parts[1] === year) {
        const lastSequence = parseInt(parts[2] || '0', 10)
        sequence = lastSequence + 1
      }
    }

    return `${prefix}-${year}-${String(sequence).padStart(3, '0')}`
  }

  /**
   * Crée une nouvelle facture
   */
  async create(invoice: InvoiceInsert) {
    try {
      // Utiliser le helper de validation pour réduire la duplication
      validateRequired(invoice, ['organization_id'])

      // Générer le numéro de facture si vide ou non fourni
      const invoiceData = invoice as InvoiceInsert & { invoice_number?: string; document_type?: 'quote' | 'invoice'; entity_id?: string | null }

      // Un devis/une facture est adressé soit à un apprenant, soit à une entité externe
      if (!invoice.student_id && !invoiceData.entity_id) {
        throw errorHandler.createValidationError(
          'Un devis ou une facture doit être associé à un apprenant ou à une entité.',
          'student_id'
        )
      }
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
      let data: Invoice | null = null
      let error: { code?: string; message?: string; details?: string } | null = null
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

      const docType = data?.document_type ?? invoice.document_type ?? 'invoice'
      const label = docType === 'quote' ? 'Devis' : 'Facture'
      logger.info(`${label} créé${docType === 'quote' ? '' : 'e'} avec succès`, {
        id: data?.id,
        organizationId: invoice.organization_id || undefined,
        invoiceNumber: data?.invoice_number,
        documentType: docType,
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
   * Transforme un devis en facture : nouveau numéro FAC + référence au devis dans les notes.
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

    const orgId = quote.organization_id as string
    if (!orgId) {
      throw errorHandler.createValidationError('Le devis doit avoir une organisation.')
    }
    const newInvoiceNumber = await this.generateInvoiceNumber(orgId, 'invoice')
    const quoteRef = `Devis de référence : ${quote.invoice_number}`
    const updatedNotes = quote.notes?.trim()
      ? `${quote.notes.trim()}\n${quoteRef}`
      : quoteRef

    const { data, error } = await this.supabase
      .from('invoices')
      .update({
        document_type: 'invoice',
        invoice_number: newInvoiceNumber,
        notes: updatedNotes,
        status: 'draft',
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
      ancienNumero: quote.invoice_number,
      nouveauNumero: newInvoiceNumber,
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

