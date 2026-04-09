const BASE_URL = 'https://fundzola-backend.onrender.com/api';

function getToken() {
  try {
    const stored = localStorage.getItem('fundzola_auth');
    return stored ? JSON.parse(stored).token : null;
  } catch { return null; }
}

function headers(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

export const api = {
  get: (path) =>
    fetch(`${BASE_URL}${path}`, { headers: headers() }).then(r => r.json()),

  post: (path, body) =>
    fetch(`${BASE_URL}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) }).then(r => r.json()),

  put: (path, body) =>
    fetch(`${BASE_URL}${path}`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) }).then(r => r.json()),

  patch: (path, body) =>
    fetch(`${BASE_URL}${path}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) }).then(r => r.json()),

  delete: (path) =>
    fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers: headers() }).then(r => r.json()),
};
