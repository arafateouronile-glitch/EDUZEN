/**
 * Utilitaires pour PWA
 * Gestion de l'installation, du service worker, et du mode offline
 */

import { logger } from '@/lib/utils/logger'

/**
 * Vérifie si l'application peut être installée
 */
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false
  
  // Vérifier si le navigateur supporte l'installation PWA
  return 'BeforeInstallPromptEvent' in window || 
         (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
}

/**
 * Vérifie si l'application est installée
 */
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false
  
  // Vérifier si l'app est en mode standalone
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://')
}

/**
 * Vérifie si l'utilisateur est en ligne
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

/**
 * Enregistre le service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    logger.debug('Service Worker registered', { scope: registration.scope })

    // Écouter les mises à jour
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nouvelle version disponible
            logger.debug('New service worker available')
          }
        })
      }
    })

    return registration
  } catch (error) {
    logger.error('Service Worker registration failed:', error)
    return null
  }
}

/**
 * Désenregistre le service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.unregister()
      return true
    }
    return false
  } catch (error) {
    logger.error('Service Worker unregistration failed:', error)
    return false
  }
}

/**
 * Demande l'installation de l'application
 */
export async function installPWA(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  // Vérifier si l'app peut être installée
  if (!canInstallPWA()) {
    return false
  }

  // L'événement beforeinstallprompt sera géré par le composant
  return false
}

/**
 * Vérifie si le service worker est actif
 */
export async function isServiceWorkerActive(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    return registration?.active !== null
  } catch {
    return false
  }
}

/**
 * Écoute les changements de statut en ligne/hors ligne
 */
export function onOnlineStatusChange(
  callback: (isOnline: boolean) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  // Retourner la fonction de nettoyage
  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}
