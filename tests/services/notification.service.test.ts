/**
 * Tests unitaires pour NotificationService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService } from '@/lib/services/notification.service'
import type { Notification, CreateNotificationParams } from '@/lib/services/notification.service'
import { createMockSupabase, resetMockSupabase } from '@/tests/__mocks__/supabase-query-builder'

// Mock Supabase client avec vi.hoisted pour résoudre les problèmes d'initialisation
const { mockSupabase } = vi.hoisted(() => {
  const mock = createMockSupabase()
  // Ajouter les méthodes spécifiques à NotificationService
  ;(mock as any).rpc = vi.fn().mockReturnValue(mock)
  ;(mock as any).channel = vi.fn(() => ({
    on: vi.fn(() => ({
      subscribe: vi.fn(),
    })),
  }))
  ;(mock as any).removeChannel = vi.fn()
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
    service = new NotificationService()
    vi.clearAllMocks()
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

      mockSupabase.eq.mockResolvedValueOnce({
        data: notifications,
        error: null,
      })

      const result = await service.getByUser(userId)

      expect(result).toEqual(notifications)
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId)
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

      mockSupabase.is = vi.fn(() => mockSupabase)
      mockSupabase.is.mockResolvedValueOnce({
        data: unreadNotifications,
        error: null,
      })

      const result = await service.getByUser(userId, { unread_only: true })

      expect(result).toEqual(unreadNotifications)
      expect(mockSupabase.is).toHaveBeenCalledWith('read_at', null)
    })
  })

  describe('getUnreadCount', () => {
    it('devrait retourner le nombre de notifications non lues', async () => {
      const userId = 'user-1'
      const count = 5

      mockSupabase.rpc.mockResolvedValueOnce({ data: count, error: null })

      const result = await service.getUnreadCount(userId)

      expect(result).toBe(count)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_unread_notifications_count', {
        p_user_id: userId,
      })
    })

    it('devrait retourner 0 si aucune notification non lue', async () => {
      const userId = 'user-1'

      mockSupabase.rpc.mockResolvedValueOnce({ data: 0, error: null })

      const result = await service.getUnreadCount(userId)

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
  })

  describe('delete', () => {
    it('devrait supprimer une notification', async () => {
      const notificationId = 'notif-1'

      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const result = await service.delete(notificationId)

      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', notificationId)
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

      service.subscribeToNotifications(userId, callback)
      service.subscribeToNotifications(userId, callback)

      // Devrait nettoyer l'ancien channel
      expect(mockSupabase.removeChannel).toHaveBeenCalled()
    })
  })
})

