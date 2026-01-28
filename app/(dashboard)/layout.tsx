'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { PageTransition } from '@/components/ui/page-transition'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { useAuth } from '@/lib/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { logger, sanitizeError } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import { FocusModeProvider, useFocusMode } from '@/lib/contexts/focus-mode-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading: authLoading } = useAuth()
  const supabase = createClient()
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true)

  // Vérifier si l'onboarding est terminé
  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboarding-status', user?.organization_id],
    queryFn: async () => {
      if (!user?.organization_id) return { completed: false }

      const { data, error } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', user.organization_id)
        .single()

      if (error) {
        logger.error('Erreur récupération onboarding status', error)
        return { completed: false }
      }

      const settings = (data?.settings as any) || {}
      return {
        completed: settings.onboarding_completed === true,
      }
    },
    enabled: !!user?.organization_id && !authLoading,
  })

  useEffect(() => {
    if (authLoading || isCheckingOnboarding) return

    // Si l'onboarding n'est pas terminé et qu'on n'est pas déjà sur la page d'onboarding
    if (
      onboardingStatus &&
      !onboardingStatus.completed &&
      pathname !== '/dashboard/onboarding'
    ) {
      router.push('/dashboard/onboarding')
    }
  }, [onboardingStatus, pathname, router, authLoading, isCheckingOnboarding])

  useEffect(() => {
    if (!authLoading && onboardingStatus !== undefined) {
      setIsCheckingOnboarding(false)
    }
  }, [authLoading, onboardingStatus])

  // Gestion d'erreur globale pour les scripts externes (extensions de navigateur, etc.)
  // IMPORTANT: Tous les hooks doivent être appelés AVANT les retours conditionnels
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Ignorer les erreurs provenant de scripts externes (extensions de navigateur)
      if (
        event.filename?.includes('frame.js') ||
        event.filename?.includes('operationBanner') ||
        event.filename?.includes('chrome-extension://') ||
        event.filename?.includes('moz-extension://') ||
        event.filename?.includes('safari-extension://')
      ) {
        // Ne pas afficher ces erreurs dans la console en production
        if (process.env.NODE_ENV === 'production') {
          event.preventDefault()
          return false
        }
        // En développement, on les log mais on ne les affiche pas comme erreurs critiques
        logger.warn('Erreur ignorée depuis une extension de navigateur', { message: event.message, filename: event.filename })
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
    // En DEV, le Service Worker cause souvent des assets "stale" (features qui disparaissent / réapparaissent).
    // On ne l'active qu'en production.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          logger.debug('Service Worker registered', { registration: registration?.scope })
        })
        .catch((error) => {
          logger.error('Service Worker registration failed:', error)
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

  // Afficher le wizard d'onboarding si nécessaire
  // IMPORTANT: Tous les hooks doivent être appelés AVANT les retours conditionnels
  if (
    !authLoading &&
    onboardingStatus &&
    !onboardingStatus.completed &&
    pathname === '/dashboard/onboarding'
  ) {
    return <>{children}</>
  }

  // Si l'onboarding est en cours de vérification, ne rien afficher
  if (isCheckingOnboarding || authLoading) {
    return (
      <div className="min-h-screen bg-bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Détecter si on est sur une page de session
  const isSessionPage = pathname?.startsWith('/dashboard/sessions/') && pathname !== '/dashboard/sessions'
  const isOnboardingPage = pathname === '/dashboard/onboarding'
  // Détecter si on est sur la page d'édition de template (zero-margin workspace)
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
        {/* Afficher le sidebar principal uniquement si on n'est pas sur une page de session */}
        {!isOnboardingPage && !isSessionPage && (
          <aside className={cn(
            "hidden md:flex md:flex-shrink-0 transition-all duration-300 ease-in-out",
            isFocusMode ? "w-0 -translate-x-full overflow-hidden opacity-0" : "w-72 opacity-100"
          )}>
            <Sidebar />
          </aside>
        )}
        <div className="flex flex-col flex-1 overflow-hidden w-0 min-w-0">
          {/* Afficher le header uniquement si on n'est pas sur une page de session */}
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
