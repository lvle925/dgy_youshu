const API_BASE = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const TOKEN_KEY = 'YS_AUTH_TOKEN';

export const isRemoteApi = Boolean(API_BASE);

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalized}`;
}

export function getAuthToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
}

export function saveAuth(result) {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    if (result?.token) sessionStorage.setItem(TOKEN_KEY, result.token);
  } catch { /* The backend cookie remains available for same-origin use. */ }
  if (result?.user) localStorage.setItem('DEMO_USER', result.user);
}

export function clearAuth() {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* Ignore unavailable browser storage. */ }
}

export function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  const credentials = options.credentials || (isRemoteApi ? 'omit' : 'same-origin');
  return fetch(apiUrl(path), { ...options, headers, credentials });
}
