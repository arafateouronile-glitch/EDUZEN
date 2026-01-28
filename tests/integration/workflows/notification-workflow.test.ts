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

// Créer la map en dehors du describe pour qu'elle persiste entre les tests
const channelsMap = new Map<string, any>()

describe('Workflow: Notifications', () => {
  let notificationService: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    resetMockSupabase(mockSupabase)
    
    // Nettoyer la map avant chaque test
    channelsMap.clear()
    
    // Réappliquer les mocks pour channel et removeChannel
    // Le service stocke le channel dans this.channels, donc on doit retourner le même objet pour chaque channelName
    // IMPORTANT: Le channel retourné doit être le même objet que celui stocké dans le service
    const channelFactory = vi.fn((channelName: string) => {
      if (!channelsMap.has(channelName)) {
        const channelMock: any = {
          on: vi.fn(),
          subscribe: vi.fn(),
        }
        // Permettre le chaînage de .on() - chaque appel à .on() retourne le channelMock
        channelMock.on.mockReturnValue(channelMock)
        // subscribe() retourne aussi le channelMock pour que le service puisse le stocker
        channelMock.subscribe.mockReturnValue(channelMock)
        channelsMap.set(channelName, channelMock)
      }
      return channelsMap.get(channelName)
    })
    ;(mockSupabase as any).channel = channelFactory
    ;(mockSupabase as any).removeChannel = vi.fn()
    
    notificationService = new NotificationService(mockSupabase as any)
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

      // Le service fait: from('notifications').insert(...).select() qui retourne une promesse
      const mockNotifications = user_ids.map((user_id, index) => ({
        id: `notification-${index + 1}`,
        user_id,
        organization_id,
        type: 'info',
        title: 'Test',
        message: 'Message',
        data: {},
        created_at: new Date().toISOString(),
      }))

      // Mock insert().select() qui retourne une promesse
      const insertQueryBuilder: any = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: mockNotifications, error: null }),
      }
      mockSupabase.from.mockReturnValueOnce(insertQueryBuilder)

      const notifications = await notificationService.createForUsers(
        user_ids,
        organization_id,
        'info',
        'Test',
        'Message'
      )

      expect(notifications).toHaveLength(3)
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
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

      // Le service fait: from('notifications').select('*', { count: 'exact', head: true }).eq().is()
      const queryBuilder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: (resolve: any) => Promise.resolve({ count, error: null }).then(resolve),
      }
      mockSupabase.from.mockReturnValueOnce(queryBuilder)

      const result = await notificationService.getUnreadCount(userId)

      expect(result).toBe(count)
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
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

      // S'abonner d'abord pour créer le channel
      // Le service fait: channel().on().on().subscribe() puis stocke le channel dans this.channels
      notificationService.subscribeToNotifications(userId, callback)
      
      // Vérifier que le channel a été créé
      expect(mockSupabase.channel).toHaveBeenCalledWith(`notifications:${userId}`)
      
      // Vérifier que le channel est bien stocké dans le service
      const serviceChannels = (notificationService as any).channels
      const channelName = `notifications:${userId}`
      
      // Le channel devrait être stocké après subscribe()
      if (!serviceChannels.has(channelName)) {
        // Si le channel n'est pas stocké, c'est que subscribe() n'a pas été appelé correctement
        // Vérifier que subscribe() a été appelé
        const expectedChannel = channelsMap.get(channelName)
        if (expectedChannel) {
          expect(expectedChannel.subscribe).toHaveBeenCalled()
        }
      }
      
      expect(serviceChannels.has(channelName)).toBe(true)
      
      // Récupérer le channel stocké
      const storedChannel = serviceChannels.get(channelName)
      expect(storedChannel).toBeDefined()
      
      // Vérifier que le channel stocké correspond à celui dans channelsMap
      const expectedChannel = channelsMap.get(channelName)
      expect(storedChannel).toBe(expectedChannel)
      
      // Se désabonner - le service vérifie si le channel existe dans this.channels
      // et appelle removeChannel seulement s'il existe
      notificationService.unsubscribeFromNotifications(userId)

      // Le service appelle removeChannel avec le channel stocké
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(expectedChannel)
      
      // Vérifier que le channel a été supprimé de la map
      expect(serviceChannels.has(channelName)).toBe(false)
    })
  })
})

