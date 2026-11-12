// Single source of truth for the auth session in localStorage.
// Key: `bugtrack_auth` → { token, email, expiresAt } (expiresAt = epoch ms).
// Everything that reads or clears the session goes through here, so expiry
// handling lives in exactly one place: readAuth() drops expired sessions.

const STORAGE_KEY = 'bugtrack_auth'

function isValidSession(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof value.token === 'string' &&
      value.token &&
      typeof value.email === 'string' &&
      typeof value.expiresAt === 'number',
  )
}

/** Returns the stored session, or null when absent, malformed or expired. */
export function readAuth() {
  let raw = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null // Storage blocked (private mode): treat as logged out.
  }
  if (!raw) return null

  let parsed = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    clearAuth()
    return null
  }
  if (!isValidSession(parsed)) {
    clearAuth()
    return null
  }
  if (parsed.expiresAt <= Date.now()) {
    clearAuth() // Token expired: clear on load, never send a dead token.
    return null
  }
  return parsed
}

export function writeAuth(session) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearAuth() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage blocked: nothing to clear.
  }
}

/** Bearer token for the Authorization header, or null when logged out. */
export function getAuthToken() {
  return readAuth()?.token ?? null
}
