/**
 * Tests unitaires pour ComplianceService
 * Couverture : getPolicies, getControls (audit P2-13)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ComplianceService } from '@/lib/services/compliance.service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

function createChain(result: { data: unknown; error: unknown }, withOr = true) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  }
  if (withOr) chain.or = vi.fn().mockReturnThis()
  return chain
}

function createMockSupabase(terminalResult: { data: unknown; error: unknown }) {
  const chain = createChain(terminalResult)
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>
}

describe('ComplianceService', () => {
  let service: ComplianceService
  let mockSupabase: SupabaseClient<Database>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPolicies', () => {
    it('devrait retourner les politiques de sécurité d\'une organisation', async () => {
      const mockPolicies = [
        { id: 'p1', organization_id: 'org-1', name: 'Politique RGPD', status: 'active', category: 'privacy' },
      ]
      mockSupabase = createMockSupabase({ data: mockPolicies, error: null })
      service = new ComplianceService(mockSupabase)

      const result = await service.getPolicies('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('security_policies')
      expect(result).toEqual(mockPolicies)
    })

    it('devrait filtrer par status et category si fournis', async () => {
      mockSupabase = createMockSupabase({ data: [], error: null })
      service = new ComplianceService(mockSupabase)

      await service.getPolicies('org-1', { status: 'active', category: 'privacy' })

      expect(mockSupabase.from).toHaveBeenCalledWith('security_policies')
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('status', 'active')
      expect(chain.eq).toHaveBeenCalledWith('category', 'privacy')
    })

    it('devrait propager l\'erreur Supabase', async () => {
      mockSupabase = createMockSupabase({ data: null, error: { message: 'DB error', code: '500' } })
      service = new ComplianceService(mockSupabase)

      await expect(service.getPolicies('org-1')).rejects.toEqual({ message: 'DB error', code: '500' })
    })
  })

  describe('getControls', () => {
    it('devrait retourner les contrôles de sécurité', async () => {
      const mockControls = [
        { id: 'c1', organization_id: 'org-1', control_id: 'CTRL-001', framework: 'ISO27001', implementation_status: 'implemented' },
      ]
      mockSupabase = createMockSupabase({ data: mockControls, error: null })
      service = new ComplianceService(mockSupabase)

      const result = await service.getControls('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('security_controls')
      expect(result).toEqual(mockControls)
    })

    it('devrait filtrer par framework et status si fournis', async () => {
      mockSupabase = createMockSupabase({ data: [], error: null })
      service = new ComplianceService(mockSupabase)

      await service.getControls('org-1', { framework: 'ISO27001', status: 'implemented' })

      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('framework', 'ISO27001')
      expect(chain.eq).toHaveBeenCalledWith('implementation_status', 'implemented')
    })
  })

  describe('getRisks', () => {
    it('devrait retourner les risques d une organisation', async () => {
      const mockRisks = [
        { id: 'r1', organization_id: 'org-1', risk_level: 'critical', treatment_status: 'open', title: 'Risque 1' },
      ]
      mockSupabase = createMockSupabase({ data: mockRisks, error: null })
      service = new ComplianceService(mockSupabase)

      const result = await service.getRisks('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('risk_assessments')
      expect(result).toEqual(mockRisks)
    })

    it('devrait retourner [] si erreur table absente (PGRST200)', async () => {
      mockSupabase = createMockSupabase({
        data: null,
        error: { code: 'PGRST200', message: 'Relation does not exist' },
      })
      service = new ComplianceService(mockSupabase)

      const result = await service.getRisks('org-1')

      expect(result).toEqual([])
    })
  })

  describe('getCriticalRisks', () => {
    it('devrait retourner les risques critiques ouverts', async () => {
      const mockRisks = [
        { id: 'r1', organization_id: 'org-1', risk_level: 'critical', treatment_status: 'open', title: 'Risque critique' },
      ]
      mockSupabase = createMockSupabase({ data: mockRisks, error: null })
      service = new ComplianceService(mockSupabase)

      const result = await service.getCriticalRisks('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('risk_assessments')
      const chain = (mockSupabase.from as ReturnType<typeof vi.fn>)()
      expect(chain.eq).toHaveBeenCalledWith('treatment_status', 'open')
      expect(chain.eq).toHaveBeenCalledWith('risk_level', 'critical')
      expect(result).toEqual(mockRisks)
    })
  })
})
