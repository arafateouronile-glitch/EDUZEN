/**
 * Service de gestion des sites/antennes (multi-sites)
 */

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'

type Site = TableRow<'sites'>
type SiteInsert = TableInsert<'sites'>
type SiteUpdate = TableUpdate<'sites'>

export interface SiteWithDistance extends Site {
  distance?: number // Distance en km (si calculée)
}

export class SiteService {
  private supabase = createClient()

  /**
   * Récupère tous les sites d'une organisation
   */
  async getAll(organizationId: string, filters?: {
    isActive?: boolean
    type?: 'headquarters' | 'site' | 'antenna'
    search?: string
  }): Promise<Site[]> {
    let query = this.supabase
      .from('sites')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    if (filters?.type) {
      query = query.eq('type', filters.type)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,city.ilike.%${filters.search}%,code.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.order('is_headquarters', { ascending: false }).order('name', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Récupère un site par son ID
   */
  async getById(id: string): Promise<Site> {
    const { data, error } = await this.supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère le siège principal d'une organisation
   */
  async getHeadquarters(organizationId: string): Promise<Site | null> {
    const { data, error } = await this.supabase
      .from('sites')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_headquarters', true)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Crée un nouveau site
   */
  async create(site: FlexibleInsert<'sites'>): Promise<Site> {
    // Si c'est le premier site ou si is_headquarters est true, vérifier qu'il n'y en a pas déjà un
    if (site.is_headquarters) {
      const existingHQ = await this.getHeadquarters(site.organization_id!)
      if (existingHQ && existingHQ.id !== site.id) {
        throw new Error('Il existe déjà un siège principal. Désignez d\'abord le nouveau siège comme non-siège.')
      }
    }

    const { data, error } = await this.supabase
      .from('sites')
      .insert(site as SiteInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour un site
   */
  async update(id: string, updates: FlexibleUpdate<'sites'>): Promise<Site> {
    // Si on définit un nouveau siège, retirer le statut de l'ancien
    if (updates.is_headquarters) {
      const site = await this.getById(id)
      if (site.organization_id) {
        const existingHQ = await this.getHeadquarters(site.organization_id)
        if (existingHQ && existingHQ.id !== id) {
          await this.supabase
            .from('sites')
            .update({ is_headquarters: false })
            .eq('id', existingHQ.id)
        }
      }
    }

    const { data, error } = await this.supabase
      .from('sites')
      .update(updates as SiteUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime un site (soft delete)
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('sites')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Récupère les sites actifs accessibles au public
   */
  async getPublicSites(organizationId: string): Promise<Site[]> {
    const { data, error } = await this.supabase
      .from('sites')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('is_headquarters', { ascending: false })
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Calcule la distance entre deux points GPS (formule de Haversine)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1)
    const dLon = this.toRad(lon2 - lon1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Trouve les sites les plus proches d'un point GPS
   */
  async findNearestSites(
    organizationId: string,
    latitude: number,
    longitude: number,
    limit: number = 5
  ): Promise<SiteWithDistance[]> {
    const sites = await this.getPublicSites(organizationId)
    
    return sites
      .filter((site) => site.latitude && site.longitude)
      .map((site) => ({
        ...site,
        distance: this.calculateDistance(
          latitude,
          longitude,
          Number(site.latitude),
          Number(site.longitude)
        ),
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0))
      .slice(0, limit)
  }
}

export const siteService = new SiteService()



