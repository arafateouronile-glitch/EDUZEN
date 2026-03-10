/**
 * Tests unitaires pour QualiopiService (audit P2 - priorité HAUTE)
 * Couverture : getIndicators (vide ou erreur table absente), getIndicatorByCode (null)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QualiopiService } from '@/lib/services/qualiopi.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('QualiopiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getIndicators', () => {
    it('retourne un tableau vide quand aucun indicateur', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null })
      const service = new QualiopiService(mockSupabase)

      const result = await service.getIndicators('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('qualiopi_indicators')
    })

    it('retourne un tableau vide quand la table n existe pas (42P01)', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { code: '42P01', message: 'relation "qualiopi_indicators" does not exist' },
      })
      const service = new QualiopiService(mockSupabase)

      const result = await service.getIndicators('org-1')

      expect(result).toEqual([])
    })

    it('retourne les indicateurs quand des donnees existent', async () => {
      const indicators = [
        { id: 'ind-1', organization_id: 'org-1', indicator_code: 'IND-01', status: 'compliant' },
      ]
      const mockSupabase = createMockSupabase({ data: indicators, error: null })
      const service = new QualiopiService(mockSupabase)

      const result = await service.getIndicators('org-1')

      expect(result).toEqual(indicators)
    })
  })

  describe('getIndicatorByCode', () => {
    it('retourne null quand indicateur introuvable (PGRST116)', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })
      const service = new QualiopiService(mockSupabase)

      const result = await service.getIndicatorByCode('org-1', 'IND-99')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('qualiopi_indicators')
    })
  })
})
