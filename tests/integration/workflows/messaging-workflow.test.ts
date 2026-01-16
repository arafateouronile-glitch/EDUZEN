/**
 * Tests d'intégration pour le workflow de messagerie
 * Teste l'intégration complète : création de conversation, envoi de message, notifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MessagingService } from '@/lib/services/messaging.service'
import { NotificationService } from '@/lib/services/notification.service'
// Mock Supabase client avec vi.hoisted pour résoudre les problèmes d'initialisation
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
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        createSignedUrl: vi.fn(),
      })),
    },
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

describe('Workflow: Messagerie', () => {
  let messagingService: MessagingService
  let notificationService: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    // Réappliquer les implémentations après clearAllMocks (sans resetMockSupabase qui casse le chaînage)
    const chainableMethods = ['from', 'select', 'eq', 'in', 'is', 'insert', 'update', 'upsert', 'delete', 'order', 'limit', 'rpc']
    chainableMethods.forEach((method) => {
      ;(mockSupabase as any)[method].mockImplementation(() => mockSupabase)
    })
    ;(mockSupabase as any).single.mockImplementation(() => Promise.resolve({ data: null, error: null }))
    ;(mockSupabase as any).maybeSingle.mockImplementation(() => Promise.resolve({ data: null, error: null }))
    ;(mockSupabase as any).range.mockImplementation(() => Promise.resolve({ data: [], error: null, count: 0 }))
    messagingService = new MessagingService()
    notificationService = new NotificationService()
  })

  it('devrait créer une conversation et envoyer un message', async () => {
    const organizationId = 'org-1'
    const senderId = 'user-1'
    const recipientId = 'user-2'

    // 1. Mock: Créer la conversation (createDirectConversation vérifie d'abord les conversations existantes)
    const conversation = {
      id: 'conversation-1',
      organization_id: organizationId,
      conversation_type: 'direct',
      created_at: new Date().toISOString(),
    }

    // Mock les requêtes Supabase dans l'ordre
    let fromCallCount = 0
    const createQueryWithThen = (data: any) => {
      const query: any = { ...mockSupabase }
      query.then = (resolve: any) => Promise.resolve({ data, error: null }).then(resolve)
      return query
    }

    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++
      // Première requête: vérifier conversations existantes (select id from conversations)
      if (fromCallCount === 1 && table === 'conversations') {
        return createQueryWithThen([]) // Pas de conversation existante
      }
      // Deuxième requête: créer la conversation (insert into conversations)
      if (fromCallCount === 2 && table === 'conversations') {
        return mockSupabase
      }
      // Troisième requête: créer les participants (insert into conversation_participants)
      if (fromCallCount === 3 && table === 'conversation_participants') {
        return mockSupabase
      }
      // Quatrième requête: envoyer le message (insert into messages)
      if (fromCallCount === 4 && table === 'messages') {
        return mockSupabase
      }
      // Cinquième requête: récupérer le sender (select from users)
      if (fromCallCount === 5 && table === 'users') {
        return createQueryWithThen([{ id: senderId, full_name: 'User 1' }])
      }
      return mockSupabase
    })

    // Mock .single() pour créer la conversation et le message
    mockSupabase.single
      .mockResolvedValueOnce({ data: conversation, error: null }) // Créer conversation
      .mockResolvedValueOnce({ data: { id: 'participant-1' }, error: null }) // Créer participant 1
      .mockResolvedValueOnce({ data: { id: 'participant-2' }, error: null }) // Créer participant 2
      .mockResolvedValueOnce({
        // Envoyer le message
        data: {
          id: 'message-1',
          conversation_id: conversation.id,
          sender_id: senderId,
          content: 'Bonjour, comment allez-vous ?',
          created_at: new Date().toISOString(),
        },
        error: null,
      })

    // Mock .maybeSingle() pour récupérer le sender
    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: senderId, full_name: 'User 1', email: 'user1@example.com' },
      error: null,
    })

    // Exécuter le workflow
    const createdConversation = await messagingService.createDirectConversation(
      senderId,
      recipientId,
      organizationId
    )

    const result = await messagingService.sendMessage({
      conversation_id: createdConversation.id,
      sender_id: senderId,
      content: 'Bonjour, comment allez-vous ?',
    })

    expect(result).toBeDefined()
    expect(result.id).toBe('message-1')
  })

  it('devrait envoyer une notification pour un nouveau message', async () => {
    const conversationId = 'conversation-1'
    const senderId = 'user-1'
    const recipientId = 'user-2'
    const organizationId = 'org-1'

    const message = {
      id: 'message-1',
      conversation_id: conversationId,
      sender_id: senderId,
      content: 'Nouveau message',
    }

    // Mock: Créer la notification (NotificationService utilise rpc puis from().select().eq().single())
    mockSupabase.rpc.mockResolvedValueOnce({
      data: 'notification-1',
      error: null,
    })

    // Mock: Récupérer la notification créée
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'notification-1',
        user_id: recipientId,
        organization_id: organizationId,
        type: 'message',
        title: 'Nouveau message',
        message: 'Vous avez reçu un nouveau message',
        created_at: new Date().toISOString(),
      },
      error: null,
    })

    // Le système devrait créer une notification pour le destinataire
    const notification = await notificationService.create({
      user_id: recipientId,
      organization_id: organizationId,
      type: 'message',
      title: 'Nouveau message',
      message: 'Vous avez reçu un nouveau message',
      data: {
        conversation_id: conversationId,
        message_id: message.id,
      },
      link: `/dashboard/messages/${conversationId}`,
    })

    expect(notification).toBeDefined()
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'create_notification',
      expect.objectContaining({
        p_type: 'message',
        p_user_id: recipientId,
      })
    )
  })

  it('devrait créer une conversation de groupe', async () => {
    const organizationId = 'org-1'
    const creatorId = 'user-1'
    const userIds = ['user-1', 'user-2', 'user-3']

    // Mock: Créer la conversation (createGroupConversation utilise insert().select().single())
    const conversation = {
      id: 'conversation-1',
      organization_id: organizationId,
      conversation_type: 'group',
      name: 'Groupe de discussion',
      created_by: creatorId,
      created_at: new Date().toISOString(),
    }

    // Mock les requêtes dans l'ordre
    let fromCallCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++
      // Première requête: créer la conversation
      if (fromCallCount === 1 && table === 'conversations') {
        return mockSupabase
      }
      // Deuxième requête: ajouter les participants (insert conversation_participants)
      if (fromCallCount === 2 && table === 'conversation_participants') {
        return mockSupabase
      }
      return mockSupabase
    })

    // Mock .single() : créer conversation puis ajouter participants
    mockSupabase.single
      .mockResolvedValueOnce({ data: conversation, error: null }) // Créer conversation
      .mockResolvedValueOnce({ data: { id: 'participant-1' }, error: null }) // Ajouter participant 1
      .mockResolvedValueOnce({ data: { id: 'participant-2' }, error: null }) // Ajouter participant 2
      .mockResolvedValueOnce({ data: { id: 'participant-3' }, error: null }) // Ajouter participant 3

    // Le service devrait créer la conversation et ajouter tous les participants
    const result = await messagingService.createGroupConversation(
      'Groupe de discussion',
      userIds,
      organizationId,
      creatorId
    )

    expect(result).toBeDefined()
    expect(result.id).toBe('conversation-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
  })

  it('devrait gérer les pièces jointes dans un message', async () => {
    const conversationId = 'conversation-1'
    const senderId = 'user-1'
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' })

    // Mock: Upload du fichier
    const mockStorageBucket = {
      upload: vi.fn().mockResolvedValueOnce({
        data: { path: 'messages/file-1.pdf' },
        error: null,
      }),
      getPublicUrl: vi.fn(),
      createSignedUrl: vi.fn(),
    }
    ;(mockSupabase.storage.from as any).mockReturnValueOnce(mockStorageBucket)

    // Mock: Créer le message avec pièce jointe
    const message = {
      id: 'message-1',
      conversation_id: conversationId,
      sender_id: senderId,
      content: 'Message avec pièce jointe',
      attachments: [
        {
          name: 'document.pdf',
          path: 'messages/file-1.pdf',
          size: 1024,
          type: 'application/pdf',
        },
      ],
    }

    // Mock les requêtes Supabase pour sendMessage
    let fromCallCount = 0
    mockSupabase.from.mockImplementation((table: string) => {
      fromCallCount++
      if (fromCallCount === 1 && table === 'messages') {
        return mockSupabase // Insert message
      }
      if (fromCallCount === 2 && table === 'users') {
        const query: any = { ...mockSupabase }
        query.then = (resolve: any) => Promise.resolve({ data: [{ id: senderId, full_name: 'User 1' }], error: null }).then(resolve)
        return query
      }
      return mockSupabase
    })

    mockSupabase.single.mockResolvedValueOnce({
      data: message,
      error: null,
    })

    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: { id: senderId, full_name: 'User 1', email: 'user1@example.com' },
      error: null,
    })
    mockSupabase.single.mockResolvedValueOnce({
      data: message,
      error: null,
    })

    // Le service devrait uploader le fichier et créer le message
    expect(mockSupabase.storage.from).toHaveBeenCalledWith('messages')
  })
})



