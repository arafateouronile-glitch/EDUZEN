/**
 * Tests unitaires pour QualiopiCheckService (audit P2 - priorité HAUTE)
 * Couverture : constantes, getSessionCompliance (session absente), listSessionsWithCompliance (vide)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QualiopiCheckService, COMPLIANCE_WEIGHTS } from '@/lib/services/qualiopi-check.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(sessionResult: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: [], error: null }),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  const from = vi.fn((table: string) => {
    if (table === 'sessions') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(sessionResult),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }
    return chain
  })
  return { from } as unknown as SupabaseClient
}

describe('QualiopiCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('COMPLIANCE_WEIGHTS', () => {
    it('exporte les poids contract, attendance, evaluation', () => {
      expect(COMPLIANCE_WEIGHTS.contract).toBe(30)
      expect(COMPLIANCE_WEIGHTS.attendance).toBe(50)
      expect(COMPLIANCE_WEIGHTS.evaluation).toBe(20)
      expect(COMPLIANCE_WEIGHTS.contract + COMPLIANCE_WEIGHTS.attendance + COMPLIANCE_WEIGHTS.evaluation).toBe(100)
    })
  })

  describe('getSessionCompliance', () => {
    it('retourne null quand la session est introuvable', async () => {
      const mockSupabase = createMockSupabase({
        data: null,
        error: { message: 'Row not found', code: 'PGRST116' },
      })
      const service = new QualiopiCheckService(mockSupabase)

      const result = await service.getSessionCompliance('org-1', 'session-1')

      expect(result).toBeNull()
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
    })
  })

  describe('listSessionsWithCompliance', () => {
    it('retourne un tableau vide quand aucune session', async () => {
      const mockSupabase = createMockSupabase({ data: null, error: null })
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
      ;(mockSupabase.from as ReturnType<typeof vi.fn>).mockReturnValue(chain)

      const service = new QualiopiCheckService(mockSupabase)
      const result = await service.listSessionsWithCompliance('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('sessions')
    })
  })
})
