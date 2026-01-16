'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Logger l'erreur
    logger.error('Next.js Error Boundary caught an error', error, {
      digest: error.digest,
      errorBoundary: true,
    })
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Oops ! Une erreur est survenue</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Nous avons rencontré un problème inattendu
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900 mb-2">Détails de l'erreur (développement uniquement) :</p>
              <p className="text-xs font-mono text-red-800 mb-2">
                {error.name}: {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs text-red-700 cursor-pointer hover:text-red-900">
                    Stack trace
                  </summary>
                  <pre className="mt-2 text-xs text-red-800 overflow-auto max-h-48 p-2 bg-red-100 rounded">
                    {error.stack}
                  </pre>
                </details>
              )}
              {error.digest && (
                <p className="text-xs text-red-700 mt-2">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              L'erreur a été enregistrée et sera examinée par notre équipe.
              Vous pouvez essayer de rafraîchir la page ou retourner à l'accueil.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={reset}
                className="flex-1"
                variant="default"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
              <Link href="/dashboard" className="flex-1">
                <Button
                  variant="outline"
                  className="w-full"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Retour au tableau de bord
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Si le problème persiste, contactez le support technique avec ce code d'erreur :
              </p>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 inline-block">
                {error.digest || error.name || 'UNKNOWN_ERROR'}
                {error && `_${Date.now()}`}
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
