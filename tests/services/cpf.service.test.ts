/**
 * Tests unitaires pour CPFService (audit P2 - priorité HAUTE)
 * Couverture : getConfiguration (null si absent), getLearnerRights (null si absent)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CPFService } from '@/lib/services/cpf.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('CPFService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConfiguration', () => {
    it('retourne null quand aucune configuration pour l organisation', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })
      const service = new CPFService(mockSupabase)

      const result = await service.getConfiguration('org-1')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('cpf_configurations')
    })

    it('retourne la config quand elle existe', async () => {
      const mockConfig = {
        id: 'cfg-1',
        organization_id: 'org-1',
        provider_name: 'Test',
        is_active: true,
      }
      const mockSupabase = createMockSupabase({ data: mockConfig, error: null })
      const service = new CPFService(mockSupabase)

      const result = await service.getConfiguration('org-1')

      expect(result).toEqual(mockConfig)
    })
  })

  describe('getLearnerRights', () => {
    it('retourne null quand aucun droit pour le learner', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })
      const service = new CPFService(mockSupabase)

      const result = await service.getLearnerRights('org-1', 'learner-1')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('cpf_learner_rights')
    })
  })
})
