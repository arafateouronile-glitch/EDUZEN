import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

// Types locaux pour les tables resource qui ne sont pas encore dans le schéma Supabase
type Resource = any
type ResourceCategory = any
type ResourceCollection = any

export class ResourceLibraryService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  // ========== CATEGORIES ==========

  async getCategories(organizationId: string) {
    const { data, error } = await (this.supabase as any)
      .from('resource_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data
  }

  async createCategory(category: TableInsert<'resource_categories'>) {
    const { data, error } = await (this.supabase as any)
      .from('resource_categories')
      .insert(category)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateCategory(id: string, updates: TableUpdate<'resource_categories'>) {
    const { data, error } = await (this.supabase as any)
      .from('resource_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteCategory(id: string) {
    const { error } = await (this.supabase as any)
      .from('resource_categories')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== RESOURCES ==========

  async getResources(organizationId: string, filters?: {
    categoryId?: string
    resourceType?: string
    authorId?: string
    search?: string
    tags?: string[]
    isPublic?: boolean
  }) {
    let query = (this.supabase as any)
      .from('resources')
      .select('*, author:users(id, full_name, email), category:resource_categories(*)')
      .eq('organization_id', organizationId)

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }

    if (filters?.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }

    if (filters?.authorId) {
      query = query.eq('author_id', filters.authorId)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    if (filters?.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getResourceBySlug(slug: string, organizationId: string) {
    const { data, error } = await (this.supabase as any)
      .from('resources')
      .select('*, author:users(id, full_name, email), category:resource_categories(*)')
      .eq('slug', slug)
      .eq('organization_id', organizationId)
      .single()

    if (error) throw error

    // Enregistrer la vue
    if (data) {
      await this.recordView(data.id)
    }

    return data
  }

  async createResource(resource: any) {
    const { data, error } = await (this.supabase as any)
      .from('resources')
      .insert(resource)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateResource(id: string, updates: any) {
    const { data, error } = await (this.supabase as any)
      .from('resources')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteResource(id: string) {
    const { error } = await (this.supabase as any)
      .from('resources')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== FAVORITES ==========

  async addToFavorites(userId: string, resourceId: string) {
    const { data, error } = await (this.supabase as any)
      .from('resource_favorites')
      .insert({ user_id: userId, resource_id: resourceId })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeFromFavorites(userId: string, resourceId: string) {
    const { error } = await (this.supabase as any)
      .from('resource_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('resource_id', resourceId)

    if (error) throw error
  }

  async isFavorite(userId: string, resourceId: string): Promise<boolean> {
    const { data, error } = await (this.supabase as any)
      .from('resource_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('resource_id', resourceId)
      .maybeSingle()

    if (error) throw error
    return !!data
  }

  async getUserFavorites(userId: string) {
    const { data, error } = await (this.supabase as any)
      .from('resource_favorites')
      .select('*, resource:resources(*, category:resource_categories(*), author:users(id, full_name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== DOWNLOADS ==========

  async recordDownload(resourceId: string, userId: string, ipAddress?: string, userAgent?: string) {
    const { data, error } = await (this.supabase as any)
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

  async getUserDownloads(userId: string) {
    const { data, error } = await (this.supabase as any)
      .from('resource_downloads')
      .select('*, resource:resources(*)')
      .eq('user_id', userId)
      .order('downloaded_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data
  }

  // ========== VIEWS ==========

  async recordView(resourceId: string, userId?: string, ipAddress?: string, userAgent?: string) {
    const { data, error } = await (this.supabase as any)
      .from('resource_views')
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

  // ========== COMMENTS ==========

  async getResourceComments(resourceId: string) {
    const { data, error } = await (this.supabase as any)
      .from('resource_comments')
      .select('*, user:users(id, full_name, email), replies:resource_comments!parent_id(*)')
      .eq('resource_id', resourceId)
      .is('parent_id', null) // Seulement les commentaires principaux
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createComment(comment: TableInsert<'resource_comments'>) {
    const { data, error } = await (this.supabase as any)
      .from('resource_comments')
      .insert(comment)
      .select('*, user:users(id, full_name, email)')
      .single()

    if (error) throw error
    return data
  }

  async updateComment(id: string, updates: TableUpdate<'resource_comments'>) {
    const { data, error } = await (this.supabase as any)
      .from('resource_comments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteComment(id: string) {
    const { error } = await (this.supabase as any)
      .from('resource_comments')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== RATINGS ==========

  async createRating(rating: TableInsert<'resource_ratings'>) {
    const { data, error } = await (this.supabase as any)
      .from('resource_ratings')
      .insert(rating)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateRating(id: string, updates: TableUpdate<'resource_ratings'>) {
    const { data, error } = await (this.supabase as any)
      .from('resource_ratings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getResourceRatings(resourceId: string) {
    const { data, error } = await (this.supabase as any)
      .from('resource_ratings')
      .select('*, user:users(id, full_name, email)')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getResourceRatingStats(resourceId: string) {
    const { data, error } = await (this.supabase as any)
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
      const ratings = data.map((r: any) => r.rating).filter(Boolean) as number[]
      stats.average = ratings.reduce((a, b) => a + b, 0) / ratings.length

      ratings.forEach((rating) => {
        stats.distribution[rating as keyof typeof stats.distribution]++
      })
    }

    return stats
  }

  // ========== COLLECTIONS ==========

  async getCollections(organizationId: string, userId?: string) {
    let query = (this.supabase as any)
      .from('resource_collections')
      .select('*, user:users(id, full_name, email)')
      .eq('organization_id', organizationId)

    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      query = query.eq('is_public', true)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getCollectionById(id: string) {
    const { data, error } = await (this.supabase as any)
      .from('resource_collections')
      .select('*, user:users(id, full_name, email), items:resource_collection_items(*, resource:resources(*))')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async createCollection(collection: TableInsert<'resource_collections'>) {
    const { data, error } = await (this.supabase as any)
      .from('resource_collections')
      .insert(collection)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateCollection(id: string, updates: TableUpdate<'resource_collections'>) {
    const { data, error } = await (this.supabase as any)
      .from('resource_collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteCollection(id: string) {
    const { error } = await (this.supabase as any)
      .from('resource_collections')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async addResourceToCollection(collectionId: string, resourceId: string, orderIndex?: number) {
    const { data, error } = await (this.supabase as any)
      .from('resource_collection_items')
      .insert({
        collection_id: collectionId,
        resource_id: resourceId,
        order_index: orderIndex || 0,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeResourceFromCollection(collectionId: string, resourceId: string) {
    const { error } = await (this.supabase as any)
      .from('resource_collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('resource_id', resourceId)

    if (error) throw error
  }

  // ========== STATISTICS ==========

  async getPopularResources(organizationId: string, limit = 10) {
    const { data, error } = await (this.supabase as any)
      .from('resources')
      .select('*, author:users(id, full_name, email), category:resource_categories(*)')
      .eq('organization_id', organizationId)
      .order('download_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  async getRecentResources(organizationId: string, limit = 10) {
    const { data, error } = await (this.supabase as any)
      .from('resources')
      .select('*, author:users(id, full_name, email), category:resource_categories(*)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  async getResourcesByType(organizationId: string, resourceType: string) {
    const { data, error } = await (this.supabase as any)
      .from('resources')
      .select('*, author:users(id, full_name, email), category:resource_categories(*)')
      .eq('organization_id', organizationId)
      .eq('resource_type', resourceType)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}

// Note: resourceLibraryService doit être instancié avec un client Supabase
// Pour les routes API: new ResourceLibraryService(await createClient()) avec le client serveur
// Pour les composants client: new ResourceLibraryService(createClient()) avec le client client

