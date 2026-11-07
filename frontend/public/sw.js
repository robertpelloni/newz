const STATIC_CACHE = 'omnifeed-static-v3';
const API_CACHE = 'omnifeed-api-v3';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Client communication and cache management commands
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'PURGE_EXPIRED_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key))
        );
      })
    );
  }

  if (event.data.type === 'NOTIFY_SYNC_COMPLETE') {
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'BACKGROUND_SYNC_COMPLETED',
          timestamp: new Date().toISOString()
        });
      });
    });
  }
});

// Background Sync coordination
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-omnifeed-queue') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        // Inform active windows that background sync was invoked by browser
        clients.forEach((client) => {
          client.postMessage({
            type: 'TRIGGER_QUEUE_REPLAY',
            tag: event.tag,
            timestamp: new Date().toISOString()
          });
        });
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET requests or WebSocket connections
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/ws/')) {
    return;
  }

  // API Caching: Network-First with Cache Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Return empty fallback response for graceful offline degradation
            return new Response(JSON.stringify({ items: [], offline: true }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Static Assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
