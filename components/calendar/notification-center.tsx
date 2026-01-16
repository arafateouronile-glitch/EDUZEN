'use client'

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from '@/components/ui/motion'
import {
  Bell,
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Users,
  ListTodo,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { calendarService, type CalendarNotification } from '@/lib/services/calendar.service'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'
import { cn, formatDate } from '@/lib/utils'

interface NotificationCenterProps {
  isOpen: boolean
  onClose: () => void
  onNotificationClick?: (notification: CalendarNotification) => void
}

export function NotificationCenter({
  isOpen,
  onClose,
  onNotificationClick,
}: NotificationCenterProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Récupérer les notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['calendar-notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      return calendarService.getNotifications(user.id, { limit: 20 })
    },
    enabled: !!user?.id && isOpen,
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
  })

  // Marquer comme lu
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      return calendarService.markNotificationAsRead(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-notifications-count'] })
    },
  })

  // Marquer toutes comme lues
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return
      return calendarService.markAllNotificationsAsRead(user.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-notifications-count'] })
    },
  })

  // Supprimer (dismiss)
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      return calendarService.dismissNotification(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-notifications-count'] })
    },
  })

  const handleNotificationClick = (notification: CalendarNotification) => {
    if (notification.status !== 'read') {
      markAsReadMutation.mutate(notification.id)
    }
    onNotificationClick?.(notification)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'todo_reminder':
        return <ListTodo className="h-4 w-4" />
      case 'session_reminder':
        return <Users className="h-4 w-4" />
      case 'formation_start':
        return <BookOpen className="h-4 w-4" />
      case 'deadline':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'todo_reminder':
        return '#3B82F6'
      case 'session_reminder':
        return '#10B981'
      case 'formation_start':
        return '#8B5CF6'
      case 'deadline':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }

  const formatNotificationTime = (date: string) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return formatDate(date)
  }

  const unreadCount = notifications?.filter(
    (n) => n.status === 'pending' || n.status === 'sent'
  ).length || 0

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, x: 20, y: -10 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 20, y: -10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm"
        >
          <GlassCard variant="premium" className="overflow-hidden shadow-2xl">
            {/* En-tête */}
            <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-brand-blue/5 to-purple-500/5">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-brand-blue" />
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-brand-blue text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    className="text-xs"
                  >
                    Tout marquer lu
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Liste des notifications */}
            <div className="max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-blue" />
                </div>
              ) : notifications && notifications.length > 0 ? (
                <div className="divide-y">
                  {notifications.map((notification) => {
                    const isUnread = notification.status === 'pending' || notification.status === 'sent'
                    const color = getNotificationColor(notification.notification_type)

                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'p-3 cursor-pointer transition-colors hover:bg-gray-50',
                          isUnread && 'bg-brand-blue-ghost/30'
                        )}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex gap-3">
                          <div
                            className="mt-1 p-2 rounded-lg"
                            style={{ backgroundColor: color + '20' }}
                          >
                            <div style={{ color }}>
                              {getNotificationIcon(notification.notification_type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  'text-sm truncate',
                                  isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'
                                )}
                              >
                                {notification.title}
                              </p>
                              {isUnread && (
                                <div className="w-2 h-2 bg-brand-blue rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatNotificationTime(notification.scheduled_at)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              dismissMutation.mutate(notification.id)
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                          >
                            <Trash2 className="h-3 w-3 text-gray-400" />
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 text-sm">Aucune notification</p>
                </div>
              )}
            </div>

            {/* Pied */}
            {notifications && notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50/50">
                <a
                  href="/dashboard/calendar"
                  className="text-xs text-brand-blue hover:underline flex items-center justify-center gap-1"
                >
                  <Calendar className="h-3 w-3" />
                  Voir le calendrier complet
                </a>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook pour les notifications
export function useCalendarNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isPermissionGranted, setIsPermissionGranted] = useState(false)

  // Vérifier les permissions de notification
  useEffect(() => {
    if ('Notification' in window) {
      setIsPermissionGranted(Notification.permission === 'granted')
    }
  }, [])

  // Demander la permission pour les notifications push
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Ce navigateur ne supporte pas les notifications')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      setIsPermissionGranted(permission === 'granted')
      return permission === 'granted'
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error)
      return false
    }
  }, [])

  // Envoyer une notification push
  const sendPushNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!isPermissionGranted) {
        console.warn('Permission de notification non accordée')
        return
      }

      try {
        const notification = new Notification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          ...options,
        })

        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error)
      }
    },
    [isPermissionGranted]
  )

  // Vérifier les notifications dues
  const checkDueNotifications = useCallback(async () => {
    if (!user?.organization_id || !isPermissionGranted) return

    try {
      const upcomingTodos = await calendarService.getUpcomingTodosWithReminder(
        user.organization_id,
        5 // 5 minutes à l'avance
      )

      for (const todo of upcomingTodos) {
        sendPushNotification(`Rappel: ${todo.title}`, {
          body: todo.description || `Échéance: ${formatDate(todo.due_date)}`,
          tag: `todo-${todo.id}`,
          requireInteraction: true,
        })
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des notifications:', error)
    }
  }, [user?.organization_id, isPermissionGranted, sendPushNotification])

  // Vérifier périodiquement les notifications dues
  useEffect(() => {
    if (!user?.organization_id || !isPermissionGranted) return

    // Vérifier immédiatement
    checkDueNotifications()

    // Puis toutes les minutes
    const interval = setInterval(checkDueNotifications, 60000)

    return () => clearInterval(interval)
  }, [user?.organization_id, isPermissionGranted, checkDueNotifications])

  return {
    isPermissionGranted,
    requestPermission,
    sendPushNotification,
    checkDueNotifications,
  }
}

// Composant bouton de notification pour le header
export function NotificationButton() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const { requestPermission, isPermissionGranted } = useCalendarNotifications()

  // Compter les notifications non lues
  const { data: unreadCount } = useQuery({
    queryKey: ['calendar-notifications-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0
      return calendarService.countUnreadNotifications(user.id)
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  })

  // Demander la permission au premier clic si pas encore accordée
  const handleClick = async () => {
    if (!isPermissionGranted) {
      await requestPermission()
    }
    setIsOpen(true)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={handleClick}
      >
        <Bell className="h-5 w-5" />
        {unreadCount && unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-full"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </Button>

      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNotificationClick={(notification) => {
          setIsOpen(false)
          // Naviguer vers l'élément correspondant
          if (notification.todo_id) {
            window.location.href = `/dashboard/calendar?todo=${notification.todo_id}`
          } else if (notification.session_id) {
            window.location.href = `/dashboard/sessions/${notification.session_id}`
          } else if (notification.formation_id) {
            window.location.href = `/dashboard/formations/${notification.formation_id}`
          }
        }}
      />
    </>
  )
}





