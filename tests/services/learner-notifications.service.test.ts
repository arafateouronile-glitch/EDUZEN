/**
 * Tests unitaires pour LearnerNotificationsService (réduction services sans tests)
 * Couverture : getPermissionStatus, scheduleAllSessionReminders (mock Supabase)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    then(r: (v: { data: unknown; error: unknown }) => void) {
      r({ data: [], error: null })
      return chain
    },
    catch: () => chain,
  }
  return {
    createClient: () => ({ from: () => chain, channel: () => ({ on: () => ({ subscribe: () => {} }), removeChannel: () => {} }), removeChannel: () => {} }),
  }
})

import { learnerNotificationsService } from '@/lib/services/learner-notifications.service'

describe('LearnerNotificationsService', () => {
  describe('getPermissionStatus', () => {
    it('retourne "unsupported" quand Notification nest pas disponible (env Node)', () => {
      expect(learnerNotificationsService.getPermissionStatus()).toBe('unsupported')
    })
  })

  describe('scheduleAllSessionReminders', () => {
    it('termine sans erreur quand aucun enrollment (données vides)', async () => {
      await expect(
        learnerNotificationsService.scheduleAllSessionReminders('student-1')
      ).resolves.toBeUndefined()
    })
  })
})
