import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { calendarService } from './calendar.service'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'
import { logger, sanitizeError } from '@/lib/utils/logger'

// Types pour les sessions (niveau 3)
type Session = TableRow<'sessions'>
type SessionInsert = TableInsert<'sessions'>
type SessionUpdate = TableUpdate<'sessions'>
/** Session ou payload avec teacher_id (présent en DB, parfois omis dans les types générés) */
type WithTeacherId = { teacher_id?: string | null }

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
   * Récupère toutes les sessions d'une organisation avec pagination optionnelle
   * Optimisé: requêtes parallèles
   * Si limit/offset sont fournis, retourne un objet { data, count, hasMore }
   * Sinon, retourne directement le tableau pour compatibilité
   */
  async getAllSessions(organizationId: string, filters?: {
    formationId?: string
    status?: Session['status']
    startDate?: string
    endDate?: string
    search?: string
    limit?: number
    offset?: number
  }) {
    const usePagination = filters?.limit !== undefined || filters?.offset !== undefined

    // Si filtre formation, pas besoin de chercher les sessions indépendantes
    if (filters?.formationId) {
      let query = this.supabase
        .from('sessions')
        .select(`*, formations!inner(*, programs(*))`, usePagination ? { count: 'exact' } : undefined)
        .eq('formations.organization_id', organizationId)
        .eq('formation_id', filters.formationId)

      if (filters?.status) query = query.eq('status', filters.status)
      if (filters?.startDate) query = query.gte('start_date', filters.startDate)
      if (filters?.endDate) query = query.lte('end_date', filters.endDate)
      if (filters?.search) query = query.ilike('name', `%${filters.search}%`)

      if (usePagination) {
        const limit = filters?.limit ?? 50
        const offset = filters?.offset ?? 0
        query = query.range(offset, offset + limit - 1).order('start_date', { ascending: true })

        const { data, error, count } = await query
        if (error) throw error
        return { data: data ?? [], count: count ?? 0, hasMore: (count ?? 0) > offset + limit }
      }

      const { data, error } = await query.order('start_date', { ascending: true })
      if (error) throw error
      return data ?? []
    }

    // Construction des requêtes de base
    let queryWithFormation = this.supabase
      .from('sessions')
      .select(`*, formations!inner(*, programs(*))`)
      .eq('formations.organization_id', organizationId)
      .not('formation_id', 'is', null)

    let queryIndependent = this.supabase
      .from('sessions')
      .select('*, formations(*)')
      .is('formation_id', null)
      .eq('organization_id', organizationId)

    // Appliquer les filtres communs
    if (filters?.status) {
      queryWithFormation = queryWithFormation.eq('status', filters.status)
      queryIndependent = queryIndependent.eq('status', filters.status)
    }
    if (filters?.startDate) {
      queryWithFormation = queryWithFormation.gte('start_date', filters.startDate)
      queryIndependent = queryIndependent.gte('start_date', filters.startDate)
    }
    if (filters?.endDate) {
      queryWithFormation = queryWithFormation.lte('end_date', filters.endDate)
      queryIndependent = queryIndependent.lte('end_date', filters.endDate)
    }
    if (filters?.search) {
      queryWithFormation = queryWithFormation.ilike('name', `%${filters.search}%`)
      queryIndependent = queryIndependent.ilike('name', `%${filters.search}%`)
    }

    // Exécution parallèle des requêtes
    const [withFormationResult, independentResult] = await Promise.all([
      queryWithFormation.order('start_date', { ascending: true }),
      queryIndependent.order('start_date', { ascending: true })
    ])

    if (withFormationResult.error) throw withFormationResult.error
    if (independentResult.error) throw independentResult.error

    // Fusionner et trier
    const merged = [...(withFormationResult.data ?? []), ...(independentResult.data ?? [])]
    merged.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

    // Si pagination demandée, appliquer et retourner le format paginé
    if (usePagination) {
      const limit = filters?.limit ?? 50
      const offset = filters?.offset ?? 0
      const paginatedData = merged.slice(offset, offset + limit)
      return { data: paginatedData, count: merged.length, hasMore: merged.length > offset + limit }
    }

    return merged
  }

  /**
   * Récupère une session par son ID avec sa formation (si présente), son programme et les programmes associés.
   * Gère les sessions sans formation (formation_id null, créées depuis /sessions/new).
   */
  async getSessionById(id: string) {
    // LEFT JOIN formations pour inclure les sessions sans formation (formation_id null)
    const { data: session, error: sessionError } = await this.supabase
      .from('sessions')
      .select(`
        *,
        formations(
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
        logger.error('SessionService - Erreur lors de la vérification de la formation', formationError, { error: sanitizeError(formationError) })
        throw new Error(`Formation non trouvée: ${formationError.message}`)
      }

      if (!formation) {
        throw new Error('Formation non trouvée')
      }

      logger.debug('SessionService - Formation trouvée', { formationId: formation.id })
    }

    // Créer la session
    const { data, error } = await this.supabase
      .from('sessions')
      .insert(session as SessionInsert)
      .select()
      .single()

    if (error) {
      logger.error('SessionService - Erreur RLS lors de la création de la session', error, {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        formation_id: session.formation_id,
        error: sanitizeError(error),
      })
      throw error
    }

    const sessionTeacherId = (session as WithTeacherId).teacher_id
    if (data && sessionTeacherId) {
      try {
        const { error: insertError } = await this.supabase
          .from('session_teachers')
          .insert({
            session_id: data.id,
            teacher_id: sessionTeacherId,
            role: 'instructor',
            is_primary: true,
          })

        if (insertError) {
          logger.warn('SessionService - Erreur lors de la création de l\'assignation dans session_teachers', { error: sanitizeError(insertError) })
        } else {
          logger.debug('SessionService - Assignation créée dans session_teachers', { sessionId: data.id, teacherId: sessionTeacherId })
        }
      } catch (syncError) {
        // Ne pas faire échouer la création de session si la synchronisation échoue
        logger.error('SessionService - Erreur lors de la synchronisation session_teachers', syncError as Error, { error: sanitizeError(syncError) })
      }
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
        const { error: linkError } = await this.supabase.rpc('insert_session_programs', {
          p_session_id: data.id,
          p_program_ids: programIds,
          p_organization_id: formation.organization_id,
          p_formation_id: data.formation_id ?? undefined,
        })

        if (linkError) {
          logger.error('SessionService - Erreur lors de la création des associations session-programme', linkError, { error: sanitizeError(linkError) })
          // Ne pas échouer complètement, mais logger l'erreur
        }

        // Synchroniser avec les calendriers si activé
        if (formation.organization_id) {
          await this.syncWithCalendars(data.id, formation.organization_id, 'create').catch((error) => {
            logger.error('SessionService - Erreur lors de la synchronisation calendrier', error, { error: sanitizeError(error) })
            // Ne pas échouer la création de session si la synchronisation échoue
          })
        }

      }
    }

    logger.info('SessionService - Session créée avec succès', { sessionId: data.id })
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

    // Créer les nouvelles associations via RPC (contourne RLS INSERT sur session_programs)
    if (programIds.length > 0) {
      const { data: sessionRow } = await this.supabase
        .from('sessions')
        .select('formation_id')
        .eq('id', sessionId)
        .single()

      const { error: insertError } = await this.supabase.rpc('insert_session_programs', {
        p_session_id: sessionId,
        p_program_ids: programIds,
        p_organization_id: organizationId,
        p_formation_id: sessionRow?.formation_id ?? undefined,
      })

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
    // Récupérer la session existante avant la mise à jour pour comparer teacher_id
    const { data: existingSession } = await this.supabase
      .from('sessions')
      .select('formation_id, teacher_id, formations(organization_id)')
      .eq('id', id)
      .single()

    const oldTeacherId = existingSession?.teacher_id
    const newTeacherId = (updates as WithTeacherId)?.teacher_id

    // Mettre à jour la session
    const { data, error } = await this.supabase
      .from('sessions')
      .update(updates as SessionUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Synchroniser session_teachers si teacher_id a changé ou si c'est la première fois
    // Le trigger SQL devrait aussi le faire, mais on le fait aussi côté TypeScript pour être sûr
    if (oldTeacherId !== newTeacherId || (newTeacherId && !oldTeacherId)) {
      try {
        logger.debug('SessionService - Synchronisation session_teachers', { 
          sessionId: id, 
          oldTeacherId, 
          newTeacherId 
        })
        
        // Supprimer l'ancienne assignation si elle existe
        if (oldTeacherId) {
          const { error: deleteError } = await this.supabase
            .from('session_teachers')
            .delete()
            .eq('session_id', id)
            .eq('teacher_id', oldTeacherId)
          
          if (deleteError) {
            logger.warn('SessionService - Erreur lors de la suppression de l\'ancienne assignation', { error: sanitizeError(deleteError) })
          } else {
            logger.debug('SessionService - Ancienne assignation supprimée', { sessionId: id, oldTeacherId })
          }
        }

        // Créer la nouvelle assignation si un nouveau teacher_id est fourni
        if (newTeacherId) {
          // Vérifier si l'assignation existe déjà
          const { data: existingAssignment } = await this.supabase
            .from('session_teachers')
            .select('id')
            .eq('session_id', id)
            .eq('teacher_id', newTeacherId)
            .maybeSingle()

          // Si elle n'existe pas, la créer
          if (!existingAssignment) {
            const { error: insertError } = await this.supabase
              .from('session_teachers')
              .insert({
                session_id: id,
                teacher_id: newTeacherId,
                role: 'instructor',
                is_primary: true, // Le teacher_id principal est considéré comme primary
              })

            if (insertError) {
              logger.warn('SessionService - Erreur lors de la création de l\'assignation dans session_teachers', { 
                error: sanitizeError(insertError),
                code: insertError.code,
                message: insertError.message,
              })
            } else {
              logger.info('SessionService - Assignation créée dans session_teachers', { sessionId: id, teacherId: newTeacherId })
            }
          } else {
            logger.debug('SessionService - Assignation existe déjà dans session_teachers', { sessionId: id, teacherId: newTeacherId })
          }
        }
      } catch (syncError) {
        // Ne pas faire échouer la mise à jour de la session si la synchronisation échoue
        logger.error('SessionService - Erreur lors de la synchronisation session_teachers', syncError as Error, { error: sanitizeError(syncError) })
      }
    }

    // Synchroniser avec les calendriers si activé
    const formation = existingSession?.formations as { organization_id?: string } | null
    if (existingSession && formation?.organization_id) {
      await this.syncWithCalendars(id, formation.organization_id, 'update').catch((error) => {
        logger.error('SessionService - Erreur lors de la synchronisation calendrier', error, { error: sanitizeError(error) })
      })
    }

    return data
  }

  /**
   * Duplique une session (sans les inscriptions ni les émargements)
   */
  async duplicateSession(id: string) {
    try {
      const { data: original, error: fetchError } = await this.supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single()
      if (fetchError) throw fetchError
      const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = original as any
      const copy = {
        ...rest,
        title: `Copie de ${original.title}`,
        status: 'draft',
        start_date: null,
        end_date: null,
      }
      const { data, error } = await this.supabase.from('sessions').insert(copy).select().single()
      if (error) throw error
      return data
    } catch (error) {
      logger.error('SessionService.duplicateSession', error, { id })
      throw error
    }
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
        logger.error('SessionService - Erreur lors de la suppression de l\'événement calendrier', error, { error: sanitizeError(error) })
      })
    }

    const { error } = await this.supabase
      .from('sessions')
      .delete()
      .eq('id', id)

    if (error) throw error
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
        // NOTE: Fonctionnalité prévue - Implémenter deleteSessionEvent et syncSession dans CalendarService
        // Nécessite: Méthodes dans CalendarService pour synchroniser avec les calendriers externes (Google, Outlook)
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
        logger.warn(`SessionService - Calendar sync for ${action} not implemented yet for provider ${integration.provider}`, { action, provider: integration.provider })
      } catch (error) {
        logger.error(`SessionService - Erreur lors de la synchronisation avec ${integration.provider}`, error, { provider: integration.provider, error: sanitizeError(error) })
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

    const indepTeacherId = (session as WithTeacherId).teacher_id
    if (data && indepTeacherId) {
      try {
        const { error: insertError } = await this.supabase
          .from('session_teachers')
          .insert({
            session_id: data.id,
            teacher_id: indepTeacherId,
            role: 'instructor',
            is_primary: true,
          })

        if (insertError) {
          logger.warn('SessionService - Erreur lors de la création de l\'assignation dans session_teachers (session indépendante)', { error: sanitizeError(insertError) })
        } else {
          logger.debug('SessionService - Assignation créée dans session_teachers (session indépendante)', { sessionId: data.id, teacherId: indepTeacherId })
        }
      } catch (syncError) {
        // Ne pas faire échouer la création de session si la synchronisation échoue
        logger.error('SessionService - Erreur lors de la synchronisation session_teachers (session indépendante)', syncError as Error, { error: sanitizeError(syncError) })
      }
    }

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











