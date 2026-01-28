/**
 * Hook personnalisé pour gérer les notifications en temps réel
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { NotificationService, type Notification } from '@/lib/services/notification.service'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

export function useNotifications(options?: {
  limit?: number
  unread_only?: boolean
  auto_refresh?: boolean
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [realtimeNotifications, setRealtimeNotifications] = useState<Notification[]>([])
  
  // Créer une instance du service avec le client côté client
  const notificationService = useMemo(() => {
    const supabase = createClient()
    return new NotificationService(supabase)
  }, [])

  // Récupérer les notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', user?.id, options?.unread_only, options?.limit],
    queryFn: () =>
      notificationService.getByUser(user!.id, {
        limit: options?.limit || 50,
        unread_only: options?.unread_only,
      }),
    enabled: !!user?.id,
    refetchInterval: options?.auto_refresh ? 30000 : false, // Refresh toutes les 30 secondes si activé
  })

  // Récupérer le nombre de notifications non lues
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve(0)
      return notificationService.getUnreadCount(user.id)
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refresh toutes les 10 secondes
  })

  // S'abonner aux notifications en temps réel
  useEffect(() => {
    if (!user?.id) return

    const unsubscribe = notificationService.subscribeToNotifications(
      user.id,
      (notification) => {
        // Ajouter la notification en temps réel
        setRealtimeNotifications((prev) => [notification, ...prev])

        // Invalider les queries pour rafraîchir
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', user.id] })

        // Afficher un toast pour les nouvelles notifications
        if (notification.type !== 'system') {
          addToast({
            type: notification.type === 'error' ? 'error' : 'info',
            title: notification.title,
            description: notification.message,
            duration: 5000,
          })
        }
      }
    )

    return () => {
      unsubscribe()
    }
  }, [user?.id, queryClient, addToast])

  // Marquer une notification comme lue
  const markAsReadMutation = useMutation({
    mutationFn: (notification_id: string) => notificationService.markAsRead(notification_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', user?.id] })
    },
  })

  // Marquer toutes les notifications comme lues
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(user!.id),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', user?.id] })
      addToast({
        type: 'success',
        title: 'Notifications marquées comme lues',
        description: `${count} notification(s) marquée(s) comme lue(s).`,
      })
    },
  })

  // Supprimer une notification
  const deleteMutation = useMutation({
    mutationFn: (notification_id: string) => notificationService.delete(notification_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', user?.id] })
    },
  })

  // Combiner les notifications statiques et en temps réel
  const allNotifications = [...realtimeNotifications, ...notifications].filter(
    (notification, index, self) =>
      index === self.findIndex((n) => n.id === notification.id)
  )

  return {
    notifications: allNotifications,
    unreadCount,
    isLoading,
    error,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

/**
 * Hook pour obtenir uniquement le nombre de notifications non lues
 * Plus léger que useNotifications pour les cas où on a juste besoin du badge
 */
export function useUnreadNotificationsCount() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // Créer une instance du service avec le client côté client
  const notificationService = useMemo(() => {
    const supabase = createClient()
    return new NotificationService(supabase)
  }, [])

  const { data: count = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve(0)
      return notificationService.getUnreadCount(user.id)
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refresh toutes les 10 secondes
  })

  // S'abonner aux mises à jour en temps réel
  useEffect(() => {
    if (!user?.id) return

    const unsubscribe = notificationService.subscribeToNotifications(user.id, () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count', user.id] })
    })

    return unsubscribe
  }, [user?.id, queryClient])

  return count
}

