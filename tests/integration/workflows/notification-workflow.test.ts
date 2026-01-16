/**
 * Tests d'intégration pour le workflow de notifications
 * Teste l'intégration complète : création → envoi → réception → lecture
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService } from '@/lib/services/notification.service'
// Mock Supabase avec vi.hoisted pour résoudre les problèmes d'initialisation
const { mockSupabase } = vi.hoisted(() => {
  // Créer le mock directement ici pour éviter les problèmes d'import
  const mock: any = {
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  }
  
  // Toutes les méthodes chainables retournent le mock lui-même
  const chainableMethods = ['from', 'select', 'eq', 'in', 'is', 'insert', 'update', 'upsert', 'delete', 'order', 'limit', 'rpc']
  chainableMethods.forEach((method) => {
    mock[method].mockImplementation(() => mock)
  })
  
  // single(), maybeSingle(), et range() retournent des promesses
  mock.single.mockResolvedValue({ data: null, error: null })
  mock.maybeSingle.mockResolvedValue({ data: null, error: null })
  mock.range.mockResolvedValue({ data: [], error: null, count: 0 })
  
  return { mockSupabase: mock }
})

import { resetMockSupabase } from '@/tests/__mocks__/supabase-query-builder'

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('Workflow: Notifications', () => {
  let notificationService: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSupabase(mockSupabase)
    // Réappliquer les mocks pour channel et removeChannel
    ;(mockSupabase as any).channel = vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    }))
    ;(mockSupabase as any).removeChannel = vi.fn()
    notificationService = new NotificationService()
  })

  describe('Workflow complet de notification', () => {
    it('devrait créer une notification et la récupérer', async () => {
      const notificationData = {
        user_id: 'user-1',
        organization_id: 'org-1',
        type: 'info' as const,
        title: 'Test Notification',
        message: 'This is a test notification',
      }

      // Créer la notification
      const notificationId = 'notification-1'
      mockSupabase.rpc.mockResolvedValueOnce({
        data: notificationId,
        error: null,
      })

      const notification = {
        id: notificationId,
        ...notificationData,
        data: {},
        created_at: new Date().toISOString(),
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: notification,
        error: null,
      })

      const created = await notificationService.create(notificationData)

      expect(created).toEqual(notification)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_notification', expect.objectContaining({
        p_user_id: notificationData.user_id,
        p_organization_id: notificationData.organization_id,
        p_type: notificationData.type,
        p_title: notificationData.title,
        p_message: notificationData.message,
      }))
    })

    it('devrait créer des notifications pour plusieurs utilisateurs', async () => {
      const user_ids = ['user-1', 'user-2', 'user-3']
      const organization_id = 'org-1'

      // Mock pour chaque création
      user_ids.forEach(() => {
        mockSupabase.rpc.mockResolvedValueOnce({
          data: `notification-${Math.random()}`,
          error: null,
        })
        mockSupabase.single.mockResolvedValueOnce({
          data: {
            id: `notification-${Math.random()}`,
            user_id: user_ids[0],
            organization_id,
            type: 'info',
            title: 'Test',
            message: 'Message',
            data: {},
            created_at: new Date().toISOString(),
          },
          error: null,
        })
      })

      const notifications = await notificationService.createForUsers(
        user_ids,
        organization_id,
        'info',
        'Test',
        'Message'
      )

      expect(notifications).toHaveLength(3)
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(3)
    })

    it('devrait marquer une notification comme lue', async () => {
      const notificationId = 'notification-1'

      mockSupabase.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      })

      const result = await notificationService.markAsRead(notificationId)

      expect(result).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('mark_notification_read', {
        p_notification_id: notificationId,
      })
    })

    it('devrait marquer toutes les notifications comme lues', async () => {
      const userId = 'user-1'
      const count = 5

      mockSupabase.rpc.mockResolvedValueOnce({
        data: count,
        error: null,
      })

      const result = await notificationService.markAllAsRead(userId)

      expect(result).toBe(count)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('mark_all_notifications_read', {
        p_user_id: userId,
      })
    })

    it('devrait récupérer le nombre de notifications non lues', async () => {
      const userId = 'user-1'
      const count = 3

      mockSupabase.rpc.mockResolvedValueOnce({
        data: count,
        error: null,
      })

      const result = await notificationService.getUnreadCount(userId)

      expect(result).toBe(count)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_unread_notifications_count', {
        p_user_id: userId,
      })
    })
  })

  describe('Workflow avec temps réel', () => {
    it('devrait s\'abonner aux notifications en temps réel', () => {
      const userId = 'user-1'
      const callback = vi.fn()

      const unsubscribe = notificationService.subscribeToNotifications(userId, callback)

      expect(mockSupabase.channel).toHaveBeenCalledWith(`notifications:${userId}`)
      expect(typeof unsubscribe).toBe('function')
    })

    it('devrait se désabonner des notifications', () => {
      const userId = 'user-1'
      const callback = vi.fn()

      notificationService.subscribeToNotifications(userId, callback)
      notificationService.unsubscribeFromNotifications(userId)

      expect(mockSupabase.removeChannel).toHaveBeenCalled()
    })
  })
})

