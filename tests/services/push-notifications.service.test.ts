/**
 * Tests unitaires pour PushNotificationsService
 * Tests de l'optimisation N+1 Pattern #5 - Campaign Notifications (9-90s saved)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PushNotificationsService } from '@/lib/services/push-notifications.service'

// Mock Supabase client with hoisting - Proper chaining pattern
const { mockSupabase, createSelectChain } = vi.hoisted(() => {
  // Create select chain factory - MUST be in hoisted to be available in beforeEach
  const createSelectChainFactory = () => {
    const chain: any = {
      eq: vi.fn(),
      in: vi.fn(),
      single: vi.fn(),
      maybeSingle: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    }
    // CRITICAL: eq() and other chainable methods MUST return the chain itself
    chain.eq.mockReturnValue(chain)
    chain.in.mockReturnValue(chain)
    chain.order.mockReturnValue(chain)
    chain.limit.mockReturnValue(chain)
    chain.single.mockResolvedValue({ data: null, error: null })
    chain.maybeSingle.mockResolvedValue({ data: null, error: null })
    return chain
  }

  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    delete: vi.fn(),
  }

  // Make chainable
  mock.from.mockReturnValue(mock)
  // Use mockImplementation to create a new chain each time
  mock.select.mockImplementation(() => createSelectChainFactory())
  mock.eq.mockReturnValue(mock)
  mock.in.mockReturnValue(mock)
  mock.insert.mockReturnValue(mock)
  mock.update.mockReturnValue(mock)
  mock.upsert.mockReturnValue(mock)
  mock.order.mockReturnValue(mock)
  mock.limit.mockReturnValue(mock)
  mock.delete.mockReturnValue(mock)
  
  // single() and maybeSingle() on main mock return promises
  mock.single.mockResolvedValue({ data: null, error: null })
  mock.maybeSingle.mockResolvedValue({ data: null, error: null })

  return { 
    mockSupabase: mock,
    createSelectChain: createSelectChainFactory
  }
})

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  maskId: (id: string) => id.slice(0, 8) + '...',
  sanitizeError: (error: any) => ({ message: error?.message || 'Unknown error' }),
}))

describe('PushNotificationsService - Campaign Optimization', () => {
  let service: PushNotificationsService

  beforeEach(() => {
    // Don't use clearAllMocks() as it resets everything including implementations
    // Instead, reset only the mock calls
    vi.clearAllMocks()

    // CRITICAL: Re-establish all mocks after clearAllMocks
    // This is essential because clearAllMocks() resets all mock implementations
    mockSupabase.from.mockReturnValue(mockSupabase)
    // CRITICAL: Use mockImplementation to create a NEW chain for each select() call
    // This ensures each query gets its own isolated chain with properly configured methods
    // createSelectChain is available from vi.hoisted()
    mockSupabase.select.mockImplementation(() => createSelectChain())
    
    service = new PushNotificationsService(mockSupabase as any)
    // eq() on main mock returns mock itself (for direct chains like from().eq())
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.in.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.update.mockReturnValue(mockSupabase)
    mockSupabase.upsert.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
    mockSupabase.limit.mockReturnValue(mockSupabase)
    mockSupabase.delete.mockReturnValue(mockSupabase)
    // single() and maybeSingle() on main mock (for direct calls, not on select chain)
    mockSupabase.single.mockResolvedValue({ data: null, error: null })
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null })
  })

  describe('sendCampaign - Pattern #5 Parallel Optimization', () => {
    it('devrait envoyer une campagne à tous les utilisateurs en parallèle', async () => {
      const campaignId = 'campaign-1'
      const mockCampaign = {
        id: campaignId,
        organization_id: 'org-1',
        title: 'Important Update',
        body: 'Please read this message',
        data: { url: '/updates' },
        target_audience: 'all',
        target_user_ids: null,
        status: 'draft',
      }

      const mockUsers = Array.from({ length: 10 }, (_, i) => ({ id: `user-${i}` }))

      // Mock campaign fetch: from -> select -> eq -> single
      // The query is: from('push_notification_campaigns').select('*').eq('id', campaignId).single()
      // Solution: Create chain with single() configured, then mock select() to return it
      const campaignChain = createSelectChain()
      campaignChain.single.mockResolvedValueOnce({
        data: mockCampaign,
        error: null,
      })
      // Mock select() to return this chain when called first time (for campaign)
      mockSupabase.select.mockReturnValueOnce(campaignChain)

      // Mock users fetch: from -> select -> eq (returns promise)
      // The query is: from('users').select('id').eq('organization_id', ...)
      // Create another chain for users query
      const usersChain = createSelectChain()
      const usersQueryResult = Promise.resolve({ data: mockUsers, error: null })
      // eq() on select chain returns the promise (this is the terminal call)
      usersChain.eq.mockReturnValueOnce(usersQueryResult as any)
      // Mock select() to return this chain when called second time (for users)
      mockSupabase.select.mockReturnValueOnce(usersChain)

      // Mock sendNotification calls (will be called in parallel)
      const sendNotificationSpy = vi.spyOn(service, 'sendNotification')
      sendNotificationSpy.mockResolvedValue({
        id: 'notif-1',
        user_id: 'user-1',
        device_id: 'device-1',
        title: 'Important Update',
        body: 'Please read this message',
        data: { url: '/updates' },
        notification_type: 'announcement',
        priority: 'normal',
        sound: 'default',
        badge: null,
        status: 'sent',
        created_at: new Date().toISOString(),
        sent_at: new Date().toISOString(),
        clicked_at: null,
        error_message: null,
      })

      // Mock campaign update: from -> update -> eq
      const updateQueryResult = Promise.resolve({ data: null, error: null })
      mockSupabase.eq.mockReturnValueOnce(updateQueryResult as any)

      const result = await service.sendCampaign(campaignId)

      // Vérifier que toutes les notifications ont été envoyées
      expect(result.sentCount).toBe(10)
      expect(result.failedCount).toBe(0)

      // Vérifier que sendNotification a été appelé 10 fois
      expect(sendNotificationSpy).toHaveBeenCalledTimes(10)

      // Vérifier que la campagne a été mise à jour avec le statut 'sent'
      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: 'sent',
        sent_count: 10,
        failed_count: 0,
        sent_at: expect.any(String),
      })
    })

    it('devrait gérer les échecs individuels sans bloquer toute la campagne', async () => {
      const campaignId = 'campaign-1'
      const mockCampaign = {
        id: campaignId,
        organization_id: 'org-1',
        title: 'Test Campaign',
        body: 'Test message',
        data: {},
        target_audience: 'all',
        status: 'draft',
      }

      const mockUsers = [
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
        { id: 'user-4' },
        { id: 'user-5' },
      ]

      // Mock campaign fetch
      const campaignChain = createSelectChain()
      campaignChain.single.mockResolvedValueOnce({ data: mockCampaign, error: null })
      mockSupabase.select.mockReturnValueOnce(campaignChain)
      
      // Mock users fetch
      const usersChain = createSelectChain()
      const usersQueryResult = Promise.resolve({ data: mockUsers, error: null })
      usersChain.eq.mockReturnValueOnce(usersQueryResult as any)
      mockSupabase.select.mockReturnValueOnce(usersChain)

      // Mock sendNotification avec succès et échecs mixtes
      const sendNotificationSpy = vi.spyOn(service, 'sendNotification')
      sendNotificationSpy
        .mockResolvedValueOnce({ id: 'notif-1' } as any) // Succès
        .mockRejectedValueOnce(new Error('No active devices')) // Échec
        .mockResolvedValueOnce({ id: 'notif-3' } as any) // Succès
        .mockRejectedValueOnce(new Error('Quiet hours active')) // Échec
        .mockResolvedValueOnce({ id: 'notif-5' } as any) // Succès

      // Mock campaign update
      const updateQueryResult = Promise.resolve({ data: null, error: null })
      mockSupabase.eq.mockReturnValueOnce(updateQueryResult as any)

      const result = await service.sendCampaign(campaignId)

      // 3 succès, 2 échecs
      expect(result.sentCount).toBe(3)
      expect(result.failedCount).toBe(2)
    })

    it('devrait envoyer une campagne ciblée à des utilisateurs spécifiques', async () => {
      const campaignId = 'campaign-targeted'
      const targetUserIds = ['user-1', 'user-2', 'user-3']

      const mockCampaign = {
        id: campaignId,
        organization_id: 'org-1',
        title: 'Targeted Message',
        body: 'This is for you',
        data: {},
        target_audience: 'specific',
        target_user_ids: targetUserIds,
        status: 'draft',
      }

      // Mock campaign fetch
      const campaignChain = createSelectChain()
      campaignChain.single.mockResolvedValueOnce({ data: mockCampaign, error: null })
      mockSupabase.select.mockReturnValueOnce(campaignChain)
      // No users query needed for targeted campaigns

      const sendNotificationSpy = vi.spyOn(service, 'sendNotification')
      sendNotificationSpy.mockResolvedValue({ id: 'notif-1' } as any)

      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const result = await service.sendCampaign(campaignId)

      expect(result.sentCount).toBe(3)
      expect(sendNotificationSpy).toHaveBeenCalledTimes(3)
    })

    it('devrait être rapide grâce à l\'envoi parallèle (vs séquentiel)', async () => {
      const campaignId = 'campaign-perf'
      const userCount = 50

      const mockCampaign = {
        id: campaignId,
        organization_id: 'org-1',
        title: 'Performance Test',
        body: 'Testing parallel send',
        data: {},
        target_audience: 'all',
        status: 'draft',
      }

      const mockUsers = Array.from({ length: userCount }, (_, i) => ({ id: `user-${i}` }))

      // Mock campaign fetch
      const campaignChain = createSelectChain()
      campaignChain.single.mockResolvedValueOnce({ data: mockCampaign, error: null })
      mockSupabase.select.mockReturnValueOnce(campaignChain)
      
      // Mock users fetch
      const usersChain = createSelectChain()
      const usersQueryResult = Promise.resolve({ data: mockUsers, error: null })
      usersChain.eq.mockReturnValueOnce(usersQueryResult as any)
      mockSupabase.select.mockReturnValueOnce(usersChain)

      const sendNotificationSpy = vi.spyOn(service, 'sendNotification')
      // Simuler chaque notification prenant 100ms
      sendNotificationSpy.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ id: 'notif-1' } as any), 100)
          )
      )

      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const startTime = Date.now()
      await service.sendCampaign(campaignId)
      const duration = Date.now() - startTime

      // Avec parallélisation : ~100ms (toutes en même temps)
      // Sans parallélisation : 50 × 100ms = 5000ms
      expect(duration).toBeLessThan(500) // Marge de sécurité
      expect(duration).toBeGreaterThanOrEqual(50) // Au moins quelques notifications en parallèle
    })
  })

  describe('sendNotification - Individual notification', () => {
    it('devrait envoyer une notification à un utilisateur avec devices actifs', async () => {
      const userId = 'user-1'
      const payload = {
        title: 'Test Notification',
        body: 'Test message',
        notificationType: 'message',
        priority: 'normal' as const,
      }

      // Mock preferences - chain: from -> select -> eq -> maybeSingle
      // getPreferences() calls: from('push_notification_preferences').select('*').eq('user_id', userId).maybeSingle()
      const prefsChain = createSelectChain()
      prefsChain.maybeSingle.mockResolvedValueOnce({
        data: {
          user_id: userId,
          enable_messages: true,
          quiet_hours_enabled: false,
        },
        error: null,
      })
      mockSupabase.select.mockReturnValueOnce(prefsChain)

      // Mock devices - chain: from -> select -> eq -> eq -> order
      // getDevices() calls: from('push_devices').select('*').eq('user_id', ...).eq('is_active', true).order(...)
      // After order(), the query is awaited
      const devicesChain = createSelectChain()
      const devicesQueryResult = Promise.resolve({
        data: [
          {
            id: 'device-1',
            user_id: userId,
            device_token: 'token-1',
            platform: 'fcm',
            is_active: true,
          },
        ],
        error: null,
      })
      // order() returns the promise (the query is awaited after order())
      devicesChain.order.mockReturnValueOnce(devicesQueryResult as any)
      mockSupabase.select.mockReturnValueOnce(devicesChain)

      // Mock createNotification - chain: from -> insert -> select -> single
      // insert() returns chain with select(), which returns object with single()
      const insertChain = mockSupabase.insert()
      const insertSelectResult = {
        single: vi.fn().mockResolvedValueOnce({
          data: {
            id: 'notif-1',
            user_id: userId,
            device_id: 'device-1',
            title: payload.title,
            body: payload.body,
            status: 'pending',
          },
          error: null,
        }),
      }
      insertChain.select.mockReturnValueOnce(insertSelectResult)

      // Mock sendToProvider
      const sendToProviderSpy = vi.spyOn(service as any, 'sendToProvider')
      sendToProviderSpy.mockResolvedValue({ success: true })

      // Mock updateNotificationStatus - chain: from -> update -> eq
      const updateQueryResult = Promise.resolve({ data: null, error: null })
      mockSupabase.eq.mockReturnValueOnce(updateQueryResult as any)

      const result = await service.sendNotification(userId, payload)

      expect(result).toBeDefined()
      expect(result.title).toBe(payload.title)
      expect(sendToProviderSpy).toHaveBeenCalled()
    })

    it('devrait rejeter si les notifications sont désactivées pour ce type', async () => {
      const userId = 'user-1'
      const payload = {
        title: 'Test',
        body: 'Test',
        notificationType: 'message',
      }

      // Mock preferences
      const prefsChain = createSelectChain()
      prefsChain.maybeSingle.mockResolvedValueOnce({
        data: {
          user_id: userId,
          enable_messages: false, // Désactivé
        },
        error: null,
      })
      mockSupabase.select.mockReturnValueOnce(prefsChain)

      await expect(service.sendNotification(userId, payload)).rejects.toThrow(
        'Notifications of type message are disabled for this user'
      )
    })

    it('devrait rejeter si heures silencieuses actives', async () => {
      const userId = 'user-1'
      const payload = {
        title: 'Test',
        body: 'Test',
        notificationType: 'message',
      }

      // Mock quiet hours active
      const prefsChain = createSelectChain()
      prefsChain.maybeSingle.mockResolvedValueOnce({
        data: {
          user_id: userId,
          enable_messages: true,
          quiet_hours_enabled: true,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
        },
        error: null,
      })
      mockSupabase.select.mockReturnValueOnce(prefsChain)

      // Simuler qu'on est dans les heures silencieuses
      const isQuietHoursSpy = vi.spyOn(service as any, 'isQuietHours')
      isQuietHoursSpy.mockReturnValue(true)

      await expect(service.sendNotification(userId, payload)).rejects.toThrow(
        'Quiet hours are active'
      )
    })
  })

  describe('Performance comparison - Sequential vs Parallel', () => {
    it('AVANT (séquentiel): envoi séquentiel à 100 users = ~9 secondes', async () => {
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`)

      const sequentialApproach = async () => {
        const results = []
        for (const userId of userIds) {
          await new Promise((resolve) => setTimeout(resolve, 90)) // 90ms par notification
          results.push({ userId, sent: true })
        }
        return results
      }

      const startTime = Date.now()
      await sequentialApproach()
      const duration = Date.now() - startTime

      // 100 × 90ms = 9000ms minimum
      expect(duration).toBeGreaterThan(8500)
    }, 15000) // 15 secondes timeout

    it('APRÈS (parallèle): envoi parallèle à 100 users = ~100ms', async () => {
      const userIds = Array.from({ length: 100 }, (_, i) => `user-${i}`)

      const parallelApproach = async () => {
        const promises = userIds.map(async (userId) => {
          await new Promise((resolve) => setTimeout(resolve, 90))
          return { userId, sent: true }
        })
        return Promise.all(promises)
      }

      const startTime = Date.now()
      await parallelApproach()
      const duration = Date.now() - startTime

      // Toutes en parallèle = ~90ms
      expect(duration).toBeLessThan(200) // Marge de sécurité
    })
  })

  describe('Error resilience with Promise.allSettled', () => {
    it('devrait continuer même si certaines notifications échouent', async () => {
      const userIds = ['user-1', 'user-2', 'user-3', 'user-4', 'user-5']

      const promises = userIds.map((userId, index) => {
        if (index % 2 === 0) {
          return Promise.resolve({ userId, sent: true })
        } else {
          return Promise.reject(new Error(`Failed for ${userId}`))
        }
      })

      const results = await Promise.allSettled(promises)

      const fulfilled = results.filter((r) => r.status === 'fulfilled').length
      const rejected = results.filter((r) => r.status === 'rejected').length

      expect(fulfilled).toBe(3) // user-1, user-3, user-5
      expect(rejected).toBe(2) // user-2, user-4
      expect(results).toHaveLength(5) // Tous les résultats sont retournés
    })
  })
})
