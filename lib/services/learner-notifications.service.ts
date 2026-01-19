import { createClient } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/utils/logger'

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
  actions?: Array<{ action: string; title: string; icon?: string }>
}

interface SessionReminder {
  sessionId: string
  sessionName: string
  startDate: string
  startTime?: string
  location?: string
  isRemote?: boolean
}

class LearnerNotificationsService {
  private supabase: SupabaseClient<any>


  constructor(supabaseClient?: SupabaseClient<any>) {

    this.supabase = supabaseClient || createClient()

  }
  private swRegistration: ServiceWorkerRegistration | null = null

  /**
   * Initialiser le service de notifications
   */
  async init(): Promise<boolean> {
    // En DEV, éviter d'enregistrer le SW pour ne pas polluer le cache et masquer les nouvelles features.
    if (process.env.NODE_ENV !== 'production') {
      return false
    }

    if (!('Notification' in window)) {
      logger.warn('Les notifications ne sont pas supportées par ce navigateur')
      return false
    }

    if (!('serviceWorker' in navigator)) {
      logger.warn('Les Service Workers ne sont pas supportés')
      return false
    }

    try {
      // Enregistrer le Service Worker
      this.swRegistration = await navigator.serviceWorker.register('/sw.js')
      logger.info('Service Worker enregistré pour les notifications')
      return true
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement du Service Worker', error as Error)
      return false
    }
  }

  /**
   * Demander la permission pour les notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      logger.warn('Les notifications ont été refusées par l\'utilisateur')
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  /**
   * Obtenir le statut des permissions
   */
  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) {
      return 'unsupported'
    }
    return Notification.permission
  }

  /**
   * Souscrire aux notifications push
   */
  async subscribeToPush(userId: string): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      logger.error('Service Worker non enregistré')
      return null
    }

    const hasPermission = await this.requestPermission()
    if (!hasPermission) {
      return null
    }

    try {
      // Vérifier si déjà souscrit
      const existingSubscription = await this.swRegistration.pushManager.getSubscription()
      if (existingSubscription) {
        return existingSubscription
      }

      // Créer une nouvelle souscription
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })

      // Sauvegarder la souscription côté serveur
      await this.savePushSubscription(userId, subscription)

      logger.info('Souscription push créée avec succès')
      return subscription
    } catch (error) {
      logger.error('Erreur lors de la souscription push', error as Error)
      return null
    }
  }

  /**
   * Sauvegarder la souscription push côté serveur
   */
  private async savePushSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/push-notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription: subscription.toJSON(),
        }),
      })
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde de la souscription', error as Error)
    }
  }

  /**
   * Afficher une notification locale
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    const hasPermission = await this.requestPermission()
    if (!hasPermission) {
      return
    }

    if (this.swRegistration) {
      // Utiliser le Service Worker pour les notifications persistantes
      await this.swRegistration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        badge: payload.badge || '/icons/badge-72x72.png',
        tag: payload.tag,
        data: payload.data,
        ...(payload.actions ? { actions: payload.actions } : {}),
        vibrate: [200, 100, 200],
        requireInteraction: true,
      } as NotificationOptions)
    } else {
      // Fallback avec l'API Notification standard
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icons/icon-192x192.png',
        tag: payload.tag,
        data: payload.data,
      })
    }
  }

  /**
   * Programmer un rappel de session
   */
  async scheduleSessionReminder(reminder: SessionReminder, minutesBefore: number = 30): Promise<void> {
    const sessionStart = new Date(`${reminder.startDate}${reminder.startTime ? `T${reminder.startTime}` : 'T09:00:00'}`)
    const reminderTime = new Date(sessionStart.getTime() - minutesBefore * 60 * 1000)
    const now = new Date()

    if (reminderTime <= now) {
      logger.warn('Le rappel est dans le passé, notification ignorée')
      return
    }

    // Calculer le délai
    const delay = reminderTime.getTime() - now.getTime()

    // Programmer la notification (utilise setTimeout pour la démo, en production utiliser un job scheduler)
    setTimeout(async () => {
      await this.showNotification({
        title: '📚 Rappel de session',
        body: `Votre session "${reminder.sessionName}" commence dans ${minutesBefore} minutes`,
        tag: `session-reminder-${reminder.sessionId}`,
        data: {
          type: 'session_reminder',
          sessionId: reminder.sessionId,
          url: `/learner/formations/${reminder.sessionId}`,
        },
        actions: [
          { action: 'view', title: 'Voir les détails' },
          { action: 'dismiss', title: 'Ignorer' },
        ],
      })
    }, delay)

    logger.info(`Rappel programmé pour ${reminderTime.toISOString()}`)
  }

  /**
   * Programmer des rappels pour toutes les sessions à venir
   */
  async scheduleAllSessionReminders(studentId: string): Promise<void> {
    try {
      const { data: enrollments } = await this.supabase
        .from('session_enrollments')
        .select(`
          session_id,
          sessions(
            id,
            name,
            start_date,
            start_time,
            location,
            is_remote
          )
        `)
        .eq('student_id', studentId)
        .in('status', ['confirmed', 'pending'])

      if (!enrollments) return

      const now = new Date()

      for (const enrollment of enrollments) {
        const session = enrollment.sessions as any
        if (!session?.start_date) continue

        const sessionDate = new Date(session.start_date)
        if (sessionDate <= now) continue

        // Programmer un rappel 24h avant
        await this.scheduleSessionReminder({
          sessionId: session.id,
          sessionName: session.name,
          startDate: session.start_date,
          startTime: session.start_time,
          location: session.location,
          isRemote: session.is_remote,
        }, 24 * 60)

        // Programmer un rappel 1h avant
        await this.scheduleSessionReminder({
          sessionId: session.id,
          sessionName: session.name,
          startDate: session.start_date,
          startTime: session.start_time,
          location: session.location,
          isRemote: session.is_remote,
        }, 60)

        // Programmer un rappel 15min avant
        await this.scheduleSessionReminder({
          sessionId: session.id,
          sessionName: session.name,
          startDate: session.start_date,
          startTime: session.start_time,
          location: session.location,
          isRemote: session.is_remote,
        }, 15)
      }

      logger.info('Rappels de sessions programmés')
    } catch (error) {
      logger.error('Erreur lors de la programmation des rappels', error as Error)
    }
  }

  /**
   * Écouter les événements de notifications en temps réel
   */
  subscribeToRealtimeNotifications(userId: string, callback: (notification: any) => void): () => void {
    const channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new)
          
          // Afficher une notification push si en arrière-plan
          if (document.hidden) {
            this.showNotification({
              title: payload.new.title,
              body: payload.new.body,
              tag: `notification-${payload.new.id}`,
              data: payload.new.data,
            })
          }
        }
      )
      .subscribe()

    return () => {
      this.supabase.removeChannel(channel)
    }
  }
}

export const learnerNotificationsService = new LearnerNotificationsService()





