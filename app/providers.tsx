'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { Toaster } from 'sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { logger } from '@/lib/utils/logger'
import { PWAProvider } from '@/components/pwa/pwa-provider'
import { ConsoleErrorFilter } from '@/components/console-error-filter'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache agressif : données considérées fraîches pendant 5 minutes
            staleTime: 5 * 60 * 1000, // 5 minutes
            // Cache pendant 30 minutes avant garbage collection
            gcTime: 30 * 60 * 1000, // 30 minutes (anciennement cacheTime)
            // Ne pas refetch automatiquement
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false,
            // Optimisation performance : retry seulement pour erreurs réseau
            retry: (failureCount, error: any) => {
              // Ne pas retry pour les erreurs 4xx (client)
              if (error?.status >= 400 && error?.status < 500) {
                return false
              }
              // Retry max 2 fois pour erreurs réseau
              return failureCount < 2
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Gestion d'erreur
            onError: (error) => {
              logger.queryError('React Query Error', error as Error)
            },
          },
          mutations: {
            // Retry pour les mutations
            retry: 1,
            retryDelay: 1000,
            // Gestion d'erreur
            onError: (error) => {
              logger.mutationError('React Query Mutation Error', error as Error)
            },
          },
        },
      })
  )

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        logger.error('Application Error Boundary', error, {
          componentStack: errorInfo.componentStack,
        })
      }}
    >
      <ConsoleErrorFilter />
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <PWAProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </PWAProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

