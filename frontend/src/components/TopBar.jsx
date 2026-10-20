import { useLocation } from 'react-router-dom'

/** Route path → page title shown in the top bar (Spanish UI copy). */
function pageTitle(pathname) {
  if (pathname === '/') return 'Dashboard'
  if (pathname === '/issues/new') return 'Nueva incidencia'
  if (pathname.startsWith('/issues/') && pathname.endsWith('/edit')) {
    return 'Editar incidencia'
  }
  if (/^\/issues\/[^/]+$/.test(pathname)) return 'Detalle de incidencia'
  if (pathname === '/issues') return 'Incidencias'
  return 'Página no encontrada'
}

/**
 * Page header strip: mobile sidebar toggle + route-derived page title
 * (the "Dashboards / All Bugs" area of the reference design).
 */
export default function TopBar({ sidebarOpen, onToggleSidebar }) {
  const { pathname } = useLocation()

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar__toggle"
        onClick={onToggleSidebar}
        aria-expanded={sidebarOpen}
        aria-controls="sidebar-nav"
        aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        data-testid="sidebar-toggle"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      </button>

      <p className="topbar__title">
        <span className="topbar__section">BugTrack</span>
        <span className="topbar__sep" aria-hidden="true">
          /
        </span>
        <span className="topbar__page">{pageTitle(pathname)}</span>
      </p>
    </header>
  )
}
