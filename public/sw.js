// Service Worker for MundoSolar PWA
const CACHE_NAME = 'mundosolar-v2'
const urlsToCache = [
  '/',
  '/dashboard',
  '/maintenance',
  '/clients',
  '/offline.html'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - Network first, falling back to cache
self.addEventListener('fetch', (event) => {
  // Skip non-http(s) requests (chrome-extension, etc.)
  if (!event.request.url.startsWith('http')) {
    return
  }

  // Only cache GET requests - Cache API doesn't support other methods
  if (event.request.method !== 'GET') {
    return
  }

  // Skip API requests and external URLs from caching
  if (event.request.url.includes('/api/') ||
      event.request.url.includes('vercel.live') ||
      event.request.url.includes('supabase')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache valid responses from same origin
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }

        const responseToCache = response.clone()

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache)
          })
          .catch(() => {})

        return response
      })
      .catch(() => {
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response
            }
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html')
            }
          })
      })
  )
})

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}

  const options = {
    body: data.body || 'Nueva notificación de MundoSolar',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/dashboard',
      notificationId: data.notificationId
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir',
        icon: '/icons/icon-72x72.png'
      },
      {
        action: 'close',
        title: 'Cerrar'
      }
    ],
    tag: data.tag || 'default',
    requireInteraction: false
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'MundoSolar', options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const urlToOpen = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window if none found
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications())
  }
})

async function syncNotifications() {
  // Sync any pending notification reads when back online
  const cache = await caches.open('pending-actions')
  const requests = await cache.keys()

  await Promise.all(
    requests.map(async (request) => {
      try {
        await fetch(request)
        await cache.delete(request)
      } catch (error) {
        console.error('Sync failed:', error)
      }
    })
  )
}
