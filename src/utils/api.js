const BASE_URL = import.meta.env.VITE_API_URL || 'https://fundzola-backend.onrender.com/api';
// const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getStoredAuth() { 
  try { return JSON.parse(sessionStorage.getItem('fundzola_auth') || 'null'); }
  catch { return null; }
}

function getAccessToken() {
  return getStoredAuth()?.accessToken || null;
}

function getRefreshToken() {
  return getStoredAuth()?.refreshToken || null;
}

let _refreshing = null; // deduplicate concurrent refresh calls

async function tryRefresh() {
  if (_refreshing) return _refreshing;
  _refreshing = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res  = await fetch(`${BASE_URL}/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken }),
      });
      const data = await res.json();
      if (data.success && data.data?.accessToken) {
        const auth = getStoredAuth();
        sessionStorage.setItem('fundzola_auth', JSON.stringify({ ...auth, accessToken: data.data.accessToken }));
        return true;
      }
    } catch { /* network error */ }
    return false;
  })();
  try { return await _refreshing; } finally { _refreshing = null; }
}

function forceLogout() {
  sessionStorage.removeItem('fundzola_auth');
  window.dispatchEvent(new Event('auth:logout'));
}

function buildHeaders(extra = {}) {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers: buildHeaders(options.headers) });

  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Retry original request with new access token
      const retry = await fetch(`${BASE_URL}${path}`, { ...options, headers: buildHeaders(options.headers) });
      return retry.json();
    }
    forceLogout();
    return { success: false, message: 'Session expired. Please log in again.' };
  }

  return res.json();
}

export const api = {
  get:    (path)        => request(path, { method: 'GET' }),
  post:   (path, body)  => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)  => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (path, body)  => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)        => request(path, { method: 'DELETE' }),
};
