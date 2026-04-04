const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1';
const _apiCache = {};

/**
 * Optimized API Helper with Neural Cache
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

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json().catch(() => null) : null;

    if (!res.ok) {
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
