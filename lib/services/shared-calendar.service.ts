import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

// Types locaux pour les tables calendar qui ne sont pas encore dans le schéma Supabase
type Calendar = any
type CalendarEvent = any
type EventParticipant = any
type CalendarShare = any

export class SharedCalendarService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  // ========== CALENDARS ==========

  async getCalendars(userId: string, organizationId: string) {
    const { data, error } = await (this.supabase as any)
      .from('calendars')
      .select('*, owner:users(id, full_name, email)')
      .eq('organization_id', organizationId)
      .or(`is_public.eq.true,owner_id.eq.${userId}`)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    // Ajouter les calendriers partagés
    const { data: sharedCalendars } = await (this.supabase as any)
      .from('calendar_shares')
      .select('*, calendar:calendars(*, owner:users(id, full_name, email))')
      .eq('shared_with_user_id', userId)
      .eq('is_accepted', true)

    if (sharedCalendars) {
      const shared = sharedCalendars.map((share: CalendarShare & { calendar: Calendar & { owner?: { id: string; full_name: string | null; email: string } } }) => ({
        ...share.calendar,
        is_shared: true,
        share_permission: share.permission_level,
      }))
      return [...(data || []), ...shared]
    }

    return data
  }

  async getCalendarById(calendarId: string) {
    const { data, error } = await (this.supabase as any)
      .from('calendars')
      .select('*, owner:users(id, full_name, email)')
      .eq('id', calendarId)
      .single()

    if (error) throw error
    return data
  }

  async createCalendar(calendar: TableInsert<'calendars'>) {
    const { data, error } = await (this.supabase as any)
      .from('calendars')
      .insert(calendar)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateCalendar(calendarId: string, updates: TableUpdate<'calendars'>) {
    const { data, error } = await (this.supabase as any)
      .from('calendars')
      .update(updates)
      .eq('id', calendarId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteCalendar(calendarId: string) {
    const { error } = await (this.supabase as any)
      .from('calendars')
      .delete()
      .eq('id', calendarId)

    if (error) throw error
  }

  // ========== EVENTS ==========

  async getEvents(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    calendarIds?: string[]
  ) {
    let query = (this.supabase as any)
      .from('calendar_events')
      .select(`
        *,
        calendar:calendars(*),
        participants:event_participants(*, user:users(id, full_name, email)),
        created_by_user:users(id, full_name, email)
      `)
      .eq('organization_id', organizationId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())

    if (calendarIds && calendarIds.length > 0) {
      query = query.in('calendar_id', calendarIds)
    }

    const { data, error } = await query.order('start_time', { ascending: true })

    if (error) throw error
    return data
  }

  async getEventById(eventId: string) {
    const { data, error } = await (this.supabase as any)
      .from('calendar_events')
      .select(`
        *,
        calendar:calendars(*),
        participants:event_participants(*, user:users(id, full_name, email)),
        reminders:event_reminders(*),
        created_by_user:users(id, full_name, email)
      `)
      .eq('id', eventId)
      .single()

    if (error) throw error
    return data
  }

  async createEvent(event: TableInsert<'calendar_events'>) {
    const { data, error } = await (this.supabase as any)
      .from('calendar_events')
      .insert(event)
      .select()
      .single()

    if (error) throw error

    // Créer les rappels par défaut si nécessaire
    // (sera géré par l'application)

    return data
  }

  async updateEvent(eventId: string, updates: TableUpdate<'calendar_events'>) {
    const { data, error } = await (this.supabase as any)
      .from('calendar_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteEvent(eventId: string) {
    const { error } = await (this.supabase as any)
      .from('calendar_events')
      .delete()
      .eq('id', eventId)

    if (error) throw error
  }

  // ========== PARTICIPANTS ==========

  async addParticipant(participant: TableInsert<'event_participants'>) {
    const { data, error } = await (this.supabase as any)
      .from('event_participants')
      .insert(participant)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateParticipantStatus(
    eventId: string,
    userId: string,
    status: string
  ) {
    const { data, error } = await (this.supabase as any)
      .from('event_participants')
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeParticipant(eventId: string, userId: string) {
    const { error } = await (this.supabase as any)
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)

    if (error) throw error
  }

  // ========== REMINDERS ==========

  async createReminder(reminder: TableInsert<'event_reminders'>) {
    const { data, error } = await (this.supabase as any)
      .from('event_reminders')
      .insert(reminder)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getUpcomingReminders(userId: string, limit: number = 10) {
    const now = new Date()
    const { data, error } = await (this.supabase as any)
      .from('event_reminders')
      .select(`
        *,
        event:calendar_events(*, calendar:calendars(*))
      `)
      .eq('user_id', userId)
      .eq('is_sent', false)
      .gte('event.start_time', now.toISOString())
      .order('event.start_time', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data
  }

  // ========== SHARES ==========

  async shareCalendar(
    calendarId: string,
    sharedWithUserId: string,
    permissionLevel: string,
    sharedBy: string
  ) {
    const { data, error } = await (this.supabase as any)
      .from('calendar_shares')
      .insert({
        calendar_id: calendarId,
        shared_with_user_id: sharedWithUserId,
        permission_level: permissionLevel,
        shared_by: sharedBy,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async acceptShare(shareId: string) {
    const { data, error } = await (this.supabase as any)
      .from('calendar_shares')
      .update({
        is_accepted: true,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', shareId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async revokeShare(shareId: string) {
    const { error } = await (this.supabase as any)
      .from('calendar_shares')
      .delete()
      .eq('id', shareId)

    if (error) throw error
  }

  async getCalendarShares(calendarId: string) {
    const { data, error } = await (this.supabase as any)
      .from('calendar_shares')
      .select('*, shared_with:users(id, full_name, email), shared_by_user:users(id, full_name)')
      .eq('calendar_id', calendarId)

    if (error) throw error
    return data
  }

  async getSharedCalendars(userId: string) {
    const { data, error } = await (this.supabase as any)
      .from('calendar_shares')
      .select('*, calendar:calendars(*, owner:users(id, full_name, email))')
      .eq('shared_with_user_id', userId)
      .eq('is_accepted', true)

    if (error) throw error
    return data
  }

  // ========== PREFERENCES ==========

  async getUserPreferences(userId: string) {
    const { data, error } = await (this.supabase as any)
      .from('user_calendar_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<TableInsert<'user_calendar_preferences'>>
  ) {
    const existing = await this.getUserPreferences(userId)

    if (existing) {
      const { data, error } = await (this.supabase as any)
        .from('user_calendar_preferences')
        .update(preferences)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      const { data, error } = await (this.supabase as any)
        .from('user_calendar_preferences')
        .insert({
          user_id: userId,
          ...preferences,
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  }

  // ========== RECURRENCE ==========

  async createRecurrenceException(exception: TableInsert<'event_recurrence_exceptions'>) {
    const { data, error } = await (this.supabase as any)
      .from('event_recurrence_exceptions')
      .insert(exception)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== SEARCH ==========

  async searchEvents(organizationId: string, query: string, startDate?: Date, endDate?: Date) {
    let searchQuery = (this.supabase as any)
      .from('calendar_events')
      .select('*, calendar:calendars(*)')
      .eq('organization_id', organizationId)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`)

    if (startDate) {
      searchQuery = searchQuery.gte('start_time', startDate.toISOString())
    }

    if (endDate) {
      searchQuery = searchQuery.lte('start_time', endDate.toISOString())
    }

    const { data, error } = await searchQuery
      .order('start_time', { ascending: true })
      .limit(50)

    if (error) throw error
    return data
  }
}

export const sharedCalendarService = new SharedCalendarService()

