/**
 * Tests unitaires pour SupportService
 * Couverture : catégories, tickets, ratings, gestion d'erreurs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SupportService } from '@/lib/services/support.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const createMockSupabase = (): SupabaseClient<Database> => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>
}

describe('SupportService', () => {
  let service: SupportService
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    mockSupabase = createMockSupabase()
    service = new SupportService(mockSupabase)
    vi.clearAllMocks()
  })

  describe('getCategories', () => {
    it('devrait retourner les catégories actives d\'une organisation', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Technique', organization_id: 'org-1', is_active: true },
      ]
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.order.mockResolvedValue({ data: mockCategories, error: null })

      const result = await service.getCategories('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('support_categories')
      expect(result).toEqual(mockCategories)
    })

    it('devrait retourner [] si la table n\'existe pas (PGRST116)', async () => {
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.order.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } })

      const result = await service.getCategories('org-1')

      expect(result).toEqual([])
    })

    it('devrait retourner [] si relation does not exist', async () => {
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.order.mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'relation "support_categories" does not exist' },
      })

      const result = await service.getCategories('org-1')

      expect(result).toEqual([])
    })

    it('devrait propager les autres erreurs', async () => {
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.order.mockResolvedValue({ data: null, error: { message: 'Connection refused' } })

      await expect(service.getCategories('org-1')).rejects.toEqual({ message: 'Connection refused' })
    })
  })

  describe('getTickets', () => {
    it('devrait retourner les tickets filtrés par organisation', async () => {
      const mockTickets = [
        { id: 't1', organization_id: 'org-1', status: 'open', priority: 'medium' },
      ]
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.select.mockReturnValue(chain)
      chain.order.mockResolvedValue({ data: mockTickets, error: null })

      const result = await service.getTickets('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('support_tickets')
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(result).toEqual(mockTickets)
    })

    it('devrait filtrer par status et categoryId', async () => {
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.select.mockReturnValue(chain)
      chain.order.mockResolvedValue({ data: [], error: null })

      await service.getTickets('org-1', { status: 'closed', categoryId: 'cat-1' })

      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(chain.eq).toHaveBeenCalledWith('status', 'closed')
      expect(chain.eq).toHaveBeenCalledWith('category_id', 'cat-1')
    })
  })

  describe('createRating', () => {
    it('devrait créer un avis sur un ticket', async () => {
      const insertPayload = {
        ticket_id: 'ticket-1',
        user_id: 'user-1',
        rating: 5,
        comment: 'Très bien',
      }
      const created = { id: 'r1', ...insertPayload, created_at: new Date().toISOString() }
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.insert.mockReturnValue(chain)
      chain.select.mockReturnValue(chain)
      chain.single.mockResolvedValue({ data: created, error: null })

      const result = await service.createRating(insertPayload as any)

      expect(mockSupabase.from).toHaveBeenCalledWith('support_ticket_ratings')
      expect(chain.insert).toHaveBeenCalledWith(insertPayload)
      expect(result).toEqual(created)
    })

    it('devrait propager l\'erreur en cas d\'échec', async () => {
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.insert.mockReturnValue(chain)
      chain.select.mockReturnValue(chain)
      chain.single.mockResolvedValue({ data: null, error: { message: 'Duplicate' } })

      await expect(service.createRating({ ticket_id: 't1', rating: 5 } as any)).rejects.toEqual({
        message: 'Duplicate',
      })
    })
  })

  describe('getTemplates', () => {
    it('devrait retourner les modèles de réponse actifs', async () => {
      const mockTemplates = [
        { id: 'tmpl-1', name: 'Réponse type', organization_id: 'org-1', is_active: true },
      ]
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.order.mockResolvedValue({ data: mockTemplates, error: null })

      const result = await service.getTemplates('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('support_response_templates')
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(chain.eq).toHaveBeenCalledWith('is_active', true)
      expect(result).toEqual(mockTemplates)
    })
  })

  describe('getTicketById', () => {
    it('devrait retourner un ticket par son id', async () => {
      const mockTicket = {
        id: 't1',
        organization_id: 'org-1',
        status: 'open',
        user: { id: 'u1', full_name: 'User' },
        category: { id: 'cat-1', name: 'Tech' },
      }
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.select.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      chain.single.mockResolvedValue({ data: mockTicket, error: null })

      const result = await service.getTicketById('t1')

      expect(mockSupabase.from).toHaveBeenCalledWith('support_tickets')
      expect(chain.eq).toHaveBeenCalledWith('id', 't1')
      expect(result).toEqual(mockTicket)
    })

    it('devrait propager l\'erreur si le ticket n\'existe pas', async () => {
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.select.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      chain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } })

      await expect(service.getTicketById('missing')).rejects.toEqual({
        code: 'PGRST116',
        message: 'No rows',
      })
    })
  })

  describe('updateTicket', () => {
    it('devrait mettre à jour un ticket', async () => {
      const updates = { status: 'closed' as const, closed_at: new Date().toISOString() }
      const updated = { id: 't1', organization_id: 'org-1', status: 'closed', ...updates }
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.update.mockReturnValue(chain)
      chain.eq.mockReturnValue(chain)
      chain.select.mockReturnValue(chain)
      chain.single.mockResolvedValue({ data: updated, error: null })

      const result = await service.updateTicket('t1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('support_tickets')
      expect(chain.update).toHaveBeenCalledWith(updates)
      expect(chain.eq).toHaveBeenCalledWith('id', 't1')
      expect(result).toEqual(updated)
    })
  })

  describe('getTickets', () => {
    it('devrait retourner [] si la table n\'existe pas (fallback)', async () => {
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.select.mockReturnValue(chain)
      chain.order.mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'relation "support_tickets" does not exist' },
      })

      const result = await service.getTickets('org-1')

      expect(result).toEqual([])
    })
  })

  describe('getStatistics', () => {
    it('devrait retourner les stats agrégées par statut et priorité', async () => {
      const tickets = [
        { status: 'open', priority: 'high', created_at: '2025-01-01T10:00:00Z', resolved_at: null, first_response_at: null },
        { status: 'resolved', priority: 'medium', created_at: '2025-01-01T09:00:00Z', resolved_at: '2025-01-02T12:00:00Z', first_response_at: '2025-01-01T10:00:00Z' },
      ]
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      chain.eq.mockReturnValue(chain)
      chain.select.mockReturnValue(chain)
      chain.gte = vi.fn().mockReturnValue(chain)
      chain.lte = vi.fn().mockReturnValue(chain)
      const promise = Promise.resolve({ data: tickets, error: null })
      chain.then = promise.then.bind(promise)
      chain.catch = promise.catch.bind(promise)

      const result = await service.getStatistics('org-1')

      expect(result).toMatchObject({
        total: 2,
        byStatus: expect.any(Object),
        byPriority: expect.any(Object),
        averageResponseTime: expect.any(Number),
        averageResolutionTime: expect.any(Number),
        resolutionRate: expect.any(Number),
      })
      expect(result.byStatus.open).toBe(1)
      expect(result.byStatus.resolved).toBe(1)
      expect(result.byPriority.high).toBe(1)
      expect(result.byPriority.medium).toBe(1)
    })
  })
})
