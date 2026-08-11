/**
 * Tests unitaires pour FECExportService (réduction services sans tests)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FECExportService } from '@/lib/services/fec-export.service'

const thenable = { data: [] as unknown[], error: null }
const chain = {
  select: () => chain,
  eq: () => chain,
  in: () => chain,
  order: () => chain,
  gte: () => chain,
  lte: () => chain,
  then(r: (v: typeof thenable) => void) {
    r(thenable)
    return { catch: () => chain }
  },
}

const mockSupabase = { from: () => chain }

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase,
}))

describe('FECExportService', () => {
  describe('generateFEC', () => {
    it('retourne le fichier FEC avec en-tête uniquement quand aucune écriture', async () => {
      const service = new FECExportService()
      const result = await service.generateFEC({
        organizationId: 'org-1',
      })

      expect(result).toContain('JournalCode')
      expect(result).toContain('JournalLib')
      expect(result.split('\n').length).toBe(1)
    })
  })
})
