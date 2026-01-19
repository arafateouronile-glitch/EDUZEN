import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { calendarService } from './calendar.service'
import { videoconferenceService } from './videoconference.service'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'

// Types pour les sessions (niveau 3)
type Session = TableRow<'sessions'>
type SessionInsert = TableInsert<'sessions'>
type SessionUpdate = TableUpdate<'sessions'>

/**
 * Service pour gérer les SESSIONS
 * Une session appartient à une formation
 * Exemple : "Session Hiver 2024" (de la formation "Excel avancé")
 */
export class SessionService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère toutes les sessions d'une organisation
   */
  async getAllSessions(organizationId: string, filters?: {
    formationId?: string
    status?: Session['status']
    startDate?: string
    endDate?: string
    search?: string
  }) {
    let query = this.supabase
      .from('sessions')
      .select(`
        *,
        formations!inner(
          *,
          programs(*)
        )
      `)
      .eq('formations.organization_id', organizationId)

    if (filters?.formationId) {
      query = query.eq('formation_id', filters.formationId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.startDate) {
      query = query.gte('start_date', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('end_date', filters.endDate)
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    const { data, error } = await query.order('start_date', { ascending: true })

    if (error) throw error
    return data
  }

  /**
   * Récupère une session par son ID avec sa formation, son programme (via formation) et tous ses programmes associés
   */
  async getSessionById(id: string) {
    // Récupérer la session avec sa formation et son programme (relation indirecte)
    const { data: session, error: sessionError } = await this.supabase
      .from('sessions')
      .select(`
        *,
        formations!inner(
          *,
          programs(*)
        )
      `)
      .eq('id', id)
      .single()

    if (sessionError) throw sessionError

    // Récupérer tous les programmes associés directement à cette session (relation many-to-many)
    const { data: sessionPrograms, error: programsError } = await this.supabase
      .from('session_programs')
      .select(`
        program_id,
        programs(*)
      `)
      .eq('session_id', id)

    if (programsError) throw programsError

    // Ajouter les programmes associés à la session
    return {
      ...session,
      session_programs: sessionPrograms?.map((sp: { programs: unknown }) => sp.programs).filter(Boolean) || [],
    }
  }

  /**
   * Crée une nouvelle session avec optionnellement plusieurs programmes associés
   */
  async createSession(session: FlexibleInsert<'sessions'>, programIds?: string[], organizationId?: string) {
    // Vérifier d'abord que la formation existe et appartient à l'organisation de l'utilisateur
    if (session.formation_id) {
      const { data: formation, error: formationError } = await this.supabase
        .from('formations')
        .select('id, organization_id')
        .eq('id', session.formation_id)
        .single()

      if (formationError) {
        console.error('Erreur lors de la vérification de la formation:', formationError)
        throw new Error(`Formation non trouvée: ${formationError.message}`)
      }

      if (!formation) {
        throw new Error('Formation non trouvée')
      }

      console.log('Formation trouvée:', formation)
    }

    // Créer la session
    const { data, error } = await this.supabase
      .from('sessions')
      .insert(session as SessionInsert)
      .select()
      .single()

    if (error) {
      console.error('Erreur RLS lors de la création de la session:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        formation_id: session.formation_id,
      })
      throw error
    }

    // Si des programmes sont fournis, créer les associations
    if (programIds && programIds.length > 0 && data) {
      // Récupérer l'organization_id de la formation
      const { data: formation } = await this.supabase
        .from('formations')
        .select('organization_id')
        .eq('id', data.formation_id)
        .single()

      if (formation) {
        const sessionPrograms = programIds.map((programId) => ({
          session_id: data.id,
          program_id: programId,
          organization_id: formation.organization_id,
        }))

        const { error: linkError } = await this.supabase
          .from('session_programs')
          .insert(sessionPrograms)

        if (linkError) {
          console.error('Erreur lors de la création des associations session-programme:', linkError)
          // Ne pas échouer complètement, mais logger l'erreur
        }

        // Synchroniser avec les calendriers si activé
        if (formation.organization_id) {
          await this.syncWithCalendars(data.id, formation.organization_id, 'create').catch((error) => {
            console.error('Erreur lors de la synchronisation calendrier:', error)
            // Ne pas échouer la création de session si la synchronisation échoue
          })
        }

        // Créer une réunion visioconférence si activé
        if (formation.organization_id) {
          await this.createVideoconferenceMeeting(data.id, formation.organization_id).catch((error) => {
            console.error('Erreur lors de la création de la réunion visioconférence:', error)
            // Ne pas échouer la création de session si la création de réunion échoue
          })
        }
      }
    }

    console.log('Session créée avec succès:', data)
    return data
  }

  /**
   * Met à jour les programmes associés à une session
   */
  async updateSessionPrograms(sessionId: string, programIds: string[], organizationId: string) {
    // Supprimer toutes les associations existantes
    const { error: deleteError } = await this.supabase
      .from('session_programs')
      .delete()
      .eq('session_id', sessionId)

    if (deleteError) throw deleteError

    // Créer les nouvelles associations
    if (programIds.length > 0) {
      const sessionPrograms = programIds.map((programId) => ({
        session_id: sessionId,
        program_id: programId,
        organization_id: organizationId,
      }))

      const { error: insertError } = await this.supabase
        .from('session_programs')
        .insert(sessionPrograms)

      if (insertError) throw insertError
    }

    return true
  }

  /**
   * Récupère tous les programmes associés à une session
   */
  async getSessionPrograms(sessionId: string) {
    const { data, error } = await this.supabase
      .from('session_programs')
      .select(`
        program_id,
        programs(*)
      `)
      .eq('session_id', sessionId)

    if (error) throw error
    return data?.map((sp: { programs: unknown }) => sp.programs).filter(Boolean) || []
  }

  /**
   * Met à jour une session
   */
  async updateSession(id: string, updates: FlexibleUpdate<'sessions'>) {
    // Récupérer l'organization_id avant la mise à jour
    const { data: existingSession } = await this.supabase
      .from('sessions')
      .select('formation_id, formations(organization_id)')
      .eq('id', id)
      .single()

    const { data, error } = await this.supabase
      .from('sessions')
      .update(updates as SessionUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Synchroniser avec les calendriers si activé
    const formation = existingSession?.formations as { organization_id?: string } | null
    if (existingSession && formation?.organization_id) {
      await this.syncWithCalendars(id, formation.organization_id, 'update').catch((error) => {
        console.error('Erreur lors de la synchronisation calendrier:', error)
      })
    }

    return data
  }

  /**
   * Supprime une session
   */
  async deleteSession(id: string) {
    // Récupérer l'organization_id avant la suppression
    const { data: existingSession } = await this.supabase
      .from('sessions')
      .select('formation_id, formations(organization_id)')
      .eq('id', id)
      .single()

    // Supprimer les événements calendrier si activé
    const formation = existingSession?.formations as { organization_id?: string } | null
    if (existingSession && formation?.organization_id) {
      await this.syncWithCalendars(id, formation.organization_id, 'delete').catch((error) => {
        console.error('Erreur lors de la suppression de l\'événement calendrier:', error)
      })
    }

    const { error } = await this.supabase
      .from('sessions')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Crée une réunion visioconférence pour une session
   */
  private async createVideoconferenceMeeting(
    sessionId: string,
    organizationId: string
  ): Promise<void> {
    // Récupérer les intégrations visioconférence actives
    const { data: integrations } = await this.supabase
      .from('videoconference_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .eq('auto_create_meetings', true)

    if (!integrations || integrations.length === 0) {
      return // Pas d'intégrations actives
    }

    // Créer une réunion avec chaque système actif
    for (const integration of integrations) {
      try {
        await videoconferenceService.createMeetingForSession(
          sessionId,
          { organizationId, provider: integration.provider as string }
        )
      } catch (error) {
        console.error(`Erreur lors de la création de réunion avec ${integration.provider}:`, error)
        // Continuer avec les autres intégrations même si une échoue
      }
    }
  }

  /**
   * Synchronise une session avec les calendriers configurés
   */
  private async syncWithCalendars(
    sessionId: string,
    organizationId: string,
    action: 'create' | 'update' | 'delete'
  ): Promise<void> {
    // Récupérer les intégrations calendrier actives
    const { data: integrations } = await this.supabase
      .from('calendar_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .eq('sync_sessions', true)
      .eq('create_events_for_sessions', true)

    if (!integrations || integrations.length === 0) {
      return // Pas d'intégrations actives
    }

    // Synchroniser avec chaque calendrier
    for (const integration of integrations) {
      try {
        // TODO: Implémenter deleteSessionEvent et syncSession dans CalendarService
        // if (action === 'delete') {
        //   await calendarService.deleteSessionEvent(
        //     organizationId,
        //     integration.provider as string,
        //     sessionId
        //   )
        // } else {
        //   await calendarService.syncSession(
        //     organizationId,
        //     integration.provider as string,
        //     sessionId
        //   )
        // }
        console.warn(`Calendar sync for ${action} not implemented yet for provider ${integration.provider}`)
      } catch (error) {
        console.error(`Erreur lors de la synchronisation avec ${integration.provider}:`, error)
        // Continuer avec les autres intégrations même si une échoue
      }
    }
  }

  /**
   * Récupère les sessions à venir
   */
  async getUpcomingSessions(organizationId: string, limit: number = 10) {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        *,
        formations!inner(
          *,
          programs(*)
        )
      `)
      .eq('formations.organization_id', organizationId)
      .gte('start_date', today)
      .eq('status', 'planned')
      .order('start_date', { ascending: true })
      .limit(limit)

    if (error) throw error
    return data
  }

  /**
   * Récupère les sessions en cours
   */
  async getOngoingSessions(organizationId: string) {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        *,
        formations!inner(
          *,
          programs(*)
        )
      `)
      .eq('formations.organization_id', organizationId)
      .lte('start_date', today)
      .gte('end_date', today)
      .eq('status', 'ongoing')
      .order('start_date', { ascending: true })

    if (error) throw error
    return data
  }

  // ========== GESTION DES RELATIONS N:N FORMATION-SESSION ==========

  /**
   * Associe une session à une ou plusieurs formations
   */
  async addSessionToFormations(sessionId: string, formationIds: string[], organizationId: string) {
    const formationSessions = formationIds.map((formationId, index) => ({
      session_id: sessionId,
      formation_id: formationId,
      organization_id: organizationId,
      order_index: index,
    }))

    const { data, error } = await this.supabase
      .from('formation_sessions')
      .insert(formationSessions)
      .select()

    if (error) throw error
    return data
  }

  /**
   * Retire une session d'une formation
   */
  async removeSessionFromFormation(sessionId: string, formationId: string) {
    const { error } = await this.supabase
      .from('formation_sessions')
      .delete()
      .eq('session_id', sessionId)
      .eq('formation_id', formationId)

    if (error) throw error
    return true
  }

  /**
   * Met à jour les formations associées à une session
   */
  async updateSessionFormations(sessionId: string, formationIds: string[], organizationId: string) {
    // Supprimer toutes les associations existantes
    const { error: deleteError } = await this.supabase
      .from('formation_sessions')
      .delete()
      .eq('session_id', sessionId)

    if (deleteError) throw deleteError

    // Créer les nouvelles associations
    if (formationIds.length > 0) {
      return this.addSessionToFormations(sessionId, formationIds, organizationId)
    }

    return []
  }

  /**
   * Récupère toutes les formations associées à une session
   */
  async getSessionFormations(sessionId: string) {
    const { data, error } = await this.supabase
      .from('formation_sessions')
      .select(`
        formation_id,
        order_index,
        formations(*)
      `)
      .eq('session_id', sessionId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data?.map((fs: { formations: unknown }) => fs.formations).filter(Boolean) || []
  }

  /**
   * Récupère toutes les sessions d'une formation (via la table de liaison N:N)
   */
  async getFormationSessions(formationId: string) {
    const { data, error } = await this.supabase
      .from('formation_sessions')
      .select(`
        session_id,
        order_index,
        sessions(*)
      `)
      .eq('formation_id', formationId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data?.map((fs: { sessions: unknown }) => fs.sessions).filter(Boolean) || []
  }

  /**
   * Crée une session indépendante (sans formation obligatoire)
   */
  async createIndependentSession(
    session: Omit<FlexibleInsert<'sessions'>, 'formation_id'> & { organization_id: string },
    programIds?: string[],
    formationIds?: string[]
  ) {
    // Créer la session sans formation_id
    const { data, error } = await this.supabase
      .from('sessions')
      .insert({
        ...session,
        formation_id: null, // Pas de formation directe
      } as SessionInsert)
      .select()
      .single()

    if (error) throw error

    // Associer les programmes si fournis
    if (programIds && programIds.length > 0 && data) {
      await this.updateSessionPrograms(data.id, programIds, session.organization_id)
    }

    // Associer les formations si fournies
    if (formationIds && formationIds.length > 0 && data) {
      await this.addSessionToFormations(data.id, formationIds, session.organization_id)
    }

    return data
  }
}

export const sessionService = new SessionService()











