/**
 * Service de recherche globale
 * Recherche dans étudiants, sessions, documents, messages
 */

import { createClient } from '@/lib/supabase/client'
import type { TableRow } from '@/lib/types/supabase-helpers'

type Student = TableRow<'students'>
type Session = TableRow<'sessions'>
type Document = TableRow<'documents'>
type Conversation = TableRow<'conversations'>

export interface SearchResult {
  type: 'student' | 'session' | 'document' | 'message'
  id: string
  title: string
  description?: string
  url: string
  metadata?: Record<string, any>
}

export class SearchService {
  private supabase = createClient()

  /**
   * Recherche globale dans tous les types de contenu
   */
  async searchGlobal(
    query: string,
    organizationId: string,
    userId?: string
  ): Promise<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      return []
    }

    const searchTerm = query.trim().toLowerCase()
    const results: SearchResult[] = []

    // Recherche en parallèle dans tous les types
    const [students, sessions, documents, conversations] = await Promise.all([
      this.searchStudents(searchTerm, organizationId),
      this.searchSessions(searchTerm, organizationId),
      this.searchDocuments(searchTerm, organizationId),
      userId ? this.searchConversations(searchTerm, organizationId, userId) : Promise.resolve([]),
    ])

    results.push(...students, ...sessions, ...documents, ...conversations)

    // Trier par pertinence (titre qui commence par la requête > contient la requête)
    return results.sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(searchTerm) ? 1 : 0
      const bStarts = b.title.toLowerCase().startsWith(searchTerm) ? 1 : 0
      return bStarts - aStarts
    })
  }

  /**
   * Recherche dans les étudiants
   */
  private async searchStudents(
    searchTerm: string,
    organizationId: string
  ): Promise<SearchResult[]> {
    const { data, error } = await this.supabase
      .from('students')
      .select('id, first_name, last_name, student_number, email')
      .eq('organization_id', organizationId)
      .or(
        `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,student_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      )
      .limit(10)

    if (error || !data) return []

    return data.map((student: Student) => ({
      type: 'student' as const,
      id: student.id,
      title: `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.student_number || 'Étudiant',
      description: student.student_number || student.email || undefined,
      url: `/dashboard/students/${student.id}`,
      metadata: {
        student_number: student.student_number,
        email: student.email,
      },
    }))
  }

  /**
   * Recherche dans les sessions
   */
  private async searchSessions(
    searchTerm: string,
    organizationId: string
  ): Promise<SearchResult[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('id, name, start_date, end_date')
      .eq('organization_id', organizationId)
      .ilike('name', `%${searchTerm}%`)
      .limit(10)

    if (error || !data) return []

    return data.map((session: Session) => ({
      type: 'session' as const,
      id: session.id,
      title: session.name || 'Session',
      description: session.start_date
        ? `Du ${new Date(session.start_date).toLocaleDateString('fr-FR')}`
        : undefined,
      url: `/dashboard/sessions/${session.id}`,
      metadata: {
        start_date: session.start_date,
        end_date: session.end_date,
      },
    }))
  }

  /**
   * Recherche dans les documents
   */
  private async searchDocuments(
    searchTerm: string,
    organizationId: string
  ): Promise<SearchResult[]> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('id, title, type, created_at')
      .eq('organization_id', organizationId)
      .ilike('title', `%${searchTerm}%`)
      .limit(10)

    if (error || !data) return []

    return data.map((doc: Document) => ({
      type: 'document' as const,
      id: doc.id,
      title: doc.title || 'Document',
      description: doc.type || undefined,
      url: `/dashboard/documents`,
      metadata: {
        type: doc.type,
        created_at: doc.created_at,
      },
    }))
  }

  /**
   * Recherche dans les conversations/messages
   */
  private async searchConversations(
    searchTerm: string,
    organizationId: string,
    userId: string
  ): Promise<SearchResult[]> {
    // Rechercher dans les conversations où l'utilisateur est participant
    const { data: conversations, error } = await this.supabase
      .from('conversations')
      .select('id, name, conversation_type')
      .eq('organization_id', organizationId)
      .ilike('name', `%${searchTerm}%`)
      .limit(5)

    if (error || !conversations) return []

    // Vérifier que l'utilisateur est participant
    const conversationIds = conversations.map((c) => c.id)
    const { data: participants } = await this.supabase
      .from('conversation_participants')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('user_id', userId)

    const userConversationIds = new Set(participants?.map((p) => p.conversation_id) || [])

    return conversations
      .filter((conv) => userConversationIds.has(conv.id))
      .map((conv: Conversation) => ({
        type: 'message' as const,
        id: conv.id,
        title: conv.name || 'Conversation',
        description: conv.conversation_type === 'group' ? 'Groupe' : 'Direct',
        url: `/dashboard/messages/${conv.id}`,
        metadata: {
          conversation_type: conv.conversation_type,
        },
      }))
  }
}

export const searchService = new SearchService()



