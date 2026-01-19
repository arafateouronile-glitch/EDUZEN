import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type SupportTicket = TableRow<'support_tickets'>
type SupportTicketMessage = TableRow<'support_ticket_messages'>
type SupportCategory = TableRow<'support_categories'>
type SupportTicketNote = TableRow<'support_ticket_notes'>
type SupportTicketRating = TableRow<'support_ticket_ratings'>
type SupportResponseTemplate = TableRow<'support_response_templates'>

export class SupportService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  // ========== CATEGORIES ==========

  async getCategories(organizationId: string) {
    const { data, error } = await this.supabase
      .from('support_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) {
      // Si la table n'existe pas encore ou erreur 404, retourner un tableau vide
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (
        errorObj.code === 'PGRST116' ||
        errorObj.code === '42P01' ||
        errorObj.code === 'PGRST301' ||
        errorObj.status === 404 ||
        errorObj.code === '404' ||
        errorObj.message?.includes('relation') ||
        errorObj.message?.includes('relationship') ||
        errorObj.message?.includes('does not exist') ||
        errorObj.message?.includes('schema cache')
      ) {
        console.warn('Table support_categories does not exist yet or invalid query:', errorObj?.message)
        return []
      }
      throw error
    }
    return data || []
  }

  async createCategory(category: TableInsert<'support_categories'>) {
    const { data, error } = await this.supabase
      .from('support_categories')
      .insert(category)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateCategory(id: string, updates: TableUpdate<'support_categories'>) {
    const { data, error } = await this.supabase
      .from('support_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteCategory(id: string) {
    const { error } = await this.supabase
      .from('support_categories')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== TICKETS ==========

  async getTickets(organizationId: string, filters?: {
    userId?: string
    status?: SupportTicket['status']
    priority?: SupportTicket['priority']
    categoryId?: string
    assignedTo?: string
  }) {
    let query = this.supabase
      .from('support_tickets')
      .select(`
        *,
        user:users(id, full_name, email),
        assigned_user:users!support_tickets_assigned_to_fkey(id, full_name, email),
        category:support_categories(*)
      `)
      .eq('organization_id', organizationId)

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }

    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })

    if (error) {
      // Si la table n'existe pas encore ou erreur 404/400, retourner un tableau vide
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (
        errorObj.code === 'PGRST116' ||
        errorObj.code === '42P01' ||
        errorObj.code === 'PGRST301' ||
        errorObj.status === 404 ||
        errorObj.status === 400 ||
        errorObj.code === '404' ||
        errorObj.code === '400' ||
        errorObj.message?.includes('relation') ||
        errorObj.message?.includes('relationship') ||
        errorObj.message?.includes('does not exist') ||
        errorObj.message?.includes('schema cache') ||
        errorObj.message?.includes('Could not find a relationship')
      ) {
        // Ne pas logger en mode production pour éviter le bruit dans la console
        if (process.env.NODE_ENV === 'development') {
          console.warn('Table support_tickets does not exist yet or invalid query:', error?.message)
        }
        return []
      }
      throw error
    }
    return data || []
  }

  async getTicketById(id: string) {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .select(`
        *,
        user:users(id, full_name, email),
        assigned_user:users!support_tickets_assigned_to_fkey(id, full_name, email),
        category:support_categories(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async createTicket(ticket: TableInsert<'support_tickets'>) {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .insert(ticket)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTicket(id: string, updates: TableUpdate<'support_tickets'>) {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async assignTicket(ticketId: string, userId: string) {
    return this.updateTicket(ticketId, {
      assigned_to: userId,
      assigned_at: new Date().toISOString(),
      status: 'in_progress',
    })
  }

  async resolveTicket(ticketId: string) {
    return this.updateTicket(ticketId, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
  }

  async closeTicket(ticketId: string) {
    return this.updateTicket(ticketId, {
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
  }

  // ========== MESSAGES ==========

  async getTicketMessages(ticketId: string) {
    const { data, error } = await this.supabase
      .from('support_ticket_messages')
      .select(`
        *,
        user:users(id, full_name, email)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  async createMessage(message: TableInsert<'support_ticket_messages'>) {
    const { data, error } = await this.supabase
      .from('support_ticket_messages')
      .insert(message)
      .select(`
        *,
        user:users(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  }

  async markMessageAsRead(messageId: string) {
    const { data, error } = await this.supabase
      .from('support_ticket_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', messageId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== NOTES ==========

  async getTicketNotes(ticketId: string) {
    const { data, error } = await this.supabase
      .from('support_ticket_notes')
      .select(`
        *,
        user:users(id, full_name, email)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createNote(note: TableInsert<'support_ticket_notes'>) {
    const { data, error } = await this.supabase
      .from('support_ticket_notes')
      .insert(note)
      .select(`
        *,
        user:users(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  }

  async updateNote(id: string, updates: TableUpdate<'support_ticket_notes'>) {
    const { data, error } = await this.supabase
      .from('support_ticket_notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteNote(id: string) {
    const { error } = await this.supabase
      .from('support_ticket_notes')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== RATINGS ==========

  async createRating(rating: TableInsert<'support_ticket_ratings'>) {
    const { data, error } = await this.supabase
      .from('support_ticket_ratings')
      .insert(rating)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getTicketRating(ticketId: string) {
    const { data, error } = await this.supabase
      .from('support_ticket_ratings')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  // ========== TEMPLATES ==========

  async getTemplates(organizationId: string) {
    const { data, error } = await this.supabase
      .from('support_response_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return data
  }

  async createTemplate(template: TableInsert<'support_response_templates'>) {
    const { data, error } = await this.supabase
      .from('support_response_templates')
      .insert(template)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTemplate(id: string, updates: TableUpdate<'support_response_templates'>) {
    const { data, error } = await this.supabase
      .from('support_response_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteTemplate(id: string) {
    const { error } = await this.supabase
      .from('support_response_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== STATISTICS ==========

  async getStatistics(organizationId: string, filters?: {
    startDate?: string
    endDate?: string
  }) {
    let query = this.supabase
      .from('support_tickets')
      .select('status, priority, created_at, resolved_at, first_response_at')
      .eq('organization_id', organizationId)

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    const { data, error } = await query

    if (error) throw error

    const ticketsData = (data || []) as any[]

    const stats = {
      total: ticketsData.length,
      byStatus: {
        open: 0,
        in_progress: 0,
        waiting_customer: 0,
        resolved: 0,
        closed: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      averageResponseTime: 0,
      averageResolutionTime: 0,
      resolutionRate: 0,
    }

    let totalResponseTime = 0
    let responseCount = 0
    let totalResolutionTime = 0
    let resolutionCount = 0
    let resolvedCount = 0

    ticketsData.forEach((ticket: any) => {
      // Par statut
      if (ticket.status && ticket.status in stats.byStatus) {
        stats.byStatus[ticket.status as keyof typeof stats.byStatus]++
      }

      // Par priorité
      if (ticket.priority && ticket.priority in stats.byPriority) {
        stats.byPriority[ticket.priority as keyof typeof stats.byPriority]++
      }

      // Temps de réponse moyen
      if (ticket.first_response_at && ticket.created_at) {
        const responseTime =
          new Date(ticket.first_response_at).getTime() -
          new Date(ticket.created_at).getTime()
        totalResponseTime += responseTime
        responseCount++
      }

      // Temps de résolution moyen
      if (ticket.resolved_at && ticket.created_at) {
        const resolutionTime =
          new Date(ticket.resolved_at).getTime() -
          new Date(ticket.created_at).getTime()
        totalResolutionTime += resolutionTime
        resolutionCount++
      }

      // Taux de résolution
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        resolvedCount++
      }
    })

    if (responseCount > 0) {
      stats.averageResponseTime = totalResponseTime / responseCount / (1000 * 60) // en minutes
    }

    if (resolutionCount > 0) {
      stats.averageResolutionTime = totalResolutionTime / resolutionCount / (1000 * 60 * 60) // en heures
    }

    if (data.length > 0) {
      stats.resolutionRate = (resolvedCount / data.length) * 100
    }

    return stats
  }
}

export const supportService = new SupportService()
