import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'

// Types pour les formations (niveau 2)
type Formation = TableRow<'formations'>
type FormationInsert = TableInsert<'formations'>
type FormationUpdate = TableUpdate<'formations'>

/**
 * Service pour gérer les FORMATIONS
 * Une formation appartient à un programme et contient plusieurs sessions
 * Exemple : "Formation Excel avancé" (dans le programme "Formation continue")
 */
export class FormationService {
  private supabase = createClient()

  /**
   * Récupère toutes les formations d'une organisation
   */
  async getAllFormations(organizationId: string, filters?: {
    programId?: string
    isActive?: boolean
    search?: string
  }) {
    let query = this.supabase
      .from('formations')
      .select(`
        *,
        programs(*)
      `)
      .eq('organization_id', organizationId)

    if (filters?.programId) {
      query = query.eq('program_id', filters.programId)
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Récupère une formation par son ID avec son programme et ses sessions
   */
  async getFormationById(id: string) {
    const { data, error } = await this.supabase
      .from('formations')
      .select(`
        *,
        programs(*),
        sessions(*)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Crée une nouvelle formation
   */
  async createFormation(formation: FlexibleInsert<'formations'>) {
    const { data, error } = await this.supabase
      .from('formations')
      .insert(formation as FormationInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour une formation
   */
  async updateFormation(id: string, updates: FlexibleUpdate<'formations'>) {
    const { data, error } = await this.supabase
      .from('formations')
      .update(updates as FormationUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime une formation (soft delete)
   */
  async deleteFormation(id: string) {
    return this.updateFormation(id, { is_active: false })
  }

  /**
   * Récupère toutes les sessions d'une formation (relation directe legacy)
   */
  async getSessionsByFormation(formationId: string) {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('formation_id', formationId)
      .order('start_date', { ascending: true })

    if (error) throw error
    return data
  }

  // ========== GESTION DES RELATIONS N:N FORMATION-SESSION ==========

  /**
   * Récupère toutes les sessions d'une formation (via la table de liaison N:N)
   * Inclut les sessions liées directement ET via formation_sessions
   */
  async getAllSessionsForFormation(formationId: string) {
    // Sessions liées via formation_sessions (N:N)
    const { data: linkedSessions, error: linkedError } = await this.supabase
      .from('formation_sessions')
      .select(`
        session_id,
        order_index,
        sessions(*)
      `)
      .eq('formation_id', formationId)
      .order('order_index', { ascending: true })

    if (linkedError) throw linkedError

    // Sessions liées directement (legacy)
    const { data: directSessions, error: directError } = await this.supabase
      .from('sessions')
      .select('*')
      .eq('formation_id', formationId)
      .order('start_date', { ascending: true })

    if (directError) throw directError

    // Combiner les deux en évitant les doublons
    const linkedSessionsData = linkedSessions?.map((fs: { sessions: unknown }) => fs.sessions).filter(Boolean) || []
    const directSessionsData = directSessions || []
    
    const allSessions = [...linkedSessionsData]
    const linkedIds = new Set(linkedSessionsData.map((s: { id: string }) => s.id))
    
    for (const session of directSessionsData) {
      if (!linkedIds.has(session.id)) {
        allSessions.push(session)
      }
    }

    return allSessions
  }

  /**
   * Associe des sessions à une formation
   */
  async addSessionsToFormation(formationId: string, sessionIds: string[], organizationId: string) {
    const formationSessions = sessionIds.map((sessionId, index) => ({
      formation_id: formationId,
      session_id: sessionId,
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
  async removeSessionFromFormation(formationId: string, sessionId: string) {
    const { error } = await this.supabase
      .from('formation_sessions')
      .delete()
      .eq('formation_id', formationId)
      .eq('session_id', sessionId)

    if (error) throw error
    return true
  }

  /**
   * Met à jour les sessions associées à une formation
   */
  async updateFormationSessions(formationId: string, sessionIds: string[], organizationId: string) {
    // Supprimer toutes les associations existantes
    const { error: deleteError } = await this.supabase
      .from('formation_sessions')
      .delete()
      .eq('formation_id', formationId)

    if (deleteError) throw deleteError

    // Créer les nouvelles associations
    if (sessionIds.length > 0) {
      return this.addSessionsToFormation(formationId, sessionIds, organizationId)
    }

    return []
  }

  /**
   * Récupère une formation avec toutes ses sessions (N:N et directes)
   */
  async getFormationWithAllSessions(id: string) {
    const formation = await this.getFormationById(id)
    if (!formation) return null

    const allSessions = await this.getAllSessionsForFormation(id)
    
    return {
      ...formation,
      all_sessions: allSessions,
    }
  }
}

export const formationService = new FormationService()

