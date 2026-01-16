'use client'

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * ErrorBoundary pour capturer les erreurs React non gérées
 * 
 * Affiche une page d'erreur conviviale au lieu d'un écran blanc
 * et log les erreurs pour le débogage
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Logger l'erreur
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    })

    // Appeler le callback optionnel
    this.props.onError?.(error, errorInfo)

    // Mettre à jour l'état avec les détails de l'erreur
    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render() {
    if (this.state.hasError) {
      // Si un fallback personnalisé est fourni, l'utiliser
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Sinon, afficher l'UI par défaut
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
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900 mb-2">Détails de l'erreur (développement uniquement) :</p>
                  <p className="text-xs font-mono text-red-800 mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-700 cursor-pointer hover:text-red-900">
                        Stack trace
                      </summary>
                      <pre className="mt-2 text-xs text-red-800 overflow-auto max-h-48 p-2 bg-red-100 rounded">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-700 cursor-pointer hover:text-red-900">
                        Component stack
                      </summary>
                      <pre className="mt-2 text-xs text-red-800 overflow-auto max-h-48 p-2 bg-red-100 rounded">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
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
                    onClick={this.handleReset}
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
                    {this.state.error?.name || 'UNKNOWN_ERROR'}
                    {this.state.error && `_${Date.now()}`}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook pour utiliser l'ErrorBoundary de manière fonctionnelle
 * Utile pour les composants fonctionnels
 */
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: Record<string, unknown>) => {
    logger.error('Unhandled error in component', error, context)
    
    // En développement, re-throw l'erreur pour qu'elle soit capturée par l'ErrorBoundary
    if (process.env.NODE_ENV === 'development') {
      throw error
    }
  }, [])

  return { handleError }
}
























