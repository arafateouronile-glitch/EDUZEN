import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'
import { logger, sanitizeError } from '@/lib/utils/logger'

type Conversation = TableRow<'conversations'>
type Message = TableRow<'messages'>
type ConversationParticipant = TableRow<'conversation_participants'>
type Call = TableRow<'calls'>

/**
 * Service de gestion de la messagerie
 * 
 * Gère les conversations, messages, participants et pièces jointes.
 * Utilise une approche optimisée pour éviter les problèmes RLS :
 * - Récupération séparée des conversations, participants et messages
 * - Enrichissement des données en batch pour éviter les requêtes N+1
 * - Support des utilisateurs et étudiants comme participants
 */
export class MessagingService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  // ========== CONVERSATIONS ==========

  /**
   * Récupère toutes les conversations d'un utilisateur avec leurs participants et derniers messages
   * 
   * Optimisation : Utilise des requêtes batch pour éviter les problèmes RLS et améliorer les performances
   * 
   * @param userId - ID de l'utilisateur
   * @param organizationId - ID de l'organisation
   * @returns Liste des conversations enrichies avec participants et dernier message
   */
  async getConversations(userId: string, organizationId: string) {
    // 1. Récupérer les IDs de conversation où l'utilisateur participe
    const { data: participantConversations, error: participantError } = await this.supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)

    if (participantError) throw participantError

    if (!participantConversations || participantConversations.length === 0) {
      return []
    }

    const conversationIds = participantConversations.map((p: any) => p.conversation_id)

    // 2. Récupérer les conversations
    const { data: conversations, error: conversationsError } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_archived', false)
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (conversationsError) throw conversationsError

    if (!conversations || conversations.length === 0) {
      return []
    }

    // 3. Récupérer TOUS les participants en une seule requête (batch)
    const { data: allParticipants } = await this.supabase
      .from('conversation_participants')
      .select('*')
      .in('conversation_id', conversationIds)

    // 4. Collecter tous les IDs uniques d'utilisateurs et d'étudiants
    const userIds = [...new Set((allParticipants || []).filter(p => p.user_id).map(p => p.user_id))]
    const studentIds = [...new Set((allParticipants || []).filter(p => p.student_id).map(p => p.student_id))]

    // 5. Récupérer tous les utilisateurs en une seule requête (batch)
    let usersMap: Record<string, any> = {}
    if (userIds.length > 0) {
      const { data: usersData } = await this.supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds)
      
      usersData?.forEach(u => { usersMap[u.id] = u })
    }

    // 6. Récupérer tous les étudiants en une seule requête (batch)
    let studentsMap: Record<string, any> = {}
    if (studentIds.length > 0) {
      const { data: studentsData } = await this.supabase
        .from('students')
        .select('id, first_name, last_name, email, student_number')
        .in('id', studentIds)
      
      studentsData?.forEach(s => { studentsMap[s.id] = s })
    }

    // 7. Récupérer les derniers messages de chaque conversation en parallèle
    const lastMessagesPromises = conversations.map(conv =>
      this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conv.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    )
    const lastMessagesResults = await Promise.all(lastMessagesPromises)

    // 8. Collecter les IDs d'expéditeurs des derniers messages
    const senderIds = [...new Set(lastMessagesResults.filter(r => r.data?.sender_id).map(r => r.data.sender_id))]
    const studentSenderIds = [...new Set(lastMessagesResults.filter(r => r.data?.student_sender_id).map(r => r.data.student_sender_id))]

    // 9. Récupérer les expéditeurs manquants
    if (senderIds.length > 0) {
      const { data: additionalUsers } = await this.supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', senderIds.filter(id => !usersMap[id]))
      
      additionalUsers?.forEach(u => { usersMap[u.id] = u })
    }

    if (studentSenderIds.length > 0) {
      const { data: additionalStudents } = await this.supabase
        .from('students')
        .select('id, first_name, last_name, email, student_number')
        .in('id', studentSenderIds.filter(id => !studentsMap[id]))
      
      additionalStudents?.forEach(s => { studentsMap[s.id] = s })
    }

    // 10. Assembler les données enrichies (aucune requête supplémentaire)
    return conversations.map((conv, index) => {
      // Participants de cette conversation
      const convParticipants = (allParticipants || [])
        .filter(p => p.conversation_id === conv.id)
        .map(participant => ({
          ...participant,
          user: participant.user_id ? usersMap[participant.user_id] || null : null,
          student: participant.student_id ? studentsMap[participant.student_id] || null : null,
        }))

      // Dernier message
      const lastMessage = lastMessagesResults[index].data
      let enrichedLastMessage = null
      if (lastMessage) {
        enrichedLastMessage = {
          ...lastMessage,
          sender: lastMessage.sender_id ? usersMap[lastMessage.sender_id] || null : null,
          student_sender: lastMessage.student_sender_id ? studentsMap[lastMessage.student_sender_id] || null : null,
        }
      }

      return {
        ...conv,
        participants: convParticipants,
        last_message: enrichedLastMessage,
      }
    })
  }

  async getConversationsByStudentId(studentId: string, organizationId: string) {
    const { data: participantConversations, error: participantError } = await this.supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('student_id', studentId)

    if (participantError) throw participantError

    if (!participantConversations || participantConversations.length === 0) {
      return []
    }

    const conversationIds = participantConversations.map((p: any) => p.conversation_id)

    const { data: conversations, error: conversationsError } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_archived', false)
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (conversationsError) throw conversationsError

    if (!conversations || conversations.length === 0) {
      return []
    }

    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation: any) => {
        const { data: participants } = await this.supabase
          .from('conversation_participants')
          .select('*')
          .eq('conversation_id', conversation.id)

        const enrichedParticipants = await Promise.all(
          (participants || []).map(async (participant: any) => {
            let user = null
            let student = null

            if (participant.user_id) {
              const { data: userData } = await this.supabase
                .from('users')
                .select('id, full_name, email, avatar_url')
                .eq('id', participant.user_id)
                .maybeSingle()
              user = userData
            }

            if (participant.student_id) {
              const { data: studentData } = await this.supabase
                .from('students')
                .select('id, first_name, last_name, email, student_number')
                .eq('id', participant.student_id)
                .maybeSingle()
              student = studentData
            }

            return {
              ...participant,
              user,
              student,
            }
          })
        )

        const { data: lastMessages } = await this.supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)

        let lastMessage = null
        if (lastMessages && lastMessages.length > 0) {
          const msg = lastMessages[0]
          let sender = null
          if (msg.sender_id) {
            const { data: senderData } = await this.supabase
              .from('users')
              .select('id, full_name, email')
              .eq('id', msg.sender_id)
              .maybeSingle()
            sender = senderData
          }
          lastMessage = {
            ...msg,
            sender,
          }
        }

        return {
          ...conversation,
          participants: enrichedParticipants,
          last_message: lastMessage,
        }
      })
    )

    return enrichedConversations
  }

  async getConversationById(conversationId: string) {
    const { data: conversation, error: convError } = await this.supabase
      .from('conversations')
      .select('id, organization_id, conversation_type, name, created_by, created_at, updated_at, is_archived, last_message_at')
      .eq('id', conversationId)
      .maybeSingle()

    if (convError) {
      logger.error('MessagingService - Erreur récupération conversation', convError, { error: sanitizeError(convError) })
      throw convError
    }

    if (!conversation) {
      return null
    }

    const { data: participants, error: participantsError } = await this.supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)

    if (participantsError) throw participantsError

    const enrichedParticipants = await Promise.all(
      (participants || []).map(async (participant: any) => {
        let user = null
        let student = null

        if (participant.user_id) {
          const { data: userData } = await this.supabase
            .from('users')
            .select('id, full_name, email, avatar_url')
            .eq('id', participant.user_id)
            .maybeSingle()
          user = userData
        }

        if (participant.student_id) {
          const { data: studentData } = await this.supabase
            .from('students')
            .select('id, first_name, last_name, email, student_number')
            .eq('id', participant.student_id)
            .maybeSingle()
          student = studentData
        }

        return {
          ...participant,
          user,
          student,
        }
      })
    )

    return {
      ...conversation,
      participants: enrichedParticipants,
    }
  }

  /**
   * Crée une conversation directe entre deux utilisateurs ou un utilisateur et un étudiant
   * 
   * Vérifie d'abord si une conversation directe existe déjà entre ces participants
   * pour éviter les doublons. Si une conversation existe, la retourne.
   * 
   * @param userId1 - ID du premier utilisateur (créateur)
   * @param userId2 - ID du deuxième utilisateur (optionnel, peut être null)
   * @param organizationId - ID de l'organisation
   * @param studentId2 - ID de l'étudiant (optionnel, utilisé si userId2 est null)
   * @returns La conversation créée ou existante avec ses participants
   */
  async createDirectConversation(
    userId1: string, 
    userId2: string | null, 
    organizationId: string,
    studentId2?: string | null
  ) {
    const { data: allDirectConversations, error: conversationsError } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('conversation_type', 'direct')
      .eq('organization_id', organizationId)
    
    if (!conversationsError && allDirectConversations && allDirectConversations.length > 0) {
      const conversationIds = allDirectConversations.map((c: any) => c.id)
      
      const { data: user1Participants, error: user1Error } = await this.supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId1)
        .in('conversation_id', conversationIds)
      
      if (!user1Error && user1Participants && user1Participants.length > 0) {
        const user1ConversationIds = user1Participants.map((p: any) => p.conversation_id)
        
        let participant2Query = this.supabase
          .from('conversation_participants')
          .select('conversation_id')
          .in('conversation_id', user1ConversationIds)
        
        if (userId2) {
          participant2Query = participant2Query.eq('user_id', userId2)
        } else if (studentId2) {
          participant2Query = participant2Query.eq('student_id', studentId2)
        }
        
        const { data: existingParticipant2 } = await participant2Query.maybeSingle()
        
        if (existingParticipant2) {
          return this.getConversationById(existingParticipant2.conversation_id)
        }
      }
    }

    const { data: conversation, error: convError } = await this.supabase
      .from('conversations')
      .insert({
        organization_id: organizationId,
        conversation_type: 'direct',
        created_by: userId1,
      })
      .select()
      .single()

    if (convError) throw convError

    await this.addParticipant(conversation.id, userId1, 'member')
    await this.addParticipant(conversation.id, userId2, 'member', studentId2)

    return this.getConversationById(conversation.id)
  }

  /**
   * Crée une conversation de groupe avec plusieurs participants
   * 
   * @param name - Nom de la conversation de groupe
   * @param userIds - Liste des IDs d'utilisateurs à ajouter
   * @param organizationId - ID de l'organisation
   * @param createdBy - ID de l'utilisateur créateur (sera owner)
   * @param studentIds - Liste optionnelle des IDs d'étudiants à ajouter
   * @returns La conversation créée avec tous ses participants
   */
  async createGroupConversation(
    name: string,
    userIds: string[],
    organizationId: string,
    createdBy: string,
    studentIds?: string[]
  ) {
    const { data: conversation, error } = await this.supabase
      .from('conversations')
      .insert({
        organization_id: organizationId,
        conversation_type: 'group',
        name,
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) throw error

    for (const userId of userIds) {
      await this.addParticipant(
        conversation.id,
        userId,
        userId === createdBy ? 'owner' : 'member'
      )
    }

    if (studentIds && studentIds.length > 0) {
      for (const studentId of studentIds) {
        await this.addParticipant(
          conversation.id,
          null,
          'member',
          studentId
        )
      }
    }

    return this.getConversationById(conversation.id)
  }

  async updateConversation(conversationId: string, updates: TableUpdate<'conversations'>) {
    const { data, error } = await this.supabase
      .from('conversations')
      .update(updates)
      .eq('id', conversationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async archiveConversation(conversationId: string) {
    return this.updateConversation(conversationId, { is_archived: true })
  }

  async deleteConversation(conversationId: string) {
    return this.updateConversation(conversationId, { is_archived: true })
  }

  async pinConversation(conversationId: string, isPinned: boolean) {
    return this.updateConversation(conversationId, { is_pinned: isPinned })
  }

  // ========== PARTICIPANTS ==========

  async addParticipant(
    conversationId: string, 
    userId: string | null, 
    role: string = 'member',
    studentId?: string | null
  ) {
    const insertData: any = {
      conversation_id: conversationId,
      role,
    }
    
    if (userId) {
      insertData.user_id = userId
    } else if (studentId) {
      insertData.student_id = studentId
    } else {
      throw new Error('Either userId or studentId must be provided')
    }
    
    const { data, error } = await this.supabase
      .from('conversation_participants')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeParticipant(conversationId: string, userId: string) {
    const { error } = await this.supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)

    if (error) throw error
  }

  async updateParticipantRole(conversationId: string, userId: string, role: string) {
    const { data, error } = await this.supabase
      .from('conversation_participants')
      .update({ role })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async muteConversation(conversationId: string, userId: string, isMuted: boolean) {
    const { data, error } = await this.supabase
      .from('conversation_participants')
      .update({ is_muted: isMuted })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async markAsRead(conversationId: string, userId: string) {
    const { error: updateError } = await this.supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)

    if (updateError) throw updateError

    const { data: messages } = await this.supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .not('sender_id', 'eq', userId)

    if (messages) {
      for (const message of messages) {
        await this.supabase
          .from('message_reads')
          .upsert({
            message_id: message.id,
            user_id: userId,
            read_at: new Date().toISOString(),
          })
      }
    }
  }

  // ========== MESSAGES ==========

  /**
   * Récupère les messages d'une conversation avec pagination
   * 
   * Enrichit chaque message avec les données de l'expéditeur (utilisateur ou étudiant)
   * et les données du message de réponse si présent.
   * 
   * @param conversationId - ID de la conversation
   * @param limit - Nombre de messages à récupérer (défaut: 50)
   * @param offset - Offset pour la pagination (défaut: 0)
   * @returns Liste des messages enrichis, triés par date croissante
   */
  async getMessages(conversationId: string, limit: number = 50, offset: number = 0) {
    const { data: messages, error } = await this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    if (!messages || messages.length === 0) {
      return []
    }

    const enrichedMessages = await Promise.all(
      messages.map(async (message: any) => {
        let sender = null
        let studentSender = null
        let replyTo = null

        if (message.sender_id) {
          const { data: userData } = await this.supabase
            .from('users')
            .select('id, full_name, email, avatar_url')
            .eq('id', message.sender_id)
            .maybeSingle()
          sender = userData
        }

        if (message.student_sender_id) {
          const { data: studentData } = await this.supabase
            .from('students')
            .select('id, first_name, last_name, email, student_number')
            .eq('id', message.student_sender_id)
            .maybeSingle()
          studentSender = studentData
        }

        if (message.reply_to_id) {
          const { data: replyMessage } = await this.supabase
            .from('messages')
            .select('*')
            .eq('id', message.reply_to_id)
            .maybeSingle()
          
          if (replyMessage) {
            let replySender = null
            let replyStudentSender = null
            
            if (replyMessage.sender_id) {
              const { data: replyUserData } = await this.supabase
                .from('users')
                .select('id, full_name')
                .eq('id', replyMessage.sender_id)
                .maybeSingle()
              replySender = replyUserData
            }
            
            if (replyMessage.student_sender_id) {
              const { data: replyStudentData } = await this.supabase
                .from('students')
                .select('id, first_name, last_name, email, student_number')
                .eq('id', replyMessage.student_sender_id)
                .maybeSingle()
              replyStudentSender = replyStudentData
            }
            
            replyTo = {
              ...replyMessage,
              sender: replySender,
              student_sender: replyStudentSender,
            }
          }
        }

        return {
          ...message,
          sender,
          student_sender: studentSender,
          reply_to: replyTo,
        }
      })
    )

    return enrichedMessages.reverse()
  }

  /**
   * Upload un fichier dans le bucket Supabase Storage pour les messages
   * 
   * @param file - Fichier à uploader
   * @param conversationId - ID de la conversation (utilisé pour organiser les fichiers)
   * @returns Le chemin du fichier uploadé (à stocker dans la DB)
   */
  async uploadAttachment(file: File, conversationId: string): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${conversationId}/${fileName}`

    const { data, error } = await this.supabase.storage
      .from('messages')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) throw error

    return filePath
  }

  /**
   * Génère une URL signée pour télécharger un fichier attaché
   * 
   * L'URL est valide pendant 1 heure (3600 secondes).
   * 
   * @param filePath - Chemin du fichier dans le bucket Storage
   * @returns URL signée pour télécharger le fichier
   */
  async getAttachmentUrl(filePath: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('messages')
      .createSignedUrl(filePath, 3600)

    if (error) throw error

    return data.signedUrl
  }

  /**
   * Envoie un message dans une conversation
   * 
   * Enrichit le message avec les données de l'expéditeur (utilisateur ou étudiant)
   * et met à jour le timestamp last_message_at de la conversation.
   * 
   * @param message - Données du message à envoyer
   * @returns Le message créé avec les données de l'expéditeur
   */
  async sendMessage(message: TableInsert<'messages'>) {
    const { data: insertedMessage, error } = await this.supabase
      .from('messages')
      .insert(message)
      .select('*')
      .single()

    if (error) throw error

    let sender = null
    let studentSender = null
    
    if (insertedMessage.sender_id) {
      const { data: userData } = await this.supabase
        .from('users')
        .select('id, full_name, email, avatar_url')
        .eq('id', insertedMessage.sender_id)
        .maybeSingle()
      sender = userData
    }
    
    if (insertedMessage.student_sender_id) {
      const { data: studentData } = await this.supabase
        .from('students')
        .select('id, first_name, last_name, email, student_number')
        .eq('id', insertedMessage.student_sender_id)
        .maybeSingle()
      studentSender = studentData
    }

    return {
      ...insertedMessage,
      sender,
      student_sender: studentSender,
    }
  }

  async updateMessage(messageId: string, content: string) {
    const { data, error } = await this.supabase
      .from('messages')
      .update({ content, is_edited: true })
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteMessage(messageId: string) {
    const { data, error } = await this.supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        content: 'Message supprimé',
      })
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const { data: message } = await this.supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single()

    if (!message) throw new Error('Message non trouvé')

    const reactions = (message.reactions as Record<string, string[]>) || {}
    if (!reactions[emoji]) {
      reactions[emoji] = []
    }
    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId)
    }

    const { data, error } = await this.supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    const { data: message } = await this.supabase
      .from('messages')
      .select('reactions')
      .eq('id', messageId)
      .single()

    if (!message) throw new Error('Message non trouvé')

    const reactions = (message.reactions as Record<string, string[]>) || {}
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId)
      if (reactions[emoji].length === 0) {
        delete reactions[emoji]
      }
    }

    const { data, error } = await this.supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== PINNED MESSAGES ==========

  async pinMessage(conversationId: string, messageId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('pinned_messages')
      .insert({
        conversation_id: conversationId,
        message_id: messageId,
        pinned_by: userId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async unpinMessage(conversationId: string, messageId: string) {
    const { error } = await this.supabase
      .from('pinned_messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('message_id', messageId)

    if (error) throw error
  }

  async getPinnedMessages(conversationId: string) {
    const { data, error } = await this.supabase
      .from('pinned_messages')
      .select(`
        *,
        message:messages(*, sender:users(id, full_name, email)),
        pinned_by_user:users(id, full_name)
      `)
      .eq('conversation_id', conversationId)
      .order('pinned_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== CALLS ==========

  async createCall(call: TableInsert<'calls'>) {
    const { data, error } = await this.supabase
      .from('calls')
      .insert(call)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateCallStatus(callId: string, status: string, duration?: number) {
    const updates: Record<string, string | number | undefined> = { status }
    if (status === 'active') {
      updates.started_at = new Date().toISOString()
    } else if (status === 'ended') {
      updates.ended_at = new Date().toISOString()
      if (duration) {
        updates.duration_seconds = duration
      }
    }

    const { data, error } = await this.supabase
      .from('calls')
      .update(updates)
      .eq('id', callId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async addCallParticipant(callId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('call_participants')
      .insert({
        call_id: callId,
        user_id: userId,
        status: 'joined',
        joined_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== NOTIFICATIONS ==========

  async getNotifications(userId: string, unreadOnly: boolean = false) {
    let query = this.supabase
      .from('message_notifications')
      .select(`
        *,
        conversation:conversations(*),
        message:messages(*, sender:users(id, full_name, email))
      `)
      .eq('user_id', userId)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  }

  async markNotificationAsRead(notificationId: string) {
    const { data, error } = await this.supabase
      .from('message_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async markAllNotificationsAsRead(userId: string) {
    const { error } = await this.supabase
      .from('message_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
  }

  // ========== SEARCH ==========

  async searchMessages(conversationId: string, query: string) {
    const { data, error } = await this.supabase
      .from('messages')
      .select(`
        *,
        sender:users(id, full_name, email, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  }
}

export const messagingService = new MessagingService()
