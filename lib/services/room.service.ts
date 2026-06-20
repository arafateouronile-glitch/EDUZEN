import type { SupabaseClient } from '@supabase/supabase-js'

export interface Room {
  id: string
  organization_id: string
  name: string
  code: string | null
  description: string | null
  capacity: number | null
  location: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RoomInsert {
  organization_id: string
  name: string
  code?: string | null
  description?: string | null
  capacity?: number | null
  location?: string | null
  is_active?: boolean
}

export interface RoomUpdate {
  name?: string
  code?: string | null
  description?: string | null
  capacity?: number | null
  location?: string | null
  is_active?: boolean
}

export class RoomService {
  private supabase: SupabaseClient<any>

  constructor(supabaseClient: SupabaseClient<any>) {
    this.supabase = supabaseClient
  }

  async getAll(organizationId: string, filters?: { isActive?: boolean; search?: string }): Promise<Room[]> {
    let query = this.supabase
      .from('rooms')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.order('name', { ascending: true })
    if (error) throw error
    return (data || []) as Room[]
  }

  async getById(id: string): Promise<Room> {
    const { data, error } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Room
  }

  async create(room: RoomInsert): Promise<Room> {
    const { data, error } = await this.supabase
      .from('rooms')
      .insert(room)
      .select()
      .single()
    if (error) throw error
    return data as Room
  }

  async update(id: string, updates: RoomUpdate): Promise<Room> {
    const { data, error } = await this.supabase
      .from('rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Room
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('rooms')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw error
  }

  async hardDelete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('rooms')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
