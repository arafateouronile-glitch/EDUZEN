import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import type { TableRow, TableInsert, TableUpdate } from '@/lib/types/supabase-helpers'
import { logger, maskId, sanitizeError } from '@/lib/utils/logger'

type PushDevice = TableRow<'push_devices'>
type PushNotification = TableRow<'push_notifications'>
type PushNotificationPreference = TableRow<'push_notification_preferences'>

export interface PushNotificationPayload {
  title: string
  body: string
  data?: Record<string, unknown>
  notificationType: string
  priority?: 'low' | 'normal' | 'high'
  sound?: string
  badge?: number
}

export class PushNotificationsService {
  private supabase: SupabaseClient<Database>


  constructor(supabaseClient?: SupabaseClient<Database>) {

    this.supabase = supabaseClient || createClient()

  }

  // ========== DEVICES ==========

  async registerDevice(device: TableInsert<'push_devices'>) {
    const { data, error } = await this.supabase
      .from('push_devices')
      .upsert(
        {
          ...device,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,device_token',
        }
      )
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getDevices(userId: string) {
    const { data, error } = await this.supabase
      .from('push_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  async unregisterDevice(deviceId: string) {
    const { error } = await this.supabase
      .from('push_devices')
      .update({ is_active: false })
      .eq('id', deviceId)

    if (error) throw error
  }

  async deleteDevice(deviceId: string) {
    const { error } = await this.supabase
      .from('push_devices')
      .delete()
      .eq('id', deviceId)

    if (error) throw error
  }

  // ========== PREFERENCES ==========

  async getPreferences(userId: string) {
    const { data, error } = await this.supabase
      .from('push_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error

    // Créer des préférences par défaut si elles n'existent pas
    if (!data) {
      return this.createDefaultPreferences(userId)
    }

    return data
  }

  async createDefaultPreferences(userId: string) {
    const { data, error } = await this.supabase
      .from('push_notification_preferences')
      .insert({
        user_id: userId,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updatePreferences(userId: string, preferences: TableUpdate<'push_notification_preferences'>) {
    const { data, error } = await this.supabase
      .from('push_notification_preferences')
      .upsert(
        {
          user_id: userId,
          ...preferences,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single()

    if (error) throw error
    return data
  }

  // ========== NOTIFICATIONS ==========

  async sendNotification(
    userId: string,
    payload: PushNotificationPayload,
    deviceId?: string
  ): Promise<PushNotification> {
    // Vérifier les préférences de l'utilisateur
    const preferences = await this.getPreferences(userId)
    if (!this.isNotificationEnabled(preferences, payload.notificationType)) {
      throw new Error(`Notifications of type ${payload.notificationType} are disabled for this user`)
    }

    // Vérifier les heures silencieuses
    if (preferences.quiet_hours_enabled && this.isQuietHours(preferences)) {
      // Ne pas envoyer pendant les heures silencieuses
      throw new Error('Quiet hours are active')
    }

    // Récupérer les devices actifs
    let devices: PushDevice[] = []
    if (deviceId) {
      const { data: device } = await this.supabase
        .from('push_devices')
        .select('*')
        .eq('id', deviceId)
        .eq('is_active', true)
        .single()

      if (device) devices = [device]
    } else {
      devices = await this.getDevices(userId)
    }

    if (devices.length === 0) {
      throw new Error('No active devices found for user')
    }

    // Envoyer la notification à chaque device
    const notifications: PushNotification[] = []
    for (const device of devices) {
      const notification = await this.createNotification(userId, device.id, payload)
      notifications.push(notification)

      // Envoyer via le provider approprié (FCM, APNS, Web Push)
      try {
        await this.sendToProvider(device, payload)
        await this.updateNotificationStatus(notification.id, 'sent', new Date())
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        await this.updateNotificationStatus(notification.id, 'failed', null, errorMessage)
        throw error
      }
    }

    return notifications[0]
  }

  private async createNotification(
    userId: string,
    deviceId: string,
    payload: PushNotificationPayload
  ): Promise<PushNotification> {
    const { data, error } = await this.supabase
      .from('push_notifications')
      .insert({
        user_id: userId,
        device_id: deviceId,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        notification_type: payload.notificationType,
        priority: payload.priority || 'normal',
        sound: payload.sound || 'default',
        badge: payload.badge,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  private async updateNotificationStatus(
    notificationId: string,
    status: string,
    sentAt: Date | null,
    errorMessage?: string
  ) {
    const updates: Record<string, unknown> = { status }
    if (sentAt) {
      updates.sent_at = sentAt.toISOString()
    }
    if (errorMessage) {
      updates.error_message = errorMessage
    }

    const { error } = await this.supabase
      .from('push_notifications')
      .update(updates)
      .eq('id', notificationId)

    if (error) throw error
  }

  private async sendToProvider(device: PushDevice, payload: PushNotificationPayload) {
    // Cette méthode sera implémentée avec les SDKs FCM, APNS, etc.
    // Pour l'instant, c'est un placeholder

    if (device.platform === 'fcm') {
      // Envoyer via Firebase Cloud Messaging
      return this.sendViaFCM(device.device_token, payload)
    } else if (device.platform === 'apns') {
      // Envoyer via Apple Push Notification Service
      return this.sendViaAPNS(device.device_token, payload)
    } else if (device.platform === 'web-push') {
      // Envoyer via Web Push API
      return this.sendViaWebPush(device.device_token, payload)
    } else {
      throw new Error(`Unsupported platform: ${device.platform}`)
    }
  }

  private async sendViaFCM(token: string, payload: PushNotificationPayload) {
    // TODO: Implémenter avec firebase-admin SDK
    // Pour l'instant, on simule l'envoi
    logger.debug('Sending FCM notification', { hasToken: !!token })
    return { success: true }
  }

  private async sendViaAPNS(token: string, payload: PushNotificationPayload) {
    // TODO: Implémenter avec node-apn ou @parse/node-apn
    logger.debug('Sending APNS notification', { hasToken: !!token })
    return { success: true }
  }

  private async sendViaWebPush(token: string, payload: PushNotificationPayload) {
    // TODO: Implémenter avec web-push library
    logger.debug('Sending Web Push notification', { hasToken: !!token })
    return { success: true }
  }

  private isNotificationEnabled(
    preferences: PushNotificationPreference,
    notificationType: string
  ): boolean {
    switch (notificationType) {
      case 'payment':
        return preferences.enable_payments ?? true
      case 'attendance':
        return preferences.enable_attendance ?? true
      case 'document':
        return preferences.enable_documents ?? true
      case 'evaluation':
        return preferences.enable_evaluations ?? true
      case 'message':
        return preferences.enable_messages ?? true
      case 'event':
        return preferences.enable_events ?? true
      case 'reminder':
        return preferences.enable_reminders ?? true
      case 'announcement':
        return preferences.enable_announcements ?? true
      case 'compliance':
        return preferences.enable_compliance ?? true
      default:
        return true
    }
  }

  private isQuietHours(preferences: PushNotificationPreference): boolean {
    if (!preferences.quiet_hours_enabled || !preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false
    }

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes() // Minutes depuis minuit

    const startMinutes = this.timeToMinutes(preferences.quiet_hours_start)
    const endMinutes = this.timeToMinutes(preferences.quiet_hours_end)

    if (startMinutes <= endMinutes) {
      // Heures silencieuses dans la même journée (ex: 22:00 - 08:00)
      return currentTime >= startMinutes && currentTime < endMinutes
    } else {
      // Heures silencieuses qui traversent minuit (ex: 22:00 - 08:00)
      return currentTime >= startMinutes || currentTime < endMinutes
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  // ========== NOTIFICATIONS HISTORY ==========

  async getNotifications(userId: string, limit: number = 50) {
    const { data, error } = await this.supabase
      .from('push_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  }

  async markAsClicked(notificationId: string) {
    const { error } = await this.supabase
      .from('push_notifications')
      .update({
        status: 'clicked',
        clicked_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    if (error) throw error
  }

  // ========== CAMPAIGNS ==========

  async createCampaign(campaign: TableInsert<'push_notification_campaigns'>) {
    const { data, error } = await this.supabase
      .from('push_notification_campaigns')
      .insert(campaign)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getCampaigns(organizationId: string) {
    const { data, error } = await this.supabase
      .from('push_notification_campaigns')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  /**
   * Envoie une campagne de notifications push
   * OPTIMIZED: Uses parallel processing to send notifications
   */
  async sendCampaign(campaignId: string) {
    logger.info('Starting campaign send', {
      campaignId: maskId(campaignId),
    })

    const { data: campaign } = await this.supabase
      .from('push_notification_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      logger.error('Campaign not found', { campaignId: maskId(campaignId) })
      throw new Error('Campaign not found')
    }

    // Déterminer les utilisateurs cibles
    let userIds: string[] = []
    if (campaign.target_audience === 'all') {
      // Récupérer tous les utilisateurs de l'organisation
      const { data: users } = await this.supabase
        .from('users')
        .select('id')
        .eq('organization_id', campaign.organization_id)

      userIds = users?.map((u: { id: string }) => u.id) || []
    } else if (campaign.target_user_ids) {
      userIds = campaign.target_user_ids
    }

    logger.info('Campaign target users identified', {
      campaignId: maskId(campaignId),
      targetCount: userIds.length,
    })

    // ✅ OPTIMIZED: Send all notifications in parallel instead of sequential loop
    const notificationPromises = userIds.map((userId) =>
      this.sendNotification(userId, {
        title: campaign.title,
        body: campaign.body,
        data: campaign.data as Record<string, unknown>,
        notificationType: 'announcement',
      }).catch((error) => {
        logger.error('Campaign notification failed', error, {
          campaignId: maskId(campaignId),
          userId: maskId(userId),
          error: sanitizeError(error),
        })
        // Return error instead of throwing to continue with other users
        return { error: true }
      })
    )

    const results = await Promise.allSettled(notificationPromises)

    // Count successes and failures
    let sentCount = 0
    let failedCount = 0

    results.forEach((result) => {
      if (result.status === 'fulfilled' && !(result.value as any)?.error) {
        sentCount++
      } else {
        failedCount++
      }
    })

    // Mettre à jour la campagne
    await this.supabase
      .from('push_notification_campaigns')
      .update({
        status: 'sent',
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaignId)

    logger.info('Campaign send completed', {
      campaignId: maskId(campaignId),
      sent: sentCount,
      failed: failedCount,
      total: userIds.length,
    })

    return { sentCount, failedCount }
  }
}

export const pushNotificationsService = new PushNotificationsService()
