/**
 * Tests unitaires pour ReportCardService (audit - réduction services sans tests)
 * Couverture : getAll (vide)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => {
  const res = { data: [], error: null }
  const ch = {
    select: () => ch,
    eq: () => ch,
    order: () => ch,
    then(r: (v: typeof res) => void) {
      r(res)
      return ch
    },
    catch: () => ch,
  }
  return { createClient: () => ({ from: () => ch }) }
})

import { reportCardService } from '@/lib/services/report-card.service.client'

describe('ReportCardService', () => {
  describe('getAll', () => {
    it('retourne un tableau vide quand aucun bulletin', async () => {
      const result = await reportCardService.getAll('org-1')
      expect(result).toEqual([])
    })
  })
})
