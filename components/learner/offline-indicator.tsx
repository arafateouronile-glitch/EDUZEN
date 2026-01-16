'use client'

import { useOffline } from '@/lib/hooks/use-offline'
import { motion, AnimatePresence } from '@/components/ui/motion'
import { Wifi, WifiOff, CloudOff, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OfflineIndicator() {
  const { isOnline, isOfflineReady, pendingSyncs, syncPendingData } = useOffline()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">Mode hors ligne</span>
              {isOfflineReady && (
                <span className="text-sm opacity-80">• Données en cache disponibles</span>
              )}
            </div>
            {pendingSyncs > 0 && (
              <span className="text-sm bg-white/20 px-2 py-1 rounded">
                {pendingSyncs} modification{pendingSyncs > 1 ? 's' : ''} en attente
              </span>
            )}
          </div>
        </motion.div>
      )}

      {isOnline && pendingSyncs > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-50 bg-brand-blue text-white px-4 py-2 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              <span className="font-medium">Connexion rétablie</span>
              <span className="text-sm opacity-80">
                • {pendingSyncs} modification{pendingSyncs > 1 ? 's' : ''} à synchroniser
              </span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={syncPendingData}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Synchroniser
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function OfflineBadge({ isAvailableOffline }: { isAvailableOffline: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
      isAvailableOffline 
        ? 'bg-green-100 text-green-700' 
        : 'bg-gray-100 text-gray-500'
    }`}>
      {isAvailableOffline ? (
        <>
          <Check className="h-3 w-3" />
          Disponible offline
        </>
      ) : (
        <>
          <CloudOff className="h-3 w-3" />
          En ligne uniquement
        </>
      )}
    </div>
  )
}





