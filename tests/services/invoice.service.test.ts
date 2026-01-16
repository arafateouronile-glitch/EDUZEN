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

    invoiceService = new InvoiceService()
  })

  describe('getAll', () => {
    it('devrait récupérer toutes les factures d\'une organisation', async () => {
      const mockInvoices = [
        { id: '1', invoice_number: 'FAC-001', organization_id: 'org-1' },
        { id: '2', invoice_number: 'FAC-002', organization_id: 'org-1' },
      ]

      const mockQuery = mockSupabase.from('invoices')
      mockQuery.order.mockResolvedValue({
        data: mockInvoices,
        error: null,
      })

      const result = await invoiceService.getAll('org-1')

      expect(result).toEqual(mockInvoices)
      expect(mockSupabase.from).toHaveBeenCalledWith('invoices')
    })

    it('devrait filtrer par statut', async () => {
      const mockInvoices = [
        { id: '1', invoice_number: 'FAC-001', status: 'sent' },
      ]

      const mockQuery = mockSupabase.from('invoices')
      mockQuery.order.mockResolvedValue({
        data: mockInvoices,
        error: null,
      })

      await invoiceService.getAll('org-1', { status: 'sent' })

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'sent')
    })

    it('devrait gérer les erreurs', async () => {
      const mockQuery = mockSupabase.from('invoices')
      mockQuery.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'PGRST116' },
      })

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

      const mockQuery = mockSupabase.from('invoices')
      mockQuery.single.mockResolvedValue({
        data: mockInvoice,
        error: null,
      })

      const result = await invoiceService.getById('1')

      expect(result).toEqual(mockInvoice)
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1')
    })

    it('devrait gérer les erreurs si la facture n\'existe pas', async () => {
      const mockQuery = mockSupabase.from('invoices')
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      })

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

      const mockQuery = mockSupabase.from('invoices')
      mockQuery.single.mockResolvedValue({
        data: { id: '1', ...newInvoice },
        error: null,
      })

      // Mock generateInvoiceNumber
      const generateSpy = vi.spyOn(InvoiceService.prototype as any, 'generateInvoiceNumber')
      generateSpy.mockResolvedValue('FAC-ORG-24-000001')

      const result = await invoiceService.create(newInvoice as any)

      expect(result).toHaveProperty('id')
      expect(mockQuery.insert).toHaveBeenCalled()
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





