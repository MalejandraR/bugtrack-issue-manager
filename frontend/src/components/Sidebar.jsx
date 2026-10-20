import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

function IconDashboard() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function IconIssues() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <circle cx="3.5" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.5" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconNewIssue() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

const links = [
  { to: '/', label: 'Dashboard', testId: 'nav-dashboard', end: true, Icon: IconDashboard },
  { to: '/issues', label: 'Incidencias', testId: 'nav-issues', Icon: IconIssues },
  { to: '/issues/new', label: 'Nueva incidencia', testId: 'nav-new-issue', Icon: IconNewIssue },
]

/**
 * Left sidebar navigation (replaces the old top NavBar).
 * On viewports narrower than 768px it renders as an off-canvas drawer
 * controlled by the App shell (`open` / `onClose`), toggled from the TopBar.
 */
export default function Sidebar({ open, onClose }) {
  const { pathname } = useLocation()

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  return (
    <>
      {open && (
        <div
          className="sidebar__backdrop"
          onClick={onClose}
          data-testid="sidebar-backdrop"
        />
      )}
      <aside
        className={`sidebar${open ? ' sidebar--open' : ''}`}
        id="sidebar-nav"
        data-testid="sidebar"
      >
        <NavLink to="/" className="sidebar__brand" data-testid="nav-brand">
          <span className="sidebar__mark" aria-hidden="true" />
          <span className="sidebar__brand-text">BugTrack</span>
        </NavLink>

        <nav className="sidebar__nav" aria-label="Navegación principal">
          {links.map(({ to, label, testId, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
              data-testid={testId}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
