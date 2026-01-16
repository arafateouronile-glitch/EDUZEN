/**
 * Composant Centre de notifications
 * Affiche la liste des notifications avec possibilité de les marquer comme lues
 */

'use client'

import { useState } from 'react'
import { X, Check, CheckCheck, Trash2, ExternalLink } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/use-notifications'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/format'
import Link from 'next/link'
import type { Notification } from '@/lib/services/notification.service'

interface NotificationCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const notificationTypeColors = {
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500',
  message: 'bg-purple-500',
  payment: 'bg-indigo-500',
  attendance: 'bg-teal-500',
  grade: 'bg-pink-500',
  document: 'bg-orange-500',
  system: 'bg-gray-500',
}

const notificationTypeLabels = {
  info: 'Information',
  success: 'Succès',
  warning: 'Avertissement',
  error: 'Erreur',
  message: 'Message',
  payment: 'Paiement',
  attendance: 'Présence',
  grade: 'Note',
  document: 'Document',
  system: 'Système',
}

export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingAllAsRead,
  } = useNotifications({ limit: 50 })

  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') {
      return !notification.read_at
    }
    return true
  })

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markAsRead(notification.id)
    }
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    deleteNotification(notificationId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Notifications</DialogTitle>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllAsRead}
                  className="text-xs"
                >
                  <CheckCheck className="mr-1 h-3 w-3" />
                  Tout marquer comme lu
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Filtres */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="text-xs"
          >
            Toutes ({notifications.length})
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
            className="text-xs"
          >
            Non lues ({unreadCount})
          </Button>
        </div>

        {/* Liste des notifications */}
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Chargement...</div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                {filter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'group relative rounded-lg border p-3 transition-colors hover:bg-accent',
                    !notification.read_at && 'bg-accent/50'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    {/* Indicateur de type */}
                    <div
                      className={cn(
                        'mt-1 h-2 w-2 rounded-full',
                        notificationTypeColors[notification.type]
                      )}
                    />

                    {/* Contenu */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium">{notification.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {notificationTypeLabels[notification.type]}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => handleDelete(e, notification.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Métadonnées */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(notification.created_at)}</span>
                        {notification.link && (
                          <Link
                            href={notification.link}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            Voir <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Indicateur non lu */}
                    {!notification.read_at && (
                      <div className="absolute right-2 top-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}



