const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || 'https://securesync-ai-production.up.railway.app';
const API_BASE = `${API}/api/v1`.replace('/api/v1/api/v1', '/api/v1');
const _apiCache = {};

// --- Offline Queue / Background Sync ---
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

async function queueOfflineAction(url, options) {
    try {
        const db = await openSyncDB();
        await new Promise((resolve, reject) => {
            const tx = db.transaction('requests', 'readwrite');
            tx.objectStore('requests').add({
                url,
                method: options.method,
                headers: options.headers,
                body: options.body,
                ts: Date.now()
            });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const swReg = await navigator.serviceWorker.ready;
            await swReg.sync.register('offline-actions');
        }
        // Dispatch an event to show toast
        window.dispatchEvent(new CustomEvent('offline-action-queued'));
    } catch(e) {
        console.error('Failed to queue offline action', e);
    }
}

/**
 * Optimized API Helper with Neural Cache & Offline Sync
 */
export async function api(path, options = {}, state = {}, retries = 0) {
  const isGet = !options.method || options.method === 'GET';
  const cacheKey = `${path}_${JSON.stringify(options.params || {})}`;
  
  // Cache Hit Check (60s TTL)
  if (isGet && _apiCache[cacheKey] && (Date.now() - _apiCache[cacheKey].ts < 60000)) {
    return _apiCache[cacheKey].data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s for production resilience
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    
    // Auto-inject JWT from state
    if (state?.token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const fullUrl = `${API_BASE}${path}`;
    const res = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      if (res.status === 503 && !isGet) {
          // Trigger offline queue
          await queueOfflineAction(fullUrl, { ...options, headers });
          return { status: 'queued', message: 'Offline. Action queued.' };
      }
      if (retries > 0 && res.status >= 500) {
        await new Promise(r => setTimeout(r, 1000 * (3 - retries)));
        return api(path, options, state, retries - 1);
      }
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.detail = payload?.detail || payload?.message || 'Neural engine error';
      throw err;
    }
    const data = payload ?? (await res.text().catch(() => null));
    
    // Save to Cache if GET
    if (isGet) _apiCache[cacheKey] = { data, ts: Date.now() };
    return data;
  } catch (e) {
    // Detect network fail (fetch threw)
    if (e.name === 'TypeError' && !isGet) {
        await queueOfflineAction(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(state?.token ? {'Authorization': `Bearer ${state.token}`} : {}), ...options.headers } });
        return { status: 'queued', message: 'Offline. Action queued.' };
    }
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000 * (3 - retries)));
      return api(path, options, state, retries - 1);
    }
    if (options.throwOnError || !isGet) throw e;
    console.warn('[API Neural Fallback]:', path, e.message);
    return null;
  }
}

export function clearApiCache() {
  Object.keys(_apiCache).forEach(k => delete _apiCache[k]);
}
