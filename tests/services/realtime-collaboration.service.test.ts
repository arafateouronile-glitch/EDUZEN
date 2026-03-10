/**
 * Tests unitaires pour RealtimeCollaborationService (réduction services sans tests)
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ from: () => ({}) }),
}))

import { RealtimeCollaborationService } from '@/lib/services/realtime-collaboration.service'

describe('RealtimeCollaborationService', () => {
  describe('getActiveUsers', () => {
    it('retourne un tableau vide quand aucun utilisateur actif sur le template', () => {
      const service = new RealtimeCollaborationService()
      expect(service.getActiveUsers('tpl-1')).toEqual([])
    })
  })
})
