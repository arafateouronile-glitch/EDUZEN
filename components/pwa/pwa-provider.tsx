/**
 * Provider pour gérer le PWA (Service Worker, installation, etc.)
 */

'use client'

import { useEffect, useState } from 'react'
import { registerServiceWorker, onOnlineStatusChange } from '@/lib/utils/pwa'
import { useToast } from '@/components/ui/toast'
import { toast as sonnerToast } from 'sonner'
import { logger, sanitizeError } from '@/lib/utils/logger'

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const { addToast } = useToast()

  useEffect(() => {
    // Enregistrer le service worker uniquement en production
    if (process.env.NODE_ENV === 'production') {
      registerServiceWorker().catch((error) => {
        logger.error('Failed to register service worker:', error)
      })
    }

    // Écouter les changements de statut en ligne/hors ligne
    const cleanup = onOnlineStatusChange((online) => {
      setIsOnline(online)

      if (!online) {
        // Utiliser sonner pour les notifications PWA (plus simple)
        sonnerToast.warning('Hors ligne', {
          description: 'Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.',
        })
      } else {
        sonnerToast.success('En ligne', {
          description: 'Votre connexion a été rétablie.',
        })
      }
    })

    return cleanup
  }, [])

  return (
    <>
      {children}
      {/* Badge de statut en ligne/hors ligne (optionnel) */}
      {!isOnline && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          Mode hors ligne
        </div>
      )}
    </>
  )
}

