import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type SessionCharge = TableRow<'session_charges'>
type ChargeCategory = TableRow<'charge_categories'>

type SessionChargeInsert = TableInsert<'session_charges'>
type ChargeCategoryInsert = TableInsert<'charge_categories'>

export interface SessionChargeWithCategory extends SessionCharge {
  id: string // Explicitement inclure id pour éviter les erreurs TypeScript
  description: string
  amount: number
  currency: string
  charge_date: string
  category_id: string | null
  payment_method: string | null
  payment_status: 'pending' | 'paid' | 'cancelled'
  paid_at: string | null
  vendor: string | null
  vendor_invoice_number: string | null
  vendor_invoice_date: string | null
  notes: string | null
  charge_categories?: ChargeCategory | null
}

export interface SessionChargesSummary {
  total_amount: number
  paid_amount: number
  pending_amount: number
  charge_count: number
}

class SessionChargesService {
  private supabase = createClient()

  // =====================================================
  // Catégories de charges
  // =====================================================

  /**
   * Récupère toutes les catégories de charges d'une organisation
   */
  async getCategories(organizationId: string): Promise<ChargeCategory[]> {
    const { data, error } = await this.supabase
      .from('charge_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('Erreur récupération catégories:', error)
      return []
    }
    return data || []
  }

  /**
   * Crée une nouvelle catégorie de charge
   */
  async createCategory(
    organizationId: string,
    category: Omit<ChargeCategoryInsert, 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<ChargeCategory> {
    const { data, error } = await this.supabase
      .from('charge_categories')
      .insert({
        ...category,
        organization_id: organizationId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Initialise les catégories par défaut pour une organisation
   */
  async initDefaultCategories(organizationId: string): Promise<void> {
    const { error } = await this.supabase.rpc('init_default_charge_categories', {
      p_organization_id: organizationId,
    })

    if (error) throw error
  }

  // =====================================================
  // Charges de session
  // =====================================================

  /**
   * Récupère toutes les charges d'une session
   */
  async getBySession(sessionId: string): Promise<SessionChargeWithCategory[]> {
    const { data, error } = await this.supabase
      .from('session_charges')
      .select(`
        *,
        charge_categories(*)
      `)
      .eq('session_id', sessionId)
      .order('charge_date', { ascending: false })

    if (error) {
      console.error('Erreur récupération charges:', error)
      return []
    }
    return (data || []) as SessionChargeWithCategory[]
  }

  /**
   * Récupère toutes les charges d'une organisation
   */
  async getAll(organizationId: string, filters?: {
    sessionId?: string
    categoryId?: string
    paymentStatus?: string
    startDate?: string
    endDate?: string
  }): Promise<SessionChargeWithCategory[]> {
    let query = this.supabase
      .from('session_charges')
      .select(`
        *,
        charge_categories(*),
        sessions(id, name)
      `)
      .eq('organization_id', organizationId)

    if (filters?.sessionId) {
      query = query.eq('session_id', filters.sessionId)
    }

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }

    if (filters?.paymentStatus) {
      query = query.eq('payment_status', filters.paymentStatus)
    }

    if (filters?.startDate) {
      query = query.gte('charge_date', filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte('charge_date', filters.endDate)
    }

    const { data, error } = await query.order('charge_date', { ascending: false })

    if (error) {
      console.error('Erreur récupération charges:', error)
      return []
    }
    return (data || []) as SessionChargeWithCategory[]
  }

  /**
   * Récupère une charge par son ID
   */
  async getById(id: string): Promise<SessionChargeWithCategory | null> {
    const { data, error } = await this.supabase
      .from('session_charges')
      .select(`
        *,
        charge_categories(*),
        sessions(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data as SessionChargeWithCategory
  }

  /**
   * Crée une nouvelle charge
   */
  async create(
    organizationId: string,
    sessionId: string,
    charge: Omit<SessionChargeInsert, 'organization_id' | 'session_id' | 'created_at' | 'updated_at'>
  ): Promise<SessionChargeWithCategory> {
    const { data, error } = await this.supabase
      .from('session_charges')
      .insert({
        ...charge,
        organization_id: organizationId,
        session_id: sessionId,
      })
      .select(`
        *,
        charge_categories(*)
      `)
      .single()

    if (error) throw error
    return data as SessionChargeWithCategory
  }

  /**
   * Met à jour une charge
   */
  async update(
    id: string,
    updates: Partial<SessionChargeInsert>
  ): Promise<SessionChargeWithCategory> {
    const { data, error } = await this.supabase
      .from('session_charges')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        charge_categories(*)
      `)
      .single()

    if (error) throw error
    return data as SessionChargeWithCategory
  }

  /**
   * Supprime une charge
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('session_charges')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Calcule le résumé des charges d'une session
   */
  async getSessionSummary(sessionId: string): Promise<SessionChargesSummary | null> {
    const { data, error } = await this.supabase.rpc('calculate_session_charges_total', {
      p_session_id: sessionId,
    })

    if (error) {
      console.error('Erreur calcul résumé charges:', error)
      return null
    }

    if (!data || data.length === 0) {
      return {
        total_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
        charge_count: 0,
      }
    }

    return {
      total_amount: Number(data[0].total_amount) || 0,
      paid_amount: Number(data[0].paid_amount) || 0,
      pending_amount: Number(data[0].pending_amount) || 0,
      charge_count: Number(data[0].charge_count) || 0,
    }
  }
}

export const sessionChargesService = new SessionChargesService()



