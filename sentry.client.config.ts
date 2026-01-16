/**
 * Configuration Sentry pour le client (browser)
 * 
 * Pour activer Sentry :
 * 1. Installer: npm install @sentry/nextjs
 * 2. Configurer NEXT_PUBLIC_SENTRY_DSN dans .env.local
 * 3. Exécuter: npx @sentry/wizard@latest -i nextjs
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN && typeof window !== 'undefined') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% en prod, 100% en dev
    
    // Session Replay (optionnel)
    replaysSessionSampleRate: 0.1, // 10% des sessions
    replaysOnErrorSampleRate: 1.0, // 100% des sessions avec erreurs
    
    // Filtrage des données sensibles
    beforeSend(event, hint) {
      // Supprimer les données sensibles des headers
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-api-key']
      }
      
      // Supprimer les données sensibles du body
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>
        if (typeof data === 'object') {
          delete data.password
          delete data.token
          delete data.secret
        }
      }
      
      return event
    },
    
    // Ignorer certaines erreurs
    ignoreErrors: [
      // Erreurs de réseau
      'NetworkError',
      'Network request failed',
      'Failed to fetch',
      // Erreurs de résolution DNS
      'Resolving DNS',
      // Erreurs de timeout
      'timeout',
      'TimeoutError',
      // Erreurs de navigateur
      'Non-Error promise rejection captured',
      'ChunkLoadError',
    ],
    
    // Tags par défaut
    initialScope: {
      tags: {
        component: 'client',
      },
    },
  })
}



