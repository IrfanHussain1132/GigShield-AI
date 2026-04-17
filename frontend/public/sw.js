// SecureSync AI — Service Worker
// Strategy: cache-first for static assets, network-first for API and navigation.
const CACHE_NAME = 'securesync-v4';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignore non-GET requests and cross-origin assets.
    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

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

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((res) => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return res;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

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

// IndexedDB helper for Background Sync
const DB_NAME = 'securesync-offline';
function openSyncDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('requests')) {
                db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function flushOfflineQueue() {
    const db = await openSyncDB();
    const requests = await new Promise((resolve, reject) => {
        const tx = db.transaction('requests', 'readonly');
        const req = tx.objectStore('requests').getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    if (!requests || requests.length === 0) return;

    for (const req of requests) {
        try {
            const res = await fetch(req.url, {
                method: req.method,
                headers: req.headers,
                body: req.body
            });
            if (res.ok) {
                await new Promise((resolve) => {
                    const tx = db.transaction('requests', 'readwrite');
                    tx.objectStore('requests').delete(req.id);
                    tx.oncomplete = () => resolve();
                });
            }
        } catch (e) {
            console.error('Background sync failed for', req.url, e);
            // Will retry on next sync
        }
    }
}

self.addEventListener('sync', (event) => {
    if (event.tag === 'offline-actions') {
        event.waitUntil(flushOfflineQueue());
    }
});
