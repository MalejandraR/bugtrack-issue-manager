import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { api } from '../services/api'
import { clearAuth, readAuth, writeAuth } from '../auth/authStorage'

const AuthContext = createContext(null)

/**
 * Owns the login session at app level: { token, email, expiresAt } persisted in
 * localStorage (`bugtrack_auth`). Expiry is checked on load by readAuth(), so a
 * stale token is cleared before any request can carry it.
 */
export function AuthProvider({ children }) {
  // Lazy initial state: read (and prune) the session exactly once per mount.
  const [auth, setAuth] = useState(() => readAuth())

  const login = useCallback(async (email, password) => {
    const session = await api.login(email, password)
    const next = {
      token: session.token,
      email: session.email,
      expiresAt: Date.now() + session.expiresInHours * 60 * 60 * 1000,
    }
    writeAuth(next)
    setAuth(next)
    return next
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setAuth(null)
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(auth?.token),
      token: auth?.token ?? null,
      email: auth?.email ?? null,
      expiresAt: auth?.expiresAt ?? null,
      login,
      logout,
    }),
    [auth, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Login/logout/isAuthenticated for the header, the guards and the login page. */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
