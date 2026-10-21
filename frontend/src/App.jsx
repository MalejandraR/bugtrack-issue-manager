import { useEffect, useRef } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import SiteHeader from './components/SiteHeader'
import { ToastProvider } from './hooks/useToast'
import Dashboard from './pages/Dashboard'
import IssueCreate from './pages/IssueCreate'
import IssueDetailDrawer from './components/IssueDetailDrawer'
import IssueEdit from './pages/IssueEdit'
import IssuesList from './pages/IssuesList'

/** `/issues/5` style paths are the detail drawer rendered on top of the list. */
const DRAWER_PATH = /^\/issues\/\d+$/

/**
 * Scrolls to the top on navigation, except when the detail drawer opens or
 * closes on top of the list: there we keep the list's scroll position.
 */
function ScrollManager() {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname)

  useEffect(() => {
    const previous = previousPath.current
    previousPath.current = pathname

    const isDrawer = (path) => DRAWER_PATH.test(path)
    const staysOnList =
      (previous === '/issues' && isDrawer(pathname)) ||
      (isDrawer(previous) && (pathname === '/issues' || isDrawer(pathname)))
    if (!staysOnList) window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function NotFound() {
  return (
    <div className="page" data-testid="not-found-page">
      <header className="head">
        <div>
          <h1>Página no encontrada</h1>
          <p className="sub">La ruta que intentaste abrir no existe.</p>
        </div>
      </header>
      <Link className="btn btn--primary" to="/" data-testid="not-found-home">
        Ir al dashboard
      </Link>
    </div>
  )
}

/** App shell: top header + routed main content + footer (prototype layout). */
function AppShell() {
  return (
    <div className="app">
      <SiteHeader />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/issues" element={<IssuesList />}>
            <Route path=":id" element={<IssueDetailDrawer />} />
          </Route>
          <Route path="/issues/new" element={<IssueCreate />} />
          <Route path="/issues/:id/edit" element={<IssueEdit />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="foot">BugTrack · Gestor de incidencias</footer>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <ScrollManager />
        <AppShell />
      </ToastProvider>
    </BrowserRouter>
  )
}
