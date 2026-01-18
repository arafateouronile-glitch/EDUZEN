import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'

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
   * Récupère tous les programmes d'une organisation
   */
  async getAllPrograms(organizationId: string, filters?: {
    isActive?: boolean
    search?: string
  }) {
    let query = this.supabase
      .from('programs')
      .select('*')
      .eq('organization_id', organizationId)

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
   * Récupère un programme par son ID avec ses formations
   */
  async getProgramById(id: string) {
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
  }

  /**
   * Crée un nouveau programme
   */
  async createProgram(program: FlexibleInsert<'programs'>) {
    const { data, error } = await this.supabase
      .from('programs')
      .insert(program as ProgramInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour un programme
   */
  async updateProgram(id: string, updates: FlexibleUpdate<'programs'>) {
    const { data, error } = await this.supabase
      .from('programs')
      .update(updates as ProgramUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
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
    const { data, error } = await this.supabase
      .from('formations')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Récupère les statistiques globales des programmes pour une organisation
   */
  async getGlobalStats(organizationId: string) {
    const { data: allPrograms, error } = await this.supabase
      .from('programs')
      .select('id, is_active, created_at')
      .eq('organization_id', organizationId)

    if (error) throw error

    const programsArray = (allPrograms as Program[]) || []
    const total = programsArray.length
    const active = programsArray.filter((p) => p.is_active).length
    const inactive = programsArray.filter((p) => !p.is_active).length

    // Compter les formations
    let totalFormations = 0
    const programIds = programsArray.map((p) => p.id)
    if (programIds.length > 0) {
      const { count, error: formationsError } = await this.supabase
        .from('formations')
        .select('*', { count: 'exact', head: true })
        .in('program_id', programIds)
      if (formationsError) throw formationsError
      totalFormations = count || 0
    }

    // Compter les sessions via les formations
    let totalSessions = 0
    if (programIds.length > 0) {
      const { data: formations, error: formationsError } = await this.supabase
        .from('formations')
        .select('id')
        .in('program_id', programIds)
      if (formationsError) throw formationsError
      const formationIds = (formations as Array<{ id: string }>)?.map((f) => f.id) || []
      if (formationIds.length > 0) {
        const { count, error: sessionsError } = await this.supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .in('formation_id', formationIds)
        if (sessionsError) throw sessionsError
        totalSessions = count || 0
      }
    }

    // Compter les inscriptions
    let totalEnrollments = 0
    if (programIds.length > 0) {
      const { data: formations, error: formationsError2 } = await this.supabase
        .from('formations')
        .select('id')
        .in('program_id', programIds)
      if (formationsError2) throw formationsError2
      const formationIds = (formations as Array<{ id: string }>)?.map((f) => f.id) || []
      if (formationIds.length > 0) {
        const { data: sessions, error: sessionsError2 } = await this.supabase
          .from('sessions')
          .select('id')
          .in('formation_id', formationIds)
        if (sessionsError2) throw sessionsError2
        const sessionIds = (sessions as Array<{ id: string }>)?.map((s) => s.id) || []
        if (sessionIds.length > 0) {
          const { count, error: enrollmentsError } = await this.supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .in('session_id', sessionIds)
          if (enrollmentsError) throw enrollmentsError
          totalEnrollments = count || 0
        }
      }
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
  }
}

export const programService = new ProgramService()
