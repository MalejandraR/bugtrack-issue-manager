import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import { ToastProvider } from './hooks/useToast'
import Dashboard from './pages/Dashboard'
import IssueCreate from './pages/IssueCreate'
import IssueDetail from './pages/IssueDetail'
import IssueEdit from './pages/IssueEdit'
import IssuesList from './pages/IssuesList'

/** Scrolls to the top (or to the anchor) whenever the route changes. */
function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      try {
        const target = document.querySelector(hash)
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      } catch {
        // Malformed hash: fall through to a normal scroll-to-top.
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}

function NotFound() {
  return (
    <div className="page page--narrow" data-testid="not-found-page">
      <h1 className="page__title">Página no encontrada</h1>
      <p className="page__subtitle">La ruta que intentaste abrir no existe.</p>
      <Link className="btn btn--primary" to="/" data-testid="not-found-home">
        Ir al dashboard
      </Link>
    </div>
  )
}

/** App shell: fixed left sidebar + top bar + routed main content. */
function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen((value) => !value), [])

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="content">
        <TopBar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/issues" element={<IssuesList />} />
            <Route path="/issues/new" element={<IssueCreate />} />
            <Route path="/issues/:id" element={<IssueDetail />} />
            <Route path="/issues/:id/edit" element={<IssueEdit />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <footer className="footer">
          <span>BugTrack · Gestor de incidencias</span>
        </footer>
      </div>
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
