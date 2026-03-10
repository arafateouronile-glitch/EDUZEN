/**
 * Tests unitaires pour WorkflowValidationService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { WorkflowValidationService } from '@/lib/services/workflow-validation.service'

function createMockSupabase() {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }
  return { from: vi.fn(() => chain) } as unknown as SupabaseClient
}

describe('WorkflowValidationService', () => {
  describe('getWorkflows', () => {
    it('retourne un tableau vide quand aucun workflow', async () => {
      const mockSupabase = createMockSupabase()
      const service = new WorkflowValidationService(mockSupabase)

      const result = await service.getWorkflows('org-1')

      expect(result).toEqual([])
      expect(mockSupabase.from).toHaveBeenCalledWith('template_workflows')
    })
  })
})
