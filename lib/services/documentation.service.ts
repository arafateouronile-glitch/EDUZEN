import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'
import { logger } from '@/lib/utils/logger'

/** Client Supabase pour les tables documentation (non encore dans Database). Un seul cast centralisé. */
type SupabaseClientWithDocumentation = SupabaseClient<Database> & { from(table: string): any }

/** Types locaux pour les tables documentation qui ne sont pas encore dans le schéma Supabase */
interface DocumentationCategory {
  id: string
  [key: string]: unknown
}
interface DocumentationArticle {
  id: string
  [key: string]: unknown
}
interface DocumentationSection {
  id: string
  [key: string]: unknown
}
interface DocumentationFavorite {
  id: string
  [key: string]: unknown
}
interface DocumentationNote {
  id: string
  [key: string]: unknown
}
interface DocumentationFeedback {
  id: string
  rating?: number
  [key: string]: unknown
}

/** Insert/update génériques pour les tables documentation */
type DocumentationCategoryInsert = Record<string, unknown>
type DocumentationCategoryUpdate = Record<string, unknown>
type DocumentationArticleInsert = Record<string, unknown>
type DocumentationArticleUpdate = Record<string, unknown>
type DocumentationSectionInsert = Record<string, unknown>
type DocumentationSectionUpdate = Record<string, unknown>
type DocumentationFeedbackInsert = Record<string, unknown>

export class DocumentationService {
  private supabase: SupabaseClient<Database>

  private get client(): SupabaseClientWithDocumentation {
    return this.supabase as SupabaseClientWithDocumentation
  }

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient
  }

  // ========== CATEGORIES ==========

  /**
   * Récupère toutes les catégories de documentation
   */
  async getCategories(organizationId?: string, includePublic = true): Promise<DocumentationCategory[] | null> {
    try {
      let query = this.client
        .from('documentation_categories')
        .select('*')
        .order('order_index', { ascending: true })

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      } else if (includePublic) {
        query = query.eq('is_public', true)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    } catch (error) {
      logger.error('DocumentationService.getCategories', error, { organizationId, includePublic })
      throw error
    }
  }

  /**
   * Récupère une catégorie par son slug
   */
  async getCategoryBySlug(slug: string, organizationId?: string) {
    try {
      let query = this.client
        .from('documentation_categories')
        .select('*')
        .eq('slug', slug)
        .single()

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      } else {
        query = query.eq('is_public', true)
      }

      const { data, error } = await query

      if (error) throw error
      return data
    } catch (error) {
      logger.error('DocumentationService.getCategoryBySlug', error, { slug, organizationId })
      throw error
    }
  }

  /**
   * Crée une catégorie
   */
  async createCategory(category: DocumentationCategoryInsert) {
    try {
      const { data, error } = await this.client
        .from('documentation_categories')
        .insert(category)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('DocumentationService.createCategory', error, { categoryKeys: Object.keys(category) })
      throw error
    }
  }

  /**
   * Met à jour une catégorie
   */
  async updateCategory(id: string, updates: DocumentationCategoryUpdate) {
    try {
      const { data, error } = await this.client
        .from('documentation_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      logger.error('DocumentationService.updateCategory', error, { id })
      throw error
    }
  }

  /**
   * Supprime une catégorie
   */
  async deleteCategory(id: string) {
    try {
      const { error } = await this.client
        .from('documentation_categories')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      logger.error('DocumentationService.deleteCategory', error, { id })
      throw error
    }
  }

  // ========== ARTICLES ==========

  /**
   * Récupère tous les articles d'une catégorie
   */
  async getArticlesByCategory(categoryId: string, status: 'draft' | 'published' | 'archived' = 'published') {
    try {
      const { data, error } = await this.client
        .from('documentation_articles')
        .select('*, author:users(id, full_name, email)')
        .eq('category_id', categoryId)
        .eq('status', status)
        .order('order_index', { ascending: true })
        .order('published_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      logger.error('DocumentationService.getArticlesByCategory', error, { categoryId, status })
      throw error
    }
  }

  /**
   * Récupère un article par son slug
   */
  async getArticleBySlug(slug: string, categorySlug: string) {
    const { data, error } = await this.client
      .from('documentation_articles')
      .select(`
        *,
        category:documentation_categories(*),
        sections:documentation_sections(*),
        author:users(id, full_name, email)
      `)
      .eq('slug', slug)
      .eq('category.slug', categorySlug)
      .eq('status', 'published')
      .single()

    if (error) throw error

    // Incrémenter le compteur de vues
    if (data) {
      await (this.client as unknown as { rpc: (name: string, args: Record<string, unknown>) => Promise<unknown> }).rpc('increment_article_view_count', { article_uuid: data.id })
    }

    return data
  }

  /**
   * Recherche d'articles
   */
  async searchArticles(query: string, organizationId?: string) {
    try {
      let searchQuery = this.client
        .from('documentation_articles')
        .select('*, category:documentation_categories(*), author:users(id, full_name)')
        .eq('status', 'published')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)

      if (organizationId) {
        searchQuery = searchQuery.eq('organization_id', organizationId)
      }

      const { data, error } = await searchQuery
        .order('view_count', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    } catch (error) {
      logger.error('DocumentationService.searchArticles', error, { query: query.substring(0, 50), organizationId })
      throw error
    }
  }

  /**
   * Récupère les articles les plus populaires
   */
  async getPopularArticles(limit = 10, organizationId?: string) {
    let query = this.client
      .from('documentation_articles')
      .select('*, category:documentation_categories(*), author:users(id, full_name)')
      .eq('status', 'published')
      .order('view_count', { ascending: false })
      .limit(limit)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    } else {
      // Sans organization_id, aucun filtre appliqué (contexte non-authentifié)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  /**
   * Récupère les articles récents
   */
  async getRecentArticles(limit = 10, organizationId?: string) {
    let query = this.client
      .from('documentation_articles')
      .select('*, category:documentation_categories(*), author:users(id, full_name)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(limit)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    } else {
      // Sans organization_id, aucun filtre appliqué (contexte non-authentifié)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  /**
   * Récupère les articles en vedette
   */
  async getFeaturedArticles(limit = 5, organizationId?: string) {
    let query = this.client
      .from('documentation_articles')
      .select('*, category:documentation_categories(*), author:users(id, full_name)')
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(limit)

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    } else {
      // Sans organization_id, aucun filtre appliqué (contexte non-authentifié)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  }

  /**
   * Crée un article
   */
  async createArticle(article: DocumentationArticleInsert) {
    const { data, error } = await this.client
      .from('documentation_articles')
      .insert(article)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour un article
   */
  async updateArticle(id: string, updates: DocumentationArticleUpdate) {
    const { data, error } = await this.client
      .from('documentation_articles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime un article
   */
  async deleteArticle(id: string) {
    const { error } = await this.client
      .from('documentation_articles')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== SECTIONS ==========

  /**
   * Récupère les sections d'un article
   */
  async getArticleSections(articleId: string) {
    const { data, error } = await this.client
      .from('documentation_sections')
      .select('*')
      .eq('article_id', articleId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data
  }

  /**
   * Crée une section
   */
  async createSection(section: DocumentationSectionInsert) {
    const { data, error } = await this.client
      .from('documentation_sections')
      .insert(section)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour une section
   */
  async updateSection(id: string, updates: DocumentationSectionUpdate) {
    const { data, error } = await this.client
      .from('documentation_sections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime une section
   */
  async deleteSection(id: string) {
    const { error } = await this.client
      .from('documentation_sections')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== FAVORITES ==========

  /**
   * Récupère les favoris d'un utilisateur
   */
  async getUserFavorites(userId: string) {
    const { data, error } = await this.client
      .from('documentation_favorites')
      .select('*, article:documentation_articles(*, category:documentation_categories(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Ajoute un article aux favoris
   */
  async addFavorite(userId: string, articleId: string) {
    const { data, error } = await this.client
      .from('documentation_favorites')
      .insert({ user_id: userId, article_id: articleId })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Retire un article des favoris
   */
  async removeFavorite(userId: string, articleId: string) {
    const { error } = await this.client
      .from('documentation_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('article_id', articleId)

    if (error) throw error
  }

  /**
   * Vérifie si un article est en favoris
   */
  async isFavorite(userId: string, articleId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('documentation_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .maybeSingle()

    if (error) throw error
    return !!data
  }

  // ========== NOTES ==========

  /**
   * Récupère les notes d'un utilisateur pour un article
   */
  async getUserNotes(userId: string, articleId: string) {
    const { data, error } = await this.client
      .from('documentation_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (error) throw error
    return data
  }

  /**
   * Crée ou met à jour une note
   */
  async upsertNote(userId: string, articleId: string, content: string) {
    // Vérifier si une note existe déjà
    const existing = await this.getUserNotes(userId, articleId)

    if (existing) {
      // Mettre à jour
      const { data, error } = await this.client
        .from('documentation_notes')
        .update({ content })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Créer
      const { data, error } = await this.client
        .from('documentation_notes')
        .insert({ user_id: userId, article_id: articleId, content })
        .select()
        .single()

      if (error) throw error
      return data
    }
  }

  /**
   * Supprime une note
   */
  async deleteNote(userId: string, articleId: string) {
    const { error } = await this.client
      .from('documentation_notes')
      .delete()
      .eq('user_id', userId)
      .eq('article_id', articleId)

    if (error) throw error
  }

  // ========== FEEDBACK ==========

  /**
   * Crée un feedback
   */
  async createFeedback(feedback: DocumentationFeedbackInsert) {
    const { data, error } = await this.client
      .from('documentation_feedback')
      .insert(feedback)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère les feedbacks d'un article
   */
  async getArticleFeedback(articleId: string) {
    const { data, error } = await this.client
      .from('documentation_feedback')
      .select('*, user:users(id, full_name)')
      .eq('article_id', articleId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Récupère les statistiques de feedback d'un article
   */
  async getArticleFeedbackStats(articleId: string) {
    const { data, error } = await this.client
      .from('documentation_feedback')
      .select('rating, is_helpful')
      .eq('article_id', articleId)

    if (error) throw error

    const stats = {
      total: data.length,
      averageRating: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      ratings: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    }

    if (data.length > 0) {
      const ratings = data.filter((f: DocumentationFeedback) => f.rating).map((f: DocumentationFeedback) => f.rating!)
      if (ratings.length > 0) {
        stats.averageRating = ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
      }

      data.forEach((f: DocumentationFeedback) => {
        if (f.rating) stats.ratings[f.rating as keyof typeof stats.ratings]++
        if (f.is_helpful === true) stats.helpfulCount++
        if (f.is_helpful === false) stats.notHelpfulCount++
      })
    }

    return stats
  }

  // ========== SEARCH HISTORY ==========

  /**
   * Enregistre une recherche
   */
  async recordSearch(userId: string, query: string, resultsCount: number) {
    const { error } = await this.client
      .from('documentation_search_history')
      .insert({ user_id: userId, query, results_count: resultsCount })

    if (error) throw error
  }

  /**
   * Récupère l'historique de recherche d'un utilisateur
   */
  async getSearchHistory(userId: string, limit = 10) {
    const { data, error } = await this.client
      .from('documentation_search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  /**
   * Supprime l'historique de recherche d'un utilisateur
   */
  async clearSearchHistory(userId: string) {
    const { error } = await this.client
      .from('documentation_search_history')
      .delete()
      .eq('user_id', userId)

    if (error) throw error
  }
}

// Note: documentationService doit être instancié avec un client Supabase
// Pour les routes API: new DocumentationService(await createClient()) avec le client serveur
// Pour les composants client: new DocumentationService(createClient()) avec le client client

