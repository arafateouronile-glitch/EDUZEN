/**
 * Tests unitaires pour PaymentService
 * 
 * Coverage cible: >50%
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PaymentService } from '@/lib/services/payment.service'
import { createClient } from '@/lib/supabase/client'
import { AppError, ErrorCode, ErrorSeverity } from '@/lib/errors'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock helpers
vi.mock('@/lib/utils/supabase-helpers', () => ({
  getAllByOrganization: vi.fn(),
  getById: vi.fn(),
}))

describe('PaymentService', () => {
  let paymentService: PaymentService
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Réinitialiser les mocks
    vi.clearAllMocks()

    // Créer un mock Supabase
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
    }

    // Mock les méthodes chainables
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }

    mockSupabase.from = vi.fn().mockReturnValue(mockQuery)

    // Mock createClient
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    paymentService = new PaymentService(mockSupabase as any)
  })

  describe('getAll', () => {
    it('devrait récupérer tous les paiements d\'une organisation', async () => {
      const mockPayments = [
        { id: '1', amount: '1000', organization_id: 'org-1' },
        { id: '2', amount: '2000', organization_id: 'org-1' },
      ]

      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')
      vi.mocked(getAllByOrganization).mockResolvedValue(mockPayments as any)

      const result = await paymentService.getAll('org-1')

      expect(result).toEqual(mockPayments)
      expect(getAllByOrganization).toHaveBeenCalled()
    })

    it('devrait filtrer par statut', async () => {
      const mockPayments = [
        { id: '1', amount: '1000', status: 'completed' },
      ]

      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')
      vi.mocked(getAllByOrganization).mockResolvedValue(mockPayments as any)

      await paymentService.getAll('org-1', { status: 'completed' })

      expect(getAllByOrganization).toHaveBeenCalledWith(
        expect.anything(),
        'payments',
        'org-1',
        expect.objectContaining({
          filters: expect.objectContaining({ status: 'completed' }),
        })
      )
    })

    it('devrait filtrer par invoiceId et studentId', async () => {
      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')
      vi.mocked(getAllByOrganization).mockResolvedValue([])

      await paymentService.getAll('org-1', { invoiceId: 'inv-1', studentId: 'stu-1' })

      expect(getAllByOrganization).toHaveBeenCalledWith(
        expect.anything(),
        'payments',
        'org-1',
        expect.objectContaining({
          filters: expect.objectContaining({
            invoice_id: 'inv-1',
            student_id: 'stu-1',
          }),
        })
      )
    })

    it('devrait retourner un tableau vide si la table n\'existe pas', async () => {
      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')
      
      // PaymentService gère gracieusement les erreurs de table inexistante
      // getAllByOrganization transforme l'erreur Supabase en AppError via errorHandler.handleError
      // Le service vérifie d'abord error.code et error.message (ligne 58-59)
      // puis vérifie originalError si c'est une AppError (ligne 82-96)
      
      // Simuler une erreur Supabase qui sera transformée en AppError par getAllByOrganization
      // Le service vérifie originalError.message.includes('relation') (ligne 93)
      const supabaseError = { code: 'PGRST116', message: 'relation "payments" does not exist' }
      
      // Créer l'AppError comme le ferait errorHandler.handleError
      // L'originalError doit être l'erreur Supabase brute
      const appError = new AppError(
        'Table not found',
        ErrorCode.DB_NOT_FOUND,
        ErrorSeverity.LOW,
        {},
        supabaseError
      )
      
      vi.mocked(getAllByOrganization).mockRejectedValueOnce(appError)

      // Le service devrait capturer l'erreur dans le catch interne (ligne 56)
      // vérifier que c'est une AppError (ligne 82)
      // puis vérifier originalError.message.includes('relation') (ligne 93) pour retourner []
      const result = await paymentService.getAll('org-1')

      // PaymentService retourne un tableau vide pour les erreurs de table inexistante
      expect(result).toEqual([])
    })

    it('devrait retourner un tableau vide si erreur brute (code PGRST116 / message relation)', async () => {
      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')
      // Rejeter avec un objet brut (pas AppError) pour couvrir le premier if (l.62-82)
      vi.mocked(getAllByOrganization).mockRejectedValueOnce(
        Object.assign(new Error('relation "payments" does not exist'), { code: 'PGRST116' })
      )

      const result = await paymentService.getAll('org-1')

      expect(result).toEqual([])
    })

    it('devrait relancer via le catch externe si erreur non gérée (l.121-129)', async () => {
      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')
      vi.mocked(getAllByOrganization).mockRejectedValueOnce(new Error('Connection refused'))

      await expect(paymentService.getAll('org-1')).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('devrait récupérer un paiement par son ID', async () => {
      const mockPayment = {
        id: '1',
        amount: '1000',
        organization_id: 'org-1',
      }

      const { getById } = await import('@/lib/utils/supabase-helpers')
      vi.mocked(getById).mockResolvedValue(mockPayment as any)

      const result = await paymentService.getById('1')

      expect(result).toEqual(mockPayment)
      expect(getById).toHaveBeenCalledWith(
        expect.anything(),
        'payments',
        '1',
        '*, invoices(*), students(*)'
      )
    })

    it('devrait gérer les erreurs si le paiement n\'existe pas', async () => {
      const { getById } = await import('@/lib/utils/supabase-helpers')
      const { AppError, ErrorCode, ErrorSeverity } = await import('@/lib/errors')
      vi.mocked(getById).mockRejectedValue(
        new AppError('Paiement non trouvé', ErrorCode.DB_NOT_FOUND, ErrorSeverity.LOW, { id: '999' })
      )

      await expect(paymentService.getById('999')).rejects.toThrow()
    })
  })

  describe('create', () => {
    it('devrait créer un nouveau paiement', async () => {
      const newPayment = {
        organization_id: 'org-1',
        invoice_id: 'invoice-1',
        amount: '1000',
        currency: 'EUR',
        status: 'pending' as const,
      }

      const createdPayment = { id: '1', ...newPayment }

      // Mock la chaîne insert().select().single()
      const mockSingle = vi.fn().mockResolvedValue({
        data: createdPayment,
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      })
      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      })
      // Mock pour updateInvoicePaymentStatus qui fait plusieurs appels
      // 1. Récupération des paiements (from('payments').select('amount').eq().eq())
      const mockPaymentsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ amount: '1000' }],
            error: null,
          }),
        }),
      })
      
      // 2. Récupération de la facture (from('invoices').select('total_amount').eq().single())
      const mockInvoiceSelect1 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'invoice-1', total_amount: 1000 },
            error: null,
          }),
        }),
      })
      
      // 3. Récupération de due_date (from('invoices').select('due_date').eq().single())
      const mockInvoiceSelect2 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { due_date: new Date().toISOString() },
            error: null,
          }),
        }),
      })
      
      // 4. Update de la facture (from('invoices').update().eq())
      const mockInvoiceUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      })
      
      const mockFrom = vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            insert: mockInsert,
            select: mockPaymentsSelect,
          }
        }
        if (table === 'invoices') {
          let selectCallCount = 0
          return {
            select: vi.fn(() => {
              selectCallCount++
              if (selectCallCount === 1) return mockInvoiceSelect1()
              return mockInvoiceSelect2()
            }),
            update: mockInvoiceUpdate,
          }
        }
        return { insert: mockInsert }
      })

      mockSupabase.from = mockFrom

      const result = await paymentService.create(newPayment as any)

      expect(result).toHaveProperty('id')
      expect(result).toEqual(createdPayment)
      expect(mockFrom).toHaveBeenCalledWith('payments')
      expect(mockInsert).toHaveBeenCalled()
    })

    it('devrait rejeter si montant invalide ou manquant', async () => {
      await expect(
        paymentService.create({
          organization_id: 'org-1',
          amount: '0',
          currency: 'EUR',
        } as any)
      ).rejects.toThrow()

      await expect(
        paymentService.create({
          organization_id: 'org-1',
          amount: '',
          currency: 'EUR',
        } as any)
      ).rejects.toThrow()

      await expect(
        paymentService.create({
          organization_id: 'org-1',
          amount: -100,
          currency: 'EUR',
        } as any)
      ).rejects.toThrow()
    })

    it('devrait rejeter si organization_id manquant', async () => {
      await expect(
        paymentService.create({
          amount: '1000',
          currency: 'EUR',
        } as any)
      ).rejects.toThrow()
    })

    it('devrait créer un paiement sans invoice_id (pas de mise à jour facture)', async () => {
      const newPayment = {
        organization_id: 'org-1',
        amount: '500',
        currency: 'EUR',
        status: 'pending' as const,
      }
      const createdPayment = { id: '2', ...newPayment }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdPayment, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: mockInsert,
      })

      const result = await paymentService.create(newPayment as any)

      expect(result).toEqual(createdPayment)
      expect(mockSupabase.from).toHaveBeenCalledWith('payments')
      expect(mockInsert).toHaveBeenCalled()
    })

    it('devrait propager updateError lors de updateInvoicePaymentStatus (create avec invoice_id)', async () => {
      const newPayment = {
        organization_id: 'org-1',
        invoice_id: 'invoice-1',
        amount: '1000',
        currency: 'EUR',
        status: 'pending' as const,
      }
      const createdPayment = { id: '1', ...newPayment }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdPayment, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      const mockPaymentsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ amount: '1000' }], error: null }),
        }),
      })
      const mockInvoiceSelect1 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'invoice-1', total_amount: 1000 },
            error: null,
          }),
        }),
      })
      const mockInvoiceSelect2 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { due_date: new Date().toISOString() },
            error: null,
          }),
        }),
      })
      const mockInvoiceUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: { message: 'update invoice failed', code: 'PGRST_ERROR' },
        }),
      })
      let selectCallCount = 0
      const mockFrom = vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            insert: mockInsert,
            select: mockPaymentsSelect,
          }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn(() => {
              selectCallCount++
              if (selectCallCount === 1) return mockInvoiceSelect1()
              return mockInvoiceSelect2()
            }),
            update: mockInvoiceUpdate,
          }
        }
        return { insert: mockInsert }
      })
      mockSupabase.from = mockFrom

      await expect(paymentService.create(newPayment as any)).rejects.toThrow()
      expect(mockInvoiceUpdate).toHaveBeenCalled()
    })

    it('devrait propager erreur non-AppError (catch l.382) si fetch payments rejette dans updateInvoicePaymentStatus', async () => {
      const newPayment = {
        organization_id: 'org-1',
        invoice_id: 'invoice-1',
        amount: '1000',
        currency: 'EUR',
        status: 'pending' as const,
      }
      const createdPayment = { id: '1', ...newPayment }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdPayment, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      const mockPaymentsSelectReject = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockRejectedValue(new Error('fetch payments failed')),
        }),
      })
      const mockFrom = vi.fn((table: string) => {
        if (table === 'payments') {
          return {
            insert: mockInsert,
            select: mockPaymentsSelectReject,
          }
        }
        return {}
      })
      mockSupabase.from = mockFrom

      await expect(paymentService.create(newPayment as any)).rejects.toThrow()
    })

    it('devrait propager paymentsError lors du fetch payments (updateInvoicePaymentStatus)', async () => {
      const newPayment = {
        organization_id: 'org-1',
        invoice_id: 'invoice-1',
        amount: '1000',
        currency: 'EUR',
        status: 'pending' as const,
      }
      const createdPayment = { id: '1', ...newPayment }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdPayment, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      const mockPaymentsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'fetch payments failed', code: 'PGRST_ERROR' },
          }),
        }),
      })
      const mockFrom = vi.fn((table: string) => {
        if (table === 'payments') {
          return { insert: mockInsert, select: mockPaymentsSelect }
        }
        return {}
      })
      mockSupabase.from = mockFrom

      await expect(paymentService.create(newPayment as any)).rejects.toThrow()
    })

    it('devrait propager invoiceError lors du fetch invoice (updateInvoicePaymentStatus)', async () => {
      const newPayment = {
        organization_id: 'org-1',
        invoice_id: 'invoice-1',
        amount: '1000',
        currency: 'EUR',
        status: 'pending' as const,
      }
      const createdPayment = { id: '1', ...newPayment }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdPayment, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      const mockPaymentsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ amount: '1000' }], error: null }),
        }),
      })
      const mockInvoiceSelect1 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'fetch invoice failed', code: 'PGRST_ERROR' },
          }),
        }),
      })
      const mockFrom = vi.fn((table: string) => {
        if (table === 'payments') {
          return { insert: mockInsert, select: mockPaymentsSelect }
        }
        if (table === 'invoices') {
          return { select: mockInvoiceSelect1 }
        }
        return {}
      })
      mockSupabase.from = mockFrom

      await expect(paymentService.create(newPayment as any)).rejects.toThrow()
    })

    it('devrait propager createDatabaseError si facture introuvable (data null, error null)', async () => {
      const newPayment = {
        organization_id: 'org-1',
        invoice_id: 'invoice-1',
        amount: '1000',
        currency: 'EUR',
        status: 'pending' as const,
      }
      const createdPayment = { id: '1', ...newPayment }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdPayment, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      const mockPaymentsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ amount: '1000' }], error: null }),
        }),
      })
      const mockInvoiceSelect1 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      })
      const mockFrom = vi.fn((table: string) => {
        if (table === 'payments') {
          return { insert: mockInsert, select: mockPaymentsSelect }
        }
        if (table === 'invoices') {
          return { select: mockInvoiceSelect1 }
        }
        return {}
      })
      mockSupabase.from = mockFrom

      await expect(paymentService.create(newPayment as any)).rejects.toThrow()
    })

    it('devrait calculer statut partial puis mettre à jour la facture', async () => {
      const newPayment = {
        organization_id: 'org-1',
        invoice_id: 'invoice-1',
        amount: '500',
        currency: 'EUR',
        status: 'pending' as const,
      }
      const createdPayment = { id: '1', ...newPayment }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdPayment, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      const mockPaymentsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ amount: '500' }], error: null }),
        }),
      })
      const mockInvoiceSelect1 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'invoice-1', total_amount: 1000 },
            error: null,
          }),
        }),
      })
      const mockInvoiceSelect2 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { due_date: new Date(Date.now() + 86400000).toISOString() },
            error: null,
          }),
        }),
      })
      const mockInvoiceUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      let selectCallCount = 0
      const mockFrom = vi.fn((table: string) => {
        if (table === 'payments') {
          return { insert: mockInsert, select: mockPaymentsSelect }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn(() => {
              selectCallCount++
              if (selectCallCount === 1) return mockInvoiceSelect1()
              return mockInvoiceSelect2()
            }),
            update: mockInvoiceUpdate,
          }
        }
        return { insert: mockInsert }
      })
      mockSupabase.from = mockFrom

      const result = await paymentService.create(newPayment as any)
      expect(result).toEqual(createdPayment)
      expect(mockInvoiceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'partial' })
      )
    })

    it('devrait calculer statut overdue (due_date passée, totalPayé 0)', async () => {
      const newPayment = {
        organization_id: 'org-1',
        invoice_id: 'invoice-1',
        amount: '1000',
        currency: 'EUR',
        status: 'pending' as const,
      }
      const createdPayment = { id: '1', ...newPayment }
      const mockSingle = vi.fn().mockResolvedValue({ data: createdPayment, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      const mockPaymentsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })
      const mockInvoiceSelect1 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'invoice-1', total_amount: 1000 },
            error: null,
          }),
        }),
      })
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      const mockInvoiceSelect2 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { due_date: pastDate }, error: null }),
        }),
      })
      const mockInvoiceUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      let selectCallCount = 0
      const mockFrom = vi.fn((table: string) => {
        if (table === 'payments') {
          return { insert: mockInsert, select: mockPaymentsSelect }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn(() => {
              selectCallCount++
              if (selectCallCount === 1) return mockInvoiceSelect1()
              return mockInvoiceSelect2()
            }),
            update: mockInvoiceUpdate,
          }
        }
        return { insert: mockInsert }
      })
      mockSupabase.from = mockFrom

      const result = await paymentService.create(newPayment as any)
      expect(result).toEqual(createdPayment)
      expect(mockInvoiceUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'overdue' })
      )
    })
  })

  describe('update', () => {
    it('devrait mettre à jour un paiement', async () => {
      const updatedPayment = {
        id: '1',
        organization_id: 'org-1',
        amount: '1500',
        status: 'completed' as const,
        invoice_id: null,
      }
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedPayment, error: null })
      const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from = vi.fn().mockReturnValue({ update: mockUpdate })

      const { getById } = await import('@/lib/utils/supabase-helpers')
      vi.mocked(getById).mockResolvedValue({ id: '1', invoice_id: null } as any)

      const result = await paymentService.update('1', { status: 'completed', amount: '1500' } as any)

      expect(result).toEqual(updatedPayment)
      expect(mockSupabase.from).toHaveBeenCalledWith('payments')
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', '1')
    })

    it('devrait rejeter si paiement non trouvé (PGRST116)', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      })
      const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from = vi.fn().mockReturnValue({ update: mockUpdate })

      await expect(paymentService.update('999', { status: 'completed' } as any)).rejects.toThrow()
    })

    it('devrait rejeter si update retourne data null et error null (!data)', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from = vi.fn().mockReturnValue({ update: mockUpdate })

      await expect(paymentService.update('1', { status: 'completed' } as any)).rejects.toThrow()
    })

    it('devrait appeler updateInvoicePaymentStatus quand status completed et payment.invoice_id présent', async () => {
      const updatedPayment = {
        id: '1',
        organization_id: 'org-1',
        amount: '1500',
        status: 'completed' as const,
        invoice_id: 'inv-1',
      }
      const mockSingleUpdate = vi.fn().mockResolvedValue({ data: updatedPayment, error: null })
      const mockEqUpdate = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: mockSingleUpdate }),
      })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdate })
      const mockPaymentsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [{ amount: '1500' }], error: null }),
        }),
      })
      const mockInvoiceSelect1 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'inv-1', total_amount: 1500 },
            error: null,
          }),
        }),
      })
      const mockInvoiceSelect2 = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { due_date: new Date().toISOString() },
            error: null,
          }),
        }),
      })
      const mockInvoiceUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      let fromCallCount = 0
      let invoiceSelectCount = 0
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'payments') {
          if (fromCallCount === 1) {
            return { update: mockUpdate }
          }
          return { select: mockPaymentsSelect }
        }
        if (table === 'invoices') {
          return {
            select: vi.fn(() => {
              invoiceSelectCount++
              if (invoiceSelectCount === 1) return mockInvoiceSelect1()
              return mockInvoiceSelect2()
            }),
            update: mockInvoiceUpdate,
          }
        }
        return {}
      })

      const { getById } = await import('@/lib/utils/supabase-helpers')
      vi.mocked(getById).mockResolvedValue({ id: '1', invoice_id: 'inv-1' } as any)

      const result = await paymentService.update('1', { status: 'completed', amount: '1500' } as any)

      expect(result).toEqual(updatedPayment)
      expect(mockInvoiceUpdate).toHaveBeenCalled()
    })

    it('devrait propager erreur non-AppError (catch update) si update chain rejette', async () => {
      const mockSingle = vi.fn().mockRejectedValue(new Error('update failed'))
      const mockEq = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      mockSupabase.from = vi.fn().mockReturnValue({ update: mockUpdate })

      await expect(paymentService.update('1', { status: 'completed' } as any)).rejects.toThrow()
    })
  })

  describe('recordMobileMoneyPayment', () => {
    it('devrait rejeter si transactionId manquant', async () => {
      await expect(
        paymentService.recordMobileMoneyPayment(
          'inv-1',
          1000,
          'XOF',
          'mtn',
          '',
          '+221771234567'
        )
      ).rejects.toThrow()
    })

    it('devrait rejeter si facture introuvable (PGRST116)', async () => {
      const invoiceChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows' },
        }),
      }
      mockSupabase.from = vi.fn().mockReturnValue(invoiceChain)

      await expect(
        paymentService.recordMobileMoneyPayment(
          'inv-missing',
          1000,
          'XOF',
          'mtn',
          'tx-1',
          '+221771234567'
        )
      ).rejects.toThrow()
    })

    it('devrait rejeter si erreur autre que not found sur la facture', async () => {
      const invoiceChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '500', message: 'Server error' },
        }),
      }
      mockSupabase.from = vi.fn().mockReturnValue(invoiceChain)

      await expect(
        paymentService.recordMobileMoneyPayment(
          'inv-1',
          1000,
          'XOF',
          'orange',
          'tx-2',
          '+221771234567'
        )
      ).rejects.toThrow()
    })

    it('devrait rejeter si facture null (data null, error null)', async () => {
      const invoiceChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabase.from = vi.fn().mockReturnValue(invoiceChain)

      await expect(
        paymentService.recordMobileMoneyPayment(
          'inv-1',
          1000,
          'XOF',
          'wave',
          'tx-3',
          '+221771234567'
        )
      ).rejects.toThrow()
    })

    it('devrait propager erreur non-AppError (catch avec provider) si fetch facture rejette', async () => {
      const invoiceChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error('network failure')),
        }),
      }
      mockSupabase.from = vi.fn().mockReturnValue(invoiceChain)

      await expect(
        paymentService.recordMobileMoneyPayment(
          'inv-1',
          1000,
          'XOF',
          'mtn',
          'tx-err',
          '+221771234567'
        )
      ).rejects.toThrow()
    })

    it('devrait créer un paiement mobile_money si facture trouvée', async () => {
      const createdPayment = {
        id: 'pm-1',
        organization_id: 'org-1',
        invoice_id: 'inv-1',
        student_id: 'stu-1',
        amount: 1000,
        currency: 'XOF',
        payment_method: 'mobile_money',
        payment_provider: 'mtn',
        transaction_id: 'tx-4',
        status: 'pending',
      }
      const invoiceFetch = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organization_id: 'org-1', student_id: 'stu-1' },
          error: null,
        }),
      }
      const paymentsInsert = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: createdPayment, error: null }),
          }),
        }),
      }
      const paymentsSelectInnerEq = vi.fn().mockResolvedValue({
        data: [{ amount: 1000 }],
        error: null,
      })
      const paymentsSelectOuterEq = vi.fn().mockReturnValue({ eq: paymentsSelectInnerEq })
      const paymentsSelect = {
        select: vi.fn().mockReturnThis(),
        eq: paymentsSelectOuterEq,
      }
      const invoiceTotal = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { total_amount: 1000 }, error: null }),
      }
      const invoiceDue = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { due_date: new Date().toISOString() }, error: null }),
      }
      const invoiceUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      let fromCallCount = 0
      mockSupabase.from = vi.fn().mockImplementation((table: string) => {
        fromCallCount++
        if (table === 'invoices') {
          if (fromCallCount === 1) return invoiceFetch
          if (fromCallCount === 4) return invoiceTotal
          if (fromCallCount === 5) return invoiceDue
          return invoiceUpdate
        }
        if (fromCallCount === 2) return paymentsInsert
        return paymentsSelect
      })

      const result = await paymentService.recordMobileMoneyPayment(
        'inv-1',
        1000,
        'XOF',
        'mtn',
        'tx-4',
        '+221771234567'
      )

      expect(result).toEqual(createdPayment)
      expect(paymentsInsert.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-1',
          invoice_id: 'inv-1',
          student_id: 'stu-1',
          amount: 1000,
          currency: 'XOF',
          payment_method: 'mobile_money',
          payment_provider: 'mtn',
          transaction_id: 'tx-4',
          status: 'pending',
          metadata: { phone_number: '+221771234567' },
        })
      )
    })
  })
})

