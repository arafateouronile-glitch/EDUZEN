'use client'

import { GlassCard } from '@/components/ui/glass-card'
import { Button } from '@/components/ui/button'
import { WifiOff, RefreshCw, Home, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useOffline } from '@/lib/hooks/use-offline'

export default function LearnerOfflinePage() {
  const { isOnline, isOfflineReady, syncPendingData } = useOffline()

  const handleRetry = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-100 flex items-center justify-center">
          <WifiOff className="h-10 w-10 text-amber-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Vous êtes hors ligne
        </h1>
        
        <p className="text-gray-500 mb-6">
          Vérifiez votre connexion internet et réessayez.
          {isOfflineReady && (
            <span className="block mt-2 text-brand-blue">
              Certaines données sont disponibles hors ligne.
            </span>
          )}
        </p>

        <div className="space-y-3">
          <Button onClick={handleRetry} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>

          {isOfflineReady && (
            <>
              <Link href="/learner" className="block">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Voir les données en cache
                </Button>
              </Link>

              <Link href="/learner/elearning" className="block">
                <Button variant="outline" className="w-full">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Cours téléchargés
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Conseils pour le mode hors ligne
          </h3>
          <ul className="text-sm text-gray-500 text-left space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-brand-blue">•</span>
              Téléchargez vos cours à l'avance pour y accéder hors ligne
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-blue">•</span>
              Vos modifications seront synchronisées au retour en ligne
            </li>
            <li className="flex items-start gap-2">
              <span className="text-brand-blue">•</span>
              Les documents consultés récemment sont mis en cache
            </li>
          </ul>
        </div>
      </GlassCard>
    </div>
  )
}




