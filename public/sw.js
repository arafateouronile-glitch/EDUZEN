/**
 * Service Worker pour PWA
 * Gère le cache et le mode offline
 */

const CACHE_NAME = 'eduzen-v1'
const RUNTIME_CACHE = 'eduzen-runtime-v1'

// Assets à mettre en cache lors de l'installation
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
]

// Install event - Cache les assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((error) => {
        console.warn('Failed to precache some assets:', error)
      })
    })
  )
  self.skipWaiting()
})

// Activate event - Nettoie les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
            )
          })
          .map((cacheName) => caches.delete(cacheName))
      )
    })
  )
  self.clients.claim()
})

// Fetch event - Stratégie de cache
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return
  }

  // Ignorer les requêtes vers des domaines externes (API, etc.)
  if (url.origin !== self.location.origin) {
    return
  }

  // Stratégie: Network First pour les pages
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache si succès
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Retourner depuis le cache si offline
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Retourner la page offline si disponible
            return caches.match('/offline')
          })
        })
    )
    return
  }

  // Stratégie: Cache First pour les assets statiques
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
      })
    )
    return
  }

  // Par défaut: Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(request)
      })
  )
})

// Message event - Pour la communication avec l'application
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.addAll(event.data.urls)
      })
    )
  }
})

// Background Sync (si supporté)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Synchroniser les données en attente
      syncPendingData()
    )
  }
})

async function syncPendingData() {
  // Implémenter la synchronisation des données en attente
  // Ex: messages non envoyés, présences non synchronisées, etc.
  console.log('Syncing pending data...')
}
