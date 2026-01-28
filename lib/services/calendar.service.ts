import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { logger } from '@/lib/utils/logger'

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

class CalendarService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

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
    const { data, error } = await this.supabase
      .from('calendar_todos')
      .insert(input as any)
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
    const { data, error } = await this.supabase
      .from('calendar_todos')
      .update(updates as any)
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
    // Désactiver temporairement l'appel RPC car il retourne toujours une erreur 400
    // Utiliser directement le fallback manuel qui fonctionne correctement
    logger.warn('CalendarService - Utilisation du fallback getCalendarEventsManual (RPC désactivé temporairement)', {
      organizationId,
      startDate,
      endDate,
      userId,
    })
    const result = await this.getCalendarEventsManual(organizationId, startDate, endDate, userId)
    logger.warn('CalendarService - Résultat fallback', {
      eventCount: result.length,
      events: result.map((e) => ({ type: e.event_type, title: e.title, id: e.event_id })),
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

    // Récupérer les TODOs
    // Pour les enseignants, filtrer uniquement les TODOs liés à leurs sessions assignées
    try {
      let todosFilter: any = { startDate, endDate }
      
      // Si c'est un enseignant, récupérer ses sessions assignées et filtrer les TODOs
      if (userId) {
        const { data: userData } = await this.supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle()

        if (userData?.role === 'teacher') {
          // Récupérer les IDs des sessions assignées à cet enseignant
          const { data: teacherSessions } = await this.supabase
            .from('session_teachers')
            .select('session_id')
            .eq('teacher_id', userId)

          if (teacherSessions && teacherSessions.length > 0) {
            const sessionIds = teacherSessions.map((st: any) => st.session_id)
            // Récupérer tous les TODOs et filtrer côté client pour ne garder que ceux liés aux sessions
            const allTodos = await this.getTodos(organizationId, todosFilter)
            const filteredTodos = allTodos.filter((todo) => {
              // Garder les TODOs sans session liée (tâches générales) OU ceux liés aux sessions de l'enseignant
              return !todo.linked_session_id || sessionIds.includes(todo.linked_session_id)
            })
            todosFilter = { ...todosFilter, todos: filteredTodos }
            events.push(
              ...filteredTodos.map((todo) => ({
                event_id: todo.id,
                event_type: 'todo' as const,
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
              }))
            )
          } else {
            // Si l'enseignant n'a pas de sessions, ne montrer que les TODOs sans session liée
            const allTodos = await this.getTodos(organizationId, todosFilter)
            const filteredTodos = allTodos.filter((todo) => !todo.linked_session_id)
            events.push(
              ...filteredTodos.map((todo) => ({
                event_id: todo.id,
                event_type: 'todo' as const,
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
              }))
            )
          }
        } else if (userData?.role === 'learner' || userData?.role === 'student') {
          // Pour les apprenants, ne montrer que les TODOs qu'ils ont créés eux-mêmes
          const todos = await this.getTodos(organizationId, { ...todosFilter, createdBy: userId })
          events.push(
            ...todos.map((todo) => ({
              event_id: todo.id,
              event_type: 'todo' as const,
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
            }))
          )
        } else {
          // Pour les autres rôles (admin, etc.), récupérer tous les TODOs normalement
          const todos = await this.getTodos(organizationId, todosFilter)
          events.push(
            ...todos.map((todo) => ({
              event_id: todo.id,
              event_type: 'todo' as const,
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
            }))
          )
        }
      } else {
        // Pas d'userId, récupérer tous les TODOs
        const todos = await this.getTodos(organizationId, todosFilter)
        events.push(
          ...todos.map((todo) => ({
            event_id: todo.id,
            event_type: 'todo' as const,
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
          }))
        )
      }
    } catch (e) {
      // Table may not exist yet
    }

    // Récupérer les Sessions
    // Inclure les sessions qui chevauchent la période demandée
    // Si userId est fourni et que l'utilisateur est un enseignant, filtrer par session_teachers
    try {
      let sessions: any[] | null | undefined = undefined
      
      // Si userId est fourni, vérifier si c'est un enseignant et filtrer ses sessions assignées
      if (userId) {
        const { data: userData } = await this.supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle()

        if (userData?.role === 'teacher') {
          logger.warn('CalendarService - Filtrage sessions pour enseignant', { userId })
          
          // Récupérer les IDs des sessions assignées à cet enseignant depuis session_teachers
          const { data: teacherSessions, error: teacherSessionsError } = await this.supabase
            .from('session_teachers')
            .select('session_id')
            .eq('teacher_id', userId)

          if (teacherSessionsError) {
            logger.error('CalendarService - Erreur récupération session_teachers', teacherSessionsError)
          }

          logger.warn('CalendarService - Sessions assignées à l\'enseignant (session_teachers)', { 
            count: teacherSessions?.length || 0,
            teacherSessions: teacherSessions,
            sessionIds: teacherSessions?.map((st: any) => st.session_id),
            isArray: Array.isArray(teacherSessions),
            truthy: !!teacherSessions,
          })

          // Si session_teachers est vide, essayer de récupérer via sessions.teacher_id (fallback)
          let sessionIds: string[] = []
          
          if (teacherSessions && Array.isArray(teacherSessions) && teacherSessions.length > 0) {
            sessionIds = teacherSessions.map((st: any) => st.session_id).filter(Boolean)
            logger.warn('CalendarService - Session IDs depuis session_teachers', { 
              sessionIds,
              count: sessionIds.length 
            })
          } else {
            // Fallback : récupérer les sessions où teacher_id est directement défini
            logger.debug('CalendarService - session_teachers vide, utilisation du fallback via sessions.teacher_id')
            const { data: sessionsByTeacherId, error: sessionsByTeacherIdError } = await this.supabase
              .from('sessions')
              .select('id')
              .eq('teacher_id', userId)
            
            if (sessionsByTeacherIdError) {
              logger.error('CalendarService - Erreur récupération sessions via teacher_id', sessionsByTeacherIdError)
            } else {
              sessionIds = (sessionsByTeacherId || []).map((s: any) => s.id).filter(Boolean)
              logger.warn('CalendarService - Session IDs depuis sessions.teacher_id', {
                sessionIds,
                count: sessionIds.length
              })
            }
          }

          if (sessionIds.length > 0) {
            // Récupérer les sessions directement par leurs IDs, puis vérifier l'organization_id via formations
            const { data: sessionsData, error: sessionsError } = await this.supabase
              .from('sessions')
              .select('id, name, start_date, end_date, start_time, end_time, location, status, formation_id, formations(id, name, organization_id)')
              .in('id', sessionIds)
            
            if (sessionsError) {
              logger.error('CalendarService - Erreur récupération sessions par IDs', sessionsError)
              throw sessionsError
            }
            
            logger.warn('CalendarService - Sessions récupérées par IDs', {
              count: sessionsData?.length || 0,
              sessions: sessionsData?.map((s: any) => ({ 
                id: s.id, 
                name: s.name, 
                start_date: s.start_date,
                formation_org_id: s.formations?.organization_id,
                expected_org_id: organizationId
              }))
            })
            
            // Filtrer côté client pour ne garder que les sessions de l'organisation
            sessions = (sessionsData || []).filter((s: any) => {
              const orgId = s.formations?.organization_id
              const matches = orgId === organizationId
              if (!matches) {
                logger.warn('CalendarService - Session filtrée (mauvaise organisation)', {
                  sessionId: s.id,
                  sessionOrgId: orgId,
                  expectedOrgId: organizationId,
                })
              }
              return matches
            })
            
            logger.warn('CalendarService - Sessions filtrées par organisation', {
              count: sessions.length,
              sessions: sessions.map((s: any) => ({ id: s.id, name: s.name, start_date: s.start_date }))
            })
          } else {
            logger.warn('CalendarService - Enseignant sans sessions assignées (ni session_teachers ni sessions.teacher_id), sessions vides')
            sessions = []
          }
        } else {
          // Utilisateur non-enseignant, continuer normalement
          logger.warn('CalendarService - Utilisateur non-enseignant, récupération de toutes les sessions')
          // Les sessions n'ont pas directement organization_id, il faut passer par formations
          const { data: sessionsData, error: sessionsError } = await this.supabase
            .from('sessions')
            .select('id, name, start_date, end_date, start_time, end_time, location, status, formation_id, formations!inner(id, name, organization_id)')
            .eq('formations.organization_id', organizationId)
          
          if (sessionsError) {
            logger.error('CalendarService - Erreur récupération sessions', sessionsError)
            throw sessionsError
          }
          sessions = sessionsData || []
        }
      } else {
        // Pas d'userId, récupérer toutes les sessions de l'organisation
        const { data: sessionsData, error: sessionsError } = await this.supabase
          .from('sessions')
          .select('id, name, start_date, end_date, start_time, end_time, location, status, formation_id, formations!inner(id, name, organization_id)')
          .eq('formations.organization_id', organizationId)
        
        if (sessionsError) {
          logger.error('CalendarService - Erreur récupération sessions', sessionsError)
          throw sessionsError
        }
        sessions = sessionsData || []
      }


      if (sessions) {
        // Filtrer pour ne garder que celles qui ont une date de début et qui chevauchent vraiment la période
        const rangeStart = new Date(startDate)
        const rangeEnd = new Date(endDate)

        const overlappingSessions = sessions.filter((session: any) => {
          // Ignorer les sessions sans date de début
          if (!session.start_date) return false

          const sessionStart = new Date(session.start_date)
          const sessionEnd = session.end_date ? new Date(session.end_date) : null

          return (
            // Session commence dans la période
            (sessionStart >= rangeStart && sessionStart <= rangeEnd) ||
            // Session se termine dans la période
            (sessionEnd && sessionEnd >= rangeStart && sessionEnd <= rangeEnd) ||
            // Session en cours (commencée avant et pas encore terminée)
            (sessionStart <= rangeStart && (!sessionEnd || sessionEnd >= rangeStart)) ||
            // Session qui englobe toute la période
            (sessionStart <= rangeStart && sessionEnd && sessionEnd >= rangeEnd)
          )
        })

        logger.warn('CalendarService - Sessions qui chevauchent la période', { 
          count: overlappingSessions.length,
          sessions: overlappingSessions.map((s: any) => ({ id: s.id, name: s.name, start_date: s.start_date }))
        })
        
        const sessionEvents = overlappingSessions.map((session: any) => {
          // S'assurer que start_date est au format YYYY-MM-DD
          const startDate = session.start_date
            ? typeof session.start_date === 'string'
              ? session.start_date.split('T')[0]
              : new Date(session.start_date).toISOString().split('T')[0]
            : null
          const endDate = session.end_date
            ? typeof session.end_date === 'string'
              ? session.end_date.split('T')[0]
              : new Date(session.end_date).toISOString().split('T')[0]
            : null

          // Construire la description avec les informations de lieu et d'heures
          const descriptionParts: string[] = []
          if (session.start_time) {
            const timeStr = session.start_time.slice(0, 5) // Format HH:MM
            const endTimeStr = session.end_time ? session.end_time.slice(0, 5) : null
            if (endTimeStr) {
              descriptionParts.push(`🕐 ${timeStr} - ${endTimeStr}`)
            } else {
              descriptionParts.push(`🕐 ${timeStr}`)
            }
          }
          if (session.location) {
            descriptionParts.push(`📍 ${session.location}`)
          }
          if (session.formations?.name) {
            descriptionParts.push(`📚 ${session.formations.name}`)
          }

          return {
            event_id: session.id,
            event_type: 'session' as const,
            title: session.name,
            description: descriptionParts.length > 0 ? descriptionParts.join(' • ') : null,
            start_date: startDate || '',
            start_time: session.start_time,
            end_date: endDate || startDate || '',
            end_time: session.end_time,
            all_day: false,
            status: session.status,
            color: '#10B981',
            category: 'session',
            priority: 'medium',
            linked_id: session.formation_id,
            location: session.location || null,
            formation_name: session.formations?.name || null,
          }
        })
        
        logger.warn('CalendarService - Événements sessions créés', { 
          count: sessionEvents.length,
          events: sessionEvents.map((e) => ({ id: e.event_id, title: e.title, start_date: e.start_date }))
        })
        
        events.push(...sessionEvents)
      }
    } catch (e) {
      // Session fetch error - continue with other events
    }

    // Récupérer les Formations
    // Les formations n'ont pas de dates directes, on utilise les dates min/max de leurs sessions
    // Pour les enseignants, filtrer par les formations des sessions où ils sont assignés
    try {
      let formationsQuery = this.supabase
        .from('formations')
        .select('*, sessions(id, start_date, end_date)')
        .eq('organization_id', organizationId)

      // Si userId est fourni, vérifier si c'est un enseignant et filtrer ses formations
      if (userId) {
        const { data: userData } = await this.supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle()

        if (userData?.role === 'teacher') {
          // Récupérer les IDs des sessions assignées à cet enseignant
          const { data: teacherSessions } = await this.supabase
            .from('session_teachers')
            .select('session_id')
            .eq('teacher_id', userId)

          if (teacherSessions && teacherSessions.length > 0) {
            const sessionIds = teacherSessions.map((st: any) => st.session_id)
            // Récupérer les formation_id des sessions assignées
            const { data: sessionsData } = await this.supabase
              .from('sessions')
              .select('formation_id')
              .in('id', sessionIds)

            if (sessionsData && sessionsData.length > 0) {
              const formationIds = [...new Set(sessionsData.map((s: any) => s.formation_id).filter((id): id is string => !!id))]
              if (formationIds.length > 0) {
                formationsQuery = formationsQuery.in('id', formationIds)
              } else {
                // Si aucune formation trouvée, ne pas afficher de formations
                // Retourner les événements déjà collectés (TODOs et sessions)
                return events
              }
            } else {
              // Si aucune session trouvée, ne pas afficher de formations
              return events
            }
          } else {
            // Si l'enseignant n'a pas de sessions assignées, ne pas afficher de formations
            // Retourner les événements déjà collectés (TODOs et sessions)
            return events
          }
        }
      }

      // Récupérer les formations
      const { data: formations, error: formationsError } = await formationsQuery

      if (formationsError) {
        throw formationsError
      }

      if (formations) {
        const rangeStart = new Date(startDate)
        const rangeEnd = new Date(endDate)

        // Pour chaque formation, calculer les dates min/max de ses sessions
        const formationsWithDates = formations
          .map((formation) => {
            const sessions = (formation.sessions as Array<{ id: string; start_date: string; end_date: string | null }>) || []
            if (sessions.length === 0) return null

            const sessionDates = sessions
              .filter((s) => s.start_date)
              .map((s) => ({
                start: new Date(s.start_date),
                end: s.end_date ? new Date(s.end_date) : null,
              }))

            if (sessionDates.length === 0) return null

            const formationStart = new Date(Math.min(...sessionDates.map((d) => d.start.getTime())))
            const formationEndDates = sessionDates.map((d) => d.end).filter((d): d is Date => d !== null)
            const formationEnd = formationEndDates.length > 0 ? new Date(Math.max(...formationEndDates.map((d) => d.getTime()))) : null

            return {
              formation,
              start_date: formationStart,
              end_date: formationEnd,
            }
          })
          .filter((f): f is NonNullable<typeof f> => f !== null)

        // Filtrer pour ne garder que celles qui chevauchent vraiment la période
        const overlappingFormations = formationsWithDates.filter(({ start_date, end_date }) => {
          return (
            // Formation commence dans la période
            (start_date >= rangeStart && start_date <= rangeEnd) ||
            // Formation se termine dans la période
            (end_date && end_date >= rangeStart && end_date <= rangeEnd) ||
            // Formation en cours (commencée avant et pas encore terminée)
            (start_date <= rangeStart && (!end_date || end_date >= rangeStart)) ||
            // Formation qui englobe toute la période
            (start_date <= rangeStart && end_date && end_date >= rangeEnd)
          )
        })

        const formationEvents = overlappingFormations.map(({ formation, start_date, end_date }) => ({
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
        events.push(...formationEvents)
      }
    } catch (e) {
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

export const calendarService = new CalendarService()
