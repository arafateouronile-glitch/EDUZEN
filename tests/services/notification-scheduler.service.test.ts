/**
 * Tests unitaires pour NotificationSchedulerService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }),
  }
  return {
    createClient: () => ({ from: () => chain }),
  }
})

import { notificationSchedulerService } from '@/lib/services/notification-scheduler.service'

describe('NotificationSchedulerService', () => {
  describe('getScheduledNotifications', () => {
    it('retourne un tableau vide quand aucune notification', async () => {
      const result = await notificationSchedulerService.getScheduledNotifications('org-1')
      expect(result).toEqual([])
    })

    it('accepte un filtre status', async () => {
      const result = await notificationSchedulerService.getScheduledNotifications('org-1', 'pending')
      expect(result).toEqual([])
    })
  })
})
