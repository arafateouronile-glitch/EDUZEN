/**
 * Tests unitaires pour NotificationService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService } from '@/lib/services/notification.service'
import type { Notification, CreateNotificationParams } from '@/lib/services/notification.service'
import { resetMockSupabase } from '@/tests/__mocks__/supabase-query-builder'

// Mock Supabase client avec vi.hoisted pour résoudre les problèmes d'initialisation
const { mockSupabase } = vi.hoisted(() => {
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
    channel: vi.fn(() => {
      const channelMock: any = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockImplementation(() => channelMock),
      }
      channelMock.on.mockReturnValue(channelMock)
      return channelMock
    }),
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

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}))

describe('NotificationService', () => {
  let service: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSupabase(mockSupabase)
    service = new NotificationService(mockSupabase as any)
  })

  describe('create', () => {
    it('devrait créer une notification avec succès', async () => {
      const params: CreateNotificationParams = {
        user_id: 'user-1',
        organization_id: 'org-1',
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test notification',
      }

      const notificationId = 'notification-1'
      const notification: Notification = {
        id: notificationId,
        ...params,
        data: {},
        created_at: new Date().toISOString(),
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: notificationId, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: notification, error: null })

      const result = await service.create(params)

      expect(result).toEqual(notification)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_notification', {
        p_user_id: params.user_id,
        p_organization_id: params.organization_id,
        p_type: params.type,
        p_title: params.title,
        p_message: params.message,
        p_data: {},
        p_link: null,
        p_expires_at: null,
      })
    })

    it('devrait gérer les erreurs lors de la création', async () => {
      const params: CreateNotificationParams = {
        user_id: 'user-1',
        organization_id: 'org-1',
        type: 'error',
        title: 'Error Notification',
        message: 'This is an error',
      }

      const error = new Error('Database error')
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error })

      await expect(service.create(params)).rejects.toThrow('Database error')
    })

    it('devrait propager l\'erreur si le fetch après rpc échoue', async () => {
      const params: CreateNotificationParams = {
        user_id: 'user-1',
        organization_id: 'org-1',
        type: 'info',
        title: 'Test',
        message: 'Test',
      }
      const notificationId = 'notif-1'
      const fetchError = new Error('Fetch failed')

      mockSupabase.rpc.mockResolvedValueOnce({ data: notificationId, error: null })
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: fetchError })

      await expect(service.create(params)).rejects.toThrow('Fetch failed')
    })
  })

  describe('createForUsers', () => {
    it('devrait retourner un tableau vide si user_ids est vide', async () => {
      const result = await service.createForUsers(
        [],
        'org-1',
        'info',
        'Title',
        'Message'
      )
      expect(result).toEqual([])
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('devrait créer des notifications sans data ni link (data: {}, link: null)', async () => {
      const userIds = ['user-1']
      const notifications: Notification[] = userIds.map((id, i) => ({
        id: `notif-${i + 1}`,
        user_id: id,
        organization_id: 'org-1',
        type: 'info' as const,
        title: 'No data',
        message: 'Message',
        data: {},
        created_at: new Date().toISOString(),
      }))

      const insertChain: any = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: notifications, error: null }),
      }
      mockSupabase.from.mockReturnValue(insertChain)

      const result = await service.createForUsers(
        userIds,
        'org-1',
        'info',
        'No data',
        'Message'
      )

      expect(result).toEqual(notifications)
      expect(insertChain.insert).toHaveBeenCalledWith(
        userIds.map((user_id) => ({
          user_id,
          organization_id: 'org-1',
          type: 'info',
          title: 'No data',
          message: 'Message',
          data: {},
          link: null,
        }))
      )
    })

    it('devrait créer des notifications pour plusieurs utilisateurs', async () => {
      const userIds = ['user-1', 'user-2']
      const notifications: Notification[] = userIds.map((id, i) => ({
        id: `notif-${i + 1}`,
        user_id: id,
        organization_id: 'org-1',
        type: 'info' as const,
        title: 'Batch',
        message: 'Message',
        data: { key: 'value' },
        created_at: new Date().toISOString(),
      }))

      const insertChain: any = {
        insert: vi.fn(),
        select: vi.fn(),
      }
      insertChain.insert.mockReturnValue(insertChain)
      insertChain.select.mockResolvedValue({ data: notifications, error: null })
      mockSupabase.from.mockReturnValue(insertChain)

      const result = await service.createForUsers(
        userIds,
        'org-1',
        'info',
        'Batch',
        'Message',
        { key: 'value' },
        '/link'
      )

      expect(result).toEqual(notifications)
      expect(insertChain.insert).toHaveBeenCalledWith(
        userIds.map((user_id) => ({
          user_id,
          organization_id: 'org-1',
          type: 'info',
          title: 'Batch',
          message: 'Message',
          data: { key: 'value' },
          link: '/link',
        }))
      )
    })

    it('devrait propager l\'erreur si batch insert échoue', async () => {
      const insertChain: any = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
      }
      mockSupabase.from.mockReturnValue(insertChain)

      await expect(
        service.createForUsers(['user-1'], 'org-1', 'info', 'T', 'M')
      ).rejects.toThrow()
    })
  })

  describe('getByUser', () => {
    it('devrait récupérer les notifications d\'un utilisateur', async () => {
      const userId = 'user-1'
      const notifications: Notification[] = [
        {
          id: 'notif-1',
          user_id: userId,
          organization_id: 'org-1',
          type: 'info',
          title: 'Notification 1',
          message: 'Message 1',
          data: {},
          created_at: new Date().toISOString(),
        },
        {
          id: 'notif-2',
          user_id: userId,
          organization_id: 'org-1',
          type: 'success',
          title: 'Notification 2',
          message: 'Message 2',
          data: {},
          created_at: new Date().toISOString(),
        },
      ]

      // Le service fait: from().select().eq().order() qui retourne une promesse directement
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: notifications, error: null }).then(resolve),
      }
      mockSupabase.from.mockReturnValue(queryBuilder)

      const result = await service.getByUser(userId)

      expect(result).toEqual(notifications)
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', userId)
    })

    it('devrait appliquer limit et offset', async () => {
      const userId = 'user-1'
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
      }
      mockSupabase.from.mockReturnValue(queryBuilder)

      await service.getByUser(userId, { limit: 10, offset: 5 })

      expect(queryBuilder.limit).toHaveBeenCalledWith(10)
      expect(queryBuilder.range).toHaveBeenCalledWith(5, 14) // offset, offset + limit - 1
    })

    it('devrait filtrer les notifications non lues si demandé', async () => {
      const userId = 'user-1'
      const unreadNotifications: Notification[] = [
        {
          id: 'notif-1',
          user_id: userId,
          organization_id: 'org-1',
          type: 'info',
          title: 'Unread Notification',
          message: 'Message',
          data: {},
          created_at: new Date().toISOString(),
        },
      ]

      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: unreadNotifications, error: null }).then(resolve),
      }
      mockSupabase.from.mockReturnValue(queryBuilder)

      const result = await service.getByUser(userId, { unread_only: true })

      expect(result).toEqual(unreadNotifications)
      expect(queryBuilder.is).toHaveBeenCalledWith('read_at', null)
    })

    it('devrait propager l\'erreur si la requête échoue', async () => {
      const userId = 'user-1'
      const queryError = new Error('Query failed')
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ data: null, error: queryError }).then(resolve),
      }
      mockSupabase.from.mockReturnValue(queryBuilder)

      await expect(service.getByUser(userId)).rejects.toThrow('Query failed')
    })
  })

  describe('getUnreadCount', () => {
    it('devrait retourner le nombre de notifications non lues', async () => {
      const userId = 'user-1'
      const count = 5

      // Le service fait: from().select('*', { count: 'exact', head: true }).eq().is()
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ count, error: null }).then(resolve),
      }
      mockSupabase.from.mockReturnValue(queryBuilder)

      const result = await service.getUnreadCount(userId)

      expect(result).toBe(count)
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
    })

    it('devrait retourner 0 si aucune notification non lue', async () => {
      const userId = 'user-1'

      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ count: 0, error: null }).then(resolve),
      }
      mockSupabase.from.mockReturnValue(queryBuilder)

      const result = await service.getUnreadCount(userId)

      expect(result).toBe(0)
    })

    it('devrait retourner 0 si user_id est null ou undefined', async () => {
      expect(await service.getUnreadCount(null)).toBe(0)
      expect(await service.getUnreadCount(undefined)).toBe(0)
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('devrait retourner 0 en cas d\'erreur Supabase', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ count: null, error: { message: 'DB error' } }).then(resolve),
      }
      mockSupabase.from.mockReturnValue(queryBuilder)

      const result = await service.getUnreadCount('user-1')

      expect(result).toBe(0)
    })

    it('devrait retourner 0 si la requête lance (catch)', async () => {
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockRejectedValue(new Error('Network error')),
      }
      mockSupabase.from.mockReturnValue(queryBuilder)

      const result = await service.getUnreadCount('user-1')

      expect(result).toBe(0)
    })
  })

  describe('markAsRead', () => {
    it('devrait marquer une notification comme lue', async () => {
      const notificationId = 'notif-1'

      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await service.markAsRead(notificationId)

      expect(result).toBe(true)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('mark_notification_read', {
        p_notification_id: notificationId,
      })
    })

    it('devrait retourner false si rpc retourne data falsy', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: false, error: null })

      const result = await service.markAsRead('notif-1')

      expect(result).toBe(false)
    })

    it('devrait propager l\'erreur si rpc échoue', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('RPC failed') })

      await expect(service.markAsRead('notif-1')).rejects.toThrow('RPC failed')
    })
  })

  describe('markAllAsRead', () => {
    it('devrait marquer toutes les notifications comme lues', async () => {
      const userId = 'user-1'
      const count = 3

      mockSupabase.rpc.mockResolvedValueOnce({ data: count, error: null })

      const result = await service.markAllAsRead(userId)

      expect(result).toBe(count)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('mark_all_notifications_read', {
        p_user_id: userId,
      })
    })

    it('devrait retourner 0 si rpc retourne data falsy', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null })

      const result = await service.markAllAsRead('user-1')

      expect(result).toBe(0)
    })

    it('devrait propager l\'erreur si rpc échoue', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: new Error('RPC failed') })

      await expect(service.markAllAsRead('user-1')).rejects.toThrow('RPC failed')
    })
  })

  describe('delete', () => {
    it('devrait supprimer une notification', async () => {
      const notificationId = 'notif-1'

      const queryBuilder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
      }
      mockSupabase.from.mockReturnValue(queryBuilder)

      const result = await service.delete(notificationId)

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', notificationId)
    })

    it('devrait propager l\'erreur si la suppression échoue', async () => {
      const queryBuilder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ error: new Error('Delete failed') }).then(resolve),
      }
      mockSupabase.from.mockReturnValue(queryBuilder)

      await expect(service.delete('notif-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('subscribeToNotifications', () => {
    it('devrait s\'abonner aux notifications en temps réel', () => {
      const userId = 'user-1'
      const callback = vi.fn()

      const unsubscribe = service.subscribeToNotifications(userId, callback)

      expect(mockSupabase.channel).toHaveBeenCalledWith(`notifications:${userId}`)
      expect(typeof unsubscribe).toBe('function')
    })

    it('devrait nettoyer l\'ancien channel avant de créer un nouveau', () => {
      const userId = 'user-1'
      const callback = vi.fn()

      const unsubscribeSpy = vi.spyOn(service as any, 'unsubscribeFromNotifications')
      unsubscribeSpy.mockImplementation(() => {
        mockSupabase.removeChannel()
      })

      service.subscribeToNotifications(userId, callback)
      service.subscribeToNotifications(userId, callback)

      expect(unsubscribeSpy).toHaveBeenCalled()
    })

    it('devrait retourner une fonction unsubscribe qui ne lance pas', () => {
      const userId = 'user-1'
      const callback = vi.fn()
      const unsubscribe = service.subscribeToNotifications(userId, callback)
      expect(typeof unsubscribe).toBe('function')
      expect(() => unsubscribe()).not.toThrow()
    })
  })

  describe('unsubscribeFromNotifications', () => {
    it('devrait ne rien faire si pas de channel pour l\'utilisateur', () => {
      ;(service as any).unsubscribeFromNotifications('user-unknown')
      expect(mockSupabase.removeChannel).not.toHaveBeenCalled()
    })

    it('devrait appeler removeChannel et retirer le channel de la map quand il existe (l.353-354)', () => {
      const userId = 'user-1'
      const callback = vi.fn()
      service.subscribeToNotifications(userId, callback)
      expect((service as any).channels.has(`notifications:${userId}`)).toBe(true)
      ;(service as any).unsubscribeFromNotifications(userId)
      expect(mockSupabase.removeChannel).toHaveBeenCalled()
      expect((service as any).channels.has(`notifications:${userId}`)).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('devrait retirer tous les channels et vider la map', () => {
      const userId = 'user-1'
      const callback = vi.fn()
      service.subscribeToNotifications(userId, callback)
      service.cleanup()
      expect(mockSupabase.removeChannel).toHaveBeenCalled()
    })
  })

  describe('constructor', () => {
    it('devrait lever une erreur si supabaseClient est null', () => {
      expect(() => new NotificationService(null as any)).toThrow(
        'SupabaseClient is required for NotificationService'
      )
    })
  })
})

