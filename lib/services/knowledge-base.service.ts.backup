import { createClient } from '@/lib/supabase/client'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type FAQCategory = TableRow<'faq_categories'>
type FAQItem = TableRow<'faq_items'>
type Guide = TableRow<'guides'>
type GuideStep = TableRow<'guide_steps'>

export class KnowledgeBaseService {
  private supabase = createClient()

  // ========== FAQ CATEGORIES ==========

  async getFAQCategories(organizationId: string) {
    const { data, error } = await this.supabase
      .from('faq_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data
  }

  async createFAQCategory(category: TableInsert<'faq_categories'>) {
    const { data, error } = await this.supabase
      .from('faq_categories')
      .insert(category)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateFAQCategory(id: string, updates: TableUpdate<'faq_categories'>) {
    const { data, error } = await this.supabase
      .from('faq_categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteFAQCategory(id: string) {
    const { error } = await this.supabase
      .from('faq_categories')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== FAQ ITEMS ==========

  async getFAQItems(organizationId: string, filters?: {
    categoryId?: string
    search?: string
    featured?: boolean
  }) {
    let query = this.supabase
      .from('faq_items')
      .select('*, category:faq_categories(*)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }

    if (filters?.search) {
      query = query.or(`question.ilike.%${filters.search}%,answer.ilike.%${filters.search}%`)
    }

    if (filters?.featured) {
      query = query.eq('is_featured', true)
    }

    const { data, error } = await query
      .order('order_index', { ascending: true })
      .order('view_count', { ascending: false })

    if (error) throw error
    return data
  }

  async getFAQItemById(id: string) {
    const { data, error } = await this.supabase
      .from('faq_items')
      .select('*, category:faq_categories(*)')
      .eq('id', id)
      .single()

    if (error) throw error

    // Incrémenter le compteur de vues
    if (data) {
      await this.supabase.rpc('increment_faq_view_count', { faq_uuid: data.id })
    }

    return data
  }

  async createFAQItem(item: TableInsert<'faq_items'>) {
    const { data, error } = await this.supabase
      .from('faq_items')
      .insert(item)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateFAQItem(id: string, updates: TableUpdate<'faq_items'>) {
    const { data, error } = await this.supabase
      .from('faq_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteFAQItem(id: string) {
    const { error } = await this.supabase
      .from('faq_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async createFAQFeedback(faqId: string, userId: string, isHelpful: boolean, comment?: string) {
    const { data, error } = await this.supabase
      .from('faq_feedback')
      .insert({
        faq_id: faqId,
        user_id: userId,
        is_helpful: isHelpful,
        comment,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== GUIDES ==========

  async getGuides(organizationId: string, filters?: {
    category?: string
    difficulty?: string
    search?: string
    featured?: boolean
  }) {
    let query = this.supabase
      .from('guides')
      .select('*, author:users(id, full_name, email)')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.difficulty) {
      query = query.eq('difficulty', filters.difficulty)
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,content.ilike.%${filters.search}%`)
    }

    if (filters?.featured) {
      query = query.eq('is_featured', true)
    }

    const { data, error } = await query
      .order('published_at', { ascending: false })
      .order('view_count', { ascending: false })

    if (error) throw error
    return data
  }

  async getGuideBySlug(slug: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('guides')
      .select('*, author:users(id, full_name, email), steps:guide_steps(*)')
      .eq('slug', slug)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (error) throw error

    // Incrémenter le compteur de vues
    if (data) {
      await this.supabase.rpc('increment_guide_view_count', { guide_uuid: data.id })
    }

    return data
  }

  async createGuide(guide: TableInsert<'guides'>) {
    const { data, error } = await this.supabase
      .from('guides')
      .insert(guide)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateGuide(id: string, updates: TableUpdate<'guides'>) {
    const { data, error } = await this.supabase
      .from('guides')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteGuide(id: string) {
    const { error } = await this.supabase
      .from('guides')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== GUIDE STEPS ==========

  async getGuideSteps(guideId: string) {
    const { data, error } = await this.supabase
      .from('guide_steps')
      .select('*')
      .eq('guide_id', guideId)
      .order('step_number', { ascending: true })

    if (error) throw error
    return data
  }

  async createGuideStep(step: TableInsert<'guide_steps'>) {
    const { data, error } = await this.supabase
      .from('guide_steps')
      .insert(step)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateGuideStep(id: string, updates: TableUpdate<'guide_steps'>) {
    const { data, error } = await this.supabase
      .from('guide_steps')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteGuideStep(id: string) {
    const { error } = await this.supabase
      .from('guide_steps')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // ========== GUIDE FAVORITES ==========

  async addGuideToFavorites(userId: string, guideId: string) {
    const { data, error } = await this.supabase
      .from('guide_favorites')
      .insert({ user_id: userId, guide_id: guideId })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async removeGuideFromFavorites(userId: string, guideId: string) {
    const { error } = await this.supabase
      .from('guide_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('guide_id', guideId)

    if (error) throw error
  }

  async isGuideFavorite(userId: string, guideId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('guide_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('guide_id', guideId)
      .maybeSingle()

    if (error) throw error
    return !!data
  }

  async getUserFavoriteGuides(userId: string) {
    const { data, error } = await this.supabase
      .from('guide_favorites')
      .select('*, guide:guides(*, author:users(id, full_name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // ========== GUIDE PROGRESS ==========

  async getGuideProgress(userId: string, guideId: string) {
    const { data, error } = await this.supabase
      .from('guide_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('guide_id', guideId)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async updateGuideProgress(
    userId: string,
    guideId: string,
    currentStep: number,
    completedSteps: number[]
  ) {
    // Vérifier si une progression existe déjà
    const existing = await this.getGuideProgress(userId, guideId)

    const totalSteps = await this.getGuideSteps(guideId)
    const isCompleted = completedSteps.length === totalSteps.length

    if (existing) {
      const { data, error } = await this.supabase
        .from('guide_progress')
        .update({
          current_step: currentStep,
          completed_steps: completedSteps,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      const { data, error } = await this.supabase
        .from('guide_progress')
        .insert({
          user_id: userId,
          guide_id: guideId,
          current_step: currentStep,
          completed_steps: completedSteps,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    }
  }

  async markStepAsCompleted(userId: string, guideId: string, stepNumber: number) {
    const progress = await this.getGuideProgress(userId, guideId)
    const completedSteps = progress?.completed_steps || []

    if (!completedSteps.includes(stepNumber)) {
      completedSteps.push(stepNumber)
    }

    return this.updateGuideProgress(userId, guideId, stepNumber, completedSteps)
  }
}

export const knowledgeBaseService = new KnowledgeBaseService()
