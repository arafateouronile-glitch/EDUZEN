import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { logger, sanitizeError } from '@/lib/utils/logger'

export interface KnowledgeBaseArticle {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  related_pages: string[] // Routes de pages liées
  created_at: string
  updated_at: string
}

export interface KnowledgeBaseCategory {
  id: string
  name: string
  description: string
  icon?: string
}

/**
 * Service de base de connaissances contextuelle
 */
export class KnowledgeBaseService {
  private supabase: SupabaseClient<any>

  constructor(supabaseClient?: SupabaseClient<any>) {
    this.supabase = supabaseClient || createClient()
  }

  /**
   * Récupère les articles liés à une page spécifique
   */
  async getArticlesForPage(pagePath: string): Promise<KnowledgeBaseArticle[]> {
    try {
      // Rechercher les articles qui mentionnent cette page dans related_pages
      const { data, error } = await this.supabase
        .from('knowledge_base_articles')
        .select('*')
        .contains('related_pages', [pagePath])
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (error) {
        // Si la table n'existe pas encore, retourner des articles par défaut
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return this.getDefaultArticlesForPage(pagePath)
        }
        throw error
      }

      return (data || []) as KnowledgeBaseArticle[]
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur récupération articles', error, {
        pagePath,
        error: sanitizeError(error),
      })
      return this.getDefaultArticlesForPage(pagePath)
    }
  }

  /**
   * Recherche d'articles par mots-clés
   */
  async searchArticles(query: string): Promise<KnowledgeBaseArticle[]> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_base_articles')
        .select('*')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        if (error.code === '42P01') {
          return []
        }
        throw error
      }

      return (data || []) as KnowledgeBaseArticle[]
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur recherche articles', error, {
        query,
        error: sanitizeError(error),
      })
      return []
    }
  }

  /**
   * Récupère toutes les catégories
   */
  async getCategories(): Promise<KnowledgeBaseCategory[]> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_base_categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        if (error.code === '42P01') {
          return this.getDefaultCategories()
        }
        throw error
      }

      return (data || []) as KnowledgeBaseCategory[]
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur récupération catégories', error, {
        error: sanitizeError(error),
      })
      return this.getDefaultCategories()
    }
  }

  /**
   * Articles par défaut si la table n'existe pas encore
   */
  private getDefaultArticlesForPage(pagePath: string): KnowledgeBaseArticle[] {
    const defaultArticles: Record<string, KnowledgeBaseArticle[]> = {
      '/dashboard/documents/generate': [
        {
          id: 'bpf-1',
          title: 'Comment déclarer mes heures stagiaires dans le BPF ?',
          content: 'Le Bilan Pédagogique et Financier (BPF) doit inclure toutes les heures de formation suivies par vos stagiaires...',
          category: 'Documents',
          tags: ['BPF', 'heures', 'déclaration'],
          related_pages: ['/dashboard/documents/generate'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'bpf-2',
          title: 'Quelles sont les informations obligatoires dans un BPF ?',
          content: 'Un BPF conforme doit contenir : les informations de l\'organisme, les données des stagiaires, les heures de formation...',
          category: 'Documents',
          tags: ['BPF', 'conformité', 'obligatoire'],
          related_pages: ['/dashboard/documents/generate'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      '/dashboard/qualiopi': [
        {
          id: 'qualiopi-1',
          title: 'Comment améliorer mon score Qualiopi ?',
          content: 'Pour améliorer votre score Qualiopi, assurez-vous de compléter tous les indicateurs requis...',
          category: 'Qualiopi',
          tags: ['Qualiopi', 'conformité', 'amélioration'],
          related_pages: ['/dashboard/qualiopi'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      '/dashboard/students/new': [
        {
          id: 'students-1',
          title: 'Comment importer mes stagiaires en masse ?',
          content: 'Utilisez l\'assistant d\'importation pour charger un fichier CSV ou Excel avec vos stagiaires...',
          category: 'Stagiaires',
          tags: ['import', 'stagiaires', 'CSV'],
          related_pages: ['/dashboard/students/new'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    }

    return defaultArticles[pagePath] || []
  }

  /**
   * Catégories par défaut
   */
  private getDefaultCategories(): KnowledgeBaseCategory[] {
    return [
      { id: '1', name: 'Documents', description: 'Génération et gestion de documents' },
      { id: '2', name: 'Qualiopi', description: 'Conformité et certification Qualiopi' },
      { id: '3', name: 'Stagiaires', description: 'Gestion des apprenants' },
      { id: '4', name: 'Facturation', description: 'Factures et paiements' },
      { id: '5', name: 'Sessions', description: 'Gestion des sessions de formation' },
    ]
  }

  /**
   * Récupère un item FAQ par son ID
   */
  async getFAQItemById(faqId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_base_faq')
        .select(`
          *,
          knowledge_base_categories!category_id (
            id,
            name
          )
        `)
        .eq('id', faqId)
        .single()

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur récupération FAQ item', error, {
        faqId,
        error: sanitizeError(error),
      })
      return null
    }
  }

  /**
   * Récupère les items FAQ
   */
  async getFAQItems(organizationId: string, filters?: { featured?: boolean; categoryId?: string; search?: string }): Promise<any[]> {
    try {
      let query = this.supabase
        .from('knowledge_base_faq')
        .select(`
          *,
          knowledge_base_categories!category_id (
            id,
            name
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_published', true)

      if (filters?.featured) {
        query = query.eq('is_featured', true)
      }

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          return []
        }
        throw error
      }

      return data || []
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur récupération FAQ items', error, {
        organizationId,
        error: sanitizeError(error),
      })
      return []
    }
  }

  /**
   * Récupère les guides
   */
  async getGuides(organizationId: string, filters?: { featured?: boolean; search?: string }): Promise<any[]> {
    try {
      let query = this.supabase
        .from('knowledge_base_guides')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_published', true)

      if (filters?.featured) {
        query = query.eq('is_featured', true)
      }

      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') {
          return []
        }
        throw error
      }

      return data || []
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur récupération guides', error, {
        organizationId,
        error: sanitizeError(error),
      })
      return []
    }
  }

  /**
   * Récupère un guide par son slug
   */
  async getGuideBySlug(slug: string, organizationId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_base_guides')
        .select('*')
        .eq('slug', slug)
        .eq('organization_id', organizationId)
        .eq('is_published', true)
        .single()

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur récupération guide par slug', error, {
        slug,
        organizationId,
        error: sanitizeError(error),
      })
      return null
    }
  }

  /**
   * Récupère la progression d'un utilisateur pour un guide
   */
  async getGuideProgress(userId: string, guideId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase
        .from('guide_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('guide_id', guideId)
        .single()

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur récupération progression guide', error, {
        userId,
        guideId,
        error: sanitizeError(error),
      })
      return null
    }
  }

  /**
   * Vérifie si un guide est en favoris pour un utilisateur
   */
  async isGuideFavorite(userId: string, guideId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('guide_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('guide_id', guideId)
        .single()

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST116') {
          return false
        }
        throw error
      }

      return !!data
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur vérification favoris guide', error, {
        userId,
        guideId,
        error: sanitizeError(error),
      })
      return false
    }
  }

  /**
   * Marque une étape comme complétée pour un guide
   */
  async markStepAsCompleted(userId: string, guideId: string, stepNumber: number): Promise<any> {
    try {
      // Récupérer ou créer la progression
      const { data: existingProgress } = await this.supabase
        .from('guide_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('guide_id', guideId)
        .single()

      let completedSteps: number[] = []
      let currentStep = stepNumber

      if (existingProgress) {
        completedSteps = existingProgress.completed_steps || []
        if (!completedSteps.includes(stepNumber)) {
          completedSteps.push(stepNumber)
        }
        currentStep = Math.max(currentStep, existingProgress.current_step || 1)
      } else {
        completedSteps = [stepNumber]
      }

      // Vérifier si toutes les étapes sont complétées (nécessite de récupérer le nombre total d'étapes)
      const { data: guideSteps } = await this.supabase
        .from('guide_steps')
        .select('step_number')
        .eq('guide_id', guideId)
        .order('step_number', { ascending: true })

      const totalSteps = guideSteps?.length || 0
      const isCompleted = totalSteps > 0 && completedSteps.length >= totalSteps

      // Insérer ou mettre à jour la progression
      const progressData = {
        user_id: userId,
        guide_id: guideId,
        current_step: currentStep,
        completed_steps: completedSteps,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      }

      if (existingProgress) {
        const { data, error } = await this.supabase
          .from('guide_progress')
          .update(progressData)
          .eq('id', existingProgress.id)
          .select()
          .single()

        if (error) {
          if (error.code === '42P01') {
            return null
          }
          throw error
        }

        return data
      } else {
        const { data, error } = await this.supabase
          .from('guide_progress')
          .insert(progressData)
          .select()
          .single()

        if (error) {
          if (error.code === '42P01') {
            return null
          }
          throw error
        }

        return data
      }
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur marquage étape complétée', error, {
        userId,
        guideId,
        stepNumber,
        error: sanitizeError(error),
      })
      throw error
    }
  }

  /**
   * Ajoute un guide aux favoris d'un utilisateur
   */
  async addGuideToFavorites(userId: string, guideId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('guide_favorites')
        .insert({
          user_id: userId,
          guide_id: guideId,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '42P01') {
          return null
        }
        // Si l'erreur est due à une contrainte unique (déjà en favoris), on retourne null
        if (error.code === '23505') {
          return null
        }
        throw error
      }

      return data
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur ajout guide aux favoris', error, {
        userId,
        guideId,
        error: sanitizeError(error),
      })
      throw error
    }
  }

  /**
   * Retire un guide des favoris d'un utilisateur
   */
  async removeGuideFromFavorites(userId: string, guideId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('guide_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('guide_id', guideId)

      if (error) {
        if (error.code === '42P01') {
          return
        }
        throw error
      }
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur retrait guide des favoris', error, {
        userId,
        guideId,
        error: sanitizeError(error),
      })
      throw error
    }
  }

  /**
   * Crée un feedback pour une FAQ
   */
  async createFAQFeedback(faqId: string, userId: string, isHelpful: boolean, comment?: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('knowledge_base_faq_feedback')
        .insert({
          faq_id: faqId,
          user_id: userId,
          is_helpful: isHelpful,
          comment: comment || null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '42P01') {
          // Table n'existe pas encore, retourner un objet factice
          return { id: 'temp', faq_id: faqId, is_helpful: isHelpful }
        }
        throw error
      }

      // Mettre à jour les compteurs de la FAQ
      if (isHelpful) {
        // Récupérer le compteur actuel et l'incrémenter
        const { data: currentFAQ } = await this.supabase
          .from('knowledge_base_faq')
          .select('helpful_count')
          .eq('id', faqId)
          .single()

        if (currentFAQ) {
          await this.supabase
            .from('knowledge_base_faq')
            .update({ helpful_count: (currentFAQ.helpful_count || 0) + 1 })
            .eq('id', faqId)
        }
      }

      return data
    } catch (error) {
      logger.error('KnowledgeBaseService - Erreur création feedback FAQ', error, {
        faqId,
        userId,
        error: sanitizeError(error),
      })
      throw error
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService()
