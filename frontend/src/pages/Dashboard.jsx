import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import Spinner from '../components/Spinner'
import { useIssues } from '../hooks/useIssues'

const COUNTERS = [
  {
    key: 'total',
    label: 'Total',
    testId: 'dashboard-counter-total',
    to: '/issues',
    pick: () => true,
    tone: 'counter--total',
  },
  {
    key: 'open',
    label: 'Abiertas',
    testId: 'dashboard-counter-open',
    to: '/issues?status=OPEN',
    pick: (issue) => issue.status === 'OPEN',
    tone: 'counter--open',
  },
  {
    key: 'in-progress',
    label: 'En progreso',
    testId: 'dashboard-counter-in-progress',
    to: '/issues?status=IN_PROGRESS',
    pick: (issue) => issue.status === 'IN_PROGRESS',
    tone: 'counter--progress',
  },
  {
    key: 'closed',
    label: 'Cerradas',
    testId: 'dashboard-counter-closed',
    to: '/issues?status=CLOSED',
    pick: (issue) => issue.status === 'CLOSED',
    tone: 'counter--closed',
  },
]

export default function Dashboard() {
  const { issues, loading, error, reload } = useIssues()

  const counts = {
    total: issues.length,
    open: issues.filter((i) => i.status === 'OPEN').length,
    'in-progress': issues.filter((i) => i.status === 'IN_PROGRESS').length,
    closed: issues.filter((i) => i.status === 'CLOSED').length,
  }

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1 className="page__title">Dashboard</h1>
          <p className="page__subtitle">Resumen general de las incidencias del proyecto.</p>
        </div>
        <Link className="btn btn--primary" to="/issues/new" data-testid="dashboard-new-issue">
          Crear incidencia
        </Link>
      </header>

      {loading && <Spinner label="Cargando incidencias…" />}

      {!loading && error && (
        <ErrorBanner
          message={`No se pudieron cargar las incidencias: ${error.message}`}
          onRetry={reload}
        />
      )}

      {!loading && !error && issues.length === 0 && (
        <EmptyState />
      )}

      {!loading && !error && issues.length > 0 && (
        <div className="counters">
          {COUNTERS.map((counter) => (
            <Link
              key={counter.key}
              className={`counter ${counter.tone}`}
              to={counter.to}
              data-testid={counter.testId}
            >
              <span className="counter__value">{counts[counter.key]}</span>
              <span className="counter__label">{counter.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
