/**
 * Configuration Sentry pour le serveur (Node.js)
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Filtrage des données sensibles
    beforeSend(event, hint) {
      // Supprimer les données sensibles
      if (event.request?.headers) {
        delete event.request.headers['authorization']
        delete event.request.headers['cookie']
        delete event.request.headers['x-api-key']
      }
      
      return event
    },
    
    // Tags par défaut
    initialScope: {
      tags: {
        component: 'server',
      },
    },
  })
}



