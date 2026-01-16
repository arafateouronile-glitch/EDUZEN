'use client'

import { useEffect, useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { realtimeCollaborationService, type ActiveUser } from '@/lib/services/realtime-collaboration.service'
import { Users } from 'lucide-react'
import { motion, AnimatePresence } from '@/components/ui/motion'

interface CollaborationUsersProps {
  templateId: string
  currentUserId: string
}

export function CollaborationUsers({ templateId, currentUserId }: CollaborationUsersProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])

  useEffect(() => {
    // Mettre à jour la liste des utilisateurs actifs
    const updateUsers = () => {
      const users = realtimeCollaborationService.getActiveUsers(templateId)
      setActiveUsers(users.filter((u) => u.id !== currentUserId))
    }

    // Mettre à jour immédiatement
    updateUsers()

    // Mettre à jour périodiquement
    const interval = setInterval(updateUsers, 1000)

    return () => clearInterval(interval)
  }, [templateId, currentUserId])

  if (activeUsers.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 px-3 py-2 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200">
        <Users className="h-4 w-4 text-gray-600" />
        <span className="text-sm text-gray-600 font-medium">
          {activeUsers.length} {activeUsers.length === 1 ? 'collaborateur' : 'collaborateurs'}
        </span>
        <div className="flex items-center gap-1 ml-2">
          <AnimatePresence>
            {activeUsers.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Avatar
                        src={user.avatarUrl}
                        alt={user.name}
                        fallback={user.name}
                        size="sm"
                        userId={user.id}
                        className="border-2"
                        style={{ borderColor: user.color }}
                      />
                      <div
                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
                        style={{ backgroundColor: user.color }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  )
}
