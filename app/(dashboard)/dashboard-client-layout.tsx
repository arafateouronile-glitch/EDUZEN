'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { PageTransition } from '@/components/ui/page-transition'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { useAuth } from '@/lib/hooks/use-auth'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { FocusModeProvider, useFocusMode } from '@/lib/contexts/focus-mode-context'

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { isLoading: authLoading } = useAuth()

  // Gestion d'erreur globale pour les scripts externes (extensions de navigateur, iframe Cursor/Vercel)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const msg = event.message ?? ''
      const filename = event.filename ?? ''
      const stack = event.error?.stack ?? ''
      const isExternalScript =
        filename.includes('frame.js') ||
        filename.includes('frame_start') ||
        filename.includes('operationBanner') ||
        filename.includes('chrome-extension://') ||
        filename.includes('moz-extension://') ||
        filename.includes('safari-extension://')
      const isKnownDomNoise =
        /removeChild.*not a child of this node/i.test(msg) ||
        /NotFoundError.*removeChild/i.test(msg) ||
        /node to be removed is not a child/i.test(msg) ||
        /frame_start|operationBanner/i.test(stack)
      if (isExternalScript || isKnownDomNoise) {
        event.preventDefault()
        event.stopPropagation()
        if (process.env.NODE_ENV === 'production') return false
        logger.warn('Erreur ignorée (script externe / iframe)', { message: event.message, filename: event.filename })
        return false
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Ignorer les rejets de promesses provenant de scripts externes
      const errorMessage = event.reason?.message || String(event.reason)
      if (
        errorMessage.includes('sendMessage') ||
        errorMessage.includes('frame.js') ||
        errorMessage.includes('operationBanner')
      ) {
        if (process.env.NODE_ENV === 'production') {
          event.preventDefault()
          return false
        }
        logger.warn('Rejet de promesse ignoré depuis une extension:', errorMessage)
        return false
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  // Enregistrer le Service Worker pour la PWA
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.debug('Service Worker registered', { registration: registration?.scope })
        })
        .catch((error) => {
          logger.error('Service Worker registration failed', error)
        })
    }
  }, [])

  // En DEV : désinscrire tout Service Worker déjà installé + purger le cache
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister())
    })

    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => caches.delete(k))
      })
    }
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  const isSessionPage = pathname?.startsWith('/dashboard/sessions/') && pathname !== '/dashboard/sessions'
  const isOnboardingPage = pathname === '/dashboard/onboarding'
  const isTemplateEditPage = pathname?.startsWith('/dashboard/settings/document-templates/') && pathname?.includes('/edit')

  return (
    <FocusModeProvider>
      <DashboardLayoutContent
        isSessionPage={isSessionPage}
        isOnboardingPage={isOnboardingPage}
        isTemplateEditPage={isTemplateEditPage}
      >
        {children}
      </DashboardLayoutContent>
    </FocusModeProvider>
  )
}

function DashboardLayoutContent({
  children,
  isSessionPage,
  isOnboardingPage,
  isTemplateEditPage,
}: {
  children: React.ReactNode
  isSessionPage: boolean
  isOnboardingPage: boolean
  isTemplateEditPage: boolean
}) {
  const { isFocusMode } = useFocusMode()

  return (
    <div className="min-h-screen bg-bg-gray-50">
      <div className="flex">
        {!isOnboardingPage && !isSessionPage && (
          <aside className={cn(
            "hidden md:flex md:flex-shrink-0 transition-all duration-300 ease-in-out",
            isFocusMode ? "w-0 -translate-x-full overflow-hidden opacity-0" : "w-72 opacity-100"
          )}>
            <Sidebar />
          </aside>
        )}
        <div className="flex flex-col flex-1 overflow-hidden w-0 min-w-0">
          {!isOnboardingPage && !isSessionPage && <Header />}
          <main className={cn(
            "flex-1 overflow-y-auto smooth-scroll-premium transition-all duration-300",
            isSessionPage || isTemplateEditPage ? "p-0" : isFocusMode ? "p-2 md:p-4" : "p-4 md:p-6"
          )}>
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </div>
      </div>
      {!isOnboardingPage && !isSessionPage && <InstallPrompt />}
    </div>
  )
}
