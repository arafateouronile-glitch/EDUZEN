/**

 * Service pour gérer la collaboration sur les templates de documents
 * Inclut : partage, commentaires, validation, historique, notifications
 */

import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type TemplateShare = Database['public']['Tables']['template_shares']['Row']
type TemplateShareInsert = Database['public']['Tables']['template_shares']['Insert']
type TemplateComment = Database['public']['Tables']['template_comments']['Row']
type TemplateCommentInsert = Database['public']['Tables']['template_comments']['Insert']
type TemplateApproval = Database['public']['Tables']['template_approvals']['Row']
type TemplateApprovalInsert = Database['public']['Tables']['template_approvals']['Insert']
type TemplateActivityLog = Database['public']['Tables']['template_activity_log']['Row']
type TemplateActivityLogInsert = Database['public']['Tables']['template_activity_log']['Insert']
type TemplateNotification = Database['public']['Tables']['template_notifications']['Row']
type TemplateNotificationInsert = Database['public']['Tables']['template_notifications']['Insert']

export type SharePermission = 'view' | 'edit' | 'comment'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type ActivityActionType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'shared'
  | 'unshared'
  | 'commented'
  | 'approved'
  | 'rejected'
  | 'restored'
  | 'duplicated'
export type NotificationType =
  | 'template_shared'
  | 'template_updated'
  | 'comment_added'
  | 'comment_replied'
  | 'approval_requested'
  | 'approval_status_changed'

export class TemplateCollaborationService {
  private supabase = createClient()

  // ========== PARTAGE ==========

  /**
   * Partage un template avec un utilisateur
   */
  async shareTemplate(
    templateId: string,
    userId: string,
    permission: SharePermission,
    sharedByUserId: string
  ): Promise<TemplateShare> {
    const { data, error } = await this.supabase
      .from('template_shares')
      .insert({
        template_id: templateId,
        shared_with_user_id: userId,
        shared_by_user_id: sharedByUserId,
        permission,
      } as TemplateShareInsert)
      .select()
      .single()

    if (error) throw error

    // Créer une notification
    await this.createNotification(userId, templateId, 'template_shared', {
      message: `Un template vous a été partagé avec les permissions ${permission}`,
    })

    // Logger l'activité
    await this.logActivity(templateId, sharedByUserId, 'shared', {
      shared_with: userId,
      permission,
    })

    return data
  }

  /**
   * Récupère les partages d'un template
   */
  async getTemplateShares(templateId: string): Promise<TemplateShare[]> {
    const { data, error } = await this.supabase
      .from('template_shares')
      .select('*, shared_with_user:users!template_shares_shared_with_user_id_fkey(id, email, full_name)')
      .eq('template_id', templateId)

    if (error) throw error
    return data || []
  }

  /**
   * Met à jour les permissions d'un partage
   */
  async updateShare(
    shareId: string,
    permission: SharePermission
  ): Promise<TemplateShare> {
    const { data, error } = await this.supabase
      .from('template_shares')
      .update({ permission })
      .eq('id', shareId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime un partage
   */
  async unshareTemplate(shareId: string, templateId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('template_shares')
      .delete()
      .eq('id', shareId)

    if (error) throw error

    // Logger l'activité
    await this.logActivity(templateId, userId, 'unshared', { share_id: shareId })
  }

  /**
   * Récupère les templates partagés avec un utilisateur
   */
  async getSharedTemplates(userId: string): Promise<Array<{
    id: string
    template_id: string
    shared_with_user_id: string
    shared_by_user_id: string
    permission_type: string
    created_at: string
    template?: unknown
    shared_by?: { id: string; email: string; full_name: string }
  }>> {
    const { data, error } = await this.supabase
      .from('template_shares')
      .select(
        '*, template:document_templates!template_shares_template_id_fkey(*), shared_by:users!template_shares_shared_by_user_id_fkey(id, email, full_name)'
      )
      .eq('shared_with_user_id', userId)

    if (error) throw error
    return data || []
  }

  // ========== COMMENTAIRES ==========

  /**
   * Ajoute un commentaire sur un template
   */
  async addComment(
    templateId: string,
    userId: string,
    content: string,
    parentCommentId?: string,
    position?: { x: number; y: number; page?: number }
  ): Promise<TemplateComment> {
    const { data, error } = await this.supabase
      .from('template_comments')
      .insert({
        template_id: templateId,
        user_id: userId,
        content,
        parent_comment_id: parentCommentId,
        position: position || null,
      } as TemplateCommentInsert)
      .select()
      .single()

    if (error) throw error

    // Créer des notifications pour les autres collaborateurs
    const shares = await this.getTemplateShares(templateId)
    const owner = await this.getTemplateOwner(templateId)
    const notifyUserIds = new Set<string>()
    shares.forEach((share) => notifyUserIds.add(share.shared_with_user_id))
    if (owner) notifyUserIds.add(owner)
    notifyUserIds.delete(userId) // Ne pas notifier l'auteur

    for (const notifyUserId of notifyUserIds) {
      await this.createNotification(notifyUserId, templateId, 'comment_added', {
        message: `Un nouveau commentaire a été ajouté sur un template`,
      })
    }

    // Si c'est une réponse, notifier le parent
    if (parentCommentId) {
      const parentComment = await this.getCommentById(parentCommentId)
      if (parentComment && parentComment.user_id !== userId) {
        await this.createNotification(parentComment.user_id, templateId, 'comment_replied', {
          message: `Quelqu'un a répondu à votre commentaire`,
        })
      }
    }

    // Logger l'activité
    await this.logActivity(templateId, userId, 'commented', {
      comment_id: data.id,
      parent_comment_id: parentCommentId,
    })

    return data
  }

  /**
   * Récupère les commentaires d'un template
   */
  async getTemplateComments(templateId: string): Promise<TemplateComment[]> {
    const { data, error } = await this.supabase
      .from('template_comments')
      .select('*, user:users!template_comments_user_id_fkey(id, email, full_name)')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Récupère un commentaire par ID
   */
  async getCommentById(commentId: string): Promise<TemplateComment | null> {
    const { data, error } = await this.supabase
      .from('template_comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  /**
   * Met à jour un commentaire
   */
  async updateComment(commentId: string, content: string): Promise<TemplateComment> {
    const { data, error } = await this.supabase
      .from('template_comments')
      .update({ content })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Marque un commentaire comme résolu
   */
  async resolveComment(commentId: string): Promise<TemplateComment> {
    const { data, error } = await this.supabase
      .from('template_comments')
      .update({ resolved: true })
      .eq('id', commentId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Supprime un commentaire
   */
  async deleteComment(commentId: string): Promise<void> {
    const { error } = await this.supabase
      .from('template_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error
  }

  // ========== VALIDATION/APPROBATION ==========

  /**
   * Demande une approbation pour un template
   */
  async requestApproval(
    templateId: string,
    approverId: string
  ): Promise<TemplateApproval> {
    const { data, error } = await this.supabase
      .from('template_approvals')
      .insert({
        template_id: templateId,
        approver_id: approverId,
        status: 'pending',
      } as TemplateApprovalInsert)
      .select()
      .single()

    if (error) throw error

    // Créer une notification
    await this.createNotification(approverId, templateId, 'approval_requested', {
      message: `Une approbation est requise pour un template`,
    })

    // Logger l'activité
    await this.logActivity(templateId, approverId, 'approved', {
      status: 'pending',
    })

    return data
  }

  /**
   * Approuve ou rejette un template
   */
  async updateApproval(
    approvalId: string,
    status: 'approved' | 'rejected',
    comment?: string
  ): Promise<TemplateApproval> {
    const { data, error } = await this.supabase
      .from('template_approvals')
      .update({
        status,
        comment,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', approvalId)
      .select()
      .single()

    if (error) throw error

    // Notifier le propriétaire du template
    const approval = data
    const owner = await this.getTemplateOwner(approval.template_id)
    if (owner) {
      await this.createNotification(owner, approval.template_id, 'approval_status_changed', {
        message: `Le statut d'approbation d'un template a changé : ${status}`,
      })
    }

    // Logger l'activité
    await this.logActivity(approval.template_id, approval.approver_id, status, {
      approval_id: approvalId,
      comment,
    })

    return data
  }

  /**
   * Récupère les approbations d'un template
   */
  async getTemplateApprovals(templateId: string): Promise<TemplateApproval[]> {
    const { data, error } = await this.supabase
      .from('template_approvals')
      .select('*, approver:users!template_approvals_approver_id_fkey(id, email, full_name)')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  // ========== HISTORIQUE ==========

  /**
   * Log une activité sur un template
   */
  async logActivity(
    templateId: string,
    userId: string,
    actionType: ActivityActionType,
    actionDetails?: Record<string, any>,
    changes?: Record<string, any>
  ): Promise<TemplateActivityLog | null> {
    try {
      const { data, error } = await this.supabase
        .from('template_activity_log')
        .insert({
          template_id: templateId,
          user_id: userId,
          action_type: actionType,
          action_details: actionDetails || {},
          changes: changes || null,
        } as TemplateActivityLogInsert)
        .select()
        .single()

      if (error) {
        // Si la table n'existe pas, on ignore silencieusement
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('Table template_activity_log n\'existe pas encore. Migration requise.')
          return null
        }
        throw error
      }
      return data
    } catch (error: unknown) {
      // Gérer les erreurs de table manquante
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === 'PGRST205' || errorObj?.code === '42P01' || errorObj?.message?.includes('does not exist')) {
        console.warn('Table template_activity_log n\'existe pas encore. Migration requise.')
        return null
      }
      throw error
    }
  }

  /**
   * Récupère l'historique d'un template
   */
  async getTemplateHistory(templateId: string): Promise<TemplateActivityLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('template_activity_log')
        .select('*, user:users!template_activity_log_user_id_fkey(id, email, full_name)')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        // Si la table n'existe pas, on retourne un tableau vide
        if (error.code === 'PGRST205' || error.code === '42P01') {
          console.warn('Table template_activity_log n\'existe pas encore. Migration requise.')
          return []
        }
        throw error
      }
      return data || []
    } catch (error: unknown) {
      // Gérer les erreurs de table manquante
      const errorObj = error as { code?: string; message?: string }
      if (errorObj?.code === 'PGRST205' || errorObj?.code === '42P01' || errorObj?.message?.includes('does not exist')) {
        console.warn('Table template_activity_log n\'existe pas encore. Migration requise.')
        return []
      }
      throw error
    }
  }

  // ========== NOTIFICATIONS ==========

  /**
   * Crée une notification
   */
  async createNotification(
    userId: string,
    templateId: string,
    notificationType: NotificationType,
    options?: { message?: string }
  ): Promise<TemplateNotification> {
    const message =
      options?.message ||
      this.getDefaultNotificationMessage(notificationType, templateId)

    const { data, error } = await this.supabase
      .from('template_notifications')
      .insert({
        user_id: userId,
        template_id: templateId,
        notification_type: notificationType,
        message,
      } as TemplateNotificationInsert)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Récupère les notifications d'un utilisateur
   */
  async getUserNotifications(userId: string, unreadOnly = false): Promise<TemplateNotification[]> {
    let query = this.supabase
      .from('template_notifications')
      .select('*, template:document_templates!template_notifications_template_id_fkey(id, name, type)')
      .eq('user_id', userId)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50)

    if (error) throw error
    return data || []
  }

  /**
   * Marque une notification comme lue
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('template_notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) throw error
  }

  /**
   * Marque toutes les notifications comme lues
   */
  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('template_notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
  }

  /**
   * Supprime une notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('template_notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error
  }

  /**
   * Récupère le nombre de notifications non lues
   */
  async getUnreadNotificationCount(userId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('template_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) throw error
    return count || 0
  }

  // ========== HELPERS ==========

  /**
   * Récupère le propriétaire d'un template (via organization_id)
   */
  private async getTemplateOwner(templateId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('document_templates')
      .select('organization_id')
      .eq('id', templateId)
      .single()

    if (error) return null

    // Récupérer le premier utilisateur de l'organisation (propriétaire)
    const { data: users } = await this.supabase
      .from('users')
      .select('id')
      .eq('organization_id', data.organization_id)
      .limit(1)

    return users?.[0]?.id || null
  }

  /**
   * Génère un message de notification par défaut
   */
  private getDefaultNotificationMessage(
    type: NotificationType,
    templateId: string
  ): string {
    const messages: Record<NotificationType, string> = {
      template_shared: 'Un template vous a été partagé',
      template_updated: 'Un template a été mis à jour',
      comment_added: 'Un nouveau commentaire a été ajouté',
      comment_replied: 'Quelqu\'un a répondu à votre commentaire',
      approval_requested: 'Une approbation est requise',
      approval_status_changed: 'Le statut d\'approbation a changé',
    }
    return messages[type] || 'Nouvelle notification'
  }
}

export const templateCollaborationService = new TemplateCollaborationService()


