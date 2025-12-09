/**
 * Service Worker
 * 
 * Provides offline support and caching for the Chaveirim Dispatcher app.
 */

const CACHE_NAME = 'chaveirim-v1';
const STATIC_CACHE = 'chaveirim-static-v1';
const API_CACHE = 'chaveirim-api-v1';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// API routes to cache with network-first strategy
const CACHEABLE_API_ROUTES = [
  '/api/highways',
  '/api/car-makes',
  '/api/agencies',
  '/api/problem-codes',
  '/api/important-phones',
  '/api/phone-categories',
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Precaching static assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket requests
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    // Check if this is a cacheable API route
    const isCacheable = CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route));
    
    if (isCacheable) {
      // Network-first for cacheable APIs
      event.respondWith(networkFirst(request, API_CACHE));
    } else {
      // Network-only for other API routes (calls, etc.)
      event.respondWith(networkOnly(request));
    }
    return;
  }

  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Handle navigation requests - return index.html for SPA
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(networkFirst(request, CACHE_NAME));
});

/**
 * Cache-first strategy
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first strategy
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Network-only strategy
 */
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Network error' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Check if path is a static asset
 */
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

/**
 * Handle push notifications
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'New notification',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'default',
      renotify: true,
      data: {
        url: data.url || '/',
        callId: data.callId,
      },
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Chaveirim Dispatch', options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

/**
 * Handle background sync
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-calls') {
    event.waitUntil(syncCalls());
  }
});

/**
 * Sync offline calls
 */
async function syncCalls() {
  // Get queued calls from IndexedDB
  // Send them to the server
  console.log('[SW] Syncing offline calls...');
}

console.log('[SW] Service worker loaded');
