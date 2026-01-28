import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'
import { logger } from '@/lib/utils/logger'

type EducationalResource = TableRow<'educational_resources'>
type ResourceCategory = TableRow<'resource_categories'>
type ResourceCollection = TableRow<'resource_collections'>
type ResourceComment = TableRow<'resource_comments'>
type ResourceRating = TableRow<'resource_ratings'>

export class EducationalResourcesService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  // ========== CATEGORIES ==========

  async getCategories(organizationId: string) {
    const { data, error } = await this.supabase
      .from('resource_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data
  }

  async createCategory(category: TableInsert<'resource_categories'>) {
    const { data, error } = await this.supabase
      .from('resource_categories')
      .insert(category)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateCategory(id: string, updates: TableUpdate<'resource_categories'>) {
    const { data, error } = await this.supabase
      .from('resource_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteCategory(id: string) {
    const { error } = await this.supabase
      .from('resource_categories')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== RESOURCES ==========

  async getResources(organizationId: string, filters?: {
    categoryId?: string
    resourceType?: string
    search?: string
    featured?: boolean
    tags?: string[]
  }) {
    try {
      let query = this.supabase
        .from('educational_resources')
        .select(`
          *,
          category:resource_categories(*),
          author:users!author_id(id, full_name, email)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'published')

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }

    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
      )
    }

    if (filters?.featured) {
      query = query.eq('is_featured', true)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

      const { data, error } = await query
        .order('created_at', { ascending: false })

      if (error) {
        // Si la table n'existe pas encore ou erreur 400, retourner un tableau vide
        if (
          error.code === 'PGRST116' ||
          error.code === 'PGRST200' ||
          error.code === '42P01' ||
          error.code === 'PGRST301' ||
          (error as any).status === 400 ||
          error.code === '400' ||
          error.message?.includes('relation') ||
          error.message?.includes('relationship') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('schema cache')
        ) {
          // Table ou relation n'existe pas encore - ignorer silencieusement
          return []
        }
        throw error
      }
      return data || []
    } catch (error: unknown) {
      // Gérer les erreurs de table inexistante ou erreur 400
      const errorObj = error as { code?: string; status?: number; message?: string }
      if (
        errorObj?.code === 'PGRST116' ||
        errorObj?.code === 'PGRST200' ||
        errorObj?.code === '42P01' ||
        errorObj?.code === 'PGRST301' ||
        errorObj?.status === 400 ||
        errorObj?.code === '400' ||
        errorObj?.message?.includes('relation') ||
        errorObj?.message?.includes('relationship') ||
        errorObj?.message?.includes('does not exist') ||
        errorObj?.message?.includes('schema cache')
      ) {
        logger.warn('EducationalResourcesService - Table educational_resources does not exist yet or invalid query', { errorMessage: errorObj?.message || String(error) })
        return []
      }
      throw error
    }
  }

  async getResourceBySlug(slug: string, organizationId: string) {
    try {
      const { data, error } = await this.supabase
        .from('educational_resources')
        .select(`
          *,
          category:resource_categories(*),
          author:users!author_id(id, full_name, email),
          versions:resource_versions(*)
      `)
        .eq('slug', slug)
        .eq('organization_id', organizationId)
        .eq('status', 'published')
        .single()

      if (error) throw error

      // Enregistrer une vue
      await this.recordView(data.id)

      return data
    } catch (error: unknown) {
      // Gérer les erreurs de table inexistante
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === 'PGRST116' || errorObj?.code === '42P01') {
        logger.warn('EducationalResourcesService - Table educational_resources does not exist yet', { errorMessage: errorObj?.message || String(error) })
        throw error
      }
      throw error
    }
  }

  async createResource(resource: TableInsert<'educational_resources'>) {
    const { data, error } = await this.supabase
      .from('educational_resources')
      .insert(resource)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateResource(id: string, updates: TableUpdate<'educational_resources'>) {
    const { data, error } = await this.supabase
      .from('educational_resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteResource(id: string) {
    const { error } = await this.supabase
      .from('educational_resources')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== FAVORITES ==========

  async addToFavorites(userId: string, resourceId: string) {
    const { data, error } = await this.supabase
      .from('resource_favorites')
      .insert({ user_id: userId, resource_id: resourceId })
      .select()
      .single()

    if (error) throw error

    // Incrémenter le compteur (fonction RPC personnalisée - peut ne pas exister)
    try {
      await (this.supabase as any).rpc('increment', {
        table_name: 'educational_resources',
        column_name: 'favorite_count',
        row_id: resourceId,
      })
    } catch (rpcError) {
      // Si la fonction RPC n'existe pas, on ignore l'erreur
      logger.warn('EducationalResourcesService - RPC increment not available, skipping favorite_count increment')
    }

    return data
  }

  async removeFromFavorites(userId: string, resourceId: string) {
    const { error } = await this.supabase
      .from('resource_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('resource_id', resourceId)

    if (error) throw error

    // Décrémenter le compteur (nécessite une fonction SQL ou mise à jour manuelle)
    const { data: resource } = await this.supabase
      .from('educational_resources')
      .select('favorite_count')
      .eq('id', resourceId)
      .single()

    if (resource && (resource.favorite_count ?? 0) > 0) {
      await this.supabase
        .from('educational_resources')
        .update({ favorite_count: (resource.favorite_count ?? 0) - 1 })
        .eq('id', resourceId)
    }
  }

  async isFavorite(userId: string, resourceId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('resource_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('resource_id', resourceId)
      .maybeSingle()

    if (error) throw error
    return !!data
  }

  async getUserFavorites(userId: string) {
    const { data, error } = await this.supabase
      .from('resource_favorites')
      .select('*, resource:educational_resources(*, category:resource_categories(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== DOWNLOADS ==========

  async recordDownload(resourceId: string, userId: string, ipAddress?: string, userAgent?: string) {
    const { data, error } = await this.supabase
      .from('resource_downloads')
      .insert({
        resource_id: resourceId,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getResourceDownloads(resourceId: string) {
    const { data, error } = await this.supabase
      .from('resource_downloads')
      .select('*, user:users(id, full_name, email)')
      .eq('resource_id', resourceId)
      .order('downloaded_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== VIEWS ==========

  async recordView(resourceId: string, userId?: string, duration?: number, ipAddress?: string, userAgent?: string) {
    const { data, error } = await this.supabase
      .from('resource_views')
      .insert({
        resource_id: resourceId,
        user_id: userId,
        view_duration_seconds: duration,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== COLLECTIONS ==========

  async getCollections(organizationId: string, filters?: {
    userId?: string
    isPublic?: boolean
    isFeatured?: boolean
  }) {
    let query = this.supabase
      .from('resource_collections')
      .select('*, user:users(id, full_name, email)')
      .eq('organization_id', organizationId)

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters?.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic)
    }

    if (filters?.isFeatured) {
      query = query.eq('is_featured', true)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getCollectionById(id: string) {
    const { data, error } = await this.supabase
      .from('resource_collections')
      .select(`
        *,
        user:users(id, full_name, email),
        resources:collection_resources(*, resource:educational_resources(*, category:resource_categories(*)))
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async createCollection(collection: TableInsert<'resource_collections'>) {
    const { data, error } = await this.supabase
      .from('resource_collections')
      .insert(collection)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async addResourceToCollection(collectionId: string, resourceId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('collection_resources')
      .insert({
        collection_id: collectionId,
        resource_id: resourceId,
        added_by: userId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeResourceFromCollection(collectionId: string, resourceId: string) {
    const { error } = await this.supabase
      .from('collection_resources')
      .delete()
      .eq('collection_id', collectionId)
      .eq('resource_id', resourceId)

    if (error) throw error
  }

  // ========== COMMENTS ==========

  async getResourceComments(resourceId: string) {
    const { data, error } = await this.supabase
      .from('resource_comments')
      .select('*, user:users(id, full_name, email), replies:resource_comments(*)')
      .eq('resource_id', resourceId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createComment(comment: TableInsert<'resource_comments'>) {
    const { data, error } = await this.supabase
      .from('resource_comments')
      .insert(comment)
      .select(`
        *,
        user:users(id, full_name, email)
      `)
      .single()

    if (error) throw error
    return data
  }

  async updateComment(id: string, content: string) {
    const { data, error } = await this.supabase
      .from('resource_comments')
      .update({ content, is_edited: true })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteComment(id: string) {
    const { error } = await this.supabase
      .from('resource_comments')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== RATINGS ==========

  async createRating(rating: TableInsert<'resource_ratings'>) {
    const { data, error } = await this.supabase
      .from('resource_ratings')
      .insert(rating)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateRating(id: string, rating: number, comment?: string) {
    const { data, error } = await this.supabase
      .from('resource_ratings')
      .update({ rating, comment })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getResourceRatings(resourceId: string) {
    const { data, error } = await this.supabase
      .from('resource_ratings')
      .select('*, user:users(id, full_name, email)')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getResourceRatingStats(resourceId: string) {
    const { data, error } = await this.supabase
      .from('resource_ratings')
      .select('rating')
      .eq('resource_id', resourceId)

    if (error) throw error

    const stats = {
      total: data.length,
      average: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }

    if (data.length > 0) {
      const ratings = data.map((r) => r.rating).filter(Boolean) as number[]
      stats.average = ratings.reduce((a, b) => a + b, 0) / ratings.length

      ratings.forEach((rating) => {
        stats.distribution[rating as keyof typeof stats.distribution]++
      })
    }

    return stats
  }

  // ========== VERSIONS ==========

  async getResourceVersions(resourceId: string) {
    const { data, error } = await this.supabase
      .from('resource_versions')
      .select('*, created_by_user:users(id, full_name)')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createVersion(version: TableInsert<'resource_versions'>) {
    const { data, error } = await this.supabase
      .from('resource_versions')
      .insert(version)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export const educationalResourcesService = new EducationalResourcesService()
