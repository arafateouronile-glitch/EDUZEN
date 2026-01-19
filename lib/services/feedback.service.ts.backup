/**
 * Service pour gérer le système de feedback utilisateur
 */

import { createClient } from '@/lib/supabase/client'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'

type UserFeedback = TableRow<'user_feedback'>
type UserFeedbackInsert = TableInsert<'user_feedback'>
type UserFeedbackUpdate = TableUpdate<'user_feedback'>

export type FeedbackType = 'bug' | 'feature_request' | 'improvement' | 'question' | 'other'
export type FeedbackStatus = 'pending' | 'reviewing' | 'in_progress' | 'resolved' | 'closed' | 'rejected'
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface CreateFeedbackParams {
  organizationId: string
  userId?: string
  studentId?: string
  feedbackType: FeedbackType
  category?: string
  title: string
  description: string
  pageUrl?: string
  userAgent?: string
  screenshotUrl?: string
  priority?: FeedbackPriority
}

export class FeedbackService {
  private supabase = createClient()

  /**
   * Crée un nouveau feedback
   */
  async create(params: CreateFeedbackParams): Promise<UserFeedback> {
    const { data, error } = await this.supabase
      .from('user_feedback')
      .insert({
        organization_id: params.organizationId,
        user_id: params.userId,
        student_id: params.studentId,
        feedback_type: params.feedbackType,
        category: params.category,
        title: params.title,
        description: params.description,
        page_url: params.pageUrl,
        user_agent: params.userAgent,
        screenshot_url: params.screenshotUrl,
        priority: params.priority || 'medium',
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère tous les feedbacks d'une organisation
   */
  async getByOrganization(
    organizationId: string,
    filters?: {
      userId?: string
      status?: FeedbackStatus
      feedbackType?: FeedbackType
      priority?: FeedbackPriority
      assignedTo?: string
      page?: number
      limit?: number
    }
  ) {
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit

    let query = this.supabase
      .from('user_feedback')
      .select('*, users(id, full_name, email), students(id, first_name, last_name, email), assigned_user:users!assigned_to(id, full_name, email)', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (filters?.userId) {
      query = query.eq('user_id', filters.userId)
    }

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.feedbackType) {
      query = query.eq('feedback_type', filters.feedbackType)
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) throw error

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    }
  }

  /**
   * Récupère un feedback par son ID
   */
  async getById(id: string): Promise<UserFeedback> {
    const { data, error } = await this.supabase
      .from('user_feedback')
      .select('*, users(id, full_name, email), students(id, first_name, last_name, email), assigned_user:users!assigned_to(id, full_name, email)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Met à jour un feedback
   */
  async update(id: string, updates: UserFeedbackUpdate): Promise<UserFeedback> {
    const { data, error } = await this.supabase
      .from('user_feedback')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Assigne un feedback à un utilisateur
   */
  async assign(feedbackId: string, userId: string): Promise<UserFeedback> {
    return this.update(feedbackId, {
      assigned_to: userId,
      status: 'reviewing',
    })
  }

  /**
   * Change le statut d'un feedback
   */
  async updateStatus(feedbackId: string, status: FeedbackStatus, resolutionNotes?: string): Promise<UserFeedback> {
    const updates: UserFeedbackUpdate = {
      status,
      resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      resolution_notes: resolutionNotes,
    }

    return this.update(feedbackId, updates)
  }

  /**
   * Récupère les statistiques de feedback
   */
  async getStats(organizationId: string) {
    const { data, error } = await this.supabase
      .from('user_feedback')
      .select('status, feedback_type, priority')
      .eq('organization_id', organizationId)

    if (error) throw error

    const stats = {
      total: data?.length || 0,
      byStatus: {} as Record<FeedbackStatus, number>,
      byType: {} as Record<FeedbackType, number>,
      byPriority: {} as Record<FeedbackPriority, number>,
      pending: 0,
      resolved: 0,
    }

    data?.forEach((feedback) => {
      stats.byStatus[feedback.status as FeedbackStatus] =
        (stats.byStatus[feedback.status as FeedbackStatus] || 0) + 1
      stats.byType[feedback.feedback_type as FeedbackType] =
        (stats.byType[feedback.feedback_type as FeedbackType] || 0) + 1
      stats.byPriority[feedback.priority as FeedbackPriority] =
        (stats.byPriority[feedback.priority as FeedbackPriority] || 0) + 1

      if (feedback.status === 'pending') stats.pending++
      if (feedback.status === 'resolved') stats.resolved++
    })

    return stats
  }

  /**
   * Supprime un feedback (admin uniquement)
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_feedback')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

export const feedbackService = new FeedbackService()



