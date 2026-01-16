'use client'

import { useEffect } from 'react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { PageTransition } from '@/components/ui/page-transition'
import { InstallPrompt } from '@/components/pwa/install-prompt'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Gestion d'erreur globale pour les scripts externes (extensions de navigateur, etc.)
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
        console.warn('Erreur ignorée depuis une extension de navigateur:', event.message, event.filename)
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
        console.warn('Rejet de promesse ignoré depuis une extension:', errorMessage)
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
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
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

  return (
    <div className="min-h-screen bg-bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden w-0 min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 smooth-scroll-premium">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </div>
      </div>
      <InstallPrompt />
    </div>
  )
}
