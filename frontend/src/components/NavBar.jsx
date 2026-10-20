import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Dashboard', testId: 'nav-dashboard', end: true },
  { to: '/issues', label: 'Incidencias', testId: 'nav-issues' },
  { to: '/issues/new', label: 'Crear', testId: 'nav-new-issue' },
]

export default function NavBar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <NavLink to="/" className="navbar__brand" data-testid="nav-brand">
          <span className="navbar__mark" aria-hidden="true" />
          BugTrack
        </NavLink>
        <nav className="navbar__links" aria-label="Navegación principal">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `navbar__link${isActive ? ' navbar__link--active' : ''}`
              }
              data-testid={link.testId}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
