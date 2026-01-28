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
  })
})

