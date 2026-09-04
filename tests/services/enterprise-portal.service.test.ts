/**
 * Tests unitaires pour EnterprisePortalService (audit - priorité HAUTE)
 * Couverture : getCompanyForManager (null), getCompanyKPIs (default sans employés)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enterprisePortalService } from '@/lib/services/enterprise-portal.service.client'
import type { SupabaseClient } from '@supabase/supabase-js'

function createMockChain(resolveValue: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveValue),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then(resolve: (v: { data: unknown; error: unknown }) => void) {
      resolve(resolveValue)
      return this as Promise<typeof resolveValue>
    },
    catch() {
      return this
    },
  }
  return chain
}

const mockFrom = vi.fn()
const mockClient = { from: mockFrom } as unknown as SupabaseClient

vi.mock('@/lib/supabase/client', () => ({ createClient: () => mockClient }))
vi.mock('@/lib/supabase/server', () => ({ createClient: () => mockClient }))

describe('EnterprisePortalService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCompanyForManager', () => {
    it('retourne null quand aucun manager actif pour le user', async () => {
      const chain = createMockChain({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
      mockFrom.mockReturnValue(chain)

      const result = await enterprisePortalService.getCompanyForManager('user-1')

      expect(result).toBeNull()
      expect(mockFrom).toHaveBeenCalledWith('company_managers')
    })
  })

  describe('getCompanyKPIs', () => {
    it('retourne les KPIs par défaut (0) quand aucun employé', async () => {
      const chain = createMockChain({ data: [], error: null })
      mockFrom.mockReturnValue(chain)

      const result = await enterprisePortalService.getCompanyKPIs('company-1', 2025)

      expect(result).toEqual({
        totalBudget: 0,
        forecastBudget: 0,
        totalHours: 0,
        averageAttendanceRate: 0,
        activeEmployees: 0,
        completedTrainings: 0,
        ongoingTrainings: 0,
        pendingInvoices: 0,
        paidInvoices: 0,
        currency: 'EUR',
      })
      expect(mockFrom).toHaveBeenCalledWith('company_employees')
    })
  })
})
