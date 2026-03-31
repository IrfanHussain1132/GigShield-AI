// SecureSync AI — Service Worker v2
// Strategy: Cache-First for static assets, Network-First for API calls
const CACHE_NAME = 'securesync-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// On install: cache static shell immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Take control of pages immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// On activate: purge stale v1 caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - /api/*          → Network-first, no caching (live data)
// - navigate (HTML) → Network-first, fall back to cached /index.html for SPA
// - static assets   → Cache-first, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin (e.g. Google Fonts CDN handled by browser)
  if (request.method !== 'GET') return;

  // API calls: always network-first, no caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ status: 'error', message: 'You are offline. Please reconnect.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // HTML navigation: network-first, fall back to cached app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache fresh HTML on success
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets (JS, CSS, images): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      });
    })
  );
});
