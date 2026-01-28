/**
 * Service pour gérer les notifications
 * Supporte les notifications en temps réel via Supabase Realtime
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type NotificationType = 
  | 'info' 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'message' 
  | 'payment' 
  | 'attendance' 
  | 'grade' 
  | 'document' 
  | 'system'

export interface Notification {
  id: string
  user_id: string
  organization_id: string
  type: NotificationType
  title: string
  message: string
  data: Record<string, any>
  link?: string
  read_at?: string
  created_at: string
  expires_at?: string
}

export interface CreateNotificationParams {
  user_id: string
  organization_id: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  link?: string
  expires_at?: string
}

export class NotificationService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient: SupabaseClient<any>) {
    if (!supabaseClient) {
      throw new Error('SupabaseClient is required for NotificationService')
    }
    this.supabase = supabaseClient
  }
  private channels: Map<string, RealtimeChannel> = new Map()

  /**
   * Crée une nouvelle notification
   */
  async create(params: CreateNotificationParams): Promise<Notification> {
    try {
      const { data, error } = await this.supabase.rpc('create_notification', {
        p_user_id: params.user_id,
        p_organization_id: params.organization_id,
        p_type: params.type,
        p_title: params.title,
        p_message: params.message,
        p_data: params.data || {},
        p_link: params.link || null,
        p_expires_at: params.expires_at || null,
      })

      if (error) throw error

      // Récupérer la notification créée
      const { data: notification, error: fetchError } = await this.supabase
        .from('notifications')
        .select('*')
        .eq('id', data)
        .single()

      if (fetchError) throw fetchError

      return notification as Notification
    } catch (error) {
      logger.error('Error creating notification', error, {
        params,
      })
      throw error
    }
  }

  /**
   * Crée une notification pour plusieurs utilisateurs
   * Optimisé : utilise un batch insert au lieu de créations individuelles
   */
  async createForUsers(
    user_ids: string[],
    organization_id: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    link?: string
  ): Promise<Notification[]> {
    try {
      if (user_ids.length === 0) {
        return []
      }

      // Batch insert au lieu de multiples appels RPC
      const { data: notifications, error } = await this.supabase
        .from('notifications')
        .insert(
          user_ids.map((user_id) => ({
            user_id,
            organization_id,
            type,
            title,
            message,
            data: data || {},
            link: link || null,
          }))
        )
        .select()

      if (error) {
        logger.error('Error creating batch notifications', error, {
          userCount: user_ids.length,
          organizationId: organization_id,
          type,
        })
        throw error
      }

      logger.info('Batch notifications created successfully', {
        count: notifications.length,
        organizationId: organization_id,
        type,
      })

      return notifications as Notification[]
    } catch (error) {
      logger.error('Error in createForUsers', error)
      throw error
    }
  }

  /**
   * Récupère les notifications d'un utilisateur
   */
  async getByUser(
    user_id: string,
    options?: {
      limit?: number
      offset?: number
      unread_only?: boolean
    }
  ): Promise<Notification[]> {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

      if (options?.unread_only) {
        query = query.is('read_at', null)
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []) as Notification[]
    } catch (error) {
      logger.error('Error fetching notifications', error, {
        user_id,
        options,
      })
      throw error
    }
  }

  /**
   * Récupère le nombre de notifications non lues
   * Utilise directement une requête sur la table notifications pour éviter les erreurs RPC
   * La fonction RPC get_unread_notifications_count peut ne pas exister dans tous les environnements
   */
  async getUnreadCount(user_id?: string | null): Promise<number> {
    try {
      // Si user_id n'est pas fourni, on ne peut pas faire la requête
      if (!user_id) {
        return 0
      }

      // Utiliser directement une requête sur la table notifications
      // Plus fiable que la fonction RPC qui peut ne pas exister
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .is('read_at', null)

      if (error) {
        // Logger l'erreur seulement en mode debug pour éviter le bruit dans la console
        logger.debug('Error getting unread count, returning 0', {
          errorCode: error.code,
          errorMessage: error.message,
        })
        return 0
      }

      return count || 0
    } catch (error) {
      // Retourner 0 au lieu de throw pour éviter de bloquer l'application
      // Ne pas logger pour éviter le bruit dans la console
      return 0
    }
  }

  /**
   * Marque une notification comme lue
   */
  async markAsRead(notification_id: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('mark_notification_read', {
        p_notification_id: notification_id,
      })

      if (error) throw error

      return data || false
    } catch (error) {
      logger.error('Error marking notification as read', error, {
        notification_id,
      })
      throw error
    }
  }

  /**
   * Marque toutes les notifications comme lues
   */
  async markAllAsRead(user_id: string): Promise<number> {
    try {
      const { data, error } = await this.supabase.rpc('mark_all_notifications_read', {
        p_user_id: user_id,
      })

      if (error) throw error

      return data || 0
    } catch (error) {
      logger.error('Error marking all notifications as read', error, {
        user_id,
      })
      throw error
    }
  }

  /**
   * Supprime une notification
   */
  async delete(notification_id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notification_id)

      if (error) throw error

      return true
    } catch (error) {
      logger.error('Error deleting notification', error, {
        notification_id,
      })
      throw error
    }
  }

  /**
   * S'abonne aux notifications en temps réel pour un utilisateur
   */
  subscribeToNotifications(
    user_id: string,
    callback: (notification: Notification) => void
  ): () => void {
    const channelName = `notifications:${user_id}`
    
    // Nettoyer le channel existant s'il y en a un
    if (this.channels.has(channelName)) {
      this.unsubscribeFromNotifications(user_id)
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user_id}`,
        },
        (payload) => {
          const notification = payload.new as Notification
          callback(notification)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user_id}`,
        },
        (payload) => {
          const notification = payload.new as Notification
          callback(notification)
        }
      )
      .subscribe()

    this.channels.set(channelName, channel)

    // Retourner une fonction de nettoyage
    return () => {
      this.unsubscribeFromNotifications(user_id)
    }
  }

  /**
   * Se désabonne des notifications en temps réel
   */
  unsubscribeFromNotifications(user_id: string): void {
    const channelName = `notifications:${user_id}`
    const channel = this.channels.get(channelName)

    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  /**
   * Nettoie tous les abonnements
   */
  cleanup(): void {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel)
    })
    this.channels.clear()
  }
}

// Note: Ne pas créer d'instance singleton car le service nécessite un client Supabase
// Utiliser `new NotificationService(supabaseClient)` dans les routes API ou composants serveur

