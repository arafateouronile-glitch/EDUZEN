/**
 * Tests d'intégration pour le workflow de paiement
 * Teste l'intégration complète : création de facture, paiement, mise à jour du statut
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PaymentService } from '@/lib/services/payment.service'
import { InvoiceService } from '@/lib/services/invoice.service'
import { NotificationService } from '@/lib/services/notification.service'
// Mock Supabase client avec vi.hoisted pour résoudre les problèmes d'initialisation
const { mockSupabase } = vi.hoisted(() => {
  // Créer le mock directement ici pour éviter les problèmes d'import
  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    rpc: vi.fn(),
  }
  
  // Toutes les méthodes chainables retournent le mock lui-même
  const chainableMethods = ['from', 'select', 'eq', 'in', 'is', 'insert', 'update', 'upsert', 'delete', 'order', 'limit', 'rpc']
  chainableMethods.forEach((method) => {
    mock[method].mockImplementation(() => mock)
  })
  
  // single(), maybeSingle(), et range() retournent des promesses
  mock.single.mockResolvedValue({ data: null, error: null })
  mock.maybeSingle.mockResolvedValue({ data: null, error: null })
  mock.range.mockResolvedValue({ data: [], error: null, count: 0 })
  
  return { mockSupabase: mock }
})

import { resetMockSupabase } from '@/tests/__mocks__/supabase-query-builder'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('Workflow: Paiement', () => {
  let paymentService: PaymentService
  let invoiceService: InvoiceService
  let notificationService: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    // Réappliquer les implémentations après clearAllMocks (sans resetMockSupabase qui casse le chaînage)
    const chainableMethods = ['from', 'select', 'eq', 'in', 'is', 'insert', 'update', 'upsert', 'delete', 'order', 'limit', 'rpc']
    chainableMethods.forEach((method) => {
      ;(mockSupabase as any)[method].mockImplementation(() => mockSupabase)
    })
    ;(mockSupabase as any).single.mockImplementation(() => Promise.resolve({ data: null, error: null }))
    ;(mockSupabase as any).maybeSingle.mockImplementation(() => Promise.resolve({ data: null, error: null }))
    ;(mockSupabase as any).range.mockImplementation(() => Promise.resolve({ data: [], error: null, count: 0 }))
    paymentService = new PaymentService()
    invoiceService = new InvoiceService()
    notificationService = new NotificationService()
  })

  it('devrait créer un paiement et mettre à jour le statut de la facture', async () => {
    const organizationId = 'org-1'
    const invoiceId = 'invoice-1'
    const studentId = 'student-1'

    // 1. Mock: Récupérer la facture (PaymentService.create vérifie la facture d'abord)
    const invoice = {
      id: invoiceId,
      organization_id: organizationId,
      student_id: studentId,
      total_amount: 10000,
      currency: 'XOF',
      status: 'pending',
      due_date: new Date().toISOString(),
    }

    // Mock les requêtes Supabase dans l'ordre
    let fromCallCount = 0
    const createQueryWithThen = (data: any) => {
      const query: any = { ...mockSupabase }
      query.then = (resolve: any) => Promise.resolve({ data, error: null }).then(resolve)
      return query
    }

    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++
      if (fromCallCount === 1 && table === 'payments') {
        return mockSupabase // Créer le paiement
      }
      if (fromCallCount === 2 && table === 'invoices') {
        return mockSupabase // updateInvoicePaymentStatus: récupérer facture
      }
      if (fromCallCount === 3 && table === 'payments') {
        return createQueryWithThen([{ amount: 10000 }]) // updateInvoicePaymentStatus: récupérer paiements (sans single)
      }
      if (fromCallCount === 4 && table === 'invoices') {
        return mockSupabase // updateInvoicePaymentStatus: mettre à jour facture
      }
      return mockSupabase
    })

    // PaymentService.create utilise directement insert().select().single() sans vérifier la facture d'abord
    // Mais ensuite il appelle updateInvoicePaymentStatus qui récupère la facture et les paiements
    mockSupabase.single
      .mockResolvedValueOnce({
        // Créer le paiement (premier appel à single())
        data: {
          id: 'payment-1',
          invoice_id: invoiceId,
          amount: 10000,
          currency: 'XOF',
          payment_method: 'cash',
          status: 'completed',
          payment_date: new Date().toISOString(),
          organization_id: organizationId,
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: invoice, error: null }) // updateInvoicePaymentStatus: récupérer facture
      .mockResolvedValueOnce({ data: [{ amount: 10000 }], error: null }) // updateInvoicePaymentStatus: récupérer paiements (sans single, donc via then())
      .mockResolvedValueOnce({ data: { ...invoice, status: 'paid' }, error: null }) // updateInvoicePaymentStatus: mettre à jour facture

    // Mock: Créer une notification (utilise rpc puis from().select().eq().single())
    mockSupabase.rpc.mockResolvedValueOnce({
      data: 'notification-1',
      error: null,
    })

    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'notification-1',
        user_id: 'user-1',
        organization_id: organizationId,
        type: 'payment',
        title: 'Paiement reçu',
        created_at: new Date().toISOString(),
      },
      error: null,
    })

    // Exécuter le workflow
    const paymentData = {
      invoice_id: invoiceId,
      amount: 10000,
      currency: 'XOF',
      payment_method: 'cash',
      payment_date: new Date().toISOString(),
      organization_id: organizationId,
    }

    const result = await paymentService.create(paymentData)

    expect(result).toBeDefined()
    expect(result.id).toBe('payment-1')
    expect(result.status).toBe('completed')
  })

  it('devrait gérer un paiement partiel', async () => {
    const organizationId = 'org-1'
    const invoiceId = 'invoice-1'
    const invoice = {
      id: invoiceId,
      organization_id: organizationId,
      total_amount: 10000,
      currency: 'XOF',
      status: 'pending',
    }

    // Mock les requêtes Supabase dans l'ordre
    let fromCallCount = 0
    const createQueryWithThen = (data: any) => {
      const query: any = { ...mockSupabase }
      query.then = (resolve: any) => Promise.resolve({ data, error: null }).then(resolve)
      return query
    }

    const payment = {
      id: 'payment-1',
      invoice_id: invoiceId,
      amount: 5000,
      currency: 'XOF',
      payment_method: 'cash',
      status: 'completed',
      organization_id: organizationId,
      created_at: new Date().toISOString(),
    }

    // L'ordre des appels dans PaymentService.create() :
    // 1. from('payments').insert().select().single() - crée le paiement
    // 2. updateInvoicePaymentStatus() :
    //    a. from('payments').select('amount').eq().eq() - récupère les paiements (sans single, donc avec then())
    //    b. from('invoices').select('total_amount').eq().single() - récupère total_amount
    //    c. from('invoices').select('due_date').eq().single() - récupère due_date
    //    d. from('invoices').update().eq() - met à jour (pas de single)
    
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++
      if (fromCallCount === 1 && table === 'payments') {
        return mockSupabase // Créer le paiement
      }
      if (fromCallCount === 2 && table === 'payments') {
        return createQueryWithThen([{ amount: 5000 }]) // updateInvoicePaymentStatus: récupérer paiements (sans single)
      }
      if (fromCallCount === 3 && table === 'invoices') {
        return mockSupabase // updateInvoicePaymentStatus: récupérer total_amount
      }
      if (fromCallCount === 4 && table === 'invoices') {
        return mockSupabase // updateInvoicePaymentStatus: récupérer due_date
      }
      if (fromCallCount === 5 && table === 'invoices') {
        return mockSupabase // updateInvoicePaymentStatus: mettre à jour facture (pas de single)
      }
      return mockSupabase
    })

    // L'ordre des appels à single() :
    // 1. Créer le paiement (premier single)
    // 2. Récupérer total_amount (deuxième single)
    // 3. Récupérer due_date (troisième single)
    mockSupabase.single
      .mockResolvedValueOnce({
        // Créer le paiement partiel (premier appel à single())
        data: payment,
        error: null,
      })
      .mockResolvedValueOnce({ data: { total_amount: 10000 }, error: null }) // updateInvoicePaymentStatus: récupérer total_amount (deuxième single)
      .mockResolvedValueOnce({ data: { due_date: new Date().toISOString() }, error: null }) // updateInvoicePaymentStatus: récupérer due_date (troisième single)

    const result = await paymentService.create({
      invoice_id: invoiceId,
      amount: 5000,
      currency: 'XOF',
      organization_id: organizationId,
      payment_method: 'cash',
    })

    expect(result).toBeDefined()
    expect(result.id).toBe('payment-1')
    expect(result.amount).toBe(5000)
  })

  it('devrait envoyer une notification après un paiement réussi', async () => {
    const invoiceId = 'invoice-1'
    const userId = 'user-1'
    const organizationId = 'org-1'

    const payment = {
      id: 'payment-1',
      invoice_id: invoiceId,
      amount: 10000,
      status: 'completed',
    }

    mockSupabase.single.mockResolvedValueOnce({
      data: payment,
      error: null,
    })

    // Mock: Créer la notification
    mockSupabase.rpc.mockResolvedValueOnce({
      data: 'notification-1',
      error: null,
    })

    // Le service devrait créer une notification
    const notification = await notificationService.create({
      user_id: userId,
      organization_id: organizationId,
      type: 'payment',
      title: 'Paiement reçu',
      message: 'Un paiement de 10000 XOF a été enregistré',
      link: `/dashboard/payments/${payment.id}`,
    })

    expect(notification).toBeDefined()
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'create_notification',
      expect.objectContaining({
        p_type: 'payment',
        p_title: 'Paiement reçu',
      })
    )
  })
})
