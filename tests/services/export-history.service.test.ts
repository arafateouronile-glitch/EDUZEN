/**
 * Tests unitaires pour ExportHistoryService (réduction services sans tests)
 * Couverture : getByOrganization (vide), create (null si table absente)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ExportHistoryService } from '@/lib/services/export-history.service'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockSupabase(
  rangeResult: { data: unknown; error: unknown; count?: number },
  insertResult?: { data: unknown; error: unknown }
) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({
      data: rangeResult.data,
      error: rangeResult.error,
      count: rangeResult.count ?? 0,
    }),
    insert: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(insertResult ?? { data: null, error: null }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('ExportHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getByOrganization', () => {
    it('retourne une liste vide quand aucun export', async () => {
      const mockSupabase = createMockSupabase({ data: [], error: null, count: 0 })
      const service = new ExportHistoryService(mockSupabase)

      const result = await service.getByOrganization('org-1')

      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
      expect(mockSupabase.from).toHaveBeenCalledWith('export_history')
    })
  })

  describe('create', () => {
    it('retourne null quand la table nexiste pas (42P01)', async () => {
      const mockSupabase = createMockSupabase(
        { data: [], error: null },
        { data: null, error: { code: 'PGRST205', message: 'Could not find the table' } }
      )
      const service = new ExportHistoryService(mockSupabase)

      const result = await service.create({
        organizationId: 'org-1',
        userId: 'user-1',
        exportType: 'excel',
        entityType: 'students',
        filename: 'export.xlsx',
      })

      expect(result).toBeNull()
    })
  })
})
