/**
 * Shared API client — same-origin requests with Bearer JWT for Burp-friendly traffic.
 */

export function getBackendUrl() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

export function getStoredToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('kiis_portal_token')
}

export function setStoredToken(token) {
  if (!token || typeof window === 'undefined') return
  localStorage.setItem('kiis_portal_token', token)
}

/** Headers including Authorization: Bearer when a token exists in localStorage. */
export function getAuthHeaders(extra = {}) {
  const headers = { ...extra }
  const token = getStoredToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

/**
 * fetch() wrapper: resolves path against current origin and attaches Bearer by default.
 * Pass options.headers.Authorization to override (e.g. forged lab token).
 */
export async function apiFetch(path, options = {}) {
  const base = getBackendUrl()
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`
  const mergedHeaders = {
    Accept: 'application/json',
    ...getAuthHeaders(),
    ...(options.headers || {}),
  }
  if (options.body && !mergedHeaders['Content-Type'] && !(options.body instanceof FormData)) {
    mergedHeaders['Content-Type'] = 'application/json'
  }
  return fetch(url, { ...options, headers: mergedHeaders })
}

export async function loginRequest(username, password) {
  const res = await fetch(`${getBackendUrl()}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json().catch(() => ({}))
  return { res, data }
}

/** Raw HTTP snippet for Burp Repeater (paste and edit Authorization). */
export function formatBurpRepeaterRequest(method, path, token, host) {
  const h = host || (typeof window !== 'undefined' ? window.location.host : 'kiis-bank-portal.onrender.com')
  const lines = [
    `${method.toUpperCase()} ${path} HTTP/1.1`,
    `Host: ${h}`,
    'Accept: application/json',
  ]
  if (token) {
    lines.push(`Authorization: Bearer ${token}`)
  }
  lines.push('Connection: close', '', '')
  return lines.join('\r\n')
}
