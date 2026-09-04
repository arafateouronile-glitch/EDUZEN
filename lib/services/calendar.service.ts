import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { logger } from '@/lib/utils/logger'
import { isVisibleNow } from '@/lib/utils/teacher-visibility'

// Types
export type CalendarTodo = {
  id: string
  organization_id: string
  title: string
  description: string | null
  due_date: string
  due_time: string | null
  start_date: string | null
  start_time: string | null
  all_day: boolean
  category: 'task' | 'meeting' | 'deadline' | 'reminder' | 'event'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  color: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  completed_at: string | null
  created_by: string | null
  assigned_to: string | null
  is_recurring: boolean
  recurrence_rule: string | null
  recurrence_end_date: string | null
  parent_todo_id: string | null
  reminder_enabled: boolean
  reminder_minutes_before: number
  reminder_sent: boolean
  reminder_sent_at: string | null
  linked_session_id: string | null
  linked_formation_id: string | null
  linked_student_id: string | null
  tags: string[] | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type CalendarNotification = {
  id: string
  organization_id: string
  user_id: string
  notification_type: 'todo_reminder' | 'session_reminder' | 'formation_start' | 'deadline'
  todo_id: string | null
  session_id: string | null
  formation_id: string | null
  title: string
  message: string | null
  status: 'pending' | 'sent' | 'read' | 'dismissed'
  scheduled_at: string
  sent_at: string | null
  read_at: string | null
  channel: 'in_app' | 'email' | 'push' | 'sms'
  created_at: string
}

export type CalendarUserPreferences = {
  id: string
  user_id: string
  organization_id: string
  default_view: 'day' | 'week' | 'month' | 'agenda'
  week_starts_on: number
  show_weekends: boolean
  working_hours_start: string
  working_hours_end: string
  default_reminder_minutes: number
  email_notifications: boolean
  push_notifications: boolean
  show_sessions: boolean
  show_formations: boolean
  show_todos: boolean
  show_completed: boolean
  session_color: string
  formation_color: string
  todo_color: string
  created_at: string
  updated_at: string
}

export type CalendarEvent = {
  event_id: string
  event_type: 'todo' | 'session' | 'formation'
  title: string
  description: string | null
  start_date: string
  start_time: string | null
  end_date: string
  end_time: string | null
  all_day: boolean
  status: string
  color: string
  category: string
  priority: string
  linked_id: string | null
  location?: string | null
  formation_name?: string | null
  /**
   * Session parente (utile pour la navigation quand event_id désigne une séance
   * — session_slots — et non la session elle-même, cf. mapSlotToEvent).
   */
  session_id?: string | null
}

export type CreateTodoInput = {
  organization_id: string
  title: string
  description?: string
  due_date: string
  due_time?: string
  start_date?: string
  start_time?: string
  all_day?: boolean
  category?: CalendarTodo['category']
  priority?: CalendarTodo['priority']
  color?: string
  assigned_to?: string
  created_by?: string
  is_recurring?: boolean
  recurrence_rule?: string
  recurrence_end_date?: string
  reminder_enabled?: boolean
  reminder_minutes_before?: number
  linked_session_id?: string
  linked_formation_id?: string
  linked_student_id?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export type UpdateTodoInput = Partial<CreateTodoInput> & {
  status?: CalendarTodo['status']
}

export class CalendarService {
  private supabase: SupabaseClient<Database>

  // Table calendar_todos non dans le schéma généré — cast centralisé ici
  private get db() { return this.supabase as unknown as SupabaseClient }

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient!
  }

  // ==========================================
  // ===================================================
  // GESTION DES TODOS (Tâches du calendrier)
  // ===================================================
  // ==========================================

  /**
   * Récupère tous les TODOs d'une organisation
   */
  async getTodos(
    organizationId: string,
    filters?: {
      startDate?: string
      endDate?: string
      status?: CalendarTodo['status'] | CalendarTodo['status'][]
      category?: CalendarTodo['category']
      priority?: CalendarTodo['priority']
      assignedTo?: string
      createdBy?: string
      search?: string
    }
  ): Promise<CalendarTodo[]> {
    let query = this.supabase
      .from('calendar_todos')
      .select('*')
      .eq('organization_id', organizationId)
      .order('due_date', { ascending: true })

    if (filters?.startDate) {
      query = query.gte('due_date', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('due_date', filters.endDate)
    }
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }
    if (filters?.category) {
      query = query.eq('category', filters.category)
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }
    if (filters?.createdBy) {
      query = query.eq('created_by', filters.createdBy)
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {
      // Si la table n'existe pas encore (404 ou PGRST116), retourner un tableau vide
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
        return []
      }
      throw error
    }
    return (data || []) as CalendarTodo[]
  }

  /**
   * Récupère un TODO par son ID
   */
  async getTodoById(id: string): Promise<CalendarTodo | null> {
    const { data, error } = await this.supabase
      .from('calendar_todos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
        return null
      }
      throw error
    }
    return data as CalendarTodo
  }

  /**
   * Crée un nouveau TODO
   */
  async createTodo(input: CreateTodoInput): Promise<CalendarTodo> {
    const { data, error } = await this.db
      .from('calendar_todos')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    
    // Créer la notification de rappel si activé
    if (input.reminder_enabled !== false) {
      await this.supabase.rpc('create_todo_reminder_notification', { todo_id: data.id })
    }
    
    return data as CalendarTodo
  }

  /**
   * Met à jour un TODO
   */
  async updateTodo(id: string, updates: UpdateTodoInput): Promise<CalendarTodo> {
    const { data, error } = await this.db
      .from('calendar_todos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as CalendarTodo
  }

  /**
   * Supprime un TODO
   */
  async deleteTodo(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_todos')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Marque un TODO comme complété
   */
  async completeTodo(id: string): Promise<CalendarTodo> {
    return this.updateTodo(id, { status: 'completed' })
  }

  /**
   * Marque plusieurs TODOs comme complétés
   */
  async completeTodos(ids: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_todos')
      .update({ status: 'completed' })
      .in('id', ids)

    if (error) throw error
  }

  // ==========================================
  // ÉVÉNEMENTS DU CALENDRIER
  // ==========================================

  /**
   * Récupère tous les événements du calendrier (TODOs + Sessions + Formations)
   */
  async getCalendarEvents(
    organizationId: string,
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<CalendarEvent[]> {
    // RPC désactivé : utiliser le fallback manuel (comportement normal)
    logger.debug('CalendarService - getCalendarEventsManual (RPC désactivé)', {
      organizationId,
      startDate,
      endDate,
      userId,
    })
    const result = await this.getCalendarEventsManual(organizationId, startDate, endDate, userId)
    logger.debug('CalendarService - Résultat fallback', {
      eventCount: result.length,
    })
    return result
    
    /* Code RPC désactivé temporairement - à réactiver une fois la fonction RPC corrigée
    try {
      // Construire les paramètres RPC
      const rpcParams: {
        p_organization_id: string
        p_start_date: string
        p_end_date: string
        p_user_id?: string
      } = {
        p_organization_id: organizationId,
        p_start_date: startDate,
        p_end_date: endDate,
      }

      // Ajouter p_user_id seulement s'il est défini
      if (userId) {
        rpcParams.p_user_id = userId
      }

      logger.debug('CalendarService - Appel RPC get_calendar_events', { 
        organizationId, 
        startDate, 
        endDate, 
        userId,
        params: rpcParams 
      })

      const { data, error } = await this.supabase.rpc('get_calendar_events', rpcParams)

      if (error) {
        logger.warn('CalendarService - Erreur RPC get_calendar_events, utilisation du fallback', {
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          },
          userId,
        })
        
        // Si la fonction n'existe pas encore (42883) ou erreur 400 (mauvaise signature)
        // ou si les tables n'existent pas (404/PGRST116)
        if (
          error.code === '42883' ||
          error.code === 'PGRST116' ||
          error.code === '42P01' ||
          error.code === '400' ||
          error.message?.includes('does not exist') ||
          error.message?.includes('function') ||
          error.message?.includes('does not exist')
        ) {
          logger.debug('CalendarService - Utilisation du fallback getCalendarEventsManual')
          return this.getCalendarEventsManual(organizationId, startDate, endDate, userId)
        }
        throw error
      }
      
      logger.debug('CalendarService - RPC get_calendar_events réussi', { 
        eventCount: data?.length || 0,
        events: data?.map((e: any) => ({ type: e.event_type, title: e.title }))
      })
      
      return (data || []) as CalendarEvent[]
    } catch (error) {
      logger.error('CalendarService - Exception lors de l\'appel RPC, utilisation du fallback', error as Error)
      return this.getCalendarEventsManual(organizationId, startDate, endDate, userId)
    }
    */
  }

  /** Convertit un CalendarTodo en CalendarEvent */
  private mapTodoToEvent(todo: CalendarTodo): CalendarEvent {
    return {
      event_id: todo.id,
      event_type: 'todo',
      title: todo.title,
      description: todo.description,
      start_date: todo.start_date || todo.due_date,
      start_time: todo.start_time,
      end_date: todo.due_date,
      end_time: todo.due_time,
      all_day: todo.all_day,
      status: todo.status,
      color: todo.color,
      category: todo.category,
      priority: todo.priority,
      linked_id: todo.linked_session_id || todo.linked_formation_id || null,
    }
  }

  /** Récupère les événements TODOs pour la période (gestion teacher / learner / admin). */
  private async fetchTodoEventsForPeriod(
    organizationId: string,
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<CalendarEvent[]> {
    const todosFilter = { startDate, endDate }
    if (!userId) {
      const todos = await this.getTodos(organizationId, todosFilter)
      return todos.map((t) => this.mapTodoToEvent(t))
    }
    const { data: userData } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    if (userData?.role === 'teacher') {
      const { data: teacherSessionsRaw } = await this.supabase
        .from('session_teachers')
        .select('session_id, visibility_date')
        .eq('teacher_id', userId)
      const teacherSessions = teacherSessionsRaw as { session_id: string | null; visibility_date: string | null }[] | null
      const sessionIds = (teacherSessions || [])
        .filter((st) => isVisibleNow(st.visibility_date))
        .map((st) => st.session_id)
        .filter((id): id is string => id != null)
      const allTodos = await this.getTodos(organizationId, todosFilter)
      const filtered = sessionIds.length > 0
        ? allTodos.filter((t) => !t.linked_session_id || sessionIds.includes(t.linked_session_id))
        : allTodos.filter((t) => !t.linked_session_id)
      return filtered.map((t) => this.mapTodoToEvent(t))
    }
    if (userData?.role === 'learner' || userData?.role === 'student') {
      const todos = await this.getTodos(organizationId, { ...todosFilter, createdBy: userId })
      return todos.map((t) => this.mapTodoToEvent(t))
    }
    const todos = await this.getTodos(organizationId, todosFilter)
    return todos.map((t) => this.mapTodoToEvent(t))
  }

  /** Session brute avec relation formations (pour mapping). */
  private mapSessionToEvent(session: {
    id: string
    name: string | null
    start_date: string | null
    end_date: string | null
    start_time: string | null
    end_time: string | null
    location: string | null
    status: string | null
    formation_id: string | null
    formations?: { name?: string | null } | null
  }): CalendarEvent {
    const startDate = session.start_date
      ? typeof session.start_date === 'string'
        ? session.start_date.split('T')[0]
        : new Date(session.start_date).toISOString().split('T')[0]
      : ''
    const endDate = session.end_date
      ? typeof session.end_date === 'string'
        ? session.end_date.split('T')[0]
        : new Date(session.end_date).toISOString().split('T')[0]
      : startDate
    const descriptionParts: string[] = []
    if (session.start_time) {
      const timeStr = session.start_time.slice(0, 5)
      const endTimeStr = session.end_time ? session.end_time.slice(0, 5) : null
      descriptionParts.push(endTimeStr ? `🕐 ${timeStr} - ${endTimeStr}` : `🕐 ${timeStr}`)
    }
    if (session.location) descriptionParts.push(`📍 ${session.location}`)
    if (session.formations?.name) descriptionParts.push(`📚 ${session.formations.name}`)
    return {
      event_id: session.id,
      event_type: 'session',
      title: session.name || '',
      description: descriptionParts.length > 0 ? descriptionParts.join(' • ') : null,
      start_date: startDate,
      start_time: session.start_time,
      end_date: endDate,
      end_time: session.end_time,
      all_day: false,
      status: session.status || '',
      color: '#274472',
      category: 'session',
      priority: 'medium',
      linked_id: session.formation_id,
      location: session.location || null,
      formation_name: session.formations?.name || null,
      session_id: session.id,
    }
  }

  /**
   * Construit un événement calendrier pour une séance (session_slots) précise,
   * quand une session a été découpée par intervenant (cf. onglet "Intervenants").
   * `event_id` identifie la séance (unique) ; `session_id` porte la session
   * parente pour la navigation ("voir la session").
   */
  private mapSlotToEvent(
    slot: {
      id: string
      date: string
      start_time: string | null
      end_time: string | null
      time_slot: string | null
      location: string | null
    },
    session: {
      id: string
      name: string | null
      formation_id: string | null
      status: string | null
      formations?: { name?: string | null } | null
    }
  ): CalendarEvent {
    const descriptionParts: string[] = []
    if (slot.start_time) {
      const timeStr = slot.start_time.slice(0, 5)
      const endTimeStr = slot.end_time ? slot.end_time.slice(0, 5) : null
      descriptionParts.push(endTimeStr ? `🕐 ${timeStr} - ${endTimeStr}` : `🕐 ${timeStr}`)
    }
    const location = slot.location || null
    if (location) descriptionParts.push(`📍 ${location}`)
    if (session.formations?.name) descriptionParts.push(`📚 ${session.formations.name}`)
    const slotLabel =
      slot.time_slot === 'morning' ? 'Matin' : slot.time_slot === 'afternoon' ? 'Après-midi' : null

    return {
      event_id: slot.id,
      event_type: 'session',
      title: slotLabel ? `${session.name || ''} — ${slotLabel}` : session.name || '',
      description: descriptionParts.length > 0 ? descriptionParts.join(' • ') : null,
      start_date: slot.date,
      start_time: slot.start_time,
      end_date: slot.date,
      end_time: slot.end_time,
      all_day: false,
      status: session.status || '',
      color: '#274472',
      category: 'session',
      priority: 'medium',
      linked_id: session.formation_id,
      location,
      formation_name: session.formations?.name || null,
      session_id: session.id,
    }
  }

  /** Récupère les événements Sessions pour la période (filtre enseignant si userId). */
  private async fetchSessionEventsForPeriod(
    organizationId: string,
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<CalendarEvent[]> {
    type SessionRow = {
      id: string
      name: string | null
      start_date: string | null
      end_date: string | null
      start_time: string | null
      end_time: string | null
      location: string | null
      status: string | null
      formation_id: string | null
      formations?: { id?: string; name?: string | null; organization_id?: string } | null
    }
    let sessions: SessionRow[] = []
    if (userId) {
      const { data: userData } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()
      if (userData?.role === 'teacher') {
        const { data: teacherSessionsRaw } = await this.supabase
          .from('session_teachers')
          .select('session_id, visibility_date')
          .eq('teacher_id', userId)
        const teacherSessions = teacherSessionsRaw as { session_id: string | null; visibility_date: string | null }[] | null
        // Filtre visibility_date sur la liste, mais le déclenchement du repli
        // ci-dessous teste la longueur BRUTE (teacherSessions), jamais celle
        // déjà filtrée : sinon un formateur dont l'unique session a une date
        // de visibilité future déclencherait à tort le repli legacy
        // sessions.teacher_id et verrait sa session malgré tout.
        let sessionIds: string[] = (teacherSessions || [])
          .filter((st) => isVisibleNow(st.visibility_date))
          .map((st) => st.session_id)
          .filter((id): id is string => id != null)
        if (!teacherSessions || teacherSessions.length === 0) {
          const { data: byTeacher } = await this.supabase
            .from('sessions')
            .select('id')
            .eq('teacher_id', userId)
          sessionIds = (byTeacher || []).map((s: { id: string }) => s.id).filter(Boolean)
        }
        if (sessionIds.length > 0) {
          const { data: sessionsData, error } = await this.supabase
            .from('sessions')
            .select('id, name, start_date, end_date, start_time, end_time, location, status, formation_id, formations(id, name, organization_id)')
            .in('id', sessionIds)
          if (error) throw error
          const orgSessions = (sessionsData || []).filter(
            (s: SessionRow) => s.formations?.organization_id === organizationId
          )

          // Une session peut avoir été "découpée" par intervenant (onglet
          // Intervenants → séances cochées, cf. session_slots.teacher_id).
          // Dans ce cas on affiche uniquement les séances de CE formateur ;
          // sinon (aucune séance assignée à personne) on garde le bloc
          // "session entière" historique.
          const { data: allSlots } = await this.supabase
            .from('session_slots')
            .select('id, session_id, date, start_time, end_time, time_slot, location, teacher_id')
            .in('session_id', orgSessions.map((s) => s.id))

          const slotsBySession = new Map<string, NonNullable<typeof allSlots>>()
          for (const slot of allSlots || []) {
            if (!slot.session_id) continue
            const arr = slotsBySession.get(slot.session_id) ?? []
            arr.push(slot)
            slotsBySession.set(slot.session_id, arr)
          }

          const rangeStartT = new Date(startDate)
          const rangeEndT = new Date(endDate)
          const slotEvents: CalendarEvent[] = []

          sessions = orgSessions.filter((session) => {
            const sessionSlotsList = slotsBySession.get(session.id) ?? []
            // "Découpée" seulement si l'assignation par séance est réellement
            // significative : plusieurs intervenants différents, ou une partie
            // des séances est sans intervenant (narrowing volontaire depuis
            // l'onglet Intervenants). Le cas par défaut — génération auto des
            // séances, toutes affectées au même formateur principal — reste
            // au comportement historique (bloc "session entière") pour ne pas
            // fragmenter le calendrier de tous les formateurs existants.
            const assignedSlots = sessionSlotsList.filter((s) => !!s.teacher_id)
            const distinctTeacherIds = new Set(assignedSlots.map((s) => s.teacher_id))
            const isFullyCoveredBySingleTeacher =
              sessionSlotsList.length > 0 &&
              assignedSlots.length === sessionSlotsList.length &&
              distinctTeacherIds.size === 1
            const isSliced = assignedSlots.length > 0 && !isFullyCoveredBySingleTeacher
            if (!isSliced) return true // comportement historique : bloc session entière

            for (const slot of sessionSlotsList) {
              if (slot.teacher_id !== userId || !slot.date) continue
              const slotDate = new Date(slot.date)
              if (slotDate >= rangeStartT && slotDate <= rangeEndT) {
                slotEvents.push(this.mapSlotToEvent(slot, session))
              }
            }
            return false // exclue du bloc "session entière"
          })

          // Les séances découpées sont retournées directement ; les sessions
          // non découpées poursuivent le chemin habituel plus bas (filtre de
          // recouvrement de dates + mapSessionToEvent).
          if (slotEvents.length > 0) {
            const overlapping = sessions.filter((session) => {
              if (!session.start_date) return false
              const sessionStart = new Date(session.start_date)
              const sessionEnd = session.end_date ? new Date(session.end_date) : null
              return (
                (sessionStart >= rangeStartT && sessionStart <= rangeEndT) ||
                (sessionEnd && sessionEnd >= rangeStartT && sessionEnd <= rangeEndT) ||
                (sessionStart <= rangeStartT && (!sessionEnd || sessionEnd >= rangeStartT)) ||
                (sessionStart <= rangeStartT && sessionEnd && sessionEnd >= rangeEndT)
              )
            })
            return [...slotEvents, ...overlapping.map((s) => this.mapSessionToEvent(s))]
          }
        }
      } else {
        const { data: sessionsData, error } = await this.supabase
          .from('sessions')
          .select('id, name, start_date, end_date, start_time, end_time, location, status, formation_id, formations!inner(id, name, organization_id)')
          .eq('formations.organization_id', organizationId)
        if (error) throw error
        sessions = sessionsData || []
      }
    } else {
      const { data: sessionsData, error } = await this.supabase
        .from('sessions')
        .select('id, name, start_date, end_date, start_time, end_time, location, status, formation_id, formations!inner(id, name, organization_id)')
        .eq('formations.organization_id', organizationId)
      if (error) throw error
      sessions = sessionsData || []
    }
    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)
    const overlapping = sessions.filter((session) => {
      if (!session.start_date) return false
      const sessionStart = new Date(session.start_date)
      const sessionEnd = session.end_date ? new Date(session.end_date) : null
      return (
        (sessionStart >= rangeStart && sessionStart <= rangeEnd) ||
        (sessionEnd && sessionEnd >= rangeStart && sessionEnd <= rangeEnd) ||
        (sessionStart <= rangeStart && (!sessionEnd || sessionEnd >= rangeStart)) ||
        (sessionStart <= rangeStart && sessionEnd && sessionEnd >= rangeEnd)
      )
    })
    return overlapping.map((s) => this.mapSessionToEvent(s))
  }

  /** Récupère les événements Formations pour la période (filtre enseignant si userId). */
  private async fetchFormationEventsForPeriod(
    organizationId: string,
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<CalendarEvent[]> {
    let formationsQuery = this.supabase
      .from('formations')
      .select('*, sessions(id, start_date, end_date)')
      .eq('organization_id', organizationId)
    if (userId) {
      const { data: userData } = await this.supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()
      if (userData?.role === 'teacher') {
        const { data: teacherSessionsRaw } = await this.supabase
          .from('session_teachers')
          .select('session_id, visibility_date')
          .eq('teacher_id', userId)
        const teacherSessions = teacherSessionsRaw as { session_id: string | null; visibility_date: string | null }[] | null
        if (!teacherSessions?.length) return []
        const sessionIds = teacherSessions
          .filter((st) => isVisibleNow(st.visibility_date))
          .map((st) => st.session_id)
          .filter((id): id is string => id != null)
        if (sessionIds.length === 0) return []
        const { data: sessionsData } = await this.supabase
          .from('sessions')
          .select('formation_id')
          .in('id', sessionIds)
        if (!sessionsData?.length) return []
        const formationIds = [...new Set(sessionsData.map((s: { formation_id: string | null }) => s.formation_id).filter(Boolean) as string[])]
        if (formationIds.length === 0) return []
        formationsQuery = formationsQuery.in('id', formationIds)
      }
    }
    const { data: formations, error } = await formationsQuery
    if (error) throw error
    if (!formations?.length) return []
    const rangeStart = new Date(startDate)
    const rangeEnd = new Date(endDate)
    const formationsWithDates = formations
      .map((formation) => {
        const sessions = (formation.sessions as Array<{ id: string; start_date: string; end_date: string | null }>) || []
        if (!sessions.length) return null
        const sessionDates = sessions
          .filter((s) => s.start_date)
          .map((s) => ({ start: new Date(s.start_date), end: s.end_date ? new Date(s.end_date) : null }))
        if (!sessionDates.length) return null
        const formationStart = new Date(Math.min(...sessionDates.map((d) => d.start.getTime())))
        const ends = sessionDates.map((d) => d.end).filter((d): d is Date => d !== null)
        const formationEnd = ends.length > 0 ? new Date(Math.max(...ends.map((d) => d.getTime()))) : null
        return { formation, start_date: formationStart, end_date: formationEnd }
      })
      .filter((f): f is NonNullable<typeof f> => f !== null)
    const overlapping = formationsWithDates.filter(
      ({ start_date, end_date }) =>
        (start_date >= rangeStart && start_date <= rangeEnd) ||
        (end_date && end_date >= rangeStart && end_date <= rangeEnd) ||
        (start_date <= rangeStart && (!end_date || end_date >= rangeStart)) ||
        (start_date <= rangeStart && end_date && end_date >= rangeEnd)
    )
    return overlapping.map(({ formation, start_date, end_date }) => ({
      event_id: formation.id,
      event_type: 'formation' as const,
      title: formation.name,
      description: formation.description,
      start_date: start_date.toISOString().split('T')[0],
      start_time: null,
      end_date: end_date ? end_date.toISOString().split('T')[0] : start_date.toISOString().split('T')[0],
      end_time: null,
      all_day: true,
      status: formation.is_active ? 'active' : 'inactive',
      color: '#8B5CF6',
      category: 'formation',
      priority: 'medium',
      linked_id: formation.program_id,
    }))
  }

  /**
   * Fallback si la fonction RPC n'existe pas
   */
  private async getCalendarEventsManual(
    organizationId: string,
    startDate: string,
    endDate: string,
    userId?: string
  ): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = []
    try {
      events.push(...(await this.fetchTodoEventsForPeriod(organizationId, startDate, endDate, userId)))
    } catch {
      // Table calendar_todos may not exist yet
    }
    try {
      events.push(...(await this.fetchSessionEventsForPeriod(organizationId, startDate, endDate, userId)))
    } catch {
      // Session fetch error - continue with other events
    }
    try {
      events.push(...(await this.fetchFormationEventsForPeriod(organizationId, startDate, endDate, userId)))
    } catch {
      // Formation fetch error - continue with collected events
    }
    return events
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  /**
   * Récupère les notifications d'un utilisateur
   */
  async getNotifications(
    userId: string,
    filters?: {
      status?: CalendarNotification['status']
      unreadOnly?: boolean
      limit?: number
    }
  ): Promise<CalendarNotification[]> {
    let query = this.supabase
      .from('calendar_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.unreadOnly) {
      query = query.in('status', ['pending', 'sent'])
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
        return []
      }
      throw error
    }
    return (data || []) as CalendarNotification[]
  }

  /**
   * Marque une notification comme lue
   */
  async markNotificationAsRead(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_notifications')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Marque toutes les notifications comme lues
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_notifications')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('status', ['pending', 'sent'])

    if (error) throw error
  }

  /**
   * Supprime une notification
   */
  async dismissNotification(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_notifications')
      .update({ status: 'dismissed' })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Compte les notifications non lues
   */
  async countUnreadNotifications(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('calendar_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('status', ['pending', 'sent'])

    if (error) {
      // Si la table n'existe pas encore, retourner 0
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
        return 0
      }
      throw error
    }
    return count || 0
  }

  // ==========================================
  // PRÉFÉRENCES UTILISATEUR
  // ==========================================

  /**
   * Récupère les préférences calendrier d'un utilisateur
   */
  async getUserPreferences(
    userId: string,
    organizationId: string
  ): Promise<CalendarUserPreferences | null> {
    const { data, error } = await this.supabase
      .from('calendar_user_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
        return null
      }
      throw error
    }
    return data as CalendarUserPreferences
  }

  /**
   * Crée ou met à jour les préférences calendrier d'un utilisateur
   */
  async upsertUserPreferences(
    userId: string,
    organizationId: string,
    preferences: Partial<Omit<CalendarUserPreferences, 'id' | 'user_id' | 'organization_id' | 'created_at' | 'updated_at'>>
  ): Promise<CalendarUserPreferences> {
    const { data, error } = await this.supabase
      .from('calendar_user_preferences')
      .upsert(
        {
          user_id: userId,
          organization_id: organizationId,
          ...preferences,
        },
        { onConflict: 'user_id,organization_id' }
      )
      .select()
      .single()

    if (error) throw error
    return data as CalendarUserPreferences
  }

  // ==========================================
  // UTILITAIRES
  // ==========================================

  /**
   * Récupère les TODOs à venir avec rappel
   */
  async getUpcomingTodosWithReminder(
    organizationId: string,
    minutesAhead: number = 60
  ): Promise<CalendarTodo[]> {
    const now = new Date()
    const futureDate = new Date(now.getTime() + minutesAhead * 60 * 1000)

    const { data, error } = await this.supabase
      .from('calendar_todos')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('reminder_enabled', true)
      .eq('reminder_sent', false)
      .in('status', ['pending', 'in_progress'])
      .gte('due_date', now.toISOString().split('T')[0])
      .lte('due_date', futureDate.toISOString().split('T')[0])

    if (error) throw error
    return (data || []) as CalendarTodo[]
  }

  /**
   * Récupère les statistiques du calendrier
   */
  async getCalendarStats(organizationId: string): Promise<{
    totalTodos: number
    pendingTodos: number
    completedTodos: number
    overdueTodos: number
    todayTodos: number
    upcomingTodos: number
  }> {
    const today = new Date().toISOString().split('T')[0]

    const { data: todos, error } = await this.supabase
      .from('calendar_todos')
      .select('id, status, due_date')
      .eq('organization_id', organizationId)

    if (error) {
      // Si la table n'existe pas encore, retourner des stats à zéro
      if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          totalTodos: 0,
          pendingTodos: 0,
          completedTodos: 0,
          overdueTodos: 0,
          todayTodos: 0,
          upcomingTodos: 0,
        }
      }
      throw error
    }

    const todosList = todos || []
    const totalTodos = todosList.length
    const pendingTodos = todosList.filter((t) => t.status === 'pending').length
    const completedTodos = todosList.filter((t) => t.status === 'completed').length
    const overdueTodos = todosList.filter(
      (t) => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date < today
    ).length
    const todayTodos = todosList.filter((t) => t.due_date === today).length
    const upcomingTodos = todosList.filter(
      (t) => t.status !== 'completed' && t.status !== 'cancelled' && t.due_date > today
    ).length

    return {
      totalTodos,
      pendingTodos,
      completedTodos,
      overdueTodos,
      todayTodos,
      upcomingTodos,
    }
  }

  // ==========================================
  // INTÉGRATIONS CALENDRIER EXTERNE
  // ==========================================

  /**
   * Récupère la configuration d'intégration calendrier (Google, Outlook)
   * Récupère la configuration d'intégration calendrier (Google, Outlook)
   * 
   * NOTE: Fonctionnalité prévue - Nécessite création de la table calendar_integrations
   */
  async getConfig(
    organizationId: string,
    provider: 'google' | 'outlook'
  ): Promise<any | null> {
    // NOTE: Fonctionnalité prévue - Récupération depuis la table calendar_integrations
    // const { data, error } = await this.supabase
    //   .from('calendar_integrations')
    //   .select('*')
    //   .eq('organization_id', organizationId)
    //   .eq('provider', provider)
    //   .single()
    // 
    // if (error) {
    //   if (error.code === 'PGRST116') return null
    //   throw error
    // }
    // return data
    
    // Pour l'instant, retourner null
    return null
  }

  /**
   * Crée ou met à jour la configuration d'intégration calendrier
   * NOTE: Fonctionnalité prévue - Nécessite création de la table calendar_integrations
   */
  async upsertConfig(
    organizationId: string,
    provider: 'google' | 'outlook',
    config: any
  ): Promise<any> {
    // NOTE: Fonctionnalité prévue - Création/mise à jour dans la table calendar_integrations
    // const { data, error } = await this.supabase
    //   .from('calendar_integrations')
    //   .upsert(
    //     {
    //       organization_id: organizationId,
    //       provider,
    //       ...config,
    //     },
    //     { onConflict: 'organization_id,provider' }
    //   )
    //   .select()
    //   .single()
    // 
    // if (error) throw error
    // return data
    
    // Pour l'instant, retourner la config telle quelle
    return { organization_id: organizationId, provider, ...config }
  }
}

