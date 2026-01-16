/**
 * Composant Badge de notifications non lues
 * Affiche le nombre de notifications non lues avec un badge
 */

'use client'

import { Bell } from 'lucide-react'
import { useUnreadNotificationsCount } from '@/lib/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  onClick?: () => void
  className?: string
  showCount?: boolean
}

export function NotificationBadge({ onClick, className, showCount = true }: NotificationBadgeProps) {
  const unreadCount = useUnreadNotificationsCount()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn('relative', className)}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {showCount && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  )
}



