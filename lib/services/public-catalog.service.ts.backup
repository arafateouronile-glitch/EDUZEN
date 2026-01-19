/**
 * Service du catalogue public des formations et inscriptions en ligne
 */

import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate, FlexibleInsert, FlexibleUpdate } from '@/lib/types/supabase-helpers'

type PublicFormation = TableRow<'public_formations'>
type PublicFormationInsert = TableInsert<'public_formations'>
type PublicFormationUpdate = TableUpdate<'public_formations'>
type PublicEnrollment = TableRow<'public_enrollments'>
type PublicEnrollmentInsert = TableInsert<'public_enrollments'>

export class PublicCatalogService {
  private supabase = createClient()

  /**
   * Récupère les formations publiques (pour le site vitrine)
   */
  async getPublicFormations(filters?: {
    organizationId?: string
    featured?: boolean
    search?: string
    siteId?: string
    limit?: number
  }): Promise<PublicFormation[]> {
    let query = this.supabase
      .from('public_formations')
      .select('*')
      .eq('is_public', true)
      .not('published_at', 'is', null)

    if (filters?.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }

    if (filters?.featured) {
      query = query.eq('is_featured', true)
    }

    if (filters?.siteId) {
      query = query.contains('available_at_sites', [filters.siteId])
    }

    if (filters?.search) {
      query = query.or(`public_title.ilike.%${filters.search}%,public_description.ilike.%${filters.search}%,seo_keywords.cs.{${filters.search}}`)
    }

    query = query.order('is_featured', { ascending: false })
      .order('published_at', { ascending: false })

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Récupère une formation publique par son slug (pour le SEO)
   */
  async getBySlug(slug: string): Promise<PublicFormation | null> {
    const { data, error } = await this.supabase
      .from('public_formations')
      .select('*')
      .eq('slug', slug)
      .eq('is_public', true)
      .not('published_at', 'is', null)
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Récupère une formation publique par son ID (admin)
   */
  async getById(id: string, organizationId?: string): Promise<PublicFormation> {
    let query = this.supabase
      .from('public_formations')
      .select('*')
      .eq('id', id)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.single()

    if (error) throw error
    return data
  }

  /**
   * Récupère toutes les formations publiques d'une organisation (admin)
   */
  async getAll(organizationId: string, filters?: {
    isPublic?: boolean
    search?: string
  }): Promise<PublicFormation[]> {
    let query = this.supabase
      .from('public_formations')
      .select('*')
      .eq('organization_id', organizationId)

    if (filters?.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic)
    }

    if (filters?.search) {
      query = query.or(`public_title.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Crée une formation publique
   */
  async create(formation: FlexibleInsert<'public_formations'>): Promise<PublicFormation> {
    // Générer un slug si non fourni
    if (!formation.slug && formation.public_title) {
      formation.slug = this.generateSlug(formation.public_title, formation.organization_id!)
    }

    const { data, error } = await this.supabase
      .from('public_formations')
      .insert(formation as PublicFormationInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour une formation publique
   */
  async update(id: string, updates: FlexibleUpdate<'public_formations'>): Promise<PublicFormation> {
    // Si le titre change, régénérer le slug si nécessaire
    if (updates.public_title && !updates.slug) {
      const existing = await this.getById(id)
      if (existing.organization_id) {
        updates.slug = this.generateSlug(updates.public_title, existing.organization_id)
      }
    }

    // Si on publie, définir published_at
    if (updates.is_public && !updates.published_at) {
      const existing = await this.getById(id)
      if (!existing.published_at) {
        updates.published_at = new Date().toISOString()
      }
    }

    const { data, error } = await this.supabase
      .from('public_formations')
      .update(updates as PublicFormationUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime une formation publique
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('public_formations')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Génère un slug unique depuis un titre
   */
  private generateSlug(title: string, organizationId: string): string {
    const baseSlug = title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9]+/g, '-') // Remplacer non-alphanumériques par des tirets
      .replace(/^-+|-+$/g, '') // Supprimer les tirets en début/fin
      .slice(0, 100) // Limiter la longueur

    // Ajouter un suffixe pour garantir l'unicité si nécessaire
    return `${baseSlug}-${organizationId.slice(0, 8)}`
  }

  /**
   * Crée une inscription en ligne
   */
  async createEnrollment(enrollment: FlexibleInsert<'public_enrollments'>): Promise<PublicEnrollment> {
    // Vérifier que la formation accepte les inscriptions en ligne
    const formation = await this.getById(enrollment.public_formation_id!, enrollment.organization_id)
    
    if (!formation.allow_online_registration) {
      throw new Error('Cette formation n\'accepte pas les inscriptions en ligne')
    }

    // Vérifier la date limite
    if (formation.registration_deadline) {
      const deadline = new Date(formation.registration_deadline)
      if (new Date() > deadline) {
        throw new Error('La date limite d\'inscription est dépassée')
      }
    }

    const { data, error } = await this.supabase
      .from('public_enrollments')
      .insert(enrollment as PublicEnrollmentInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère les inscriptions en ligne d'une organisation
   */
  async getEnrollments(organizationId: string, filters?: {
    status?: string
    formationId?: string
    search?: string
  }): Promise<PublicEnrollment[]> {
    let query = this.supabase
      .from('public_enrollments')
      .select('*, public_formations(*), sites(*)')
      .eq('organization_id', organizationId)

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.formationId) {
      query = query.eq('public_formation_id', filters.formationId)
    }

    if (filters?.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Met à jour le statut d'une inscription
   */
  async updateEnrollmentStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'rejected' | 'cancelled',
    processedBy?: string,
    notes?: string
  ): Promise<PublicEnrollment> {
    const updates: any = {
      status,
      processed_at: new Date().toISOString(),
    }

    if (processedBy) {
      updates.processed_by = processedBy
    }

    if (notes) {
      updates.admin_notes = notes
    }

    const { data, error } = await this.supabase
      .from('public_enrollments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export const publicCatalogService = new PublicCatalogService()



