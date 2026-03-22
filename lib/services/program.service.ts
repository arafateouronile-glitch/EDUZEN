import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'
import { logger } from '@/lib/utils/logger'

// Types pour les vrais programmes (niveau 1)
type Program = TableRow<'programs'>
type ProgramInsert = TableInsert<'programs'>
type ProgramUpdate = TableUpdate<'programs'>

/**
 * Service pour gérer les PROGRAMMES
 * Un programme contient plusieurs formations
 * Exemple : "Programme de formation continue" > "Formation Excel" > "Session Hiver 2024"
 */
export class ProgramService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère tous les programmes d'une organisation avec pagination optionnelle
   * Si limit/offset sont fournis, retourne un objet { data, count, hasMore }
   * Sinon, retourne directement le tableau pour compatibilité
   */
  async getAllPrograms(organizationId: string, filters?: {
    isActive?: boolean
    search?: string
    limit?: number
    offset?: number
  }): Promise<Program[] | { data: Program[]; count: number; hasMore: boolean }> {
    try {
    const usePagination = filters?.limit !== undefined || filters?.offset !== undefined

    let query = this.supabase
      .from('programs')
      .select('*', usePagination ? { count: 'exact' } : undefined)
      .eq('organization_id', organizationId)

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Appliquer pagination seulement si demandée
    if (usePagination) {
      const limit = filters?.limit ?? 50
      const offset = filters?.offset ?? 0
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query.order('created_at', { ascending: false })
      if (error) throw error
      return { data: (data ?? []) as Program[], count: count ?? 0, hasMore: (count ?? 0) > offset + limit }
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Program[]
    } catch (error) {
      logger.error('ProgramService.getAllPrograms', error, { organizationId, filters })
      throw error
    }
  }

  /**
   * Récupère un programme par son ID avec ses formations
   */
  async getProgramById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from('programs')
        .select(`
          *,
          formations(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('ProgramService.getProgramById', error, { id })
      throw error
    }
  }

  /**
   * Crée un nouveau programme
   */
  async createProgram(program: FlexibleInsert<'programs'>) {
    try {
      const { data, error } = await this.supabase
        .from('programs')
        .insert(program as ProgramInsert)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('ProgramService.createProgram', error, { organizationId: (program as { organization_id?: string }).organization_id })
      throw error
    }
  }

  /**
   * Met à jour un programme
   */
  async updateProgram(id: string, updates: FlexibleUpdate<'programs'>) {
    try {
      const { data, error } = await this.supabase
        .from('programs')
        .update(updates as ProgramUpdate)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('ProgramService.updateProgram', error, { id })
      throw error
    }
  }

  /**
   * Supprime un programme (soft delete)
   */
  async deleteProgram(id: string) {
    return this.updateProgram(id, { is_active: false })
  }

  /**
   * Récupère toutes les formations d'un programme
   */
  async getFormationsByProgram(programId: string) {
    try {
      const { data, error } = await this.supabase
        .from('formations')
        .select('*')
        .eq('program_id', programId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      logger.error('ProgramService.getFormationsByProgram', error, { programId })
      throw error
    }
  }

  /**
   * Récupère les statistiques globales des programmes pour une organisation
   * Optimisé: une seule requête formations, une seule requête sessions
   */
  async getGlobalStats(organizationId: string) {
    try {
    const { data: allPrograms, error } = await this.supabase
      .from('programs')
      .select('id, is_active, created_at')
      .eq('organization_id', organizationId)

    if (error) throw error

    const programsArray = (allPrograms as Program[]) || []
    const total = programsArray.length
    const active = programsArray.filter((p) => p.is_active).length
    const inactive = programsArray.filter((p) => !p.is_active).length

    const programIds = programsArray.map((p) => p.id)

    // Requêtes parallèles optimisées - une seule fois chaque
    let totalFormations = 0
    let totalSessions = 0
    let totalEnrollments = 0
    let formationIds: string[] = []
    let sessionIds: string[] = []

    if (programIds.length > 0) {
      // Récupérer formations avec count en une seule requête
      const [formationsResult, formationsCountResult] = await Promise.all([
        this.supabase
          .from('formations')
          .select('id')
          .in('program_id', programIds),
        this.supabase
          .from('formations')
          .select('*', { count: 'exact', head: true })
          .in('program_id', programIds)
      ])

      if (formationsResult.error) throw formationsResult.error
      formationIds = (formationsResult.data as Array<{ id: string }>)?.map((f) => f.id) || []
      totalFormations = formationsCountResult.count || 0
    }

    if (formationIds.length > 0) {
      // Récupérer sessions avec count en une seule requête
      const [sessionsResult, sessionsCountResult] = await Promise.all([
        this.supabase
          .from('sessions')
          .select('id')
          .in('formation_id', formationIds),
        this.supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .in('formation_id', formationIds)
      ])

      if (sessionsResult.error) throw sessionsResult.error
      sessionIds = (sessionsResult.data as Array<{ id: string }>)?.map((s) => s.id) || []
      totalSessions = sessionsCountResult.count || 0
    }

    if (sessionIds.length > 0) {
      const { count, error: enrollmentsError } = await this.supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .in('session_id', sessionIds)
      if (enrollmentsError) throw enrollmentsError
      totalEnrollments = count || 0
    }

    // Grouper par statut pour le graphique
    const statusData = [
      { name: 'Actifs', value: active, color: '#335ACF' },
      { name: 'Inactifs', value: inactive, color: '#6B7280' },
    ].filter(item => item.value > 0)

    // Grouper par mois pour le graphique d'évolution
    const byMonth: Record<string, number> = {}
    programsArray.forEach((p) => {
      if (p.created_at) {
        const date = new Date(p.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        byMonth[monthKey] = (byMonth[monthKey] || 0) + 1
      }
    })

    const monthlyData = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Derniers 6 mois
      .map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        programmes: count,
      }))

    return {
      total,
      active,
      inactive,
      totalFormations,
      totalSessions,
      totalEnrollments,
      statusData,
      monthlyData,
    }
    } catch (error) {
      logger.error('ProgramService.getGlobalStats', error, { organizationId })
      throw error
    }
  }
}

export const programService = new ProgramService()
