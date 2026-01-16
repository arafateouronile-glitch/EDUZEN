/**
 * Page affichée quand l'utilisateur est hors ligne
 */

'use client'

import { WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function OfflinePage() {
  const router = useRouter()

  const handleRetry = () => {
    if (navigator.onLine) {
      router.refresh()
    } else {
      alert('Vous êtes toujours hors ligne. Veuillez vérifier votre connexion internet.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="flex flex-col items-center space-y-6">
          <div className="rounded-full bg-red-100 p-4">
            <WifiOff className="h-12 w-12 text-red-500" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Vous êtes hors ligne
            </h1>
            <p className="mt-2 text-gray-600">
              Il semble que vous n'ayez pas de connexion internet.
              Certaines fonctionnalités peuvent ne pas être disponibles.
            </p>
          </div>

          <div className="w-full space-y-3">
            <Button
              onClick={handleRetry}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Réessayer
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              className="w-full"
              size="lg"
            >
              Retour au dashboard
            </Button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>
              Vous pouvez toujours accéder aux pages mises en cache.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
