// Single place where the backend base URL is configured.
// Override with VITE_API_URL (e.g. in a .env file) when the API lives elsewhere.
import { clearAuth, getAuthToken } from '../auth/authStorage'

const RAW_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '')

/**
 * Low level fetch wrapper: JSON in, JSON out, throws an ApiError on non-2xx.
 *
 * When a session exists, every request carries `Authorization: Bearer <token>`
 * (public GETs ignore it server-side; writes require it). A 401 on a MUTATION
 * means the token is dead: clear the session and land on /login. Public GETs and
 * the login request itself never redirect — reads must stay public and a wrong
 * password must render its inline error, not reload the page.
 */
async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getAuthToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor.', { status: 0 })
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const isLoginAttempt = path === '/auth/login'
    if (response.status === 401 && method !== 'GET' && !isLoginAttempt) {
      clearAuth()
      window.location.assign('/login')
    }
    throw new ApiError(data?.message || `Error del servidor (${response.status}).`, {
      status: response.status,
      fieldErrors: data?.fieldErrors || null,
    })
  }

  return {
    data,
    location: response.headers.get('Location'),
  }
}

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

function idFromLocation(location) {
  if (!location) return null
  const match = location.match(/\/issues\/(\d+)(?:\D|$)/)
  return match ? Number(match[1]) : null
}

function toQuery(filters = {}) {
  const params = new URLSearchParams()
  for (const key of ['status', 'priority', 'severity']) {
    const value = filters[key]
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return query ? `?${query}` : ''
}

export const api = {
  health() {
    return request('/health').then((r) => r.data)
  },

  /** POST /auth/login → { token, tokenType, expiresInHours, email }. */
  login(email, password) {
    return request('/auth/login', { method: 'POST', body: { email, password } }).then(
      (r) => r.data,
    )
  },

  /** GET /auth/me → { email } of the current token (requires auth). */
  me() {
    return request('/auth/me').then((r) => r.data)
  },

  listIssues(filters = {}) {
    return request(`/issues${toQuery(filters)}`).then((r) => r.data ?? [])
  },

  getIssue(id) {
    return request(`/issues/${id}`).then((r) => r.data)
  },

  async createIssue(payload) {
    const { data, location } = await request('/issues', { method: 'POST', body: payload })
    return { ...data, id: data?.id ?? idFromLocation(location) }
  },

  updateIssue(id, payload) {
    return request(`/issues/${id}`, { method: 'PUT', body: payload }).then((r) => r.data)
  },

  updateStatus(id, status) {
    return request(`/issues/${id}/status`, { method: 'PATCH', body: { status } }).then(
      (r) => r.data,
    )
  },
}
