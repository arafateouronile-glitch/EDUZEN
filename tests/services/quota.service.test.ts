/**
 * Tests unitaires pour QuotaService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QuotaService } from '@/lib/services/quota.service'

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
  sanitizeError: vi.fn((err) => ({ message: err?.message || 'Error' })),
}))

describe('QuotaService', () => {
  let mockSupabase: any
  let service: QuotaService

  const createMockSupabase = () => {
    const chain: any = {
      from: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      gte: vi.fn(),
      maybeSingle: vi.fn(),
      single: vi.fn(),
      rpc: vi.fn(),
    }
    chain.from.mockReturnValue(chain)
    chain.select.mockReturnValue(chain)
    chain.eq.mockReturnValue(chain)
    chain.gte.mockReturnValue(chain)
    chain.maybeSingle.mockResolvedValue({ data: null, error: null })
    chain.single.mockResolvedValue({ data: null, error: null })
    chain.rpc = vi.fn()
    return chain
  }

  beforeEach(() => {
    mockSupabase = createMockSupabase()
    service = new QuotaService(mockSupabase)
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('devrait lever une erreur si supabaseClient est null', () => {
      expect(() => new QuotaService(null as any)).toThrow('SupabaseClient is required')
    })
  })

  describe('getUsage', () => {
    it('devrait retourner l\'usage via RPC', async () => {
      const usage = {
        plan_name: 'Premium',
        max_students: 100,
        current_student_count: 50,
        max_sessions_per_month: 20,
        current_sessions_count: 10,
        subscription_status: 'active',
        features: { advanced: true },
      }
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: usage, error: null }),
      })

      const result = await service.getUsage('org-1')

      expect(result).toEqual(usage)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_organization_usage', { org_id: 'org-1' })
    })

    it('devrait utiliser fallback si message contient "function" (sans 42883)', async () => {
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'XX000', message: 'function get_organization_usage does not exist' },
        }),
      })
      const subscription = {
        id: 'sub-1',
        organization_id: 'org-1',
        status: 'active',
        plans: { name: 'Basic', max_students: 10, max_sessions_per_month: 5, features: {} },
      }
      const subChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: subscription, error: null }),
      }
      mockSupabase.from.mockReturnValueOnce(subChain)
      const studentChain: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
      studentChain.eq.mockReturnValueOnce(studentChain).mockResolvedValueOnce({ count: 2, error: null })
      mockSupabase.from.mockReturnValueOnce(studentChain)
      const sessionChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ count: 1, error: null }),
      }
      mockSupabase.from.mockReturnValueOnce(sessionChain)

      const result = await service.getUsage('org-1')

      expect(result).toMatchObject({ plan_name: 'Basic', current_student_count: 2, current_sessions_count: 1 })
    })

    it('devrait utiliser fallback si fonction SQL n\'existe pas (code 42883)', async () => {
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42883', message: 'function does not exist' },
        }),
      })

      // Mock fallback: subscription + plan
      const subscription = {
        id: 'sub-1',
        organization_id: 'org-1',
        status: 'active',
        plan_id: 'plan-1',
        plans: {
          name: 'Basic',
          max_students: 50,
          max_sessions_per_month: 10,
          features: {},
        },
      }
      
      // Mock subscription query: from -> select -> eq -> eq -> maybeSingle
      const subscriptionChain = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn(),
      }
      subscriptionChain.select.mockReturnValue(subscriptionChain)
      subscriptionChain.eq.mockReturnValue(subscriptionChain)
      subscriptionChain.maybeSingle.mockResolvedValue({ data: subscription, error: null })
      mockSupabase.from.mockReturnValueOnce(subscriptionChain)

      // Mock count students: from -> select -> eq -> eq (le dernier eq retourne la promesse)
      const studentCountChain = {
        select: vi.fn(),
        eq: vi.fn(),
      }
      studentCountChain.select.mockReturnValue(studentCountChain)
      // Premier eq retourne la chaîne, deuxième eq retourne la promesse
      studentCountChain.eq
        .mockReturnValueOnce(studentCountChain) // eq('organization_id')
        .mockResolvedValueOnce({ count: 25, error: null }) // eq('status') - dernier appel
      mockSupabase.from.mockReturnValueOnce(studentCountChain)

      // Mock count sessions: from -> select -> eq -> gte (gte retourne la promesse)
      const sessionCountChain = {
        select: vi.fn(),
        eq: vi.fn(),
        gte: vi.fn(),
      }
      sessionCountChain.select.mockReturnValue(sessionCountChain)
      sessionCountChain.eq.mockReturnValue(sessionCountChain)
      sessionCountChain.gte.mockResolvedValue({ count: 5, error: null })
      mockSupabase.from.mockReturnValueOnce(sessionCountChain)

      const result = await service.getUsage('org-1')

      expect(result).toMatchObject({
        plan_name: 'Basic',
        max_students: 50,
        current_student_count: 25,
        max_sessions_per_month: 10,
        current_sessions_count: 5,
      })
    })

    it('devrait utiliser le fallback si erreur RPC (ex: fonction absente)', async () => {
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      })

      const result = await service.getUsage('org-1')
      // Le service utilise getUsageFallback en cas d'erreur RPC
      expect(result).toMatchObject({
        plan_name: null,
        current_sessions_count: 0,
        current_student_count: 0,
      })
    })

    it('devrait retourner valeurs par défaut si pas de subscription', async () => {
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42883' },
        }),
      })
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await service.getUsage('org-1')

      expect(result).toMatchObject({
        plan_name: null,
        max_students: null,
        current_student_count: 0,
        max_sessions_per_month: null,
        current_sessions_count: 0,
        subscription_status: null,
        features: null,
      })
    })

    it('devrait retourner null si getUsageFallback lance (catch)', async () => {
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42883', message: 'function missing' },
        }),
      })
      const subChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Subscription fetch failed')),
      }
      mockSupabase.from.mockReturnValueOnce(subChain)

      const result = await service.getUsage('org-1')

      expect(result).toBeNull()
    })

    it('devrait retourner null si getUsageFallback a subscription puis students count lance (catch l.114-119)', async () => {
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42883', message: 'function missing' },
        }),
      })
      const subscription = {
        id: 'sub-1',
        organization_id: 'org-1',
        status: 'active',
        plan_id: 'plan-1',
        plans: { name: 'Basic', max_students: 50, max_sessions_per_month: 10, features: {} },
      }
      const subChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: subscription, error: null }),
      }
      const studentChain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn(),
      }
      studentChain.eq.mockReturnValueOnce(studentChain).mockRejectedValueOnce(new Error('Students fetch failed'))
      mockSupabase.from
        .mockReturnValueOnce(subChain)
        .mockReturnValueOnce(studentChain)

      const result = await service.getUsage('org-1')

      expect(result).toBeNull()
    })
  })

  describe('canAddStudent', () => {
    it('devrait autoriser si RPC retourne true', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: true, error: null })
      )
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { current_student_count: 10, max_students: 100 },
          error: null,
        }),
      })

      const result = await service.canAddStudent('org-1')

      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('devrait refuser si RPC retourne false', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: false, error: null })
      )
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { current_student_count: 100, max_students: 100 },
          error: null,
        }),
      })

      const result = await service.canAddStudent('org-1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Limite d\'étudiants atteinte')
    })

    it('devrait utiliser fallback si RPC échoue', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: undefined, error: { message: 'RPC failed' } })
      )
      // Mock getUsage fallback
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42883' },
        }),
      })
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await service.canAddStudent('org-1')

      expect(result.allowed).toBe(true) // Par défaut si pas d'info
    })

    it('devrait autoriser si plan illimité (max_students null)', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: undefined, error: {} })
      )
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { max_students: null, current_student_count: 1000 },
          error: null,
        }),
      })

      const result = await service.canAddStudent('org-1')

      expect(result.allowed).toBe(true)
    })

    it('devrait refuser si limite atteinte (fallback)', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: undefined, error: {} })
      )
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { max_students: 50, current_student_count: 50 },
          error: null,
        }),
      })

      const result = await service.canAddStudent('org-1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Limite atteinte')
    })

    it('devrait autoriser par défaut en cas d\'erreur', async () => {
      mockSupabase.rpc.mockImplementation(() => {
        throw new Error('Database error')
      })

      const result = await service.canAddStudent('org-1')

      expect(result.allowed).toBe(true)
    })

    it('devrait autoriser si fallback et getUsage retourne null', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: undefined, error: { message: 'RPC failed' } })
      )
      vi.spyOn(service, 'getUsage').mockResolvedValueOnce(null)

      const result = await service.canAddStudent('org-1')

      expect(result).toEqual({ allowed: true })
    })
  })

  describe('canCreateSession', () => {
    it('devrait autoriser si RPC retourne true', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: true, error: null })
      )
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { current_sessions_count: 5, max_sessions_per_month: 20 },
          error: null,
        }),
      })

      const result = await service.canCreateSession('org-1')

      expect(result.allowed).toBe(true)
    })

    it('devrait refuser si limite mensuelle atteinte', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: undefined, error: {} })
      )
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { max_sessions_per_month: 10, current_sessions_count: 10 },
          error: null,
        }),
      })

      const result = await service.canCreateSession('org-1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('Limite mensuelle atteinte')
    })

    it('devrait autoriser si plan illimité (max_sessions null)', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: undefined, error: {} })
      )
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { max_sessions_per_month: null, current_sessions_count: 100 },
          error: null,
        }),
      })

      const result = await service.canCreateSession('org-1')

      expect(result.allowed).toBe(true)
    })

    it('devrait autoriser si fallback et getUsage retourne null', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: undefined, error: { message: 'RPC failed' } })
      )
      vi.spyOn(service, 'getUsage').mockResolvedValueOnce(null)

      const result = await service.canCreateSession('org-1')

      expect(result).toEqual({ allowed: true })
    })

    it('devrait autoriser en fallback si usage sous la limite (current < max)', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: undefined, error: {} })
      )
      vi.spyOn(service, 'getUsage').mockResolvedValueOnce({
        plan_name: 'Basic',
        max_students: 50,
        current_student_count: 10,
        max_sessions_per_month: 20,
        current_sessions_count: 5,
        subscription_status: 'active',
        features: {},
      } as any)

      const result = await service.canCreateSession('org-1')

      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
      expect(result.usage).toBeDefined()
    })

    it('devrait refuser en fallback avec reason formatée si limite atteinte', async () => {
      mockSupabase.rpc.mockReturnValueOnce(
        Promise.resolve({ data: undefined, error: { message: 'RPC not found' } })
      )
      vi.spyOn(service, 'getUsage').mockResolvedValueOnce({
        plan_name: 'Pro',
        max_students: 100,
        current_student_count: 50,
        max_sessions_per_month: 8,
        current_sessions_count: 8,
        subscription_status: 'active',
        features: {},
      } as any)

      const result = await service.canCreateSession('org-1')

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('Limite mensuelle atteinte : 8/8 sessions')
      expect(result.usage).toBeDefined()
    })

    it('devrait autoriser par défaut si erreur (catch)', async () => {
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Database unreachable'))

      const result = await service.canCreateSession('org-1')

      expect(result).toEqual({ allowed: true })
    })
  })

  describe('hasFeature', () => {
    it('devrait retourner true si feature activée', async () => {
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { features: { advanced: true, reports: false } },
          error: null,
        }),
      })

      const result = await service.hasFeature('org-1', 'advanced')

      expect(result).toBe(true)
    })

    it('devrait retourner false si feature désactivée', async () => {
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { features: { advanced: false } },
          error: null,
        }),
      })

      const result = await service.hasFeature('org-1', 'advanced')

      expect(result).toBe(false)
    })

    it('devrait retourner false si pas d\'usage', async () => {
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const result = await service.hasFeature('org-1', 'advanced')

      expect(result).toBe(false)
    })

    it('devrait retourner false si getUsage lance (catch)', async () => {
      vi.spyOn(service, 'getUsage').mockRejectedValueOnce(new Error('DB error'))

      const result = await service.hasFeature('org-1', 'advanced')

      expect(result).toBe(false)
    })

    it('devrait retourner false si pas de features', async () => {
      mockSupabase.rpc.mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { features: null },
          error: null,
        }),
      })

      const result = await service.hasFeature('org-1', 'advanced')

      expect(result).toBe(false)
    })
  })

  describe('getCurrentPlan', () => {
    it('devrait retourner le plan actuel', async () => {
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { plan_name: 'Premium' },
          error: null,
        }),
      })
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: {
          plan_id: 'plan-1',
          plans: { name: 'Premium', features: { advanced: true } },
        },
        error: null,
      })

      const result = await service.getCurrentPlan('org-1')

      expect(result).toMatchObject({
        planId: 'plan-1',
        planName: 'Premium',
        features: { advanced: true },
      })
    })

    it('devrait retourner null si pas d\'usage', async () => {
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      const result = await service.getCurrentPlan('org-1')

      expect(result).toBeNull()
    })

    it('devrait retourner null si pas de plan_name', async () => {
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { plan_name: null },
          error: null,
        }),
      })

      const result = await service.getCurrentPlan('org-1')

      expect(result).toBeNull()
    })

    it('devrait gérer plans comme tableau', async () => {
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { plan_name: 'Basic' },
          error: null,
        }),
      })
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: {
          plan_id: 'plan-1',
          plans: [{ name: 'Basic', features: {} }],
        },
        error: null,
      })

      const result = await service.getCurrentPlan('org-1')

      expect(result).toMatchObject({
        planId: 'plan-1',
        planName: 'Basic',
      })
    })

    it('devrait retourner null si subscription ou plans manquants', async () => {
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { plan_name: 'Premium' },
          error: null,
        }),
      })
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await service.getCurrentPlan('org-1')

      expect(result).toBeNull()
    })

    it('devrait retourner null si la requête subscriptions lance (catch)', async () => {
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { plan_name: 'P' },
          error: null,
        }),
      })
      mockSupabase.maybeSingle.mockRejectedValueOnce(new Error('Subscriptions error'))

      const result = await service.getCurrentPlan('org-1')

      expect(result).toBeNull()
    })

    it('devrait retourner null et logger si getCurrentPlan lance (catch l.273-278)', async () => {
      const { logger } = await import('@/lib/utils/logger')
      mockSupabase.rpc.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: { plan_name: 'P' },
          error: null,
        }),
      })
      mockSupabase.maybeSingle.mockRejectedValueOnce(new Error('DB error'))

      const result = await service.getCurrentPlan('org-1')

      expect(result).toBeNull()
      expect(logger.error).toHaveBeenCalled()
    })
  })
})
