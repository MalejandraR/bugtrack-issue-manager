import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useIssues } from '../hooks/useIssues'
import { onIssuesChanged } from '../utils/issueEvents'

/**
 * Top header (prototype's `.top`): the BugTrack bug logo plus the pill
 * navigation. "Incidencias" carries a lime badge with the number of issues
 * that are not closed yet; it refreshes through the app-wide issues signal.
 *
 * Auth (Fase 7): "+ Nueva" only exists when signed in, and the right side shows
 * "Ingresar" (logged out) or the account email + "Salir" (logged in). Hiding is
 * UX only — the server is what actually rejects unauthenticated writes.
 */
export default function SiteHeader() {
  const { issues, reload } = useIssues()
  const { isAuthenticated, email, logout } = useAuth()

  useEffect(() => onIssuesChanged(reload), [reload])

  const openCount = issues.filter((issue) => issue.status !== 'CLOSED').length

  return (
    <header className="top">
      <NavLink to="/" className="logo" data-testid="nav-brand">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="9" fill="#C6F432" stroke="#14121F" strokeWidth="2.5" />
          <ellipse cx="16" cy="19" rx="6" ry="7" fill="#14121F" />
          <circle cx="16" cy="10.5" r="3.5" fill="#14121F" />
          <path
            d="M10 16l-4-2M10 21l-4 1M22 16l4-2M22 21l4 1M13.5 8l-2-3M18.5 8l2-3"
            stroke="#14121F"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        BugTrack
      </NavLink>

      <nav className="nav" aria-label="Principal">
        <NavLink to="/" end data-testid="nav-dashboard">
          Dashboard
        </NavLink>
        <NavLink to="/issues" data-testid="nav-issues">
          Incidencias <span className="n">{openCount}</span>
        </NavLink>
        {isAuthenticated && (
          <NavLink to="/issues/new" data-testid="nav-new-issue">
            + Nueva
          </NavLink>
        )}
        {isAuthenticated ? (
          <span className="nav__auth" data-testid="nav-auth">
            <span className="nav__user" data-testid="auth-user-email">
              {email}
            </span>
            <button type="button" className="btn btn--sm" onClick={logout} data-testid="auth-logout">
              Salir
            </button>
          </span>
        ) : (
          <NavLink to="/login" data-testid="auth-login">
            Ingresar
          </NavLink>
        )}
      </nav>
    </header>
  )
}
