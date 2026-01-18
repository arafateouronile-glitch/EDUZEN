import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'

type SessionSlot = TableRow<'session_slots'>
type SessionSlotInsert = TableInsert<'session_slots'>
type SessionSlotUpdate = TableUpdate<'session_slots'>

export interface GenerateSlotsParams {
  sessionId: string
  startDate: string
  endDate: string
  timeSlotType: 'morning' | 'afternoon' | 'both'
  morningStart?: string // Format HH:mm
  morningEnd?: string
  afternoonStart?: string
  afternoonEnd?: string
  location?: string
  teacherId?: string
  capacityMax?: number
}

export class SessionSlotService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }

  /**
   * Récupère toutes les séances d'une session
   */
  async getBySessionId(sessionId: string) {
    const { data, error } = await this.supabase
      .from('session_slots')
      .select('*')
      .eq('session_id', sessionId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Récupère une séance par son ID
   */
  async getById(id: string) {
    const { data, error } = await this.supabase
      .from('session_slots')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Crée une nouvelle séance
   */
  async create(slot: FlexibleInsert<'session_slots'>) {
    const { data, error } = await this.supabase
      .from('session_slots')
      .insert(slot as SessionSlotInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour une séance
   */
  async update(id: string, updates: FlexibleUpdate<'session_slots'>) {
    const { data, error } = await this.supabase
      .from('session_slots')
      .update(updates as SessionSlotUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime une séance
   */
  async delete(id: string) {
    const { error } = await this.supabase
      .from('session_slots')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Génère automatiquement les séances pour une session
   */
  async generateSlots(params: GenerateSlotsParams) {
    const { sessionId, startDate, endDate, timeSlotType, morningStart, morningEnd, afternoonStart, afternoonEnd, location, teacherId, capacityMax } = params

    // Valeurs par défaut pour les heures
    const defaultMorningStart = morningStart || '09:00'
    const defaultMorningEnd = morningEnd || '12:00'
    const defaultAfternoonStart = afternoonStart || '14:00'
    const defaultAfternoonEnd = afternoonEnd || '17:00'

    // Générer toutes les dates entre startDate et endDate
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    // Exclure les weekends (samedi = 6, dimanche = 0)
    let currentDate = new Date(start)
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclure dimanche et samedi
        dates.push(currentDate.toISOString().split('T')[0])
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Générer les séances pour chaque date
    const slots: FlexibleInsert<'session_slots'>[] = []

    for (const date of dates) {
      if (timeSlotType === 'morning' || timeSlotType === 'both') {
        slots.push({
          session_id: sessionId,
          date,
          time_slot: 'morning',
          start_time: defaultMorningStart,
          end_time: defaultMorningEnd,
          location: location || null,
          teacher_id: teacherId || null,
          capacity_max: capacityMax || null,
        })
      }

      if (timeSlotType === 'afternoon' || timeSlotType === 'both') {
        slots.push({
          session_id: sessionId,
          date,
          time_slot: 'afternoon',
          start_time: defaultAfternoonStart,
          end_time: defaultAfternoonEnd,
          location: location || null,
          teacher_id: teacherId || null,
          capacity_max: capacityMax || null,
        })
      }

      if (timeSlotType === 'full_day') {
        slots.push({
          session_id: sessionId,
          date,
          time_slot: 'full_day',
          start_time: defaultMorningStart,
          end_time: defaultAfternoonEnd,
          location: location || null,
          teacher_id: teacherId || null,
          capacity_max: capacityMax || null,
        })
      }
    }

    // Supprimer les séances existantes pour cette session
    const { error: deleteError } = await this.supabase
      .from('session_slots')
      .delete()
      .eq('session_id', sessionId)

    if (deleteError) throw deleteError

    // Insérer les nouvelles séances
    if (slots.length > 0) {
      const { data, error } = await this.supabase
        .from('session_slots')
        .insert(slots as SessionSlotInsert[])
        .select()

      if (error) throw error
      return data
    }

    return []
  }

  /**
   * Supprime toutes les séances d'une session
   */
  async deleteBySessionId(sessionId: string) {
    const { error } = await this.supabase
      .from('session_slots')
      .delete()
      .eq('session_id', sessionId)

    if (error) throw error
  }
}

export const sessionSlotService = new SessionSlotService()
























