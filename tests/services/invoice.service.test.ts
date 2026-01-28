/**
 * Tests unitaires pour InvoiceService
 * 
 * Coverage cible: >50%
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InvoiceService } from '@/lib/services/invoice.service'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock helpers
vi.mock('@/lib/utils/supabase-helpers', () => ({
  getAllByOrganization: vi.fn(),
  getById: vi.fn(),
}))

describe('InvoiceService', () => {
  let invoiceService: InvoiceService
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
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    }

    mockSupabase.from = vi.fn().mockReturnValue(mockQuery)

    // Mock createClient
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)

    invoiceService = new InvoiceService(mockSupabase as any)
  })

  describe('getAll', () => {
    it('devrait récupérer toutes les factures d\'une organisation', async () => {
      const mockInvoices = [
        { id: '1', invoice_number: 'FAC-001', organization_id: 'org-1' },
        { id: '2', invoice_number: 'FAC-002', organization_id: 'org-1' },
      ]

      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')
      vi.mocked(getAllByOrganization).mockResolvedValue(mockInvoices as any)

      const result = await invoiceService.getAll('org-1')

      expect(result).toEqual(mockInvoices)
      expect(getAllByOrganization).toHaveBeenCalled()
    })

    it('devrait filtrer par statut', async () => {
      const mockInvoices = [
        { id: '1', invoice_number: 'FAC-001', status: 'sent' },
      ]

      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')
      vi.mocked(getAllByOrganization).mockResolvedValue(mockInvoices as any)

      await invoiceService.getAll('org-1', { status: 'sent' })

      expect(getAllByOrganization).toHaveBeenCalledWith(
        expect.anything(),
        'invoices',
        'org-1',
        expect.objectContaining({
          filters: expect.objectContaining({ status: 'sent' }),
        })
      )
    })

    it('devrait gérer les erreurs', async () => {
      const { getAllByOrganization } = await import('@/lib/utils/supabase-helpers')
      const { AppError, ErrorCode, ErrorSeverity } = await import('@/lib/errors')
      
      vi.mocked(getAllByOrganization).mockRejectedValue(
        new AppError('Database error', ErrorCode.DB_ERROR, ErrorSeverity.HIGH)
      )

      await expect(invoiceService.getAll('org-1')).rejects.toThrow()
    })
  })

  describe('getById', () => {
    it('devrait récupérer une facture par son ID', async () => {
      const mockInvoice = {
        id: '1',
        invoice_number: 'FAC-001',
        organization_id: 'org-1',
      }

      const { getById } = await import('@/lib/utils/supabase-helpers')
      vi.mocked(getById).mockResolvedValue(mockInvoice as any)

      const result = await invoiceService.getById('1')

      expect(result).toEqual(mockInvoice)
      expect(getById).toHaveBeenCalledWith(
        expect.anything(),
        'invoices',
        '1',
        '*, students(*), enrollments(*), payments(*)'
      )
    })

    it('devrait gérer les erreurs si la facture n\'existe pas', async () => {
      const { getById } = await import('@/lib/utils/supabase-helpers')
      const { AppError, ErrorCode, ErrorSeverity } = await import('@/lib/errors')
      
      vi.mocked(getById).mockRejectedValue(
        new AppError('Facture non trouvée', ErrorCode.DB_NOT_FOUND, ErrorSeverity.LOW, { id: '999' })
      )

      await expect(invoiceService.getById('999')).rejects.toThrow()
    })
  })

  describe('create', () => {
    it('devrait créer une nouvelle facture', async () => {
      const newInvoice = {
        organization_id: 'org-1',
        student_id: 'student-1',
        amount: 1000,
        currency: 'EUR',
      }

      const createdInvoice = { id: '1', invoice_number: '2025-001', ...newInvoice }

      // Mock generateInvoiceNumber pour éviter l'appel à maybeSingle
      const generateSpy = vi.spyOn(InvoiceService.prototype as any, 'generateInvoiceNumber')
      generateSpy.mockResolvedValue('2025-001')

      // Mock la chaîne insert().select().single()
      const mockSingle = vi.fn().mockResolvedValue({
        data: createdInvoice,
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      })
      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect,
      })
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        like: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      mockSupabase.from = mockFrom

      const result = await invoiceService.create(newInvoice as any)

      expect(result).toHaveProperty('id')
      expect(result).toEqual(createdInvoice)
      expect(mockFrom).toHaveBeenCalledWith('invoices')
      expect(mockInsert).toHaveBeenCalled()
    })

    it('devrait valider les champs requis', async () => {
      const invalidInvoice = {
        organization_id: 'org-1',
        // student_id manquant
      }

      await expect(invoiceService.create(invalidInvoice as any)).rejects.toThrow()
    })
  })
})





