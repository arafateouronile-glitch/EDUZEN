import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

// Types locaux pour les tables marketplace qui ne sont pas encore dans le schéma Supabase
type MarketplaceTemplate = any
type MarketplaceCategory = any
type MarketplaceRating = any

export class TemplateMarketplaceService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  // ========== CATEGORIES ==========

  async getCategories() {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_categories')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data
  }

  // ========== TEMPLATES ==========

  async getTemplates(filters?: {
    categoryId?: string
    search?: string
    featured?: boolean
    verified?: boolean
    isFree?: boolean
    minRating?: number
    tags?: string[]
    authorId?: string
    sortBy?: 'popular' | 'recent' | 'rating' | 'downloads'
  }) {
    let query = (this.supabase as any)
      .from('marketplace_templates')
      .select(`
        *,
        category:marketplace_categories(*),
        author:users(id, full_name, email),
        template:document_templates(id, name, type)
      `)
      .eq('status', 'approved')

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }

    if (filters?.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,short_description.ilike.%${filters.search}%`
      )
    }

    if (filters?.featured) {
      query = query.eq('is_featured', true)
    }

    if (filters?.verified) {
      query = query.eq('is_verified', true)
    }

    if (filters?.isFree !== undefined) {
      query = query.eq('is_free', filters.isFree)
    }

    if (filters?.minRating) {
      query = query.gte('rating_average', filters.minRating)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    if (filters?.authorId) {
      query = query.eq('author_id', filters.authorId)
    }

    // Tri
    switch (filters?.sortBy) {
      case 'popular':
        query = query.order('download_count', { ascending: false })
        break
      case 'rating':
        query = query.order('rating_average', { ascending: false })
        break
      case 'downloads':
        query = query.order('download_count', { ascending: false })
        break
      case 'recent':
      default:
        query = query.order('published_at', { ascending: false })
        break
    }

    const { data, error } = await query.limit(50)

    if (error) throw error
    return data
  }

  async getTemplateBySlug(slug: string) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_templates')
      .select(`
        *,
        category:marketplace_categories(*),
        author:users(id, full_name, email),
        template:document_templates(*)
      `)
      .eq('slug', slug)
      .eq('status', 'approved')
      .single()

    if (error) throw error

    // Incrémenter le compteur de vues
    const { data: template } = await (this.supabase as any)
      .from('marketplace_templates')
      .select('view_count')
      .eq('id', data.id)
      .single()

    if (template) {
      await (this.supabase as any)
        .from('marketplace_templates')
        .update({ view_count: (template.view_count || 0) + 1 })
        .eq('id', data.id)
    }

    return data
  }

  async publishTemplate(template: any) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_templates')
      .insert({
        ...template,
        status: 'pending', // Nécessite approbation
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTemplate(id: string, updates: any) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteTemplate(id: string) {
    const { error } = await (this.supabase as any)
      .from('marketplace_templates')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== DOWNLOADS ==========

  async downloadTemplate(marketplaceTemplateId: string, userId: string, organizationId: string) {
    // Récupérer le template
    const { data: marketplaceTemplate } = await (this.supabase as any)
      .from('marketplace_templates')
      .select('template_id, is_free, price')
      .eq('id', marketplaceTemplateId)
      .single()

    if (!marketplaceTemplate) throw new Error('Template non trouvé')

    // Vérifier si c'est gratuit ou si l'utilisateur a payé
    if (!marketplaceTemplate.is_free) {
      // Vérifier si une transaction existe
      const { data: transaction } = await (this.supabase as any)
        .from('marketplace_transactions')
        .select('id, payment_status')
        .eq('marketplace_template_id', marketplaceTemplateId)
        .eq('buyer_id', userId)
        .eq('payment_status', 'completed')
        .maybeSingle()

      if (!transaction) {
        throw new Error('Template payant - Paiement requis')
      }
    }

    // Créer une copie du template pour l'utilisateur
    const { data: originalTemplate } = await (this.supabase as any)
      .from('document_templates')
      .select('*')
      .eq('id', marketplaceTemplate.template_id)
      .single()

    if (!originalTemplate) throw new Error('Template original non trouvé')

    // Créer une nouvelle instance du template
    const { data: newTemplate, error: createError } = await (this.supabase as any)
      .from('document_templates')
      .insert({
        organization_id: organizationId,
        name: `${originalTemplate.name} (Copie)`,
        type: originalTemplate.type,
        header_content: originalTemplate.header_content,
        body_content: originalTemplate.body_content,
        footer_content: originalTemplate.footer_content,
        variables: originalTemplate.variables,
        is_default: false,
      })
      .select()
      .single()

    if (createError) throw createError

    // Enregistrer le téléchargement
    const { data: download, error: downloadError } = await (this.supabase as any)
      .from('marketplace_downloads')
      .insert({
        marketplace_template_id: marketplaceTemplateId,
        user_id: userId,
        organization_id: organizationId,
        downloaded_template_id: newTemplate.id,
      })
      .select()
      .single()

    if (downloadError) throw downloadError

    return { template: newTemplate, download }
  }

  // ========== FAVORITES ==========

  async addToFavorites(marketplaceTemplateId: string, userId: string) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_favorites')
      .insert({
        marketplace_template_id: marketplaceTemplateId,
        user_id: userId,
      })
      .select()
      .single()

    if (error) throw error

    // Incrémenter le compteur
    const { data: template } = await (this.supabase as any)
      .from('marketplace_templates')
      .select('favorite_count')
      .eq('id', marketplaceTemplateId)
      .single()

    if (template) {
      await (this.supabase as any)
        .from('marketplace_templates')
        .update({ favorite_count: (template.favorite_count || 0) + 1 })
        .eq('id', marketplaceTemplateId)
    }

    return data
  }

  async removeFromFavorites(marketplaceTemplateId: string, userId: string) {
    const { error } = await (this.supabase as any)
      .from('marketplace_favorites')
      .delete()
      .eq('marketplace_template_id', marketplaceTemplateId)
      .eq('user_id', userId)

    if (error) throw error

    // Décrémenter le compteur
    const { data: template } = await (this.supabase as any)
      .from('marketplace_templates')
      .select('favorite_count')
      .eq('id', marketplaceTemplateId)
      .single()

    if (template && template.favorite_count > 0) {
      await (this.supabase as any)
        .from('marketplace_templates')
        .update({ favorite_count: template.favorite_count - 1 })
        .eq('id', marketplaceTemplateId)
    }
  }

  async isFavorite(marketplaceTemplateId: string, userId: string): Promise<boolean> {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_favorites')
      .select('id')
      .eq('marketplace_template_id', marketplaceTemplateId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return !!data
  }

  async getUserFavorites(userId: string) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_favorites')
      .select('*, marketplace_template:marketplace_templates(*, category:marketplace_categories(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== RATINGS ==========

  async createRating(rating: any) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_ratings')
      .insert(rating)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateRating(id: string, rating: number, reviewText?: string) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_ratings')
      .update({ rating, review_text: reviewText })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getTemplateRatings(marketplaceTemplateId: string) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_ratings')
      .select('*, user:users(id, full_name, email)')
      .eq('marketplace_template_id', marketplaceTemplateId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async getUserRating(marketplaceTemplateId: string, userId: string) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_ratings')
      .select('*')
      .eq('marketplace_template_id', marketplaceTemplateId)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  // ========== COLLECTIONS ==========

  async getCollections(filters?: { userId?: string; isPublic?: boolean; isFeatured?: boolean }) {
    let query = (this.supabase as any)
      .from('marketplace_collections')
      .select('*, user:users(id, full_name, email)')
      .eq('is_public', filters?.isPublic !== undefined ? filters.isPublic : true)

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters?.isFeatured) {
      query = query.eq('is_featured', true)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async createCollection(collection: any) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_collections')
      .insert(collection)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async addTemplateToCollection(collectionId: string, marketplaceTemplateId: string) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_collection_templates')
      .insert({
        collection_id: collectionId,
        marketplace_template_id: marketplaceTemplateId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== REPORTS ==========

  async reportTemplate(
    marketplaceTemplateId: string,
    userId: string,
    reason: string,
    description?: string
  ) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_reports')
      .insert({
        marketplace_template_id: marketplaceTemplateId,
        reported_by: userId,
        reason,
        description,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== TRANSACTIONS ==========

  async createTransaction(transaction: any) {
    const { data, error } = await (this.supabase as any)
      .from('marketplace_transactions')
      .insert(transaction)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTransactionStatus(
    transactionId: string,
    status: string,
    paymentTransactionId?: string
  ) {
    const updates: Record<string, string | undefined> = { payment_status: status }
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString()
    }
    if (paymentTransactionId) {
      updates.payment_transaction_id = paymentTransactionId
    }

    const { data, error } = await (this.supabase as any)
      .from('marketplace_transactions')
      .update(updates)
      .eq('id', transactionId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export const templateMarketplaceService = new TemplateMarketplaceService()


