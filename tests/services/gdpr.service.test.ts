/**
 * Tests unitaires pour GDPRService
 * Couverture : consentements, registre des traitements, demandes des personnes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GDPRService } from '@/lib/services/gdpr.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
}

function createMockSupabase(terminalResult: { data: unknown; error: unknown }) {
  const chain = createChain(terminalResult)
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('GDPRService', () => {
  let service: GDPRService
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserConsents', () => {
    it('devrait retourner les consentements d\'un utilisateur', async () => {
      const mockConsents = [
        { id: 'c1', organization_id: 'org-1', user_id: 'user-1', consent_type: 'marketing', granted: true },
      ]
      mockSupabase = createMockSupabase({ data: mockConsents, error: null })
      service = new GDPRService(mockSupabase)

      const result = await service.getUserConsents('org-1', 'user-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('gdpr_consents')
      expect(result).toEqual(mockConsents)
    })

    it('devrait retourner [] si pas de données', async () => {
      mockSupabase = createMockSupabase({ data: null, error: null })
      service = new GDPRService(mockSupabase)

      const result = await service.getUserConsents('org-1', 'user-1')

      expect(result).toEqual([])
    })
  })

  describe('getProcessingRegistry', () => {
    it('devrait retourner le registre des traitements actifs', async () => {
      const mockRegistry = [
        { id: 'r1', organization_id: 'org-1', processing_name: 'Formation', status: 'active' },
      ]
      mockSupabase = createMockSupabase({ data: mockRegistry, error: null })
      service = new GDPRService(mockSupabase)

      const result = await service.getProcessingRegistry('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('gdpr_processing_registry')
      expect(result).toEqual(mockRegistry)
    })

    it('devrait retourner [] si la table n\'existe pas (PGRST200)', async () => {
      mockSupabase = createMockSupabase({ data: null, error: { code: 'PGRST200', message: 'Not found' } })
      service = new GDPRService(mockSupabase)

      const result = await service.getProcessingRegistry('org-1')

      expect(result).toEqual([])
    })

    it('devrait propager les autres erreurs', async () => {
      mockSupabase = createMockSupabase({ data: null, error: { message: 'Connection refused' } })
      service = new GDPRService(mockSupabase)

      await expect(service.getProcessingRegistry('org-1')).rejects.toEqual({ message: 'Connection refused' })
    })
  })

  describe('createDataSubjectRequest', () => {
    it('devrait créer une demande d\'accès', async () => {
      const request = {
        organization_id: 'org-1',
        request_type: 'access' as const,
        request_status: 'pending' as const,
        request_date: new Date().toISOString(),
        requested_by_name: 'Jean Dupont',
        requested_by_email: 'jean@example.com',
        identity_verified: false,
      }
      const created = { id: 'req-1', ...request, created_at: new Date().toISOString(), updated_at: '' }
      mockSupabase = createMockSupabase({ data: created, error: null })
      service = new GDPRService(mockSupabase)

      const result = await service.createDataSubjectRequest(request)

      expect(mockSupabase.from).toHaveBeenCalledWith('gdpr_data_subject_requests')
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.insert).toHaveBeenCalledWith(request)
      expect(result).toEqual(created)
    })
  })

  describe('getDataSubjectRequests', () => {
    it('devrait filtrer par type et statut', async () => {
      mockSupabase = createMockSupabase({ data: [], error: null })
      service = new GDPRService(mockSupabase)

      await service.getDataSubjectRequests('org-1', {
        requestType: 'erasure',
        status: 'pending',
      })

      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('request_type', 'erasure')
      expect(chain.eq).toHaveBeenCalledWith('request_status', 'pending')
    })

    it('devrait retourner [] si la table n\'existe pas', async () => {
      mockSupabase = createMockSupabase({ data: null, error: { code: 'PGRST200' } })
      service = new GDPRService(mockSupabase)

      const result = await service.getDataSubjectRequests('org-1')

      expect(result).toEqual([])
    })
  })

  describe('getDataBreaches', () => {
    it('devrait retourner les violations de données', async () => {
      const mockBreaches = [
        { id: 'b1', organization_id: 'org-1', breach_type: 'confidentiality', breach_date: '2025-01-01', severity: 'high' },
      ]
      mockSupabase = createMockSupabase({ data: mockBreaches, error: null })
      service = new GDPRService(mockSupabase)

      const result = await service.getDataBreaches('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('gdpr_data_breaches')
      expect(result).toEqual(mockBreaches)
    })

    it('devrait retourner [] si la table n\'existe pas', async () => {
      mockSupabase = createMockSupabase({ data: null, error: { code: 'PGRST200' } })
      service = new GDPRService(mockSupabase)

      const result = await service.getDataBreaches('org-1')

      expect(result).toEqual([])
    })
  })

  describe('updateConsent', () => {
    it('devrait mettre à jour un consentement (granted)', async () => {
      const updated = {
        id: 'c1',
        organization_id: 'org-1',
        user_id: 'user-1',
        consent_type: 'marketing' as const,
        granted: true,
        created_at: '',
        updated_at: new Date().toISOString(),
      }
      const chain = createChain({ data: updated, error: null })
      const upsertChain = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updated, error: null }),
      }
      ;(mockSupabase as { from: ReturnType<typeof vi.fn> }).from = vi.fn(() => upsertChain)
      service = new GDPRService(mockSupabase as unknown as SupabaseClient)

      const result = await service.updateConsent({
        id: 'c1',
        organization_id: 'org-1',
        user_id: 'user-1',
        consent_type: 'marketing',
        granted: true,
      })

      expect(result).toEqual(updated)
      expect(upsertChain.upsert).toHaveBeenCalled()
    })
  })

  describe('notifyCNIL', () => {
    it('devrait mettre à jour cnil_notified sur la violation', async () => {
      const updateChain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      ;(mockSupabase as { from: ReturnType<typeof vi.fn> }).from = vi.fn(() => updateChain)
      service = new GDPRService(mockSupabase as unknown as SupabaseClient)

      await service.notifyCNIL('breach-1')

      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          cnil_notified: true,
          cnil_notification_date: expect.any(String),
        })
      )
      expect(updateChain.eq).toHaveBeenCalledWith('id', 'breach-1')
    })
  })
})
